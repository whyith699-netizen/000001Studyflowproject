/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const DarkModeContext = createContext();

const THEME_STYLES = [
  {
    id: 'ocean',
    labelKey: 'themeStyleOcean',
    label: 'Ocean',
    colors: ['#2563eb', '#0891b2', '#059669', '#d97706'],
  },
  {
    id: 'sakura',
    labelKey: 'themeStyleSakura',
    label: 'Sakura',
    colors: ['#e11d48', '#f97316', '#7c3aed', '#0f766e'],
  },
  {
    id: 'forest',
    labelKey: 'themeStyleForest',
    label: 'Forest',
    colors: ['#15803d', '#65a30d', '#334155', '#ca8a04'],
  },
  {
    id: 'studio',
    labelKey: 'themeStyleStudio',
    label: 'Studio',
    colors: ['#27272a', '#4f46e5', '#0284c7', '#ea580c'],
  },
];

const DEFAULT_THEME_STYLE = 'ocean';
const validThemeStyles = new Set(THEME_STYLES.map((style) => style.id));

const getInitialThemeStyle = () => {
  try {
    const savedStyle = localStorage.getItem('themeStyle');
    if (validThemeStyles.has(savedStyle)) return savedStyle;

    if (localStorage.getItem('darkMode') !== null) {
      localStorage.removeItem('darkMode');
    }
  } catch {
    // Ignore storage issues and fall back to the default style.
  }

  return DEFAULT_THEME_STYLE;
};

const applyThemeStyle = (themeStyle) => {
  document.documentElement.dataset.themeStyle = themeStyle;
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark-mode');
};

export function DarkModeProvider({ children }) {
  const [themeStyle, setThemeStyleState] = useState(getInitialThemeStyle);

  useEffect(() => {
    applyThemeStyle(themeStyle);

    try {
      localStorage.setItem('themeStyle', themeStyle);
    } catch {
      // Ignore storage issues; the in-memory style still applies.
    }
  }, [themeStyle]);

  const setThemeStyle = useCallback((nextStyle) => {
    setThemeStyleState(validThemeStyles.has(nextStyle) ? nextStyle : DEFAULT_THEME_STYLE);
  }, []);

  const cycleThemeStyle = useCallback(() => {
    setThemeStyleState((currentStyle) => {
      const currentIndex = THEME_STYLES.findIndex((style) => style.id === currentStyle);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % THEME_STYLES.length;
      return THEME_STYLES[nextIndex].id;
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    cycleThemeStyle();
  }, [cycleThemeStyle]);

  const currentThemeStyle = THEME_STYLES.find((style) => style.id === themeStyle) || THEME_STYLES[0];

  const value = useMemo(
    () => ({
      isDarkMode: false,
      toggleDarkMode,
      themeStyle,
      setThemeStyle,
      cycleThemeStyle,
      currentThemeStyle,
      themeStyles: THEME_STYLES,
    }),
    [themeStyle, setThemeStyle, cycleThemeStyle, toggleDarkMode, currentThemeStyle]
  );

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

export default DarkModeContext;
