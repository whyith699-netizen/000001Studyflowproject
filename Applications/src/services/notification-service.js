import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import {
  getTaskReminderNotificationLabel,
  getTaskReminderOffsetMs,
  isTaskReminderActive,
  normalizeTaskReminder,
} from '../config/taskReminderOptions';

let nativePermissionRequested = false;
let webPermissionRequested = false;
const nativeChannelsReady = new Set();

const TIMER_CHANNEL_ID = 'studyflow-timer-channel';
const DEADLINE_CHANNEL_ID = 'studyflow-deadline-channel';
const TONE_PATTERNS = {
  complete: [
    { at: 0, freq: 880, duration: 0.2, peak: 0.2 },
    { at: 0.22, freq: 988, duration: 0.2, peak: 0.18 },
    { at: 0.44, freq: 1174, duration: 0.2, peak: 0.16 }
  ],
  'break-start': [
    { at: 0, freq: 659, duration: 0.16, peak: 0.14 },
    { at: 0.18, freq: 784, duration: 0.18, peak: 0.16 }
  ],
  'focus-start': [
    { at: 0, freq: 784, duration: 0.16, peak: 0.14 },
    { at: 0.18, freq: 988, duration: 0.18, peak: 0.16 }
  ]
};

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function getActiveLang() {
  if (typeof window === 'undefined') return 'en';

  try {
    const stored = window.localStorage?.getItem('studyflow-lang');
    return stored === 'id' ? 'id' : 'en';
  } catch {
    return 'en';
  }
}

async function playAlarmTone(tone = 'complete') {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) return false;

  try {
    const context = new AudioContextCtor();
    if (context.state === 'suspended') {
      await context.resume();
    }

    const now = context.currentTime;
    const pattern = TONE_PATTERNS[tone] || TONE_PATTERNS.complete;
    const longestStep = pattern.reduce(
      (max, entry) => Math.max(max, entry.at + entry.duration),
      0
    );

    pattern.forEach(({ at, freq, duration, peak }) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + at);

      gainNode.gain.setValueAtTime(0.0001, now + at);
      gainNode.gain.exponentialRampToValueAtTime(peak, now + at + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + at + duration);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(now + at);
      oscillator.stop(now + at + duration + 0.02);
    });

    setTimeout(() => {
      context.close().catch(() => {});
    }, Math.ceil((longestStep + 0.6) * 1000));

    return true;
  } catch (error) {
    console.error('Alarm tone playback failed:', error);
    return false;
  }
}

async function vibrateDevice() {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.vibrate({ duration: 350 });
      return true;
    }
  } catch (error) {
    console.error('Native vibration failed:', error);
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    return Boolean(navigator.vibrate([160, 80, 220]));
  }

  return false;
}

async function triggerForegroundAlert({
  soundEnabled = true,
  tone = 'complete',
  vibrate = true,
} = {}) {
  const ops = [];
  if (soundEnabled) {
    ops.push(playAlarmTone(tone));
  }
  if (vibrate) {
    ops.push(vibrateDevice());
  }

  const result = await Promise.allSettled(ops);
  return result.some((entry) => entry.status === 'fulfilled' && entry.value);
}

export async function playTimerTransitionCue({
  eventType = 'break-start',
  soundEnabled = true,
} = {}) {
  if (!soundEnabled) return false;

  return triggerForegroundAlert({
    soundEnabled,
    tone: eventType,
    vibrate: false,
  });
}

async function ensureNativeNotificationSupport() {
  if (!Capacitor.isNativePlatform()) return false;

  if (!nativePermissionRequested) {
    nativePermissionRequested = true;
    try {
      await LocalNotifications.requestPermissions();
    } catch (error) {
      console.error('Native notification permission request failed:', error);
    }
  }

  try {
    const permissionStatus = await LocalNotifications.checkPermissions();
    return permissionStatus.display === 'granted';
  } catch (error) {
    console.error('Native notification permission check failed:', error);
    return false;
  }
}

async function ensureChannel({ id, name, description }) {
  if (nativeChannelsReady.has(id) || !Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.createChannel({
      id,
      name,
      description,
      importance: 5,
      visibility: 1
    });
    nativeChannelsReady.add(id);
  } catch {
    // iOS or old Android may not support channels.
    nativeChannelsReady.add(id);
  }
}

async function showWebNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'default' && !webPermissionRequested) {
    webPermissionRequested = true;
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error('Web notification permission request failed:', error);
    }
  }

  if (Notification.permission !== 'granted') return false;

  try {
    new Notification(title, { body });
    return true;
  } catch (error) {
    console.error('Web notification failed:', error);
    return false;
  }
}

export async function notifyTimerComplete({
  title = 'Timer Complete!',
  body = 'Your timer session has ended.',
  soundEnabled = true,
  tone = 'complete',
}) {
  if (Capacitor.isNativePlatform()) {
    const canNotify = await ensureNativeNotificationSupport();
    if (!canNotify) return false;

    await ensureChannel({
      id: TIMER_CHANNEL_ID,
      name: 'Timer Alerts',
      description: 'StudyFlow timer completion notifications'
    });

    const appIsForeground =
      typeof document !== 'undefined' && document.visibilityState === 'visible';

    if (appIsForeground) {
      await triggerForegroundAlert({ soundEnabled, tone });
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2147483647,
            channelId: TIMER_CHANNEL_ID,
            title,
            body,
            schedule: { at: new Date(Date.now() + 250) },
            silent: appIsForeground ? true : !soundEnabled
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('Native notification schedule failed:', error);
      return false;
    }
  }

  return showWebNotification(title, body);
}

function parseDueDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function createReminderId(userId, taskId, offsetKey) {
  const seed = `${userId}:${taskId}:${offsetKey}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return 1000000000 + (hash % 1000000000);
}

function getPriorityLabel(priority, lang) {
  const normalized = String(priority || '').toLowerCase();
  const labels = {
    en: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
    id: {
      high: 'Tinggi',
      medium: 'Sedang',
      low: 'Rendah',
    },
  };

  return labels[lang]?.[normalized] || labels.en[normalized] || null;
}

function buildDeadlineReminderContent(task, reminderKey, lang) {
  const taskLabel = task.text || task.title || (lang === 'id' ? 'Tugas' : 'Task');
  const reminderLabel = getTaskReminderNotificationLabel(reminderKey, lang);
  const classLabel = task.className ? String(task.className).trim() : '';
  const priorityLabel = getPriorityLabel(task.priority, lang);

  const dueDate = parseDueDate(task.dueDate);
  let deadlineStr = '';
  if (dueDate) {
    const options = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    deadlineStr = dueDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', options);
  }

  if (lang === 'id') {
    const bodyParts = [`Yuk siap-siap, tugas "${taskLabel}" batas waktunya tinggal ${reminderLabel} lagi nih.`];
    if (deadlineStr) {
      bodyParts.push(`Deadline: ${deadlineStr}.`);
    }
    if (classLabel) {
      bodyParts.push(`Kelas: ${classLabel}.`);
    }
    if (priorityLabel) {
      bodyParts.push(`Prioritas: ${priorityLabel}.`);
    }
    bodyParts.push(`Ayo selesaikan sekarang, kamu pasti bisa! 💪`);

    return {
      title: 'Waktunya ngerjain tugas! 🚀',
      body: bodyParts.join(' '),
    };
  }

  const bodyParts = [`Hey, your task "${taskLabel}" is due in ${reminderLabel}.`];
  if (deadlineStr) {
    bodyParts.push(`Deadline: ${deadlineStr}.`);
  }
  if (classLabel) {
    bodyParts.push(`Class: ${classLabel}.`);
  }
  if (priorityLabel) {
    bodyParts.push(`Priority: ${priorityLabel}.`);
  }
  bodyParts.push(`Let's get it done! 💪`);

  return {
    title: 'Time to crush your task! 🚀',
    body: bodyParts.join(' '),
  };
}

function buildDeadlineNotifications(tasks, userId) {
  const now = Date.now();
  const notifications = [];
  const lang = getActiveLang();

  tasks.forEach((task) => {
    if (!task || task.completed) return;
    const dueDate = parseDueDate(task.dueDate);
    if (!dueDate) return;
    const reminderKey = normalizeTaskReminder(task.reminder);
    if (!isTaskReminderActive(reminderKey)) return;

    const offsetMs = getTaskReminderOffsetMs(reminderKey);
    if (!offsetMs) return;

    const reminderAt = dueDate.getTime() - offsetMs;
    if (reminderAt <= now + 15000) return;

    const content = buildDeadlineReminderContent(task, reminderKey, lang);

    notifications.push({
      id: createReminderId(userId, task.id, reminderKey),
      channelId: DEADLINE_CHANNEL_ID,
      title: content.title,
      body: content.body,
      schedule: {
        at: new Date(reminderAt),
        allowWhileIdle: true
      },
      extra: {
        type: 'task-deadline',
        taskId: task.id,
        offset: reminderKey
      }
    });
  });

  return notifications;
}

export async function syncTaskDeadlineReminders(tasks = [], userId = '') {
  if (!Capacitor.isNativePlatform()) {
    return { scheduled: 0, canceled: 0 };
  }
  if (!userId) {
    return { scheduled: 0, canceled: 0 };
  }

  const canNotify = await ensureNativeNotificationSupport();
  if (!canNotify) return { scheduled: 0, canceled: 0 };

  await ensureChannel({
    id: DEADLINE_CHANNEL_ID,
    name: 'Task Deadlines',
    description: 'StudyFlow deadline reminders'
  });

  let canceled = 0;
  try {
    const pending = await LocalNotifications.getPending();
    const staleIds = (pending.notifications || [])
      .filter(
        (notification) =>
          notification?.channelId === DEADLINE_CHANNEL_ID ||
          notification?.extra?.type === 'task-deadline'
      )
      .map((notification) => ({ id: notification.id }));

    if (staleIds.length > 0) {
      await LocalNotifications.cancel({ notifications: staleIds });
      canceled = staleIds.length;
    }
  } catch (error) {
    console.error('Failed to clear stale deadline reminders:', error);
  }

  const reminders = buildDeadlineNotifications(tasks, userId);
  if (reminders.length === 0) {
    return { scheduled: 0, canceled };
  }

  try {
    await LocalNotifications.schedule({ notifications: reminders });
    return { scheduled: reminders.length, canceled };
  } catch (error) {
    console.error('Failed to schedule deadline reminders:', error);
    return { scheduled: 0, canceled };
  }
}

export default {
  playTimerTransitionCue,
  notifyTimerComplete,
  syncTaskDeadlineReminders
};
