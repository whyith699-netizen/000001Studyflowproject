import React, { useState, useEffect } from 'react';
import { studySessionsService } from '../services/firestore-service';

const WeeklyProgress = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = studySessionsService.subscribeToSessions((fetchedSessions) => {
      setSessions(fetchedSessions);
      setLoading(false);
    });
    return () => unsubscribe();
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
  const totalHours = (dailyData.reduce((acc, d) => acc + d.minutes, 0) / 60).toFixed(1);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex-1">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
          <i className="fas fa-chart-line text-blue-600"></i>
          <h2 className="text-sm font-semibold text-gray-900">Weekly Progress</h2>
        </div>
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex-1">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-line text-blue-600"></i>
          <h2 className="text-sm font-semibold text-gray-900">Weekly Progress</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Total:</span>
          <span className="text-sm font-bold text-blue-600">{totalHours}h</span>
        </div>
      </div>
      
      <div className="h-40 flex items-end justify-between gap-3 px-2">
        {dailyData.map((day) => (
          <div key={day.name} className="flex flex-col items-center gap-2 group flex-1">
            <div className="w-full bg-gray-50 rounded-lg relative h-full flex items-end overflow-hidden border border-gray-100 group-hover:border-blue-200 transition-colors">
              <div
                className={`w-full rounded-lg relative transition-all ${
                  day.isToday
                    ? 'bg-blue-600 shadow-sm'
                    : day.minutes > 0
                    ? 'bg-blue-200 group-hover:bg-blue-300'
                    : 'bg-gray-100'
                }`}
                style={{ height: `${day.percentage}%` }}
                title={`${day.hours}h`}
              >
                {day.minutes > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {day.hours}h
                  </span>
                )}
              </div>
            </div>
            <span
              className={`text-[10px] font-medium ${
                day.isToday ? 'text-blue-600 font-bold' : 'text-gray-400'
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
