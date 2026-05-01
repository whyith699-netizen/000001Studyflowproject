import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase-config';
import { userService, achievementService, tasksService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useAdvancedAnalytics } from '../hooks/useAdvancedAnalytics';
import Sidebar from './Sidebar';
import BadgeGallery from './analytics/BadgeGallery';
import ActivityHeatmap from './analytics/ActivityHeatmap';
import SocialSection from './SocialSection';

const ProfilePage = () => {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const { totalFocusMinutes, completedTasksCount, monthlySummary, rawSessions } = useAdvancedAnalytics('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, earned, all] = await Promise.all([
          userService.getProfile(),
          achievementService.getMyAchievements(),
          achievementService.fetchBadges()
        ]);
        setProfile(p);
        setEarnedBadges(earned);
        setAllBadges(all);
      } catch (error) {
        console.error("Failed to load profile data:", error);
      }
    };
    loadData();

    const unsubTasks = tasksService.subscribeToTasks(setRecentTasks);
    return () => { unsubTasks(); };
  }, []);

  const totalHours = Math.floor(totalFocusMinutes / 60);

  // Level & XP system
  const level = Math.max(1, Math.floor(totalHours / 10) + 1);
  const xpInCurrentLevel = totalHours % 10;
  const xpForNextLevel = 10;
  const xpProgress = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);

  // Recent activity feed (combined sessions + completed tasks)
  const recentActivity = useMemo(() => {
    const activities = [];

    rawSessions.slice(0, 10).forEach(s => {
      activities.push({
        id: `s-${s.id}`,
        type: 'session',
        text: s.taskName || t('focusSession'),
        detail: t('focusMinutes', { n: s.duration }),
        timestamp: s.completedAt || s.timestamp || s.createdAt,
        icon: 'fa-clock',
        iconColor: 'text-blue-500'
      });
    });

    recentTasks.filter(t => t.completed).slice(0, 5).forEach(task => {
      activities.push({
        id: `t-${task.id}`,
        type: 'task',
        text: task.title || task.text,
        detail: task.type || t('individual'),
        timestamp: task.completedAt || task.updatedAt || task.createdAt,
        icon: 'fa-check-circle',
        iconColor: 'text-emerald-500'
      });
    });

    return activities
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 8);
  }, [rawSessions, recentTasks, t]);

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const cardCls = isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100';

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-slate-50'}`}>
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-4">
          {/* Row 1: Header */}
          <div className={`rounded-2xl p-6 border shadow-sm ${cardCls}`}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.displayName || 'Student'}
                </h1>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {user?.email}
                </p>
                {memberSince && (
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <i className="fas fa-calendar-alt mr-1"></i>{t('memberSince')} {memberSince}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center md:justify-start">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-orange-900/20 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                    <i className="fas fa-fire"></i>{profile?.streak || 0} {t('days')}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <i className="fas fa-clock"></i>{totalHours}h
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <i className="fas fa-check-circle"></i>{completedTasksCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Level / XP Bar */}
          <div className={`rounded-2xl p-4 border shadow-sm ${cardCls}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {level}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('level')} {level}
                  </p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {xpInCurrentLevel}/{xpForNextLevel}h {t('toNextLevel')}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('levelTitle')}
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          {/* Row 3: Monthly Summary + Activity Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Monthly Summary */}
            <div className={`lg:col-span-4 rounded-2xl p-4 border shadow-sm ${cardCls}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-calendar-check text-blue-500 mr-1.5"></i>{t('monthlySummary')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-blue-600'}`}>{monthlySummary.monthHours}h</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('focusHours')}</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-800' : 'bg-emerald-50'}`}>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-emerald-600'}`}>{monthlySummary.sessionCount}</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('sessions')}</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-800' : 'bg-amber-50'}`}>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-amber-600'}`}>{monthlySummary.completedTasks}</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('tasksDone')}</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-800' : 'bg-orange-50'}`}>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-orange-600'}`}>{monthlySummary.streak}</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('streak')}</p>
                </div>
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className={`lg:col-span-8 rounded-2xl p-4 border shadow-sm ${cardCls}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-th text-blue-500 mr-1.5"></i>{t('activityHeatmap')}
              </h3>
              <ActivityHeatmap sessions={rawSessions} isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Row 4: Badges + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className={`lg:col-span-7 rounded-2xl p-6 border shadow-sm ${cardCls}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('badgesAchievements')}</h2>
                <span className="text-xs font-bold text-blue-500">{earnedBadges.length} / {allBadges.length}</span>
              </div>
              <BadgeGallery earnedBadges={earnedBadges} allBadges={allBadges} isDarkMode={isDarkMode} />
            </div>

            <div className={`lg:col-span-5 rounded-2xl p-4 border shadow-sm ${cardCls}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-stream text-blue-500 mr-1.5"></i>{t('recentActivity')}
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <p className={`text-xs text-center py-6 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('noRecentActivity')}</p>
                ) : (
                  recentActivity.map(activity => (
                    <div key={activity.id} className={`flex items-center gap-2.5 p-2 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                        <i className={`fas ${activity.icon} ${activity.iconColor} text-xs`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{activity.text}</p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{activity.detail}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Row 5: Social */}
          <div className={`rounded-2xl p-6 border shadow-sm ${cardCls}`}>
            <h2 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('socialCommunity')}</h2>
            <SocialSection isDarkMode={isDarkMode} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
