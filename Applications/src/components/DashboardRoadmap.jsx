import React, { useState, useEffect, useMemo } from 'react';
import { tasksService, calendarEventsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';

const CATEGORY_COLORS = {
  exam: { dot: 'bg-red-500', border: 'border-l-red-500', bg: 'bg-red-50', darkBg: 'bg-red-900/10', icon: 'fa-file-alt text-red-500' },
  task: { dot: 'bg-blue-500', border: 'border-l-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/10', icon: 'fa-check-circle text-blue-500' },
  event: { dot: 'bg-purple-500', border: 'border-l-purple-500', bg: 'bg-purple-50', darkBg: 'bg-purple-900/10', icon: 'fa-calendar text-purple-500' },
};

const DashboardRoadmap = () => {
  const { isDarkMode } = useDarkMode();
  const { t, lang } = useLang();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [completingIds, setCompletingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTasks = tasksService.subscribeToTasks(setTasks);
    const unsubEvents = calendarEventsService.subscribeToEvents(setEvents);
    setLoading(false);
    return () => { unsubTasks(); unsubEvents(); };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const roadmapByDay = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const formatISO = (d) => d.toISOString().split('T')[0];
    const endStr = formatISO(sevenDaysLater);

    const items = [];

    tasks.forEach(task => {
      if (task.completed || !task.dueDate) return;
      const dateStr = task.dueDate.split('T')[0];
      if (dateStr >= todayStr && dateStr <= endStr) {
        items.push({
          id: task.id,
          type: 'task',
          category: task.type === 'exam' ? 'exam' : 'task',
          title: task.title || task.text,
          date: dateStr,
          priority: task.priority,
          className: task.className,
          completable: true
        });
      }
    });

    events.forEach(event => {
      if (!event.date) return;
      if (event.date >= todayStr && event.date <= endStr) {
        items.push({
          id: event.id,
          type: 'event',
          category: 'event',
          title: event.title,
          date: event.date,
          time: event.time,
          completable: false
        });
      }
    });

    items.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });

    // Group by day
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });

    // Sort days
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayItems]) => {
        const doneCount = dayItems.filter(i => i.completable).length; // all are incomplete (filtered above)
        return { date, items: dayItems, total: dayItems.length, isToday: date === todayStr };
      });
  }, [tasks, events, todayStr]);

  const handleQuickComplete = async (taskId) => {
    setCompletingIds(prev => new Set(prev).add(taskId));
    try {
      await tasksService.toggleTask(taskId, true);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const cardCls = isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100';

  if (loading) return null;

  const totalItems = roadmapByDay.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className={`rounded-2xl p-4 border shadow-sm flex flex-col h-full ${cardCls}`}>
      <div className={`flex items-center justify-between mb-4 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <i className="fas fa-route text-blue-500"></i>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('roadmapTab') || 'Roadmap'} (7 {t('days')})</h3>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            {totalItems}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <i className={`fas fa-calendar-check text-2xl ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}></i>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('noUpcomingItems')}</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}>{t('addTasksOrEvents')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {roadmapByDay.map(({ date, items: dayItems, total, isToday }) => {
              const itemDate = new Date(date);
              const dayLabel = isToday
                ? t('today')
                : itemDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });

              return (
                <div key={date} className={isToday ? 'ring-1 ring-blue-500/20 rounded-xl p-2 -m-1' : ''}>
                  {/* Day Header with progress */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-500' : isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {dayLabel}
                    </span>
                    <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {total} {total === 1 ? t('task') : t('tasks')}
                    </span>
                  </div>

                  {/* Day Items */}
                  <div className="space-y-1.5">
                    {dayItems.map((item, idx) => {
                      const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.task;
                      const isCompleting = completingIds.has(item.id);

                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          className={`p-2 rounded-lg border-l-3 flex items-center gap-2 transition-all ${cat.border} ${
                            isToday
                              ? isDarkMode ? 'bg-slate-800/80 border border-slate-700' : 'bg-blue-50/30 border border-blue-100'
                              : isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-gray-50/50 border border-gray-100'
                          }`}
                        >
                          <i className={`fas ${cat.icon} text-xs`}></i>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{item.title}</p>
                            <div className="flex items-center gap-2">
                              {item.time && <span className="text-[9px] text-slate-400 font-mono">{item.time}</span>}
                              {item.className && <span className="text-[9px] text-slate-400 truncate">{item.className}</span>}
                              {item.priority === 'high' && (
                                <span className="text-[9px] font-semibold text-red-400">
                                  <i className="fas fa-exclamation-circle text-[8px] mr-0.5"></i>{t('high')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Complete Button for tasks */}
                          {item.completable && (
                            <button
                              onClick={() => handleQuickComplete(item.id)}
                              disabled={isCompleting}
                              className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${
                                isCompleting
                                  ? 'border-blue-300 bg-blue-50'
                                  : isDarkMode
                                  ? 'border-slate-600 hover:border-blue-500 hover:bg-blue-500/10'
                                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                              }`}
                              title={t('markComplete')}
                            >
                              {isCompleting ? (
                                <i className="fas fa-spinner fa-spin text-[8px] text-blue-500"></i>
                              ) : (
                                <i className={`fas fa-check text-[8px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}></i>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
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
