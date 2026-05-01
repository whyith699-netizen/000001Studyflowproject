import React, { useMemo } from 'react';
import { useLang } from '../../contexts/LanguageContext';

const WEEKS = 12;
const DAYS = 7;

const ActivityHeatmap = ({ sessions, isDarkMode }) => {
  const { t } = useLang();
  const heatmapData = useMemo(() => {
    const now = new Date();
    const grid = [];

    for (let w = WEEKS - 1; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekDays = [];
      for (let d = 0; d < DAYS; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        const dayStr = day.toISOString().split('T')[0];

        const dayMinutes = sessions
          .filter(s => {
            const sDate = new Date(s.completedAt || s.timestamp || s.createdAt);
            return sDate.toISOString().split('T')[0] === dayStr;
          })
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        weekDays.push({ date: dayStr, minutes: dayMinutes });
      }
      grid.push(weekDays);
    }

    return grid;
  }, [sessions]);

  const maxMinutes = useMemo(() => {
    let max = 0;
    heatmapData.forEach(week => week.forEach(d => { if (d.minutes > max) max = d.minutes; }));
    return Math.max(max, 1);
  }, [heatmapData]);

  const getColor = (minutes) => {
    if (minutes === 0) return isDarkMode ? 'bg-slate-800' : 'bg-gray-100';
    const ratio = minutes / maxMinutes;
    if (ratio >= 0.75) return 'bg-emerald-500';
    if (ratio >= 0.5) return 'bg-emerald-400';
    if (ratio >= 0.25) return 'bg-emerald-300';
    return isDarkMode ? 'bg-emerald-900/60' : 'bg-emerald-200';
  };

  const dayLabels = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];

  return (
    <div className="w-full">
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {dayLabels.map((label, i) => (
            <div key={label} className="w-6 h-3 flex items-center">
              <span className={`text-[8px] ${i % 2 === 1 ? (isDarkMode ? 'text-slate-500' : 'text-gray-400') : 'opacity-0'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-0.5 flex-1 overflow-hidden">
          {heatmapData.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5 flex-1">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`h-3 w-full rounded-sm ${getColor(day.minutes)} transition-colors`}
                  title={`${day.date}: ${day.minutes}m`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
