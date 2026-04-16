export const TASK_REMINDER_OPTIONS = [
  {
    value: "none",
    ms: null,
    labelKey: "taskReminderNone",
    notificationLabel: {
      en: "the due time",
      id: "waktu tenggat",
    },
  },
  {
    value: "10m",
    ms: 10 * 60 * 1000,
    labelKey: "taskReminder10m",
    notificationLabel: {
      en: "10 minutes",
      id: "10 menit",
    },
  },
  {
    value: "30m",
    ms: 30 * 60 * 1000,
    labelKey: "taskReminder30m",
    notificationLabel: {
      en: "30 minutes",
      id: "30 menit",
    },
  },
  {
    value: "1h",
    ms: 60 * 60 * 1000,
    labelKey: "taskReminder1h",
    notificationLabel: {
      en: "1 hour",
      id: "1 jam",
    },
  },
  {
    value: "1d",
    ms: 24 * 60 * 60 * 1000,
    labelKey: "taskReminder1d",
    notificationLabel: {
      en: "24 hours",
      id: "24 jam",
    },
  },
];

const TASK_REMINDER_LOOKUP = Object.fromEntries(
  TASK_REMINDER_OPTIONS.map((option) => [option.value, option]),
);

export function normalizeTaskReminder(value) {
  return TASK_REMINDER_LOOKUP[value] ? value : "none";
}

export function getTaskReminderOption(value) {
  return TASK_REMINDER_LOOKUP[normalizeTaskReminder(value)];
}

export function getTaskReminderOffsetMs(value) {
  return getTaskReminderOption(value)?.ms ?? null;
}

export function isTaskReminderActive(value) {
  return normalizeTaskReminder(value) !== "none";
}

export function getTaskReminderNotificationLabel(value, lang = "en") {
  const option = getTaskReminderOption(value);
  return option?.notificationLabel?.[lang] || option?.notificationLabel?.en || "";
}
