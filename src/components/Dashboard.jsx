import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { tasksService, classesService, userService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import Sidebar from './Sidebar';
import Timer from './Timer';
import WeeklyProgress from './WeeklyProgress';
import StudyGoals from './StudyGoals';

const Dashboard = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [streak, setStreak] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state for add task
  const [formData, setFormData] = useState({
    text: '',
    type: 'individual',
    classId: '',
    priority: 'medium',
    dueDate: ''
  });

  useEffect(() => {
    // Load classes for dropdown
    const unsubClasses = classesService.subscribeToClasses((fetchedClasses) => {
      setClasses(fetchedClasses);
    });

    // Load user streak
    const loadStreak = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile?.streak) setStreak(profile.streak);
      } catch (error) {
        console.error('Error loading streak:', error);
      }
    };
    loadStreak();

    return () => unsubClasses();
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;
    
    setIsAdding(true);
    try {
      await tasksService.addTask({
        text: formData.text.trim(),
        type: formData.type,
        classId: formData.classId || null,
        className: classes.find(c => c.id === formData.classId)?.name || null,
        priority: formData.priority,
        dueDate: formData.dueDate || null
      });
      setFormData({ text: '', type: 'individual', classId: '', priority: 'medium', dueDate: '' });
      setShowAddTaskModal(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 md:px-10 md:py-10 flex flex-col gap-6">
          {/* Header */}
          <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex flex-col gap-1">
                <h1 className={`text-2xl md:text-3xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Welcome Back, {user?.displayName?.split(' ')[0] || 'Student'}
                </h1>
                <div className="flex items-center gap-2">
                  <i className="fas fa-fire text-orange-500"></i>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    You're on a <span className="text-blue-600 font-bold">{streak}-day learning streak</span>! Keep it up.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddTaskModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                New Task
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (Focus & Stats) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Current Focus Widget */}
              <Timer mode="compact" />

              {/* Weekly Progress Chart */}
              <WeeklyProgress />
            </div>

            {/* Right Column (Checklist & Extra) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Study Goals Checklist */}
              <StudyGoals />

              {/* Daily Quote / Motivation */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 shadow-sm relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <i className="fas fa-quote-right text-6xl"></i>
                </div>
                <p className="text-xs font-medium text-blue-100 mb-1.5 uppercase tracking-wider">Quote of the day</p>
                <p className="text-lg font-semibold leading-relaxed relative z-10">
                  "The secret of getting ahead is getting started."
                </p>
                <p className="mt-3 text-xs font-medium text-blue-100 relative z-10">— Mark Twain</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Task Modal - Enhanced like extension */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 w-full max-w-md shadow-xl ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Task</h2>
              <button 
                onClick={() => setShowAddTaskModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-400"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="space-y-4">
              {/* Task Title + Type */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.text}
                  onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Task title..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                >
                  <option value="exam">Exam</option>
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                </select>
              </div>

              {/* Class Selection */}
              <select
                value={formData.classId}
                onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="">Select class (optional)</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

              {/* Priority + Due Date */}
              <div className="flex gap-2">
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !formData.text.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
