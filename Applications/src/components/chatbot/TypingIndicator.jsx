import React from 'react';
import { Bot } from 'lucide-react';

/**
 * Typing Indicator Component
 * Shows animated dots while AI is generating response
 */
function TypingIndicator({ visible = true }) {
  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 animate-fade-in">
      <div className="sf-chatbot-avatar-assistant flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="sf-chatbot-assistant-bubble inline-block rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1">
            <span
              className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
