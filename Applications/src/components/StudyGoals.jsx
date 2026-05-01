import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { tasksService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';

const TASK_TYPES = {
  exam: { label: 'Exam', icon: 'fa-file-alt', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  individual: { label: 'Individual', icon: 'fa-user', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  group: { label: 'Group', icon: 'fa-users', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  other: { label: 'Other', icon: 'fa-sticky-note', color: 'text-gray-500', bg: 'bg-gray-50', darkBg: 'bg-gray-800' }
};

const StudyGoals = ({ className }) => {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);

  useEffect(() => {
    const unsubTasks = tasksService.subscribeToTasks((fetchedTasks) => {
      const sorted = [...fetchedTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setTasks(sorted);
      setLoading(false);
    });

    return () => unsubTasks();
  }, []);

  const taskCounts = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.completed && Object.prototype.hasOwnProperty.call(acc, task.type)) {
        acc[task.type]++;
      }
      return acc;
    }, { exam: 0, individual: 0, group: 0 });
  }, [tasks]);

  // Completion percentage
  const completionPct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.completed).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  // Due today count
  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => !t.completed && t.dueDate && t.dueDate.split('T')[0] === todayStr).length;
  }, [tasks]);

  // Overdue count
  const overdueCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => !t.completed && t.dueDate && t.dueDate.split('T')[0] < todayStr).length;
  }, [tasks]);

  // Priority breakdown
  const priorityBreakdown = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.filter(t => !t.completed).forEach(t => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return counts;
  }, [tasks]);

  const isOverdue = useCallback((task) => {
    if (task.completed || !task.dueDate) return false;
    return task.dueDate.split('T')[0] < new Date().toISOString().split('T')[0];
  }, []);

  const isDueToday = useCallback((task) => {
    if (task.completed || !task.dueDate) return false;
    return task.dueDate.split('T')[0] === new Date().toISOString().split('T')[0];
  }, []);

  const handleToggle = async (taskId, currentStatus) => {
    try {
      await tasksService.toggleTask(taskId, !currentStatus);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksService.deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const title = quickAddText.trim();
    if (!title || quickAddSubmitting) return;
    setQuickAddSubmitting(true);
    try {
      await tasksService.addTask({ title, type: 'individual', priority: 'medium' });
      setQuickAddText('');
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  // Progress bar color
  const progressColor = completionPct >= 75 ? 'bg-emerald-500' : completionPct >= 40 ? 'bg-blue-500' : 'bg-amber-500';

  if (loading) {
    return (
      <div className={`rounded-2xl p-3 border shadow-sm flex-1 flex flex-col ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'} ${className || ''}`}>
        <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <i className="fas fa-tasks text-blue-500"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('myTasks')}</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-3 border shadow-sm flex-1 flex flex-col ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'} ${className || ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <i className="fas fa-tasks text-blue-500"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('myTasks')}</h2>
          {dueTodayCount > 0 && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              {dueTodayCount} {t('dueTodayBadge')}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              {overdueCount} {t('overdue')}
            </span>
          )}
        </div>

        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <i className="fas fa-file-alt text-[10px]"></i>{taskCounts.exam}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <i className="fas fa-user text-[10px]"></i>{taskCounts.individual}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <i className="fas fa-users text-[10px]"></i>{taskCounts.group}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('completionRate')}</span>
          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{completionPct}%</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Priority Breakdown Pills */}
      <div className="flex items-center gap-1.5 mb-2">
        {priorityBreakdown.high > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{t('high')}: {priorityBreakdown.high}</span>
        )}
        {priorityBreakdown.medium > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{t('medium')}: {priorityBreakdown.medium}</span>
        )}
        {priorityBreakdown.low > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">{t('low')}: {priorityBreakdown.low}</span>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0 pr-1">
        {tasks.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <i className="fas fa-clipboard-list text-3xl mb-2 opacity-40"></i>
            <p className="text-xs">{t('noTasksYet')}</p>
          </div>
        ) : (
          tasks.map((task) => {
            const typeConfig = TASK_TYPES[task.type] || TASK_TYPES.other;
            const priorityClass = task.priority === 'high' ? 'border-l-red-500' :
                                  task.priority === 'medium' ? 'border-l-amber-500' : 'border-l-green-500';
            const overdue = isOverdue(task);
            const dueToday = isDueToday(task);

            return (
              <div
                key={task.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border-l-3 transition-all group ${
                  task.completed
                    ? isDarkMode ? 'bg-slate-800/50 opacity-60' : 'bg-gray-50 opacity-60'
                    : overdue
                    ? isDarkMode ? 'bg-red-900/10 hover:bg-red-900/20' : 'bg-red-50/50 hover:bg-red-50'
                    : isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50'
                } ${priorityClass} border ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}
              >
                <div className="relative flex items-center pt-0.5">
                  <input
                    type="checkbox"
                    checked={task.completed || false}
                    onChange={() => handleToggle(task.id, task.completed)}
                    className="peer w-4 h-4 appearance-none rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  />
                  <i className="fas fa-check absolute text-white text-[8px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity left-[3px] top-[5px]"></i>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDarkMode ? typeConfig.darkBg : typeConfig.bg} ${typeConfig.color}`}>
                      <i className={`fas ${typeConfig.icon}`}></i>
                      {typeConfig.label}
                    </span>
                    {task.className && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'text-slate-400 bg-slate-700' : 'text-gray-500 bg-gray-100'}`}>
                        {task.className}
                      </span>
                    )}
                    {overdue && (
                      <span className="text-[10px] font-bold text-red-500">{t('overdue')}</span>
                    )}
                    {dueToday && !overdue && (
                      <span className="text-[10px] font-bold text-amber-500">{t('dueToday')}</span>
                    )}
                  </div>

                  <span className={`text-sm font-medium block truncate ${
                    task.completed
                      ? isDarkMode ? 'line-through text-slate-500' : 'line-through text-gray-400'
                      : isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {task.title || task.text || 'Untitled Task'}
                  </span>

                  {task.dueDate && (
                    <span className={`text-[10px] ${overdue ? 'text-red-400 font-semibold' : isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {t('dueDate')}: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity p-0.5"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Inline Quick Add */}
      <form onSubmit={handleQuickAdd} className={`mt-2 pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            placeholder={t('quickAddPlaceholder')}
            className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border outline-none transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-blue-400'
            }`}
          />
          <button
            type="submit"
            disabled={!quickAddText.trim() || quickAddSubmitting}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all"
          >
            <i className={`fas ${quickAddSubmitting ? 'fa-spinner fa-spin' : 'fa-plus'} text-[10px]`}></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudyGoals;
