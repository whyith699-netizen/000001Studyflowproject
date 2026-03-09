import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';

let nativePermissionRequested = false;
let webPermissionRequested = false;
const nativeChannelsReady = new Set();

const TIMER_CHANNEL_ID = 'studyflow-timer-channel';
const DEADLINE_CHANNEL_ID = 'studyflow-deadline-channel';
const DEADLINE_OFFSETS = [
  { key: '24h', ms: 24 * 60 * 60 * 1000, label: '24 hours' },
  { key: '1h', ms: 60 * 60 * 1000, label: '1 hour' }
];

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

async function playAlarmTone() {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) return false;

  try {
    const context = new AudioContextCtor();
    if (context.state === 'suspended') {
      await context.resume();
    }

    const now = context.currentTime;
    const pattern = [
      { at: 0, freq: 880 },
      { at: 0.22, freq: 988 },
      { at: 0.44, freq: 1174 }
    ];

    pattern.forEach(({ at, freq }) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + at);

      gainNode.gain.setValueAtTime(0.0001, now + at);
      gainNode.gain.exponentialRampToValueAtTime(0.2, now + at + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(now + at);
      oscillator.stop(now + at + 0.2);
    });

    setTimeout(() => {
      context.close().catch(() => {});
    }, 1200);

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

async function triggerForegroundAlert({ soundEnabled = true } = {}) {
  const ops = [];
  if (soundEnabled) {
    ops.push(playAlarmTone());
  }
  ops.push(vibrateDevice());

  const result = await Promise.allSettled(ops);
  return result.some((entry) => entry.status === 'fulfilled' && entry.value);
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
  soundEnabled = true
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
      await triggerForegroundAlert({ soundEnabled });
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

function buildDeadlineNotifications(tasks, userId) {
  const now = Date.now();
  const notifications = [];

  tasks.forEach((task) => {
    if (!task || task.completed) return;
    const dueDate = parseDueDate(task.dueDate);
    if (!dueDate) return;

    DEADLINE_OFFSETS.forEach((offset) => {
      const reminderAt = dueDate.getTime() - offset.ms;
      if (reminderAt <= now + 15000) return;

      const taskLabel = task.text || task.title || 'Task';

      notifications.push({
        id: createReminderId(userId, task.id, offset.key),
        channelId: DEADLINE_CHANNEL_ID,
        title: 'Task deadline reminder',
        body: `"${taskLabel}" is due in ${offset.label}.`,
        schedule: {
          at: new Date(reminderAt),
          allowWhileIdle: true
        },
        extra: {
          type: 'task-deadline',
          taskId: task.id,
          offset: offset.key
        }
      });
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
  notifyTimerComplete,
  syncTaskDeadlineReminders
};
