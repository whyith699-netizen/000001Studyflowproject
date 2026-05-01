import React from 'react';
import { useLang } from '../../contexts/LanguageContext';

const WEEKLY_GOAL_HOURS = 15;

const GoalProgressRing = ({ totalFocusMinutes, isDarkMode }) => {
  const { t } = useLang();
  const currentHours = totalFocusMinutes / 60;
  const pct = Math.min(Math.round((currentHours / WEEKLY_GOAL_HOURS) * 100), 100);

  // SVG circle properties
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const getColor = () => {
    if (pct >= 100) return '#10b981';
    if (pct >= 60) return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <i className="fas fa-bullseye text-blue-500 mr-1.5"></i>{t('weeklyGoal')}
      </h3>
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="130" height="130" className="-rotate-90">
            <circle
              cx="65" cy="65" r={radius}
              fill="none"
              stroke={isDarkMode ? '#1e293b' : '#f1f5f9'}
              strokeWidth="10"
            />
            <circle
              cx="65" cy="65" r={radius}
              fill="none"
              stroke={getColor()}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pct}%</span>
            <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {currentHours.toFixed(1)}/{WEEKLY_GOAL_HOURS}h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressRing;
