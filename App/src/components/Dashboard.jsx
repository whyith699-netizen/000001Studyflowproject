import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { tasksService, classesService, userService, uniformsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import Sidebar from './Sidebar';
import Timer from './Timer';
import WeeklyProgress from './WeeklyProgress';
import StudyGoals from './StudyGoals';

const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_LABEL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Resolve class icon - handles both 'fa-book' and 'book' formats (Extension compatibility)
const getClassIcon = (cls) => {
  const icon = cls.icon;
  if (!icon) return 'fa-graduation-cap';
  if (icon.startsWith('fa-')) return icon;
  return `fa-${icon}`;
};

const Dashboard = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [streak, setStreak] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [uniforms, setUniforms] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [formData, setFormData] = useState({
    text: '',
    type: 'individual',
    classId: '',
    priority: 'medium',
    dueDate: ''
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubClasses = classesService.subscribeToClasses((fetchedClasses) => {
      setClasses(fetchedClasses);
    });

    const unsubUniforms = uniformsService.subscribeToUniforms((data) => {
      setUniforms(data);
    });

    const loadStreak = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile?.streak) setStreak(profile.streak);
      } catch (error) {
        console.error('Error loading streak:', error);
      }
    };
    loadStreak();

    return () => {
      unsubClasses();
      unsubUniforms();
    };
  }, []);

  // Derived data
  const todayKey = DAYS_MAP[currentTime.getDay()];
  const todayLabel = DAYS_LABEL[currentTime.getDay()];
  const todayUniform = uniforms[todayKey] || null;
  const todayClasses = classes.filter(cls => cls.days && cls.days.some(d => d.toLowerCase() === todayKey.toLowerCase()));

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

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3 h-full">
          {/* Header */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <h1 className={`text-xl md:text-2xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('welcomeBack')}, {user?.displayName?.split(' ')[0] || 'Student'}
                </h1>
                <div className="flex items-center gap-2">
                  <i className="fas fa-bolt text-blue-500"></i>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('streakMessage', { n: streak })}! {t('keepItUp')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddTaskModal(true)}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                {t('newTask')}
              </button>
            </div>
          </div>

          {/* 3-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
            
            {/* LEFT COLUMN — Info Widgets */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              
              {/* Live Clock & Date */}
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-clock text-blue-600"></i>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('timeAndDate')}</h3>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-black tracking-wider font-mono ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {formatTime(currentTime)}
                  </p>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {todayLabel}, {formatDate(currentTime)}
                  </p>
                </div>
              </div>

              {/* Today's Uniform */}
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-tshirt text-blue-500"></i>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('todayUniform')}</h3>
                </div>
                {todayUniform ? (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                      <i className="fas fa-tshirt text-blue-500 text-lg"></i>
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{todayUniform}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{todayLabel}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <i className="fas fa-tshirt text-xl mb-1 opacity-30"></i>
                    <p className="text-xs">{t('notSet')}</p>
                  </div>
                )}
              </div>

              {/* Today's Schedule */}
              <div className={`rounded-xl p-3 border shadow-sm flex-1 ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-book text-blue-500"></i>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('todaySchedule')}</h3>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    {todayClasses.length} {t('classes')}
                  </span>
                </div>
                {todayClasses.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {todayClasses.map((cls) => (
                      <div key={cls.id} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                          <i className={`fas ${getClassIcon(cls)} text-blue-600`}></i>
                        </div>
                        <p className={`font-medium text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{cls.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <i className="fas fa-calendar-check text-xl mb-1 opacity-30"></i>
                    <p className="text-xs">{t('noClassToday')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CENTER COLUMN — Timer & Progress */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <Timer mode="compact" />
              <div className="flex-1 min-h-0">
                <WeeklyProgress />
              </div>
            </div>

            {/* RIGHT COLUMN — Tasks & Quote */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              <StudyGoals />

              {/* Quote of the Day */}
              <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl p-5 shadow-sm relative text-white flex-shrink-0 border border-white/[0.06]">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <i className="fas fa-quote-right text-6xl"></i>
                </div>
                <p className="text-xs font-medium text-blue-100 mb-2 uppercase tracking-wider">{t('quoteOfTheDay')}</p>
                <p className="text-lg font-semibold leading-relaxed relative z-10">
                  "The secret of getting ahead is getting started."
                </p>
                <p className="mt-3 text-sm font-medium text-blue-200 relative z-10">— Mark Twain</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 w-full max-w-md shadow-xl ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('addTask')}</h2>
              <button 
                onClick={() => setShowAddTaskModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-400"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.text}
                  onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder={t('taskTitle')}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                >
                  <option value="exam">{t('exam')}</option>
                  <option value="individual">{t('individual')}</option>
                  <option value="group">{t('group')}</option>
                </select>
              </div>

              <select
                value={formData.classId}
                onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="">{t('selectClass')}</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
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
                    t('addTask')
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
