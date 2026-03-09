/**
 * Chatbot Configuration for StudyFlow AI Assistant
 */

export const CHATBOT_CONFIG = {
  // Enable/disable chatbot feature
  enabled: true,

  // Gemini API Generation Configuration
  gemini: {
    temperature: 0.7,
    maxTokens: 1024,
    topP: 0.95,
    topK: 40,
  },

  // Model fallback chain — ordered by quality (best first)
  // When a model hits its rate limit (429), the next model is tried instantly
  modelChain: [
    { id: 'gemini-3-flash',        rpm: 15, rpd: 20,    label: 'Gemini 3 Flash' },
    { id: 'gemini-3.1-flash-lite', rpm: 15, rpd: 500,   label: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-2.5-flash-lite', rpm: 10, rpd: 30,    label: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.5-flash',      rpm: 5,  rpd: 20,    label: 'Gemini 2.5 Flash' },
    { id: 'gemma-3-27b-it',        rpm: 30, rpd: 14400, label: 'Gemma 3 27B' },
  ],

  // Retry configuration (only used for the last model in chain)
  retry: {
    maxAttempts: 3,            // Max retry attempts on 429 (last model only)
    baseDelayMs: 2000,         // 2s base delay (exponential backoff)
    maxDelayMs: 30000,         // Cap at 30s max wait
    cooldownMs: 60000,         // 1 min cooldown for a model after 429
  },

  // Chat context
  context: {
    maxMessagesInContext: 20,
    systemPrompt: `Anda adalah StudyFlow AI Assistant, chatbot pembelajaran yang membantu siswa dan mahasiswa dalam proses belajar.

Karakter Anda:
- Ramah, suportif, dan motivatif
- Memberikan jawaban yang jelas dan terstruktur
- Menggunakan bahasa yang sesuai dengan input user (Indonesia/English)
- Memberikan tips belajar yang praktis

Jika user bertanya tentang progress, jadwal, atau tugas, gunakan konteks data yang tersedia agar jawaban personal dan relevan.`,
  },

  // UI Configuration
  ui: {
    position: 'bottom-right',
    defaultOpen: false,
    showQuickReplies: true,
    showTypingIndicator: true,
    defaultToneStyle: 'friendly',
    defaultOutputLanguage: 'auto',
    toneStyles: [
      { value: 'friendly', label: 'Friendly' },
      { value: 'formal', label: 'Formal' },
      { value: 'coach', label: 'Coach' },
    ],
    outputLanguages: [
      { value: 'auto', label: 'Follow user input' },
      { value: 'en', label: 'English' },
      { value: 'id', label: 'Bahasa Indonesia' },
    ],
  },

  // Quick reply suggestions
  quickReplies: [
    { id: 'progress', labelKey: 'chatQuickProgressLabel', valueKey: 'chatQuickProgressValue' },
    { id: 'tasks', labelKey: 'chatQuickTasksLabel', valueKey: 'chatQuickTasksValue' },
    { id: 'addTask', labelKey: 'chatQuickAddTaskLabel', valueKey: 'chatQuickAddTaskValue' },
    { id: 'addCalendar', labelKey: 'chatQuickAddCalendarLabel', valueKey: 'chatQuickAddCalendarValue' },
    { id: 'timer', labelKey: 'chatQuickPomodoroLabel', valueKey: 'chatQuickPomodoroValue' },
    { id: 'motivation', labelKey: 'chatQuickMotivationLabel', valueKey: 'chatQuickMotivationValue' },
  ],

  // Action execution - chatbot can write to database
  actions: {
    enabled: true,
    requireConfirmation: true, // always ask user to confirm before executing
  },

  // Voice input (Web Speech API)
  voice: {
    enabled: true,
    language: 'id-ID', // default language (BCP-47)
    silenceTimeout: 5000, // ms to auto-stop after silence
  },

  // File attachments in chat
  attachments: {
    enabled: true,
    maxFiles: 3, // max files per message
    maxSizeMB: 5, // max size per file
    allowedTypes: [
      'image/*',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
};

export default CHATBOT_CONFIG;
