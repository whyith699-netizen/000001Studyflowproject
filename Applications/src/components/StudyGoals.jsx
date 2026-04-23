import React, { useState, useEffect } from 'react';
import { tasksService, classesService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';

// Task type configurations
const TASK_TYPES = {
  exam: { label: 'Exam', icon: 'fa-file-alt', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  individual: { label: 'Individual', icon: 'fa-user', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  group: { label: 'Group', icon: 'fa-users', color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  other: { label: 'Other', icon: 'fa-sticky-note', color: 'text-gray-500', bg: 'bg-gray-50', darkBg: 'bg-gray-800' }
};

const StudyGoals = () => {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTasks = tasksService.subscribeToTasks((fetchedTasks) => {
      const sorted = fetchedTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setTasks(sorted);
      setLoading(false);
    });

    const unsubClasses = classesService.subscribeToClasses((fetchedClasses) => {
      setClasses(fetchedClasses);
    });

    return () => {
      unsubTasks();
      unsubClasses();
    };
  }, []);

  const taskCounts = {
    exam: tasks.filter(t => t.type === 'exam' && !t.completed).length,
    individual: tasks.filter(t => t.type === 'individual' && !t.completed).length,
    group: tasks.filter(t => t.type === 'group' && !t.completed).length
  };

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

  if (loading) {
    return (
      <div className={`rounded-xl p-3 border shadow-sm h-full ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
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
    <div className={`rounded-xl p-3 border shadow-sm h-full flex flex-col ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      {/* Header - No Add Button */}
      <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <i className="fas fa-tasks text-blue-500"></i>
          <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('myTasks')}</h2>
        </div>
        
        {/* Quick Stats Only */}
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <i className="fas fa-file-alt text-[10px]"></i>
            {taskCounts.exam}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <i className="fas fa-user text-[10px]"></i>
            {taskCounts.individual}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-500">
            <i className="fas fa-users text-[10px]"></i>
            {taskCounts.group}
          </span>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <i className="fas fa-clipboard-list text-3xl mb-2 opacity-40"></i>
            <p className="text-xs">{t('noTasksYet')}</p>
          </div>
        ) : (
          tasks.slice(0, 10).map((task) => {
            const typeConfig = TASK_TYPES[task.type] || TASK_TYPES.other;
            const priorityClass = task.priority === 'high' ? 'border-l-red-500' : 
                                  task.priority === 'medium' ? 'border-l-amber-500' : 'border-l-green-500';
            
            return (
              <div
                key={task.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border-l-3 transition-all group ${
                  task.completed 
                    ? isDarkMode ? 'bg-slate-800/50 opacity-60' : 'bg-gray-50 opacity-60'
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
                  </div>
                  
                  <span className={`text-sm font-medium block truncate ${
                    task.completed 
                      ? isDarkMode ? 'line-through text-slate-500' : 'line-through text-gray-400'
                      : isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {task.title || task.text || 'Untitled Task'}
                  </span>
                  
                  {task.dueDate && (
                    <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
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
      
      {tasks.length > 10 && (
        <button className={`w-full mt-3 py-2 text-xs font-semibold rounded-lg transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-blue-50'}`}>
          View All {tasks.length} Tasks
        </button>
      )}
    </div>
  );
};

export default StudyGoals;

