import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase-config';
import { examsService, studySessionsService } from '../services/firestore-service';
import { streakService, STREAK_UPDATE_EVENT } from '../services/streak-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import Timer from './Timer';
import Sidebar from './Sidebar';

const FocusMode = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const [streak, setStreak] = useState(0);
  const [exams, setExams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      // Load streak from new service
      await streakService.loadFromFirestore();
      setStreak(streakService.checkStreakValidity());
    };

    loadUserData();

    const unsubExams = examsService.subscribeToExams((fetchedExams) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = fetchedExams
        .filter(e => new Date(e.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);
      setExams(upcoming);
    });

    const unsubSessions = studySessionsService.subscribeToSessions((fetchedSessions) => {
      setSessions(fetchedSessions.slice(0, 3));
      setLoading(false);
    });

    // Listen for streak updates (real-time)
    const handleStreakUpdate = (e) => {
      setStreak(e.detail.streak);
    };
    window.addEventListener(STREAK_UPDATE_EVENT, handleStreakUpdate);

    return () => {
      unsubExams();
      unsubSessions();
      window.removeEventListener(STREAK_UPDATE_EVENT, handleStreakUpdate);
    };
  }, []);

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 md:px-10 md:py-10">
          {/* Header */}
          <div className={`rounded-xl p-4 border shadow-sm mb-6 ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <i className="fas fa-clock text-blue-600 text-xl"></i>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Focus Mode</h1>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Block out distractions with the Pomodoro technique</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Timer */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <Timer mode="full" />
            </div>

            {/* Right Column: Widgets */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Daily Streak */}
              <div className={`rounded-xl p-5 border shadow-sm relative overflow-hidden ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i className="fas fa-fire text-orange-500 text-6xl"></i>
                </div>
                <div className="relative z-10">
                  <div className={`flex items-center gap-2 mb-3 pb-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                    <i className="fas fa-fire text-orange-500"></i>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Daily Streak</h3>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{streak}</p>
                    <p className={`text-sm mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Days</p>
                  </div>
                  <p className="text-green-600 text-xs font-medium flex items-center gap-1">
                    <i className="fas fa-arrow-up"></i>
                    {streak > 0 ? "Keep it up! You're on fire." : "Start a session to begin!"}
                  </p>
                  <div className="flex gap-1 mt-4">
                    {[...Array(7)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 flex-1 rounded-full ${i < Math.min(streak, 7) ? 'bg-orange-500' : isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Upcoming Exams */}
              <div className={`rounded-xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center justify-between mb-4 pb-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-calendar-alt text-blue-600"></i>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Exams</h3>
                  </div>
                  <Link to="/schedule" className="text-blue-600 text-xs font-medium hover:underline">View All</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                  ) : exams.length === 0 ? (
                    <div className={`text-center py-6 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      <i className="fas fa-calendar-check text-2xl mb-2 opacity-40"></i>
                      <p className="text-xs">No upcoming exams</p>
                    </div>
                  ) : (
                    exams.map((exam) => (
                      <div key={exam.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className={`flex flex-col items-center w-10 h-10 rounded-lg border text-center justify-center ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
                          <span className="text-[9px] font-bold text-red-500 uppercase leading-none">
                            {new Date(exam.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className={`text-sm font-bold leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {new Date(exam.date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{exam.title}</p>
                          <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{exam.subject || 'No subject'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Sessions */}
              <div className={`rounded-xl p-5 border shadow-sm flex-1 ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-4 pb-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-history text-green-600"></i>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Sessions</h3>
                </div>
                <div className={`relative pl-4 border-l-2 space-y-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className={`text-center py-6 -ml-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      <i className="fas fa-clock text-2xl mb-2 opacity-40"></i>
                      <p className="text-xs">No sessions yet</p>
                    </div>
                  ) : (
                    sessions.map((session, index) => (
                      <div key={session.id} className="relative">
                        <div className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 ${isDarkMode ? 'border-[#1e293b]' : 'border-white'} ${
                          index === 0 ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
                        }`}></div>
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {session.taskName || 'Focus Session'}
                          </p>
                          {index === 0 ? (
                            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              Recent
                            </span>
                          ) : (
                            <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                              {formatTimeAgo(session.completedAt || session.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{session.duration}m focus</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FocusMode;
