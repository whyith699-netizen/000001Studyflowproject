import React from 'react';
import { useLang } from '../../contexts/LanguageContext';

const INSIGHT_ICONS = {
  best: 'fa-star text-amber-500',
  peak: 'fa-bolt text-purple-500',
  streak: 'fa-fire text-orange-500',
  tasks: 'fa-check-circle text-emerald-500',
  session: 'fa-clock text-blue-500',
  start: 'fa-lightbulb text-gray-400',
};

const PERIOD_LABELS = {
  morning: 'morningLabel',
  afternoon: 'afternoonLabel',
  evening: 'eveningLabel',
  night: 'nightLabel',
};

const getInsightText = (insight, t) => {
  switch (insight.type) {
    case 'best': {
      const dayName = new Date(insight.date).toLocaleDateString(undefined, { weekday: 'long' });
      return t('insightBestDay', { day: dayName, hours: insight.hours });
    }
    case 'peak':
      return t('insightPeakTime', { period: t(PERIOD_LABELS[insight.period] || insight.period), pct: insight.pct });
    case 'streak':
      return t('insightStreak', { n: insight.count });
    case 'tasks':
      return t('insightTasks', { pct: insight.rate });
    case 'session':
      return t('insightSession', { n: insight.minutes });
    case 'start':
      return t('insightStart');
    default:
      return '';
  }
};

const InsightsCard = ({ insights, isDarkMode }) => {
  const { t } = useLang();

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <i className="fas fa-lightbulb text-amber-500 mr-1.5"></i>{t('insights')}
      </h3>
      <div className="space-y-2.5">
        {insights.map((insight, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 p-2 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
              <i className={`fas ${INSIGHT_ICONS[insight.type] || INSIGHT_ICONS.start} text-[10px]`}></i>
            </div>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {getInsightText(insight, t)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsCard;
