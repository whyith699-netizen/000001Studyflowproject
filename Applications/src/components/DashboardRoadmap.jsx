import React, { useState, useEffect, useMemo } from 'react';
import { tasksService, calendarEventsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';

const DashboardRoadmap = () => {
  const { isDarkMode } = useDarkMode();
  const { t, lang } = useLang();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTasks = tasksService.subscribeToTasks(setTasks);
    const unsubEvents = calendarEventsService.subscribeToEvents(setEvents);
    setLoading(false);
    return () => { unsubTasks(); unsubEvents(); };
  }, []);

  const roadmapItems = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const formatISO = (d) => d.toISOString().split('T')[0];
    const todayStr = formatISO(today);
    const endStr = formatISO(sevenDaysLater);

    const items = [];

    // Process Tasks
    tasks.forEach(task => {
      if (task.completed || !task.dueDate) return;
      const dateStr = task.dueDate.split('T')[0];
      if (dateStr >= todayStr && dateStr <= endStr) {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title || task.text,
          date: dateStr,
          priority: task.priority,
          className: task.className
        });
      }
    });

    // Process Events
    events.forEach(event => {
      if (!event.date) return;
      if (event.date >= todayStr && event.date <= endStr) {
        items.push({
          id: event.id,
          type: 'event',
          title: event.title,
          date: event.date,
          time: event.time
        });
      }
    });

    // Sort by date then time
    return items.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [tasks, events]);

  const cardCls = isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100';

  if (loading) return null;

  return (
    <div className={`rounded-2xl p-4 border shadow-sm flex flex-col h-full ${cardCls}`}>
      <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <i className="fas fa-route text-blue-500"></i>
        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('roadmapTab') || 'Roadmap'} (7 Days)</h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {roadmapItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <i className="fas fa-calendar-check text-2xl mb-2"></i>
            <p className="text-xs">No upcoming items</p>
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-5">
            {roadmapItems.map((item, idx) => {
              const itemDate = new Date(item.date);
              const isToday = item.date === new Date().toISOString().split('T')[0];
              
              return (
                <div key={`${item.id}-${idx}`} className="relative">
                  <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 ${isDarkMode ? 'border-slate-900' : 'border-white'} ${isToday ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                        {isToday ? t('today') : itemDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      {item.time && <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>}
                    </div>
                    
                    <div className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50'}`}>
                      <i className={`fas ${item.type === 'task' ? 'fa-check-circle text-blue-500' : 'fa-calendar text-purple-500'} text-xs`}></i>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{item.title}</p>
                        {item.className && <p className="text-[9px] text-slate-400 truncate">{item.className}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardRoadmap;
