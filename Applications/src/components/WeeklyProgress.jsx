import React, { useState, useEffect } from 'react';
import { localSessionsService } from '../services/local-db-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useTimer } from '../contexts/TimerContext';

const WeeklyProgress = () => {
  const { isDarkMode } = useDarkMode();
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

    // Poll for changes every 3 seconds for near-realtime UI updates
    // This is very cheap as it's a local IndexedDB read.
    const interval = setInterval(loadLocalData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Calculate daily data from sessions
  const getDailyData = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = now.getDay();
    const data = Array(7).fill(0);

    // Aggregate session minutes per day
    sessions.forEach(session => {
      const sessionDate = new Date(session.completedAt || session.createdAt);
      if (sessionDate >= startOfWeek) {
        const dayIndex = sessionDate.getDay();
        data[dayIndex] += session.duration || 0;
      }
    });

    // Convert to hours for display
    const maxMinutes = Math.max(...data, 60);
    
    return days.map((name, i) => ({
      name,
      minutes: data[i],
      hours: (data[i] / 60).toFixed(1),
      percentage: Math.max((data[i] / maxMinutes) * 100, 5),
      isToday: i === today
    }));
  };

  const dailyData = getDailyData();

  // Add live elapsed time to today's data
  const liveData = dailyData.map(day => {
    if (day.isToday && liveElapsedMinutes > 0) {
      const newMinutes = day.minutes + liveElapsedMinutes;
      return { ...day, minutes: newMinutes, hours: (newMinutes / 60).toFixed(1) };
    }
    return day;
  });
  // Recalculate percentages with live data
  const maxMinutesLive = Math.max(...liveData.map(d => d.minutes), 60);
  const finalData = liveData.map(d => ({ ...d, percentage: Math.max((d.minutes / maxMinutesLive) * 100, 5) }));

  const totalHours = (finalData.reduce((acc, d) => acc + d.minutes, 0) / 60).toFixed(1);

  if (loading) {
    return (
      <div className={`rounded-2xl p-3 border shadow-sm flex-1 ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
        <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <i className="fas fa-chart-line text-blue-600"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Progress</h2>
        </div>
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-3 border shadow-sm flex-1 h-full flex flex-col ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-line text-blue-600"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Progress</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total:</span>
          <span className="text-sm font-bold text-blue-600">{totalHours}h</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-[120px] flex items-end justify-between gap-3 px-2">
        {finalData.map((day) => (
          <div key={day.name} className="flex flex-col items-center gap-2 group flex-1">
            <div className={`w-full rounded-lg relative h-full flex items-end overflow-hidden border transition-colors ${
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
                title={`${day.hours}h`}
              >
                {day.minutes > 0 && (
                  <span className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-500'
                  }`}>
                    {day.hours}h
                  </span>
                )}
              </div>
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

