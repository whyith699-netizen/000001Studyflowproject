import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { studySessionsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import Sidebar from './Sidebar';

const ReportsPage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    const unsubscribe = studySessionsService.subscribeToSessions((fetchedSessions) => {
      setSessions(fetchedSessions);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const now = new Date();
  const getStartOfWeek = () => {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getStartOfMonth = () => new Date(now.getFullYear(), now.getMonth(), 1);

  const filterByPeriod = (session) => {
    const sessionDate = new Date(session.completedAt || session.createdAt);
    if (selectedPeriod === 'week') return sessionDate >= getStartOfWeek();
    if (selectedPeriod === 'month') return sessionDate >= getStartOfMonth();
    return true;
  };

  const filteredSessions = sessions.filter(filterByPeriod);
  const totalMinutes = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const completedPomodoros = filteredSessions.filter(s => s.type === 'pomodoro').length;

  const getDailyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = now.getDay();
    const data = Array(7).fill(0);

    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.completedAt || session.createdAt);
      data[sessionDate.getDay()] += session.duration || 0;
    });

    const maxMinutes = Math.max(...data, 60);
    return days.map((name, i) => ({
      name,
      minutes: data[i],
      percentage: Math.max((data[i] / maxMinutes) * 100, 5),
      isToday: i === today
    }));
  };

  const dailyData = getDailyData();

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 md:px-10 md:py-10 flex flex-col gap-6">
          {/* Header */}
          <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Study Reports</h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Track your productivity and progress</p>
              </div>
              <div className={`flex items-center gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                {['week', 'month', 'all'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedPeriod === period
                        ? isDarkMode ? 'bg-[#1e293b] shadow-sm text-blue-400' : 'bg-white shadow-sm text-blue-600'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <i className="fas fa-clock text-blue-600"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Time</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{totalHours}h {remainingMinutes}m</p>
                </div>

                <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <i className="fas fa-check-circle text-green-600"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Sessions</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{filteredSessions.length}</p>
                </div>

                <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <i className="fas fa-stopwatch text-red-600"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Pomodoros</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{completedPomodoros}</p>
                </div>

                <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <i className="fas fa-chart-line text-purple-600"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Avg/Day</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(totalMinutes / 7)}m</p>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className={`rounded-xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-4 pb-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-chart-bar text-blue-600"></i>
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Daily Activity</h2>
                </div>
                <div className="h-48 flex items-end justify-between gap-3 px-2">
                  {dailyData.map((day) => (
                    <div key={day.name} className="flex flex-col items-center gap-2 group flex-1">
                      <div className={`w-full rounded-lg relative h-full flex items-end overflow-hidden border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 group-hover:border-blue-500' : 'bg-gray-50 border-gray-100 group-hover:border-blue-200'}`}>
                        <div
                          className={`w-full rounded-lg transition-all ${
                            day.isToday
                              ? 'bg-blue-600'
                              : day.minutes > 0
                              ? isDarkMode ? 'bg-blue-800 group-hover:bg-blue-700' : 'bg-blue-200 group-hover:bg-blue-300'
                              : isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                          }`}
                          style={{ height: `${day.percentage}%` }}
                        >
                          {day.minutes > 0 && (
                            <span className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                              {day.minutes}m
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium ${day.isToday ? 'text-blue-600 font-bold' : isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        {day.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Sessions */}
              <div className={`rounded-xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-4 pb-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-history text-green-600"></i>
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Sessions</h2>
                </div>
                {filteredSessions.length === 0 ? (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <i className="fas fa-clock text-4xl mb-3 opacity-40"></i>
                    <p className="text-sm">No study sessions yet</p>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Start a focus session to track your progress</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredSessions.slice(0, 10).map((session) => (
                      <div 
                        key={session.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            session.type === 'pomodoro' ? 'bg-red-50' : 'bg-green-50'
                          }`}>
                            <i className={`fas ${session.type === 'pomodoro' ? 'fa-stopwatch text-red-600' : 'fa-coffee text-green-600'} text-sm`}></i>
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {session.taskName || (session.type === 'pomodoro' ? 'Focus Session' : 'Break')}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              {new Date(session.completedAt || session.createdAt).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{session.duration}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
