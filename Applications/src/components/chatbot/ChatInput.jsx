import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Paperclip, Send, X } from 'lucide-react';
import useVoiceInput from '../../hooks/useVoiceInput';
import { CHATBOT_CONFIG } from '../../config/chatbot-config';
import { useLang } from '../../contexts/LanguageContext';

/**
 * Chat Input Component
 * Enhanced with voice input and file attachment support.
 */
function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Tulis pesan...',
}) {
  const { t } = useLang();
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const voiceConfig = CHATBOT_CONFIG.voice || {};
  const attachConfig = CHATBOT_CONFIG.attachments || {};

  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    language: voiceConfig.language || 'id-ID',
    silenceTimeout: voiceConfig.silenceTimeout || 5000,
  });

  useEffect(() => {
    if (transcript) {
      // Transcript arrives from Web Speech API callback and is merged into draft input.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage((prev) => {
        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + transcript;
      });
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [message]);

  const submitMessage = () => {
    const content = message.trim();
    if ((!content && attachedFiles.length === 0) || disabled || isLoading) return;

    onSend(content, attachedFiles.length > 0 ? attachedFiles : null);
    setMessage('');
    setAttachedFiles([]);
    if (isListening) stopListening();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    const maxFiles = attachConfig.maxFiles || 3;
    const maxSizeBytes = (attachConfig.maxSizeMB || 5) * 1024 * 1024;

    const validFiles = files
      .filter((f) => f.size <= maxSizeBytes)
      .slice(0, maxFiles - attachedFiles.length);

    setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, maxFiles));

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isFileAttachmentEnabled = attachConfig.enabled !== false;
  const isVoiceEnabled = voiceConfig.enabled !== false && voiceSupported;

  return (
    <form
      onSubmit={handleSubmit}
      className="sf-chatbot-surface sf-chatbot-border border-t px-3 pb-3 pt-2 backdrop-blur-sm"
    >
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="sf-chatbot-soft-panel group relative flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
            >
              {file.type?.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="sf-chatbot-subtext max-w-[100px] truncate">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="sf-chatbot-icon-btn ml-0.5 rounded-full p-0.5 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {voiceError && (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-300">
          {voiceError}
        </div>
      )}

      <div className="sf-chatbot-input-shell rounded-2xl p-2 shadow-sm">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Sedang mendengarkan...' : placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className="sf-chatbot-input-text max-h-[140px] min-h-[44px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-1 flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            {isFileAttachmentEnabled && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={attachConfig.allowedTypes?.join(',') || '*'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isLoading || attachedFiles.length >= (attachConfig.maxFiles || 3)}
                  className="sf-chatbot-icon-btn inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  title="Lampirkan file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </>
            )}

            {isVoiceEnabled && (
              <button
                type="button"
                onClick={toggleVoice}
                disabled={disabled || isLoading}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-50 text-red-600'
                    : 'sf-chatbot-icon-btn'
                } disabled:cursor-not-allowed disabled:opacity-40`}
                title={isListening ? 'Berhenti merekam suara' : 'Masukkan suara'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            <p className="sf-chatbot-subtext text-[11px]">
              {isListening
                ? (t('chatInputRecording') || 'Perekaman aktif...')
                : (t('chatInputHint') || 'Enter kirim, Shift+Enter baris baru')}
            </p>
          </div>

          <button
            type="submit"
            disabled={(!message.trim() && attachedFiles.length === 0) || disabled || isLoading}
            className="sf-chatbot-send-btn inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-all disabled:cursor-not-allowed disabled:bg-slate-400"
            aria-label="Kirim pesan"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </form>
  );
}

export default ChatInput;



