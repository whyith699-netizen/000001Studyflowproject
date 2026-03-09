import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { studySessionsService, userService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useTimer } from '../contexts/TimerContext';
import Sidebar from './Sidebar';

const ReportsPage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { liveElapsedMinutes } = useTimer();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [extensionStudyTime, setExtensionStudyTime] = useState(0);

  useEffect(() => {
    const unsubscribe = studySessionsService.subscribeToSessions((fetchedSessions) => {
      setSessions(fetchedSessions);
      setLoading(false);
    });

    // Also load totalStudyTime from user profile (set by Extension tab tracking)
    const loadExtensionTime = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile?.totalStudyTime) {
          // totalStudyTime from Extension is in seconds, convert to minutes
          setExtensionStudyTime(Math.floor(profile.totalStudyTime / 60));
        }
      } catch (error) {
        console.error('Error loading extension study time:', error);
      }
    };
    loadExtensionTime();

    return () => unsubscribe();
  }, []);

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  const toMillis = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (value && typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }
    return 0;
  };

  const getPeriodRange = (period) => {
    if (period === 'all') return { start: null, end: null };
    if (period === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      return { start: start.getTime(), end: now.getTime() };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: now.getTime() };
  };

  const { start: periodStart, end: periodEnd } = getPeriodRange(selectedPeriod);
  const allPomodoroSessions = sessions.filter((session) => session.type === 'pomodoro');
  const pomodoroSessions = allPomodoroSessions.filter((session) => {
    const time = toMillis(session.completedAt || session.createdAt);
    if (selectedPeriod === 'all') return true;
    return time >= periodStart && time <= periodEnd;
  });

  const sessionMinutes = pomodoroSessions.reduce((acc, s) => acc + Math.floor(s.duration || 0), 0);
  const liveMinutes = Math.floor(Math.max(0, Number(liveElapsedMinutes) || 0));
  const totalMinutesRaw = sessionMinutes + (selectedPeriod === 'all' ? extensionStudyTime : 0) + liveMinutes;
  const totalMinutes = Math.floor(totalMinutesRaw);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.floor(totalMinutes % 60);
  const completedPomodoros = pomodoroSessions.length;

  const getAverageDays = () => {
    if (selectedPeriod === 'week') return 7;
    if (selectedPeriod === 'month') return Math.max(1, now.getDate());
    if (allPomodoroSessions.length === 0) return 1;
    const firstSessionTime = Math.min(...allPomodoroSessions.map((session) => toMillis(session.completedAt || session.createdAt)).filter((value) => value > 0));
    if (!firstSessionTime || Number.isNaN(firstSessionTime)) return 1;
    return Math.max(1, Math.floor((now.getTime() - firstSessionTime) / msPerDay) + 1);
  };

  const avgPerDay = Math.floor(totalMinutes / getAverageDays());

  const getDailyData = () => {
    const days = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
    const today = now.getDay();
    const data = Array(7).fill(0);

    pomodoroSessions.forEach(session => {
      const sessionDate = new Date(session.completedAt || session.createdAt);
      data[sessionDate.getDay()] += Math.floor(session.duration || 0);
    });

    const boostedData = data.map((value, index) => (index === today ? value + liveMinutes : value));
    const maxMinutes = Math.max(...boostedData, 60);

    return days.map((name, i) => {
      let mins = data[i];
      // Add live elapsed to today
      if (i === today) mins += liveMinutes;
      return {
        name,
        minutes: mins,
        percentage: Math.max((mins / maxMinutes) * 100, 5),
        isToday: i === today
      };
    });
  };

  const dailyData = getDailyData();

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0">
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3">
          {/* Header */}
          <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('studyReports')}</h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('reportsSubtitle')}</p>
              </div>
              <div className={`flex items-center gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                {['week', 'month', 'all'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedPeriod === period
                        ? isDarkMode ? 'sf-dark-card shadow-sm text-blue-400' : 'bg-white shadow-sm text-blue-600'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {period === 'week' ? t('thisWeek') : period === 'month' ? t('thisMonth') : t('allTime')}
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <i className="fas fa-clock text-blue-600"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('totalStudyTime')}</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{totalHours}h {remainingMinutes}m</p>
                </div>

                <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <i className="fas fa-check-circle text-blue-500"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('sessions')}</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{pomodoroSessions.length}</p>
                </div>

                <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <i className="fas fa-stopwatch text-blue-500"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('pomodoros')}</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{completedPomodoros}</p>
                </div>

                <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <i className="fas fa-chart-line text-blue-500"></i>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('avgPerDay')}</span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{avgPerDay}m</p>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-chart-bar text-blue-600"></i>
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('dailyActivity')}</h2>
                </div>
                <div className="h-36 flex items-end justify-between gap-3 px-2">
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
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <i className="fas fa-history text-blue-500"></i>
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('recentSessions')}</h2>
                </div>
                {pomodoroSessions.length === 0 ? (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <i className="fas fa-clock text-4xl mb-3 opacity-40"></i>
                    <p className="text-sm">{t('noStudySessions')}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('startFocusSession')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pomodoroSessions.slice(0, 10).map((session) => (
                      <div 
                        key={session.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            session.type === 'pomodoro' ? 'bg-blue-50' : 'bg-gray-50'
                          }`}>
                            <i className={`fas ${session.type === 'pomodoro' ? 'fa-stopwatch text-blue-500' : 'fa-coffee text-gray-500'} text-sm`}></i>
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {session.taskName || (session.type === 'pomodoro' ? t('focusSession') : t('breakLabel'))}
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

