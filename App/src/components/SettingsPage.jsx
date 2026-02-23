import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { userService, deleteUserData } from '../services/firestore-service';
import { signOut, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import Sidebar from './Sidebar';

const SettingsPage = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const [settings, setSettings] = useState({
    displayName: user?.displayName || '',
    pomodoroMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    autoStartBreaks: false,
    soundEnabled: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile?.settings) {
          setSettings(prev => ({ ...prev, ...profile.settings }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      if (settings.displayName !== user?.displayName) {
        await updateProfile(auth.currentUser, { displayName: settings.displayName });
      }

      await userService.updateProfile({
        settings: {
          pomodoroMinutes: settings.pomodoroMinutes,
          shortBreakMinutes: settings.shortBreakMinutes,
          longBreakMinutes: settings.longBreakMinutes,
          autoStartBreaks: settings.autoStartBreaks,
          soundEnabled: settings.soundEnabled
        }
      });

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
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!window.confirm('This will permanently delete all your data. Are you absolutely sure?')) return;
    
    try {
      // Delete all user data from Firestore first
      await deleteUserData();
      // Then delete the auth account
      await auth.currentUser.delete();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage('Please sign in again before deleting your account.');
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3">
          {/* Header */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Customize your Study Flow experience</p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`p-4 rounded-xl ${
              message.includes('Error') 
                ? 'bg-red-50 text-red-600 border border-red-100' 
                : 'bg-green-50 text-green-600 border border-green-100'
            }`}>
              <div className="flex items-center gap-2">
                <i className={`fas ${message.includes('Error') ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                {message}
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
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
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <i className="fas fa-stopwatch text-blue-500"></i>
              <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('timerSettings')}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('pomodoro')}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settings.pomodoroMinutes}
                    onChange={(e) => setSettings({ ...settings, pomodoroMinutes: parseInt(e.target.value) || 25 })}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-blue-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:bg-slate-700' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>min</span>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('shortBreakDuration')}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.shortBreakMinutes}
                    onChange={(e) => setSettings({ ...settings, shortBreakMinutes: parseInt(e.target.value) || 5 })}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:border-blue-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white focus:bg-slate-700' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>min</span>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('longBreakDuration')}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.longBreakMinutes}
                    onChange={(e) => setSettings({ ...settings, longBreakMinutes: parseInt(e.target.value) || 15 })}
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
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Sound notifications</span>
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
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-red-900/50' : 'bg-white border-red-100'}`}>
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
    </div>
  );
};

export default SettingsPage;
