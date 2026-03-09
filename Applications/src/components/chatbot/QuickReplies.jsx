import React from 'react';
import { CHATBOT_CONFIG } from '../../config/chatbot-config';
import { useLang } from '../../contexts/LanguageContext';

/**
 * Quick Replies Component
 */
function QuickReplies({ onSelect, disabled = false }) {
  const { t } = useLang();
  const quickReplies = CHATBOT_CONFIG.quickReplies;

  if (!quickReplies || quickReplies.length === 0) {
    return null;
  }

  return (
    <div className="sf-chatbot-panel border-x-0 border-b-0 px-3 py-2">
      <p className="sf-chatbot-subtext mb-2 text-[11px] font-medium uppercase tracking-wide">
        {t('chatQuickRepliesTitle') || 'Saran cepat'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {quickReplies.map((reply, index) => {
          const label = reply.labelKey ? t(reply.labelKey) : reply.label;
          const value = reply.valueKey ? t(reply.valueKey) : reply.value;

          return (
          <button
            key={`${reply.id || reply.value || index}-${index}`}
            type="button"
            onClick={() => onSelect(value)}
            disabled={disabled}
            className="sf-chatbot-quick-chip whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickReplies;
