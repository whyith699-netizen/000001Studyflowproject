import React, { useState, useEffect } from 'react';
import { tasksService, classesService } from '../services/firestore-service';

// Task type configurations
const TASK_TYPES = {
  exam: { label: 'Exam', icon: 'fa-file-alt', color: 'text-red-600', bg: 'bg-red-50' },
  individual: { label: 'Individual', icon: 'fa-user', color: 'text-blue-600', bg: 'bg-blue-50' },
  group: { label: 'Group', icon: 'fa-users', color: 'text-green-600', bg: 'bg-green-50' },
  other: { label: 'Other', icon: 'fa-sticky-note', color: 'text-gray-600', bg: 'bg-gray-50' }
};

const StudyGoals = () => {
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
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm h-full">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
          <i className="fas fa-tasks text-amber-500"></i>
          <h2 className="text-sm font-semibold text-gray-900">My Tasks</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm h-full flex flex-col">
      {/* Header - No Add Button */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <i className="fas fa-tasks text-amber-500"></i>
          <h2 className="text-sm font-semibold text-gray-900">My Tasks</h2>
        </div>
        
        {/* Quick Stats Only */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
          <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
            <i className="fas fa-file-alt text-[10px]"></i>
            {taskCounts.exam}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
            <i className="fas fa-user text-[10px]"></i>
            {taskCounts.individual}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
            <i className="fas fa-users text-[10px]"></i>
            {taskCounts.group}
          </span>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <i className="fas fa-clipboard-list text-3xl mb-2 opacity-40"></i>
            <p className="text-xs">No tasks yet</p>
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
                  task.completed ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'
                } ${priorityClass} border border-gray-100`}
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
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${typeConfig.bg} ${typeConfig.color}`}>
                      <i className={`fas ${typeConfig.icon}`}></i>
                      {typeConfig.label}
                    </span>
                    {task.className && (
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {task.className}
                      </span>
                    )}
                  </div>
                  
                  <span className={`text-sm font-medium block truncate ${
                    task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                  }`}>
                    {task.text || 'Untitled Task'}
                  </span>
                  
                  {task.dueDate && (
                    <span className="text-[10px] text-gray-400">
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
        <button className="w-full mt-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          View All {tasks.length} Tasks
        </button>
      )}
    </div>
  );
};

export default StudyGoals;
