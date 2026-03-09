import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Shield,
  X,
} from 'lucide-react';
import {
  getApiKey,
  isValidApiKeyFormat,
  removeApiKey,
  saveApiKey,
} from '../../utils/encryption';
import { useLang } from '../../contexts/LanguageContext';

/**
 * API Key Setup Component
 */
function ApiKeySetup({ onClose, onApiKeySaved }) {
  const { t } = useLang();
  const existingKey = getApiKey();
  const hasApiKey = existingKey !== null;

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleSave = () => {
    setError('');
    setSuccess(false);

    if (!apiKey.trim()) {
      setError(t('chatApiKeyErrorEmpty') || 'API key cannot be empty.');
      return;
    }

    if (!isValidApiKeyFormat(apiKey)) {
      setError(t('chatApiKeyErrorFormat') || 'Invalid API key format. Use a Gemini key starting with AIza.');
      return;
    }

    const saved = saveApiKey(apiKey.trim());
    if (!saved) {
      setError(t('chatApiKeyErrorSave') || 'Failed to save API key. Please try again.');
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onApiKeySaved?.();
      onClose?.();
    }, 1000);
  };

  const handleRemove = () => {
    removeApiKey();
    setApiKey('');
    setSuccess(false);
    setError('');
    onApiKeySaved?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-fade-in">
      <div className="sf-chatbot-panel sf-chatbot-shadow max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl">
        <div className="sf-chatbot-panel sticky top-0 z-10 flex items-center justify-between border-x-0 border-t-0 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="sf-chatbot-soft-panel flex h-10 w-10 items-center justify-center rounded-xl text-sky-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="sf-chatbot-heading text-sm font-semibold">
                {t('chatApiKeyTitle') || 'Gemini API Key Settings'}
              </h2>
              <p className="sf-chatbot-subtext text-xs">
                {t('chatApiKeySubtitle') || 'Enable StudyFlow Assistant features'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sf-chatbot-icon-btn rounded-lg p-2 transition-colors"
            title={t('close') || 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="sf-chatbot-soft-panel rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-sky-600" />
              <div className="sf-chatbot-subtext text-xs">
                <p className="sf-chatbot-heading font-semibold">{t('chatApiKeyWhyTitle') || 'Why do I need an API key?'}</p>
                <p className="mt-1">
                  {t('chatApiKeyWhyDesc') || 'StudyFlow uses Gemini Flash to generate AI responses. The key is stored locally in your browser.'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="sf-chatbot-panel sf-chatbot-heading flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:opacity-90"
          >
            <span>{t('chatApiKeyGuideTitle') || 'Guide to get an API key'}</span>
            <span className="sf-chatbot-subtext text-xs">
              {showGuide
                ? (t('chatApiKeyGuideHide') || 'Hide')
                : (t('chatApiKeyGuideShow') || 'Show')}
            </span>
          </button>

          {showGuide && (
            <div className="sf-chatbot-panel sf-chatbot-subtext animate-fade-in rounded-xl p-4 text-sm">
              <ol className="space-y-2">
                <li>
                  1. {t('chatApiKeyStepOpen') || 'Open AI Studio:'}{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                  >
                    aistudio.google.com/apikey
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>2. {t('chatApiKeyStepLogin') || 'Log in to your Google account.'}</li>
                <li>3. {t('chatApiKeyStepCreate') || 'Click Create API Key.'}</li>
                <li>4. {t('chatApiKeyStepPaste') || 'Copy the key and paste it in the form below.'}</li>
              </ol>
            </div>
          )}

          <div>
            <label className="sf-chatbot-subtext mb-2 block text-xs font-semibold uppercase tracking-wide">
              {t('chatApiKeyLabel') || 'Gemini API Key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={hasApiKey && !apiKey ? '******************************' : apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={t('chatApiKeyPlaceholder') || 'AIza...'}
                disabled={hasApiKey && !apiKey}
                className="sf-chatbot-input-shell sf-chatbot-input-text w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-80"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="sf-chatbot-icon-btn absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors"
                title={showKey ? (t('chatApiKeyHide') || 'Hide key') : (t('chatApiKeyShow') || 'Show key')}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-2 text-xs font-medium text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                {t('chatApiKeySaved') || 'API key saved successfully.'}
              </div>
            )}
            {hasApiKey && !apiKey && !error && (
              <p className="mt-2 text-xs text-emerald-600">
                {t('chatApiKeyAlreadySaved') || 'API key already saved.'}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {hasApiKey ? (
              <>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                >
                  {t('chatApiKeyRemove') || 'Remove key'}
                </button>
                <button
                  type="button"
                  onClick={() => setApiKey(existingKey || '')}
                  className="sf-chatbot-soft-panel sf-chatbot-heading flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:opacity-90"
                >
                  {t('chatApiKeyEdit') || 'Edit key'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="sf-chatbot-soft-panel sf-chatbot-heading flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:opacity-90"
                >
                  {t('chatApiKeyLater') || 'Later'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!apiKey.trim()}
                  className="sf-chatbot-send-btn flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {t('chatApiKeySave') || 'Save key'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiKeySetup;
