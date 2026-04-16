import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase-config';
import { userService, deleteUserData } from '../services/firestore-service';
import { signOut, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { getApiKeyStatus } from '../utils/encryption';
import { chatbotService } from '../services/chatbot-service';
import { CHATBOT_CONFIG } from '../config/chatbot-config';
import Sidebar from './Sidebar';
import ApiKeySetup from './chatbot/ApiKeySetup';
import Select from './Select';

const clampMinutes = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const SettingsPage = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { confirm } = useConfirm();
  const [settings, setSettings] = useState({
    displayName: user?.displayName || '',
    pomodoroMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    autoStartBreaks: false,
    soundEnabled: true,
    breakTypePreference: 'shortBreak'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [toneStyle, setToneStyle] = useState(CHATBOT_CONFIG.ui.defaultToneStyle || 'friendly');
  const [isToneSaving, setIsToneSaving] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState(CHATBOT_CONFIG.ui.defaultOutputLanguage || 'auto');
  const [isOutputLanguageSaving, setIsOutputLanguageSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const isErrorMessage = /error|gagal/i.test(message);

  const toneOptions = useMemo(() => {
    const options = CHATBOT_CONFIG.ui.toneStyles || [];
    return options.length > 0
      ? options.map((opt) => ({ ...opt, label: t(`tone${opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}`) }))
      : [
          { value: 'friendly', label: t('toneFriendly') },
          { value: 'formal', label: t('toneFormal') },
          { value: 'coach', label: t('toneCoach') },
        ];
  }, [t]);

  const outputLanguageOptions = useMemo(() => {
    const options = CHATBOT_CONFIG.ui.outputLanguages || [];
    return options.length > 0
      ? options.map((opt) => ({
          ...opt,
          label: opt.value === 'en'
            ? t('outputLanguageEnglish')
            : opt.value === 'id'
              ? t('outputLanguageIndonesian')
              : t('outputLanguageAuto'),
        }))
      : [
          { value: 'auto', label: t('outputLanguageAuto') },
          { value: 'en', label: t('outputLanguageEnglish') },
          { value: 'id', label: t('outputLanguageIndonesian') },
        ];
  }, [t]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile) {
          const profileSettings = profile.settings || {};
          setSettings(prev => ({
            ...prev,
            displayName: profile.displayName || prev.displayName,
            pomodoroMinutes: clampMinutes(profileSettings.pomodoroMinutes, 1, 120, prev.pomodoroMinutes),
            shortBreakMinutes: clampMinutes(profileSettings.shortBreakMinutes, 1, 30, prev.shortBreakMinutes),
            longBreakMinutes: clampMinutes(profileSettings.longBreakMinutes, 1, 60, prev.longBreakMinutes),
            autoStartBreaks: Boolean(profileSettings.autoStartBreaks),
            soundEnabled: profileSettings.soundEnabled !== false,
            breakTypePreference: profileSettings.breakTypePreference || 'shortBreak'
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();

    // Load API key status
    const apiStatus = getApiKeyStatus();
    setApiKeyConfigured(apiStatus.configured);

    // Load chatbot preferences
    const loadChatbotPreferences = async () => {
      try {
        const chatSettings = await chatbotService.getSettings();
        const savedTone = chatSettings?.toneStyle;
        const savedOutputLanguage = chatSettings?.responseLanguage;
        if (savedTone && toneOptions.some((option) => option.value === savedTone)) {
          setToneStyle(savedTone);
        }
        if (savedOutputLanguage && outputLanguageOptions.some((option) => option.value === savedOutputLanguage)) {
          setResponseLanguage(savedOutputLanguage);
        }
      } catch (error) {
        console.error('Failed to load chatbot settings:', error);
      }
    };
    loadChatbotPreferences();
  }, [toneOptions, outputLanguageOptions]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const fallbackDisplayName = user?.displayName || user?.email?.split('@')[0] || 'StudyFlow User';
      const normalizedDisplayName = settings.displayName.trim() || fallbackDisplayName;

      if (normalizedDisplayName !== user?.displayName) {
        await updateProfile(auth.currentUser, { displayName: normalizedDisplayName });
      }

      const normalizedTimerSettings = {
        pomodoroMinutes: settings.pomodoroMinutes === '' ? 1 : clampMinutes(settings.pomodoroMinutes, 1, 120, 25),
        shortBreakMinutes: settings.shortBreakMinutes === '' ? 1 : clampMinutes(settings.shortBreakMinutes, 1, 30, 5),
        longBreakMinutes: settings.longBreakMinutes === '' ? 1 : clampMinutes(settings.longBreakMinutes, 1, 60, 15),
        autoStartBreaks: Boolean(settings.autoStartBreaks),
        soundEnabled: settings.soundEnabled !== false,
        breakTypePreference: settings.breakTypePreference === 'longBreak' ? 'longBreak' : 'shortBreak'
      };

      await userService.updateProfile({
        email: user?.email || '',
        displayName: normalizedDisplayName,
        photoURL: user?.photoURL || null,
        settings: normalizedTimerSettings
      });

      setSettings(prev => ({ ...prev, ...normalizedTimerSettings, displayName: normalizedDisplayName }));
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    const firstAccepted = await confirm({
      title: t('deleteAccountStepOneTitle'),
      message: t('deleteAccountStepOneMessage'),
      confirmText: t('continueAction'),
      cancelText: t('cancel'),
      variant: 'danger',
    });
    if (!firstAccepted) return;

    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    const currentDisplayName = user?.displayName || settings.displayName || '';
    
    if (deleteConfirmName !== currentDisplayName) {
      setMessage('Display name tidak cocok. Silakan ketik dengan benar.');
      return;
    }

    setIsDeleting(true);
    
    try {
      // Delete all user data from Firestore first
      await deleteUserData();
      // Then delete the auth account
      await auth.currentUser.delete();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage('Please sign in again before deleting your account.');
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmName('');
    }
  };

  const cancelDeleteAccount = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName('');
    setIsDeleting(false);
  };

  const handleApiKeySaved = () => {
    const apiStatus = getApiKeyStatus();
    setApiKeyConfigured(apiStatus.configured);
    setShowApiKeyModal(false);
  };

  const handleToneChange = async (newTone) => {
    setToneStyle(newTone);
    setIsToneSaving(true);

    try {
      await chatbotService.saveSettings({ toneStyle: newTone });
      // Dispatch event to notify ChatWindow
      window.dispatchEvent(new CustomEvent('chatbotToneChange', { detail: newTone }));
    } catch (error) {
      console.error('Failed to save tone setting:', error);
      setMessage(t('saveToneError'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsToneSaving(false);
    }
  };

  const handleOutputLanguageChange = async (newOutputLanguage) => {
    setResponseLanguage(newOutputLanguage);
    setIsOutputLanguageSaving(true);

    try {
      await chatbotService.saveSettings({ responseLanguage: newOutputLanguage });
      window.dispatchEvent(new CustomEvent('chatbotOutputLanguageChange', { detail: newOutputLanguage }));
    } catch (error) {
      console.error('Failed to save output language setting:', error);
      setMessage(t('saveOutputLanguageError'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsOutputLanguageSaving(false);
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />
      
      <main
        className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3">
          {/* Header */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Customize your Study Flow experience</p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`p-4 rounded-xl ${
              isErrorMessage
                ? 'bg-red-50 text-red-600 border border-red-100' 
                : 'bg-green-50 text-green-600 border border-green-100'
            }`}>
              <div className="flex items-center gap-2">
                <i className={`fas ${isErrorMessage ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                {message}
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <i className="fas fa-user text-blue-600"></i>
              <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('profileInfo')}</h2>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div>
                <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.displayName || 'User'}</p>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('displayName')}</label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-blue-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:bg-slate-700' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
              />
            </div>
          </div>

          {/* Timer Settings */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <i className="fas fa-stopwatch text-blue-500"></i>
              <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('timerSettings')}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('pomodoro')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.pomodoroMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setSettings({ ...settings, pomodoroMinutes: val === '' ? '' : parseInt(val, 10) });
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-blue-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:bg-slate-700' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>min</span>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('shortBreakDuration')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.shortBreakMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setSettings({ ...settings, shortBreakMinutes: val === '' ? '' : parseInt(val, 10) });
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-blue-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:bg-slate-700' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>min</span>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('longBreakDuration')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.longBreakMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setSettings({ ...settings, longBreakMinutes: val === '' ? '' : parseInt(val, 10) });
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-blue-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:bg-slate-700' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>min</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className={`flex items-center justify-between cursor-pointer p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Auto-start breaks</span>
                <div
                  onClick={() => setSettings({ ...settings, autoStartBreaks: !settings.autoStartBreaks })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    settings.autoStartBreaks ? 'bg-blue-600' : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoStartBreaks ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
              <label className={`flex items-center justify-between cursor-pointer p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div>
                  <span className={`block text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{t('timerSoundAlerts')}</span>
                  <span className={`block mt-0.5 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('timerSoundAlertsDesc')}</span>
                </div>
                <div
                  onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    settings.soundEnabled ? 'bg-blue-600' : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('breakTypePreference')}</label>
                <Select
                  value={settings.breakTypePreference}
                  onChange={(value) => setSettings({ ...settings, breakTypePreference: value })}
                  options={[
                    { value: 'shortBreak', label: t('shortBreakOption') },
                    { value: 'longBreak', label: t('longBreakOption') },
                  ]}
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('breakTypePreferenceDesc')}</p>
              </div>
            </div>
          </div>

          {/* Chatbot Settings */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <i className="fas fa-robot text-blue-500"></i>
              <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('chatbotSettings')}</h2>
            </div>

            {/* API Key Status */}
            <div className={`mb-3 p-3 rounded-lg flex items-center justify-between ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('apiKeyStatus')}</p>
                <p className={`text-xs ${apiKeyConfigured ? 'text-green-600' : 'text-orange-600'}`}>
                  {apiKeyConfigured ? t('configured') : t('notConfigured')}
                </p>
              </div>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                {t('setupApiKey')}
              </button>
            </div>

            {/* Response Style (Tone) */}
            <div className={`mb-3 p-3 rounded-lg flex items-center justify-between ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div>
                <p className={`text-[11px] font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('toneStyleLabel')}</p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('toneStyleDesc')}</p>
              </div>
              <div className="flex items-center gap-2">
                {isToneSaving && <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600"></div>}
                <Select
                  value={toneStyle}
                  onChange={handleToneChange}
                  options={toneOptions}
                  size="sm"
                  className="min-w-[120px]"
                />
              </div>
            </div>

            {/* Output Language */}
            <div className={`mb-3 p-3 rounded-lg flex items-center justify-between ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div>
                <p className={`text-[11px] font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('outputLanguageLabel')}</p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('outputLanguageDesc')}</p>
              </div>
              <div className="flex items-center gap-2">
                {isOutputLanguageSaving && <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600"></div>}
                <Select
                  value={responseLanguage}
                  onChange={handleOutputLanguageChange}
                  options={outputLanguageOptions}
                  size="sm"
                  className="min-w-[140px]"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                {t('saveSettings')}
              </>
            )}
          </button>

          {/* Danger Zone */}
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card border-red-900/50' : 'bg-white border-red-100'}`}>
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-red-900/50' : 'border-red-100'}`}>
              <i className="fas fa-exclamation-triangle text-red-500"></i>
              <h2 className="text-sm font-semibold text-red-600">{t('dangerZone')}</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className={`flex-1 px-4 py-2.5 border rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <i className="fas fa-sign-out-alt"></i>
                {t('signOutAccount')}
              </button>
              <button
                onClick={handleDeleteAccount}
                className={`flex-1 px-4 py-2.5 border border-red-200 rounded-lg font-medium text-red-600 transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}
              >
                <i className="fas fa-trash-alt"></i>
                {t('deleteAllData')}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* API Key Setup Modal */}
      {showApiKeyModal && (
        <ApiKeySetup
          onClose={() => setShowApiKeyModal(false)}
          onApiKeySaved={handleApiKeySaved}
        />
      )}

      {/* Delete Account Verification Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md shadow-xl ${isDarkMode ? 'sf-dark-card' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('deleteAccountVerificationTitle')}</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('deleteAccountVerificationSubtitle')}</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl mb-4 ${isDarkMode ? 'bg-red-900/20 border border-red-900/50' : 'bg-red-50 border border-red-100'}`}>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                ⚠️ {t('deleteAccountStepTwoMessage')}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {t('deleteAccountWarning')}
              </p>
            </div>

            <div className="mb-4">
              <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('deleteAccountConfirmLabel')}
              </label>
              <div className={`p-3 rounded-lg mb-2 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mb-1`}>{t('deleteAccountYourDisplayName')}:</p>
                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.displayName || settings.displayName || 'User'}
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmName.trim()) {
                    confirmDeleteAccount();
                  }
                }}
                placeholder={t('deleteAccountInputPlaceholder')}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {message && message.includes('tidak cocok') && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm text-red-600">{t('deleteAccountNameMismatch')}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={cancelDeleteAccount}
                disabled={isDeleting}
                className={`flex-1 px-4 py-2.5 border rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={isDeleting || deleteConfirmName.trim() === ''}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt"></i>
                    {t('deleteAllData')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
