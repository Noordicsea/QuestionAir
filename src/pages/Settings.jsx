import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';
import Spinner from '../components/Spinner';
import PushNotificationToggle from '../components/PushNotificationToggle';

export default function Settings() {
  const { user, settings, updateSettings, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  const [nameMessage, setNameMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    
    setNameLoading(true);
    setNameMessage('');
    try {
      await api.patch('/auth/profile', { displayName: displayName.trim() });
      setNameMessage('Name updated');
    } catch (err) {
      setNameMessage(err.message);
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordMessage('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMessage('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSettingChange = async (key, value) => {
    setSettingsLoading(true);
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
      <h2 className="text-xl font-display font-medium text-ink-900 dark:text-sand-100 mb-6">
        Settings
      </h2>

      {/* Profile section */}
      <section className="card p-5 mb-4">
        <h3 className="font-medium text-ink-800 dark:text-sand-200 mb-4">Profile</h3>
        
        <form onSubmit={handleUpdateName} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={nameLoading || !displayName.trim()}
              className="btn btn-secondary text-sm"
            >
              {nameLoading ? <Spinner size="sm" /> : 'Update name'}
            </button>
            {nameMessage && (
              <span className="text-sm text-sage-600">{nameMessage}</span>
            )}
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-sand-200 dark:border-ink-700">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Username: {user?.username}
          </p>
        </div>
      </section>

      {/* Appearance section */}
      <section className="card p-5 mb-4">
        <h3 className="font-medium text-ink-800 dark:text-sand-200 mb-4">Appearance</h3>
        
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink-700 dark:text-sand-300">Theme</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`theme-option ${theme === 'light' ? 'theme-option-active' : 'theme-option-inactive'}`}
            >
              <SunIcon className="w-4 h-4" />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`theme-option ${theme === 'dark' ? 'theme-option-active' : 'theme-option-inactive'}`}
            >
              <MoonIcon className="w-4 h-4" />
              Dark
            </button>
            <button
              onClick={() => setTheme('auto')}
              className={`theme-option ${theme === 'auto' ? 'theme-option-active' : 'theme-option-inactive'}`}
            >
              <SystemIcon className="w-4 h-4" />
              Auto
            </button>
          </div>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Auto will follow your system preference
          </p>
        </div>
      </section>

      {/* Preferences section */}
      <section className="card p-5 mb-4">
        <h3 className="font-medium text-ink-800 dark:text-sand-200 mb-4">Preferences</h3>
        
        <div className="space-y-4">
          {/* Push Notifications */}
          <PushNotificationToggle 
            enabled={settings?.notificationsEnabled}
            onToggle={(enabled) => handleSettingChange('notificationsEnabled', enabled)}
          />

          {/* Quiet hours */}
          {settings?.notificationsEnabled && (
            <div className="pl-4 border-l-2 border-sand-200 dark:border-ink-700">
              <p className="text-sm font-medium text-ink-700 dark:text-sand-300 mb-2">Quiet hours</p>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={settings?.quietHoursStart || ''}
                  onChange={(e) => handleSettingChange('quietHoursStart', e.target.value)}
                  className="input text-sm w-32"
                />
                <span className="text-ink-500 dark:text-ink-400">to</span>
                <input
                  type="time"
                  value={settings?.quietHoursEnd || ''}
                  onChange={(e) => handleSettingChange('quietHoursEnd', e.target.value)}
                  className="input text-sm w-32"
                />
              </div>
              {settings?.quietHoursStart && settings?.quietHoursEnd && (
                <button
                  onClick={() => {
                    handleSettingChange('quietHoursStart', null);
                    handleSettingChange('quietHoursEnd', null);
                  }}
                  className="text-xs text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-sand-300 mt-1"
                >
                  Clear quiet hours
                </button>
              )}
            </div>
          )}

          {/* Default depth */}
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Default question depth
            </label>
            <select
              value={settings?.defaultDepth || 'medium'}
              onChange={(e) => handleSettingChange('defaultDepth', e.target.value)}
              className="input text-sm w-40"
            >
              <option value="quick">Quick</option>
              <option value="medium">Medium</option>
              <option value="deep">Deep</option>
            </select>
          </div>

          {/* Quick question max length */}
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Quick question max length
            </label>
            <input
              type="number"
              value={settings?.quickQuestionMaxLength || 280}
              onChange={(e) => handleSettingChange('quickQuestionMaxLength', parseInt(e.target.value))}
              className="input text-sm w-24"
              min={100}
              max={1000}
            />
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
              Character limit for "quick" questions
            </p>
          </div>
        </div>
      </section>

      {/* Change password section */}
      <section className="card p-5 mb-4">
        <h3 className="font-medium text-ink-800 dark:text-sand-200 mb-4">Change password</h3>
        
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
            />
          </div>
          
          {error && (
            <p className="text-sm text-rust-600 dark:text-rust-400 bg-rust-50 dark:bg-rust-950 px-3 py-2 rounded">
              {error}
            </p>
          )}
          
          {passwordMessage && (
            <p className="text-sm text-sage-600 dark:text-sage-400">{passwordMessage}</p>
          )}
          
          <button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword}
            className="btn btn-secondary text-sm"
          >
            {passwordLoading ? <Spinner size="sm" /> : 'Change password'}
          </button>
        </form>
      </section>

      {/* Logout */}
      <section className="card p-5">
        <button
          onClick={logout}
          className="btn btn-ghost text-rust-600 dark:text-rust-400 hover:bg-rust-50 dark:hover:bg-rust-950"
        >
          Sign out
        </button>
      </section>

      {/* Footer */}
      <p className="text-center text-xs text-ink-400 mt-8">
        Questionair &middot; Take your time. Protect your energy.
      </p>
    </div>
  );
}

// Theme icons
function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

