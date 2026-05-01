import React, { useState, useEffect, useMemo } from 'react';
import { localSessionsService } from '../services/local-db-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useTimer } from '../contexts/TimerContext';
import { useLang } from '../contexts/LanguageContext';

const DAILY_GOAL_HOURS = 2;

const WeeklyProgress = () => {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { liveElapsedMinutes } = useTimer();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocalData = async () => {
      const fetchedSessions = await localSessionsService.getSessions();
      setSessions(fetchedSessions);
      setLoading(false);
    };

    loadLocalData();
    const interval = setInterval(loadLocalData, 3000);
    return () => clearInterval(interval);
  }, []);

  const parseSessionDate = (session) => {
    const val = session.timestamp || session.completedAt || session.createdAt;
    if (!val) return new Date();
    let d;
    if (typeof val === 'object' && val.seconds) {
      d = new Date(val.seconds * 1000);
    } else if (typeof val === 'number') {
      d = new Date(val < 10000000000 ? val * 1000 : val);
    } else {
      d = new Date(val);
    }
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const getWeekData = (offset = 0) => {
    const now = new Date();
    const ref = new Date(now);
    ref.setDate(ref.getDate() - 7 * offset);
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const days = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
    const todayIndex = now.getDay();
    const data = Array(7).fill(0);

    sessions.forEach(session => {
      const sessionDate = parseSessionDate(session);
      if (sessionDate >= startOfWeek) {
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        if (sessionDate < endOfWeek) {
          const dayIndex = sessionDate.getDay();
          if (dayIndex >= 0 && dayIndex < 7) {
            data[dayIndex] += Number(session.duration) || 0;
          }
        }
      }
    });

    const maxMinutes = Math.max(...data, 60);
    return days.map((name, i) => ({
      name,
      minutes: data[i],
      hours: (data[i] / 60).toFixed(1),
      percentage: Math.max((data[i] / maxMinutes) * 100, 5),
      isToday: offset === 0 && i === todayIndex
    }));
  };

  const currentWeekData = getWeekData(0);
  const prevWeekData = getWeekData(1);

  // Add live elapsed time to today's data
  const liveData = currentWeekData.map(day => {
    if (day.isToday && liveElapsedMinutes > 0) {
      const newMinutes = day.minutes + liveElapsedMinutes;
      return { ...day, minutes: newMinutes, hours: (newMinutes / 60).toFixed(1) };
    }
    return day;
  });

  const maxMinutesLive = Math.max(...liveData.map(d => d.minutes), 60);
  const finalData = liveData.map(d => ({
    ...d,
    percentage: Math.max((d.minutes / maxMinutesLive) * 100, 5)
  }));

  const totalMinutes = finalData.reduce((acc, d) => acc + d.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Vs last week calculation
  const prevTotalMinutes = prevWeekData.reduce((acc, d) => acc + d.minutes, 0);
  const vsLastWeek = prevTotalMinutes > 0
    ? Math.round(((totalMinutes - prevTotalMinutes) / prevTotalMinutes) * 100)
    : (totalMinutes > 0 ? 100 : 0);

  // Quick stats
  const daysWithData = finalData.filter(d => d.minutes > 0);
  const avgDailyMinutes = daysWithData.length > 0
    ? Math.round(totalMinutes / daysWithData.length)
    : 0;
  const bestDay = finalData.length > 0
    ? finalData.reduce((best, d) => d.minutes > best.minutes ? d : best, finalData[0])
    : { name: '—', minutes: 0 };
  const totalSessions = sessions.length;

  // Goal line position (percentage of max)
  const goalMinutes = DAILY_GOAL_HOURS * 60;
  const goalLinePct = Math.min((goalMinutes / maxMinutesLive) * 100, 100);

  if (loading) {
    return (
      <div className={`rounded-2xl p-3 border shadow-sm flex-1 ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
        <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <i className="fas fa-chart-line text-blue-600"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('weeklyProgress')}</h2>
        </div>
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-3 border shadow-sm flex-1 lg:h-full flex flex-col ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center justify-between mb-1.5 pb-1.5 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-line text-blue-600"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('weeklyProgress')}</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* vs Last Week */}
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            vsLastWeek > 0
              ? 'text-emerald-600 bg-emerald-50'
              : vsLastWeek < 0
              ? 'text-red-500 bg-red-50'
              : isDarkMode ? 'text-slate-400 bg-slate-800' : 'text-gray-500 bg-gray-100'
          }`}>
            <i className={`fas fa-arrow-${vsLastWeek > 0 ? 'up' : vsLastWeek < 0 ? 'down' : 'right'} text-[8px]`}></i>
            {vsLastWeek !== 0 ? `${Math.abs(vsLastWeek)}%` : '—'}
          </span>
          <div className="flex items-center gap-1">
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('totalLabel')}:</span>
            <span className="text-sm font-bold text-blue-600">{totalHours}h</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className={`flex items-center gap-3 mb-2 pb-1.5 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-gray-50'}`}>
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <i className="fas fa-clock text-[8px] mr-0.5"></i>
          {t('avgDaily')}: <strong className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{(avgDailyMinutes / 60).toFixed(1)}h</strong>
        </span>
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <i className="fas fa-trophy text-[8px] mr-0.5"></i>
          {t('bestDay')}: <strong className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{bestDay.name}</strong>
        </span>
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <i className="fas fa-list text-[8px] mr-0.5"></i>
          {t('totalSessions')}: <strong className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{totalSessions}</strong>
        </span>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-[120px] flex items-end justify-between gap-3 px-2 relative">
        {/* Goal Target Line */}
        {goalLinePct > 0 && goalLinePct < 100 && (
          <div
            className="absolute left-2 right-2 border-t-2 border-dashed border-blue-400/40 z-10 pointer-events-none"
            style={{ bottom: `${goalLinePct}%` }}
          >
            <span className="absolute -top-3 right-0 text-[9px] font-medium text-blue-400 bg-transparent">{DAILY_GOAL_HOURS}h</span>
          </div>
        )}

        {finalData.map((day) => (
          <div key={day.name} className="flex flex-col items-center gap-1 group flex-1">
            {/* Always-visible value label */}
            <span className={`text-[9px] font-semibold whitespace-nowrap ${
              day.minutes > 0
                ? day.isToday ? 'text-blue-600' : isDarkMode ? 'text-slate-400' : 'text-gray-500'
                : isDarkMode ? 'text-slate-600' : 'text-gray-300'
            }`}>
              {day.minutes > 0 ? `${day.hours}h` : '—'}
            </span>
            <div className={`w-full rounded-lg relative flex-1 flex items-end overflow-hidden border transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 group-hover:border-blue-500'
                : 'bg-gray-50 border-gray-100 group-hover:border-blue-200'
            }`}>
              <div
                className={`w-full rounded-lg relative transition-all ${
                  day.isToday
                    ? 'bg-blue-600 shadow-sm'
                    : day.minutes > 0
                    ? isDarkMode ? 'bg-blue-800 group-hover:bg-blue-700' : 'bg-blue-200 group-hover:bg-blue-300'
                    : isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                }`}
                style={{ height: `${day.percentage}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${
                day.isToday ? 'text-blue-600 font-bold' : isDarkMode ? 'text-slate-500' : 'text-gray-400'
              }`}
            >
              {day.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyProgress;
