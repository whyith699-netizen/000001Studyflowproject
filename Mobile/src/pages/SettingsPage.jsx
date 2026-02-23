import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Globe, LogOut, Info, Shield, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const displayName = user?.displayName || 'Student';
  const email = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="profile-card">
        {user?.photoURL ? (
          <img className="profile-avatar" src={user.photoURL} alt="" />
        ) : (
          <div className="profile-avatar-placeholder">{initials}</div>
        )}
        <div className="profile-info">
          <div className="profile-name">{displayName}</div>
          <div className="profile-email">{email}</div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-group">
        <div className="settings-group-title">Appearance</div>

        <button className="settings-item" onClick={toggleTheme}>
          <div className={`settings-icon ${isDark ? 'purple' : 'amber'}`}>
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="settings-label">Dark Mode</span>
          <div className={`toggle ${isDark ? 'active' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </button>
      </div>

      {/* About */}
      <div className="settings-group">
        <div className="settings-group-title">About</div>

        <div className="settings-item">
          <div className="settings-icon blue">
            <Info size={20} />
          </div>
          <span className="settings-label">Version</span>
          <span className="settings-value">1.0.0</span>
        </div>

        <div className="settings-item">
          <div className="settings-icon green">
            <Shield size={20} />
          </div>
          <span className="settings-label">Platform</span>
          <span className="settings-value">Mobile PWA</span>
        </div>
      </div>

      {/* Account */}
      <div className="settings-group">
        <div className="settings-group-title">Account</div>

        <button className="settings-item" onClick={signOut} style={{ color: 'var(--color-danger)' }}>
          <div className="settings-icon red">
            <LogOut size={20} />
          </div>
          <span className="settings-label" style={{ color: 'var(--color-danger)' }}>Sign Out</span>
          <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>
    </div>
  );
}
