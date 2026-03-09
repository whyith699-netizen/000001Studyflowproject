import React from 'react';
import {
  AlertCircle,
  Ban,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';
import { useLang } from '../../contexts/LanguageContext';
import ActionConfirmation from './ActionConfirmation';

/**
 * Message Bubble Component
 * Renders chat messages with support for file attachments, action cards, and feedback.
 */
function MessageBubble({ message, onFeedback, showFeedback = false, onActionConfirm, onActionCancel }) {
  const { t, lang } = useLang();
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isTyping = message.role === 'typing';

  if (isSystem) return null;

  if (isTyping) {
    return (
      <div className="mb-4 flex items-start gap-3 animate-fade-in">
        <div className="sf-chatbot-avatar-assistant flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl">
          <Bot className="h-4 w-4" />
        </div>
        <div className="sf-chatbot-assistant-bubble rounded-2xl rounded-tl-md px-3 py-2 shadow-sm">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const locale = lang === 'en' ? 'en-US' : 'id-ID';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const displayContent = isAssistant
    ? String(message.content || '').replace(/\*/g, '')
    : message.content;

  const toneBadge = () => {
    if (!isAssistant || !message.toneStyle) return null;

    const labelMap = {
      friendly: t('toneFriendly') || 'Friendly',
      formal: t('toneFormal') || 'Formal',
      coach: t('toneCoach') || 'Coach',
    };

    const label = labelMap[message.toneStyle] || (t('toneStyleLabel') || 'Style');
    return (
      <span className="sf-chatbot-tone-badge ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
        {label}
      </span>
    );
  };

  const renderFiles = () => {
    const files = message.files;
    if (!files || !Array.isArray(files) || files.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {files.map((file, idx) => {
          const isImage = file.type?.startsWith('image/');

          if (isImage && file.url) {
            return (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
              className="sf-chatbot-panel group relative block overflow-hidden rounded-lg"
            >
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-20 w-20 object-cover transition-transform group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                  <ImageIcon className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </a>
            );
          }

          return (
            <a
              key={idx}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sf-chatbot-soft-panel flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors hover:opacity-90"
            >
              <FileText className="sf-chatbot-subtext h-3.5 w-3.5" />
              <span className="sf-chatbot-subtext max-w-[120px] truncate">{file.name}</span>
              <Download className="sf-chatbot-subtext h-3 w-3" />
            </a>
          );
        })}
      </div>
    );
  };

  const renderActionBadge = () => {
    if (!message.actionStatus || message.actionStatus === 'pending') return null;

    const badgeMap = {
      success: {
        text: message.actionResult || (t('chatActionSuccess') || 'Action executed successfully.'),
        color: 'text-emerald-600 dark:text-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      },
      failed: {
        text: message.actionResult || (t('chatActionFailed') || 'Action execution failed.'),
        color: 'text-red-600 dark:text-red-400',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
      },
      cancelled: {
        text: t('chatActionCancelled') || 'Action cancelled.',
        color: 'text-slate-500 dark:text-slate-400',
        icon: <Ban className="h-3.5 w-3.5" />,
      },
      executing: {
        text: t('chatActionExecuting') || 'Processing action...',
        color: 'text-sky-600 dark:text-sky-400',
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      },
    };

    const badge = badgeMap[message.actionStatus];
    if (!badge) return null;

    return (
      <div className={`mt-2 flex items-center gap-1.5 text-xs ${badge.color}`}>
        {badge.icon}
        <span>{badge.text}</span>
      </div>
    );
  };

  return (
    <div className={`mb-4 flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-sm ${
          isUser
            ? 'sf-chatbot-avatar-user'
            : 'sf-chatbot-avatar-assistant'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`min-w-0 ${isUser ? 'items-end' : 'items-start'} flex max-w-[82%] flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'sf-chatbot-user-bubble rounded-tr-md'
              : 'sf-chatbot-assistant-bubble rounded-tl-md'
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{displayContent}</div>

          {renderFiles()}

          <div
            className="sf-chatbot-muted-xs mt-2 flex items-center text-[11px]"
          >
            <span>{formatTime(message.timestamp)}</span>
            {toneBadge()}
          </div>

          {message.error && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {t('chatResponseError') || 'An error occurred while generating a response.'}
            </p>
          )}

          {message.usage && (
            <p className="sf-chatbot-muted-xs mt-1 text-[11px]">
              Tokens: {(message.usage.inputTokens || 0) + (message.usage.outputTokens || 0)}
            </p>
          )}

          {renderActionBadge()}
        </div>

        {isAssistant && message.action && (
          <ActionConfirmation
            action={message.action}
            status={message.actionStatus || 'pending'}
            resultMessage={message.actionResult || ''}
            onConfirm={(updatedAction) => onActionConfirm?.(message.id, updatedAction)}
            onCancel={() => onActionCancel?.(message.id)}
          />
        )}

        {showFeedback && isAssistant && !message.error && onFeedback && (
          <div className="mt-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => onFeedback(message.id, true)}
              className={`rounded-lg p-1.5 transition-colors ${
                message.helpful === true
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'sf-chatbot-icon-btn'
              }`}
              title={t('chatFeedbackUseful') || 'Helpful'}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onFeedback(message.id, false)}
              className={`rounded-lg p-1.5 transition-colors ${
                message.helpful === false
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                  : 'sf-chatbot-icon-btn'
              }`}
              title={t('chatFeedbackNotUseful') || 'Not helpful'}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
