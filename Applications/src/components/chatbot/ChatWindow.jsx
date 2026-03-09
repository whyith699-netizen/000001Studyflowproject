import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  History,
  Loader2,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  Minimize2,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase-config';
import { chatbotService } from '../../services/chatbot-service';
import { getApiKeyStatus } from '../../utils/encryption';
import { useLang } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import QuickReplies from './QuickReplies';
import ApiKeySetup from './ApiKeySetup';
import { CHATBOT_CONFIG } from '../../config/chatbot-config';

const CHAT_SESSION_RETENTION_DAYS = 7;

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const truncateText = (value, maxLength = 72) => {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(1, maxLength - 3))}...`;
};

/**
 * Chat Window Component
 */
function ChatWindow({ onClose, onToggleSize, isExpanded = false }) {
  const [user] = useAuthState(auth);
  const { t } = useLang();
  const { confirm } = useConfirm();
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [chatError, setChatError] = useState('');
  const [rateLimitUntil, setRateLimitUntil] = useState(0);
  const [rateLimitCountdownSec, setRateLimitCountdownSec] = useState(0);
  const [toneStyle, setToneStyle] = useState(CHATBOT_CONFIG.ui.defaultToneStyle || 'friendly');
  const [responseLanguage, setResponseLanguage] = useState(CHATBOT_CONFIG.ui.defaultOutputLanguage || 'auto');
  const [showRecentChats, setShowRecentChats] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isLoadingRecentChats, setIsLoadingRecentChats] = useState(false);
  const [recentChatError, setRecentChatError] = useState('');
  const messagesEndRef = useRef(null);

  const buildRateLimitMessage = useCallback((retryAfterMs) => {
    const seconds = Math.max(1, Math.ceil((Number(retryAfterMs) || 0) / 1000));
    return `Too many requests. Please try again in ${seconds} seconds.`;
  }, []);

  const formatSessionTime = useCallback((value) => {
    const ts = toMillis(value);
    if (!ts) return '';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ts);
  }, []);

  const getSessionPreview = useCallback((session) => {
    const prefix = session?.lastRole === 'user'
      ? `${t('you') || 'You'}: `
      : 'AI: ';
    const content = truncateText(session?.lastMessage || '');

    if (!content) {
      return t('recentChatNoMessage') || 'No messages yet';
    }

    return `${prefix}${content}`;
  }, [t]);

  const initializeChat = useCallback(async () => {
    try {
      setChatError('');
      const session = await chatbotService.getCurrentSession();
      setSessionId(session.id);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setChatError(t('initChatError') || 'Failed to prepare chat session.');
    }
  }, [t]);

  const loadRecentSessions = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingRecentChats(true);
      setRecentChatError('');
      const sessions = await chatbotService.getSessions();
      setRecentSessions(Array.isArray(sessions) ? sessions : []);
    } catch (error) {
      console.error('Failed to load recent chats:', error);
      setRecentChatError(t('recentChatsLoadError') || 'Failed to load recent chats.');
    } finally {
      setIsLoadingRecentChats(false);
    }
  }, [t, user]);

  useEffect(() => {
    const status = getApiKeyStatus();
    setApiKeyConfigured(status.configured);

    if (!status.configured) {
      setShowApiKeySetup(true);
    }
  }, []);

  useEffect(() => {
    if (user && apiKeyConfigured && !sessionId) {
      initializeChat();
    }
  }, [user, apiKeyConfigured, sessionId, initializeChat]);

  useEffect(() => {
    const allowedOutputLanguages = (CHATBOT_CONFIG.ui.outputLanguages || []).map((option) => option.value);

    const loadChatPreferences = async () => {
      try {
        const settings = await chatbotService.getSettings();
        const savedTone = settings?.toneStyle;
        const savedOutputLanguage = settings?.responseLanguage;
        if (savedTone) {
          setToneStyle(savedTone);
        }
        if (savedOutputLanguage && allowedOutputLanguages.includes(savedOutputLanguage)) {
          setResponseLanguage(savedOutputLanguage);
        }
      } catch (error) {
        console.error('Failed to load chatbot settings:', error);
      }
    };

    if (user && apiKeyConfigured) {
      loadChatPreferences();
    }

    const handleToneChange = (event) => {
      const newTone = event.detail;
      setToneStyle(newTone);
    };
    const handleOutputLanguageChange = (event) => {
      const newOutputLanguage = event.detail;
      if (newOutputLanguage && allowedOutputLanguages.includes(newOutputLanguage)) {
        setResponseLanguage(newOutputLanguage);
      }
    };

    window.addEventListener('chatbotToneChange', handleToneChange);
    window.addEventListener('chatbotOutputLanguageChange', handleOutputLanguageChange);
    return () => {
      window.removeEventListener('chatbotToneChange', handleToneChange);
      window.removeEventListener('chatbotOutputLanguageChange', handleOutputLanguageChange);
    };
  }, [user, apiKeyConfigured]);

  useEffect(() => {
    if (!sessionId) return undefined;

    const unsubscribe = chatbotService.subscribeToMessages(sessionId, (nextMessages) => {
      setMessages(nextMessages);
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowQuickReplies(false);
    } else {
      setShowQuickReplies(true);
    }
  }, [messages.length]);

  useEffect(() => {
    if (!rateLimitUntil) {
      setRateLimitCountdownSec(0);
      return undefined;
    }

    const tick = () => {
      const msLeft = rateLimitUntil - Date.now();
      if (msLeft <= 0) {
        setRateLimitUntil(0);
        setRateLimitCountdownSec(0);
        setChatError('');
        return false;
      }

      setRateLimitCountdownSec(Math.ceil(msLeft / 1000));
      return true;
    };

    tick();
    const intervalId = window.setInterval(() => {
      if (!tick()) {
        window.clearInterval(intervalId);
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [rateLimitUntil]);

  const handleSend = async (content, files = null) => {
    const isRateLimited = rateLimitUntil > Date.now();
    if ((!content.trim() && (!files || files.length === 0)) || isLoading) return;
    if (isRateLimited) {
      setChatError(buildRateLimitMessage(rateLimitCountdownSec * 1000));
      return;
    }
    if (!sessionId) {
      setChatError(t('sessionNotReady') || 'Chat session not ready. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    setIsTyping(true);
    setShowQuickReplies(false);
    setChatError('');

    try {
      let result;
      if (files && files.length > 0) {
        result = await chatbotService.sendMessageWithFiles(content, files, sessionId, { toneStyle, responseLanguage });
      } else {
        result = await chatbotService.sendMessage(content, sessionId, { toneStyle, responseLanguage });
      }

      if (!result.success) {
        console.error('Failed to send message:', result.error);
        if (result.isRateLimited) {
          const retryAfterMs = Math.max(1000, Number(result.retryAfterMs) || 0);
          setRateLimitUntil(Date.now() + retryAfterMs);
          setChatError(buildRateLimitMessage(retryAfterMs));
        } else {
          setRateLimitUntil(0);
          setRateLimitCountdownSec(0);
          setChatError(result.error || t('sendMessageError') || 'Failed to send message to AI.');
        }
      } else {
        setRateLimitUntil(0);
        setRateLimitCountdownSec(0);
        setChatError('');
        if (showRecentChats) {
          await loadRecentSessions();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const rawError = String(error?.message || '');
      const normalizedError = rawError.toLowerCase();
      if (normalizedError.includes('rate limit')) {
        const fallbackMs = Math.max(1000, rateLimitCountdownSec * 1000);
        setRateLimitUntil(Date.now() + fallbackMs);
        setChatError(buildRateLimitMessage(fallbackMs));
      } else {
        setChatError(error.message || t('sendMessageError') || 'An error occurred while sending the message.');
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleQuickReply = (value) => {
    handleSend(value);
  };

  const handleFeedback = async (messageId, helpful) => {
    try {
      await chatbotService.provideFeedback(messageId, sessionId, helpful);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleActionConfirm = async (messageId, actionData) => {
    try {
      await chatbotService.executeConfirmedAction(actionData, messageId, sessionId);
    } catch (error) {
      console.error('Failed to execute action:', error);
      setChatError('Failed to execute action: ' + (error.message || 'Unknown error'));
    }
  };

  const handleActionCancel = async (messageId) => {
    try {
      await chatbotService.cancelAction(messageId, sessionId);
    } catch (error) {
      console.error('Failed to cancel action:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const newSession = await chatbotService.createSession();
      setSessionId(newSession.id);
      setMessages([]);
      setShowQuickReplies(true);
      setChatError('');
      if (showRecentChats) {
        await loadRecentSessions();
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      setChatError(t('newChatError') || 'Failed to create new chat session.');
    }
  };

  const handleClearChat = async () => {
    const accepted = await confirm({
      title: t('clearHistory') || 'Clear history',
      message: t('clearChatConfirm') || 'Delete all chat history?',
      confirmText: t('delete') || 'Delete',
      cancelText: t('cancel') || 'Cancel',
      variant: 'danger',
    });
    if (!accepted) {
      return;
    }

    try {
      await chatbotService.clearAllChats();
      const newSession = await chatbotService.createSession();
      setSessionId(newSession.id);
      setMessages([]);
      setShowQuickReplies(true);
      setChatError('');
      if (showRecentChats) {
        await loadRecentSessions();
      }
    } catch (error) {
      console.error('Failed to clear chat:', error);
      setChatError(t('clearChatError') || 'Failed to clear chat history.');
    }
  };

  const handleOpenRecentChats = async () => {
    setShowRecentChats(true);
    await loadRecentSessions();
  };

  const handleSelectRecentChat = (targetSessionId) => {
    if (!targetSessionId) return;
    setShowRecentChats(false);

    if (targetSessionId === sessionId) {
      return;
    }

    setMessages([]);
    setChatError('');
    setSessionId(targetSessionId);
  };

  const handleDeleteRecentChat = async (targetSessionId) => {
    const accepted = await confirm({
      title: t('recentChatDeleteTitle') || 'Delete chat',
      message: t('recentChatDeleteConfirm') || 'Delete this chat session?',
      confirmText: t('delete') || 'Delete',
      cancelText: t('cancel') || 'Cancel',
      variant: 'danger',
    });

    if (!accepted) {
      return;
    }

    try {
      await chatbotService.deleteSession(targetSessionId);

      if (targetSessionId === sessionId) {
        const fallbackSession = await chatbotService.getCurrentSession();
        setMessages([]);
        setSessionId(fallbackSession.id);
      }

      await loadRecentSessions();
    } catch (error) {
      console.error('Failed to delete recent chat:', error);
      setRecentChatError(t('recentChatDeleteError') || 'Failed to delete chat session.');
    }
  };

  const handleApiKeySaved = () => {
    setApiKeyConfigured(true);
    setShowApiKeySetup(false);
    initializeChat();
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('pleaseLogin') || 'Please log in to use the chatbot.'}
        </p>
      </div>
    );
  }

  const toolbarButtonClass = 'sf-chatbot-toolbar-btn rounded-lg p-1.5';
  const isRateLimited = rateLimitUntil > Date.now();
  const inputDisabled = !apiKeyConfigured || isRateLimited;
  const effectiveError = isRateLimited
    ? buildRateLimitMessage(rateLimitCountdownSec * 1000)
    : chatError;

  return (
    <div className="sf-chatbot-shell relative flex h-full flex-col">
      <div className="sf-chatbot-panel border-x-0 border-t-0 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="sf-chatbot-soft-panel flex h-8 w-8 items-center justify-center rounded-lg">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8.5 9H15.5M8.5 13H13M6.2 18L4 20V7.6C4 6.71634 4.71634 6 5.6 6H18.4C19.2837 6 20 6.71635 20 7.6V16.4C20 17.2837 19.2837 18 18.4 18H6.2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="sf-chatbot-heading text-sm font-semibold">
              {t('chatTitle') || 'StudyFlow Assistant'}
            </h3>
          </div>

          <div className="sf-chatbot-soft-panel flex items-center gap-1 rounded-xl p-1">
            <button
              type="button"
              onClick={handleNewChat}
              className={toolbarButtonClass}
              title={t('newChat') || 'New chat'}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenRecentChats}
              className={toolbarButtonClass}
              title={t('recentChats') || 'Recent chats'}
            >
              <History className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClearChat}
              className={toolbarButtonClass}
              title={t('clearHistory') || 'Clear history'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowApiKeySetup(true)}
              className={toolbarButtonClass}
              title={t('settings') || 'Settings'}
            >
              <Settings className="h-4 w-4" />
            </button>
            {onToggleSize && (
              <button
                type="button"
                onClick={onToggleSize}
                className={`hidden md:block ${toolbarButtonClass}`}
                title={isExpanded ? t('collapseChat') || 'Collapse chat' : t('expandChat') || 'Expand chat'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={toolbarButtonClass}
              title={t('close') || 'Close'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {effectiveError && (
        <div className="sf-chatbot-error mx-4 mt-3 rounded-xl px-3 py-2 text-xs">
          {effectiveError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="sf-chatbot-avatar-assistant mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h4 className="sf-chatbot-heading text-base font-semibold">
              {t('startChatMsg') || 'Start a conversation'}
            </h4>
            <p className="sf-chatbot-subtext mt-1 max-w-xs text-sm">
              {t('startChatDesc') || 'Ask about your schedule, tasks, or study goals.'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onFeedback={handleFeedback}
                showFeedback={true}
                onActionConfirm={handleActionConfirm}
                onActionCancel={handleActionCancel}
              />
            ))}
            {isTyping && <MessageBubble message={{ role: 'typing' }} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showQuickReplies && CHATBOT_CONFIG.ui.showQuickReplies && (
        <QuickReplies onSelect={handleQuickReply} disabled={isLoading || inputDisabled} />
      )}

      <ChatInput
        onSend={handleSend}
        disabled={inputDisabled}
        isLoading={isLoading}
        placeholder={inputDisabled
          ? (isRateLimited ? buildRateLimitMessage(rateLimitCountdownSec * 1000) : (t('apiKeyRequired') || 'API key required'))
          : (t('chatPlaceholder') || 'Type a message...')}
      />

      {showApiKeySetup && (
        <ApiKeySetup
          onClose={() => setShowApiKeySetup(false)}
          onApiKeySaved={handleApiKeySaved}
        />
      )}

      {showRecentChats && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-fade-in">
          <div className="sf-chatbot-panel sf-chatbot-shadow max-h-[88vh] w-full max-w-xl overflow-hidden rounded-3xl">
            <div className="sf-chatbot-panel sticky top-0 z-10 flex items-center justify-between border-x-0 border-t-0 px-5 py-4 backdrop-blur-sm">
              <div>
                <h2 className="sf-chatbot-heading text-sm font-semibold">
                  {t('recentChats') || 'Recent chats'}
                </h2>
                <p className="sf-chatbot-subtext mt-0.5 text-xs">
                  {t('recentChatsDesc') || 'Chats are automatically deleted after 7 days.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentChats(false)}
                className="sf-chatbot-icon-btn rounded-lg p-2 transition-colors"
                title={t('close') || 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {recentChatError && (
                <div className="sf-chatbot-error rounded-xl px-3 py-2 text-xs">
                  {recentChatError}
                </div>
              )}

              {isLoadingRecentChats ? (
                <div className="sf-chatbot-subtext flex items-center justify-center gap-2 rounded-xl py-8 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('recentChatsLoading') || 'Loading...'}
                </div>
              ) : (
                <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                  {recentSessions.length === 0 ? (
                    <div className="sf-chatbot-subtext rounded-xl py-8 text-center text-sm">
                      {t('recentChatsEmpty') || 'No recent chats yet.'}
                    </div>
                  ) : (
                    recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`sf-chatbot-soft-panel flex items-center gap-2 rounded-xl p-2 ${
                          session.id === sessionId ? 'ring-1 ring-sky-500/50' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectRecentChat(session.id)}
                          className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-500/5"
                        >
                          <p className="sf-chatbot-heading truncate text-sm font-medium">
                            {getSessionPreview(session)}
                          </p>
                          <p className="sf-chatbot-subtext mt-0.5 text-xs">
                            {formatSessionTime(session.updatedAt || session.createdAt)}
                          </p>
                        </button>

                        {session.id === sessionId && (
                          <span className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-500">
                            {t('active') || 'Active'}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteRecentChat(session.id);
                          }}
                          className="sf-chatbot-icon-btn rounded-lg p-2 transition-colors hover:text-rose-500"
                          title={t('delete') || 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="sf-chatbot-panel border-x-0 border-b-0 px-5 py-3">
              <p className="sf-chatbot-subtext text-[11px]">
                {t('recentChatsRetentionNote') || `Chat older than ${CHAT_SESSION_RETENTION_DAYS} days is removed automatically.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;

