/**
 * Firestore Schema Documentation for Chatbot
 * 
 * This file documents the Firestore collections and documents used by the chatbot feature.
 * Actual security rules are in ../../firestore.rules
 */

/**
 * CHATBOT FIRESTORE SCHEMA
 * =========================
 * 
 * users/{userId}/
 *   ├── chatSessions/                          // Collection: Chat sessions
 *   │     └── {sessionId}/                     // Document: Individual session
 *   │           ├── createdAt: timestamp       // Session creation time
 *   │           ├── updatedAt: timestamp       // Last message time
 *   │           ├── topic: string              // Auto-detected topic
 *   │           ├── messageCount: number       // Total messages in session
 *   │           └── messages/                  // Subcollection: Messages
 *   │                 └── {messageId}/         // Document: Individual message
 *   │                       ├── role: string   // "user" | "assistant" | "system"
 *   │                       ├── content: string // Message content
 *   │                       ├── timestamp: timestamp
 *   │                       ├── intent?: string // Detected intent (optional)
 *   │                       ├── entities?: object // Extracted entities (optional)
 *   │                       └── helpful?: boolean // User feedback (optional)
 *   │
 *   └── settings/                              // Collection: User settings
 *         └── chatbot/                         // Document: Chatbot settings
 *               ├── apiConfigured: boolean     // Is API key set?
 *               ├── model: string              // Gemini model used
 *               ├── createdAt: timestamp
 *               └── updatedAt: timestamp
 */

// Example document structures:

export const chatSessionExample = {
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T10:05:00.000Z",
  topic: "study_progress",
  messageCount: 4,
};

export const chatMessageExample = {
  role: "user", // or "assistant" or "system"
  content: "Bagaimana progress belajarku hari ini?",
  timestamp: "2026-03-07T10:00:00.000Z",
  intent: "study_progress",
  entities: {
    timeRange: "today",
  },
  // Optional feedback
  // helpful: true,
};

export const chatbotSettingsExample = {
  apiConfigured: true,
  model: "gemini-3.0-flash",
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T10:00:00.000Z",
};

/**
 * SECURITY RULES SUMMARY
 * ======================
 * 
 * users/{userId}/chatSessions/** 
 *   - Read/Write: Only authenticated user with matching userId
 * 
 * users/{userId}/settings/chatbot
 *   - Read/Write: Only authenticated user with matching userId
 * 
 * All other paths: DENY
 */

/**
 * INDEXES REQUIRED
 * ================
 * 
 * Collection: users/{userId}/chatSessions/{sessionId}/messages
 * Indexes:
 *   - timestamp ASC (for ordering messages)
 *   - role ASC, timestamp ASC (for filtering by role)
 */

export default {
  chatSessionExample,
  chatMessageExample,
  chatbotSettingsExample,
};
