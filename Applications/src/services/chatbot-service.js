/**
 * Chatbot Service
 * Main service for chatbot functionality - handles chat logic, Firestore sync, and Gemini AI integration
 */

import { auth, db } from '../firebase-config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { geminiClient } from './gemini-client';
import { buildSystemContext, detectIntent, buildConversationHistory } from './chatbot-context';
import { parseActionFromResponse, executeAction } from './chatbot-actions';
import { isApiKeyConfigured } from '../utils/encryption';
import { CHATBOT_CONFIG } from '../config/chatbot-config';
import { uploadTaskAttachments } from './attachments-service';
import { findAvailableModel, getRemainingQuota, getQuotaSummary } from '../utils/rate-limiter';

/**
 * Generate unique ID for chat sessions/messages
 */
const generateId = (prefix = 'chat') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get chat sessions collection reference
 */
const getChatSessionsRef = (userId) => {
  return collection(db, 'users', userId, 'chatSessions');
};

/**
 * Get messages subcollection reference
 */
const getMessagesRef = (userId, sessionId) => {
  return collection(db, 'users', userId, 'chatSessions', sessionId, 'messages');
};

/**
 * Get chatbot settings reference
 */
const getChatbotSettingsRef = (userId) => {
  return doc(db, 'users', userId, 'settings', 'chatbot');
};

const getRateLimitSnapshot = () => {
  return {
    models: getRemainingQuota(),
    summary: getQuotaSummary(),
  };
};

const CHAT_SESSION_RETENTION_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildSessionSnippet = (content) => {
  const clean = String(content || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
};

const sanitizeAssistantOutput = (content) => {
  return String(content || '').replace(/\*/g, '');
};

/**
 * Chatbot Service
 */
export const chatbotService = {
  /**
   * Check if chatbot is available (user logged in + API key configured)
   */
  isAvailable() {
    const user = auth.currentUser;
    if (!user) {
      return { available: false, reason: 'User not logged in' };
    }

    const apiKeyConfigured = isApiKeyConfigured();
    if (!apiKeyConfigured) {
      return { available: false, reason: 'API key not configured' };
    }

    return { available: true };
  },

  /**
   * Initialize user collections if they don't exist
   * Call this after user logs in to ensure parent documents exist
   */
  async initializeUserCollections() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    // Create user document if it doesn't exist (parent document)
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      initialized: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Initialize chatbot settings
    const settingsRef = getChatbotSettingsRef(user.uid);
    await setDoc(settingsRef, {
      apiConfigured: isApiKeyConfigured(),
      toneStyle: CHATBOT_CONFIG.ui.defaultToneStyle || 'friendly',
      responseLanguage: CHATBOT_CONFIG.ui.defaultOutputLanguage || 'auto',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true };
  },

  /**
   * Get or create current chat session
   */
  async getCurrentSession() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');
    await this.cleanupExpiredSessions(CHAT_SESSION_RETENTION_DAYS);

    // Get the most recent session
    const sessionsRef = getChatSessionsRef(user.uid);
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const sessionDoc = snapshot.docs[0];
      return { id: sessionDoc.id, ...sessionDoc.data() };
    }

    // Create new session
    return this.createSession();
  },

  /**
   * Create a new chat session
   */
  async createSession() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const sessionId = generateId('session');
    const sessionRef = doc(getChatSessionsRef(user.uid), sessionId);

    const sessionData = {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      topic: 'general',
      messageCount: 0,
      lastMessage: '',
      lastRole: '',
    };

    await setDoc(sessionRef, sessionData);

    return { id: sessionId, ...sessionData };
  },

  /**
   * Get chat messages for a session
   */
  async getMessages(sessionId, limitCount = 50) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');
    if (!sessionId) throw new Error('Session ID required');

    const messagesRef = getMessagesRef(user.uid, sessionId);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(limitCount));
    const snapshot = await getDocs(q);

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    return messages;
  },

  /**
   * Subscribe to chat messages (real-time)
   */
  subscribeToMessages(sessionId, callback) {
    const user = auth.currentUser;
    if (!user) return () => {};
    if (!sessionId) return () => {};

    const messagesRef = getMessagesRef(user.uid, sessionId);
    // Limit messages to save reads
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    (async () => {
      try {
        const snapshot = await getDocs(q);
        const messages = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        callback(messages);
      } catch (error) {
        console.error('Messages fetch error:', error);
      }
    })();

    return () => {}; // No-op
  },

  /**
   * Send a message and get AI response
   */
  async sendMessage(content, sessionId = null, options = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    // Check availability
    const availability = this.isAvailable();
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Pre-check: is any model available?
    const availableModel = findAvailableModel();
    if (!availableModel) {
      const quotaInfo = getRateLimitSnapshot();
      return {
        success: false,
        error: `All models are currently rate-limited. Please try again in ${Math.ceil(quotaInfo.summary.nextAvailableIn / 1000)} seconds.`,
        isRateLimited: true,
        retryAfterMs: quotaInfo.summary.nextAvailableIn,
        quotaInfo,
      };
    }

    // Get or create session
    if (!sessionId) {
      const session = await this.getCurrentSession();
      sessionId = session.id;
    }

    // Add user message to Firestore (including file metadata if present)
    const userMessageData = {
      role: 'user',
      content: content.trim(),
      intent: detectIntent(content),
    };

    // Attach file metadata if files were provided
    if (options.files && options.files.length > 0) {
      userMessageData.files = options.files;
    }

    const userMessage = await this._addMessage(sessionId, userMessageData);
    await this._updateSession(sessionId, {
      lastMessage: buildSessionSnippet(content),
      lastRole: 'user',
    });

    // Load chatbot preferences (tone + output language)
    let chatSettings = null;
    try {
      chatSettings = await this.getSettings();
    } catch (error) {
      console.warn('Failed to load chatbot settings for sendMessage:', error);
    }

    const selectedToneStyle = options.toneStyle
      || chatSettings?.toneStyle
      || CHATBOT_CONFIG.ui.defaultToneStyle
      || 'friendly';
    const selectedResponseLanguage = options.responseLanguage
      || chatSettings?.responseLanguage
      || CHATBOT_CONFIG.ui.defaultOutputLanguage
      || 'auto';

    // Build context for AI
    const [systemContext, recentMessages] = await Promise.all([
      buildSystemContext(),
      this.getMessages(sessionId, CHATBOT_CONFIG.context.maxMessagesInContext),
    ]);

    // Prepare messages for Gemini. Ensure latest user prompt is present exactly once.
    const historyMessages = buildConversationHistory(recentMessages);
    const lastMessage = historyMessages[historyMessages.length - 1];
    if (lastMessage?.role !== 'user' || lastMessage?.content !== content) {
      historyMessages.push({ role: 'user', content });
    }

    const toneInstruction = this._buildToneInstruction(selectedToneStyle);
    const outputLanguageInstruction = this._buildOutputLanguageInstruction(selectedResponseLanguage);
    const additionalInstructions = [toneInstruction, outputLanguageInstruction]
      .filter(Boolean)
      .join('\n');
    const finalSystemContext = additionalInstructions
      ? `${systemContext}\n\n${additionalInstructions}`
      : systemContext;

    const messagesForGemini = [
      { role: 'system', content: finalSystemContext },
      ...historyMessages,
    ];

    // Send to Gemini API
    const geminiResult = await geminiClient.sendMessage(messagesForGemini);

    if (!geminiResult.success) {
      const isRateLimited = Boolean(geminiResult.isRateLimited);
      const quotaInfo = isRateLimited ? getRateLimitSnapshot() : null;
      const retryAfterMs = geminiResult.retryAfterMs || quotaInfo?.summary?.nextAvailableIn || 0;

      // Build an informative error for rate limits
      const errorContent = isRateLimited
        ? `Rate limit active. Please try again in ${Math.max(1, Math.ceil(retryAfterMs / 1000))} seconds.`
        : `Sorry, an error occurred: ${geminiResult.error}`;

      // Add error message
      await this._addMessage(sessionId, {
        role: 'assistant',
        content: errorContent,
        error: true,
        isRateLimited,
        retryAfterMs,
      });
      await this._updateSession(sessionId, {
        messageCount: (recentMessages.length + 2),
        lastMessage: buildSessionSnippet(errorContent),
        lastRole: 'assistant',
      });
      return {
        success: false,
        error: geminiResult.error,
        isRateLimited,
        retryAfterMs,
        quotaInfo,
        userMessage,
      };
    }

    // Check if the response contains an action JSON
    const actionResult = parseActionFromResponse(geminiResult.response);

    // Determine display content and action data
    const displayContent = actionResult.cleanResponse || geminiResult.response;
    const sanitizedDisplayContent = sanitizeAssistantOutput(displayContent);

    // Add AI response to Firestore
    const assistantMessageData = {
      role: 'assistant',
      content: sanitizedDisplayContent,
      intent: 'response',
      usage: geminiResult.usage,
      toneStyle: selectedToneStyle,
      responseLanguage: selectedResponseLanguage,
      modelUsed: geminiResult.modelUsed || null,
    };

    // If there's an action, save it in the message metadata
    if (actionResult.hasAction) {
      assistantMessageData.action = actionResult.action;
      assistantMessageData.actionStatus = 'pending';
    }

    const assistantMessage = await this._addMessage(sessionId, assistantMessageData);

    // Update session
    await this._updateSession(sessionId, {
      messageCount: (recentMessages.length + 2),
      lastMessage: buildSessionSnippet(sanitizedDisplayContent),
      lastRole: 'assistant',
    });

    return {
      success: true,
      userMessage,
      assistantMessage,
      usage: geminiResult.usage,
      modelUsed: geminiResult.modelUsed || null,
      // Return action data for UI to show confirmation
      action: actionResult.hasAction ? actionResult.action : null,
    };
  },

  /**
   * Send a message with file attachments
   * Uploads files to Firebase Storage and sends message with file metadata
   */
  async sendMessageWithFiles(content, files, sessionId = null, options = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    let uploadedFiles = [];

    // Upload files to Firebase Storage
    if (files && files.length > 0) {
      const chatFileId = `chat_${Date.now()}`;
      const uploadResult = await uploadTaskAttachments(chatFileId, files);
      uploadedFiles = uploadResult.uploaded;
    }

    // Build the content including file info for AI context
    let fullContent = content;
    if (uploadedFiles.length > 0) {
      const fileNames = uploadedFiles.map((f) => f.name).join(', ');
      fullContent += `\n\n[Attached file: ${fileNames}]`;
    }

    // Send message with file metadata
    return this.sendMessage(fullContent, sessionId, {
      ...options,
      files: uploadedFiles,
    });
  },

  /**
   * Execute a confirmed action and update the message status
   */
  async executeConfirmedAction(actionData, messageId, sessionId) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    try {
      // Update message status to executing
      const messagesRef = getMessagesRef(user.uid, sessionId);
      const messageRef = doc(messagesRef, messageId);
      await updateDoc(messageRef, { actionStatus: 'executing' });

      // Execute the action
      const result = await executeAction(actionData);

      // Update message with result
      await updateDoc(messageRef, {
        actionStatus: result.success ? 'success' : 'failed',
        actionResult: result.message || result.error || '',
      });

      // Add a system message with the result
      if (result.success) {
        await this._addMessage(sessionId, {
          role: 'assistant',
          content: result.message || 'Action executed successfully! âœ…',
          intent: 'action_result',
        });
      }

      return result;
    } catch (error) {
      console.error('[chatbot-service] Action execution error:', error);

      // Update message status to failed
      const messagesRef = getMessagesRef(user.uid, sessionId);
      const messageRef = doc(messagesRef, messageId);
      await updateDoc(messageRef, {
        actionStatus: 'failed',
        actionResult: error.message || 'Failed to execute action',
      });

      return { success: false, error: error.message };
    }
  },

  /**
   * Cancel a pending action
   */
  async cancelAction(messageId, sessionId) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const messagesRef = getMessagesRef(user.uid, sessionId);
    const messageRef = doc(messagesRef, messageId);
    await updateDoc(messageRef, {
      actionStatus: 'cancelled',
      actionResult: 'Action cancelled by user',
    });
  },

  /**
   * Add a message to the session
   */
  async _addMessage(sessionId, messageData) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const messageId = generateId('msg');
    const messagesRef = getMessagesRef(user.uid, sessionId);

    const message = {
      id: messageId,
      ...messageData,
      timestamp: serverTimestamp(),
    };

    await setDoc(doc(messagesRef, messageId), message);

    return message;
  },

  /**
   * Update session metadata
   */
  async _updateSession(sessionId, updates) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const sessionRef = doc(getChatSessionsRef(user.uid), sessionId);
    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    // Delete all messages first
    const messagesRef = getMessagesRef(user.uid, sessionId);
    const snapshot = await getDocs(messagesRef);
    const deletePromises = snapshot.docs.map((doc) =>
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);

    // Delete session
    const sessionRef = doc(getChatSessionsRef(user.uid), sessionId);
    await deleteDoc(sessionRef);
  },

  /**
   * Clear all chat history
   */
  async clearAllChats() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const sessionsRef = getChatSessionsRef(user.uid);
    const snapshot = await getDocs(sessionsRef);
    const deletePromises = snapshot.docs.map((sessionDoc) =>
      this.deleteSession(sessionDoc.id)
    );
    await Promise.all(deletePromises);
  },

  /**
   * Get all chat sessions
   */
  async getSessions() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');
    await this.cleanupExpiredSessions(CHAT_SESSION_RETENTION_DAYS);

    const sessionsRef = getChatSessionsRef(user.uid);
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    return sessions;
  },

  /**
   * Delete chat sessions older than retention window (default 7 days)
   */
  async cleanupExpiredSessions(retentionDays = CHAT_SESSION_RETENTION_DAYS) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const cutoffMs = Date.now() - (retentionDays * DAY_IN_MS);
    const sessionsRef = getChatSessionsRef(user.uid);
    const snapshot = await getDocs(sessionsRef);

    const expiredSessionIds = [];
    snapshot.forEach((sessionDoc) => {
      const data = sessionDoc.data();
      const sessionMs = toMillis(data?.updatedAt) || toMillis(data?.createdAt);
      if (sessionMs > 0 && sessionMs < cutoffMs) {
        expiredSessionIds.push(sessionDoc.id);
      }
    });

    if (expiredSessionIds.length === 0) {
      return { deletedCount: 0 };
    }

    await Promise.all(expiredSessionIds.map((id) => this.deleteSession(id)));
    return { deletedCount: expiredSessionIds.length };
  },

  /**
   * Provide feedback on a message
   */
  async provideFeedback(messageId, sessionId, helpful) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const messagesRef = getMessagesRef(user.uid, sessionId);
    const messageRef = doc(messagesRef, messageId);
    await updateDoc(messageRef, {
      helpful,
      feedbackAt: serverTimestamp(),
    });
  },

  /**
   * Save chatbot settings
   */
  async saveSettings(settings) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const settingsRef = getChatbotSettingsRef(user.uid);
    const settingsDoc = await getDoc(settingsRef);

    const settingsData = {
      apiConfigured: isApiKeyConfigured(),
      modelChain: CHATBOT_CONFIG.modelChain.map((m) => m.id),
      ...settings,
      updatedAt: serverTimestamp(),
    };

    if (!settingsDoc.exists()) {
      settingsData.createdAt = serverTimestamp();
      if (!settingsData.toneStyle) {
        settingsData.toneStyle = CHATBOT_CONFIG.ui.defaultToneStyle || 'friendly';
      }
      if (!settingsData.responseLanguage) {
        settingsData.responseLanguage = CHATBOT_CONFIG.ui.defaultOutputLanguage || 'auto';
      }
    }

    await setDoc(settingsRef, settingsData, { merge: true });
  },

  /**
   * Get chatbot settings
   */
  async getSettings() {
    const user = auth.currentUser;
    if (!user) return null;

    const settingsRef = getChatbotSettingsRef(user.uid);
    const snapshot = await getDoc(settingsRef);

    return snapshot.exists() ? snapshot.data() : null;
  },

  /**
   * Build optional tone instruction for system prompt
   */
  _buildToneInstruction(toneStyle = null) {
    switch (toneStyle) {
      case 'formal':
        return 'Use formal, structured, and professional language.';
      case 'coach':
        return 'Use the style of a learning coach: assertive, action-focused, and motivating.';
      case 'friendly':
        return 'Use friendly, warm, and easy-to-understand language.';
      default:
        return '';
    }
  },

  /**
   * Build optional output language instruction for system prompt
   */
  _buildOutputLanguageInstruction(responseLanguage = null) {
    switch (responseLanguage) {
      case 'en':
        return 'Respond only in English. Do not switch to Indonesian unless the user explicitly asks for Indonesian output.';
      case 'id':
        return 'Jawab hanya dalam Bahasa Indonesia. Jangan beralih ke bahasa Inggris kecuali user secara eksplisit meminta output bahasa Inggris.';
      case 'auto':
      default:
        return 'Respond in the same language as the user\'s latest message. Keep one primary language per response unless translation is requested.';
    }
  },

  /**
   * Get current rate limit info for all models
   * @returns {Array<{ id, label, rpm, rpd, cooldownRemaining, available }>}
   */
  getRateLimitInfo() {
    return getRateLimitSnapshot();
  },
};

/**
 * Quick reply actions
 */
export const quickReplyActions = {
  progress: 'How is my learning progress today?',
  tasks: 'What are the unfinished tasks?',
  addCalendar: 'Add calendar event: title, date (YYYY-MM-DD), time (optional), description (optional)',
  timer: 'Start a focus timer',
  motivation: 'Give me some studying motivation',
  schedule: 'What is today\'s class schedule?',
  recommendation: 'What should I study right now?',
};

export default chatbotService;

