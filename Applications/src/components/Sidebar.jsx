import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useSidebarCollapse } from '../contexts/SidebarCollapseContext';
import { isNotesFeatureEnabled } from '../config/featureFlags';

const Sidebar = ({ user, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { lang, toggleLang, t } = useLang();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Use context if props not provided (for backward compatibility)
  const collapseContext = useSidebarCollapse();
  const isCollapsed = collapsed !== undefined ? !!collapsed : collapseContext?.isCollapsed || false;
  const handleToggleCollapse = onToggleCollapse || collapseContext?.toggleCollapse || (() => {});

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

    const navItems = useMemo(
    () => {
      const items = [
        { path: '/dashboard', icon: 'fa-th-large', label: t('dashboard') },
        { path: '/schedule', icon: 'fa-stream', label: t('schedule') },
        { path: '/focus', icon: 'fa-clock', label: t('focusMode') },
        { path: '/tasks', icon: 'fa-clipboard-list', label: t('myTasks') },
        { path: '/calendar', icon: 'fa-calendar-days', label: t('calendarTitle') },
        { path: '/reports', icon: 'fa-chart-bar', label: t('reports') },
        { path: '/settings', icon: 'fa-cog', label: t('settings') },
      ];

      if (isNotesFeatureEnabled) {
        items.splice(2, 0, { path: '/notes', icon: 'fa-note-sticky', label: t('notesMenu') });
      }

      return items;
    },
    [t]
  );
  const primaryMobileItems = useMemo(
    () => navItems.filter((item) => ['/dashboard', '/focus', '/tasks'].includes(item.path)),
    [navItems]
  );
  const leftMobileItems = useMemo(() => primaryMobileItems.slice(0, 2), [primaryMobileItems]);
  const rightMobileItems = useMemo(() => primaryMobileItems.slice(2), [primaryMobileItems]);

  const moreMobileItems = useMemo(
    () => {
      const preferredOrder = isNotesFeatureEnabled
        ? ['/notes', '/schedule', '/calendar', '/reports', '/settings']
        : ['/schedule', '/calendar', '/reports', '/settings'];
      return navItems
        .filter((item) => !['/dashboard', '/focus', '/tasks'].includes(item.path))
        .sort((a, b) => preferredOrder.indexOf(a.path) - preferredOrder.indexOf(b.path));
    },
    [navItems]
  );

  const isMoreActive = moreMobileItems.some((item) => item.path === location.pathname);

  return (
    <>
      <aside className={`flex-shrink-0 flex-col border-r hidden md:flex transition-all duration-200 ${
        isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'
      }`} style={{ width: isCollapsed ? 60 : 208 }}>
        <div className="flex h-full flex-col justify-between p-3">
          <div className="flex flex-col gap-3">
            {/* Logo & User Profile */}
            <div className={`flex items-center gap-3 pb-3 border-b ${
              isDarkMode ? 'border-slate-700' : 'border-gray-100'
            } ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
              <div
                className="w-10 h-10 rounded-xl shadow-sm relative bg-blue-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0"
              >
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <h1 className={`text-sm font-semibold leading-normal truncate ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user?.displayName || 'StudyFlow'}
                  </h1>
                  <p className={`text-xs font-normal leading-normal truncate ${
                    isDarkMode ? 'text-slate-400' : 'text-gray-400'
                  }`}>
                    {user?.email || 'Premium Plan'}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isCollapsed ? 'justify-center px-0' : 'px-3'
                    } ${
                      isActive
                        ? isDarkMode
                          ? 'bg-blue-900/30 text-blue-400 font-medium'
                          : 'bg-blue-50 text-blue-600 font-medium'
                        : isDarkMode
                          ? 'hover:bg-slate-700 text-slate-300'
                          : 'hover:bg-gray-50 text-gray-600'
                    }`
                  }
                >
                  <i className={`fas ${item.icon} text-base w-5 text-center`}></i>
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className={`border-t pt-3 flex flex-col gap-2 ${
            isDarkMode ? 'border-slate-700' : 'border-gray-100'
          }`}>
            {/* Collapse Toggle */}
            <button
              onClick={handleToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex items-center gap-3 py-2 w-full text-left rounded-lg transition-colors ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isDarkMode
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-base w-5 text-center`}></i>
              {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              title={isCollapsed ? (lang === 'en' ? 'English' : 'Indonesia') : undefined}
              className={`flex items-center gap-3 py-2 w-full text-left rounded-lg transition-colors ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isDarkMode
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <i className="fas fa-globe text-base w-5 text-center"></i>
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium">{lang === 'en' ? 'English' : 'Indonesia'}</span>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {lang.toUpperCase()}
                  </span>
                </>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isCollapsed ? (isDarkMode ? t('lightMode') : t('darkMode')) : undefined}
              className={`flex items-center gap-3 py-2 w-full text-left rounded-lg transition-colors ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isDarkMode
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-base w-5 text-center`}></i>
              {!isCollapsed && <span className="text-sm font-medium">{isDarkMode ? t('lightMode') : t('darkMode')}</span>}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={isCollapsed ? t('logOut') : undefined}
              className={`flex items-center gap-3 py-2 w-full text-left rounded-lg hover:bg-red-50 text-red-500 transition-colors ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              }`}
            >
              <i className="fas fa-sign-out-alt text-base w-5 text-center"></i>
              {!isCollapsed && <span className="text-sm font-medium">{t('logOut')}</span>}
            </button>
          </div>
        </div>
      </aside>

      {showMoreMenu && (
        <button
          type="button"
          onClick={() => setShowMoreMenu(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/20"
          aria-label="Close mobile menu"
        />
      )}

      {showMoreMenu && (
        <div
          className={`md:hidden fixed inset-x-2 z-50 max-h-[56vh] overflow-y-auto rounded-xl border p-2 shadow-xl ${
            isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`}
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)' }}
        >
          <div className="flex flex-col gap-1">
            {moreMobileItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setShowMoreMenu(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-900/40 text-blue-300'
                        : 'bg-blue-50 text-blue-600'
                      : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <i className={`fas ${item.icon} text-sm w-4 text-center`}></i>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className={`my-1 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}></div>
            <button
              onClick={toggleLang}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-globe text-sm w-4 text-center"></i>
              <span>{lang === 'en' ? 'English' : 'Indonesia'}</span>
              <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                {lang.toUpperCase()}
              </span>
            </button>
            <button
              onClick={toggleDarkMode}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-sm w-4 text-center`}></i>
              <span>{isDarkMode ? t('lightMode') : t('darkMode')}</span>
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                handleLogout();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
            >
              <i className="fas fa-sign-out-alt text-sm w-4 text-center"></i>
              <span>{t('logOut')}</span>
            </button>
          </div>
        </div>
      )}

      <nav
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t ${
          isDarkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch px-1 py-1.5">
          <div className="flex min-w-0 flex-1 items-stretch gap-0.5">
            {leftMobileItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 transition-all ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-900/40 text-blue-300'
                        : 'bg-blue-50 text-blue-600'
                      : isDarkMode
                        ? 'text-slate-400'
                        : 'text-gray-500'
                  }`
                }
              >
                <i className={`fas ${item.icon} text-sm`}></i>
                <span className="text-[10px] leading-none text-center whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="w-[88px] flex-shrink-0" aria-hidden="true" />

          <div className="flex min-w-0 flex-1 items-stretch gap-0.5">
            {rightMobileItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 transition-all ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-900/40 text-blue-300'
                        : 'bg-blue-50 text-blue-600'
                      : isDarkMode
                        ? 'text-slate-400'
                        : 'text-gray-500'
                  }`
                }
              >
                <i className={`fas ${item.icon} text-sm`}></i>
                <span className="text-[10px] leading-none text-center whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className={`flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 transition-all ${
                showMoreMenu || isMoreActive
                  ? isDarkMode
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'bg-blue-50 text-blue-600'
                  : isDarkMode
                    ? 'text-slate-400'
                    : 'text-gray-500'
              }`}
            >
              <i className={`fas ${showMoreMenu ? 'fa-xmark' : 'fa-ellipsis-h'} text-sm`}></i>
              <span className="text-[10px] leading-none text-center whitespace-nowrap">
                {lang === 'id' ? 'Menu' : 'More'}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;



