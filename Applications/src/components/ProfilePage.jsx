import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { userService, achievementService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useAdvancedAnalytics } from '../hooks/useAdvancedAnalytics';
import Sidebar from './Sidebar';
import BadgeGallery from './analytics/BadgeGallery';
import SocialSection from './SocialSection';

const ProfilePage = () => {
  const { isDarkMode } = useDarkMode();
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const { totalFocusMinutes, completedTasksCount } = useAdvancedAnalytics('all');

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
  }, []);

  const totalHours = Math.floor(totalFocusMinutes / 60);

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-slate-50'}`}>
      <Sidebar user={user} />
      
      <main
        className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-4">
          {/* Header */}
          <div className={`rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
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
                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center md:justify-start">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-orange-900/20 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                    <i className="fas fa-fire"></i>
                    {profile?.streak || 0} Day Streak
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <i className="fas fa-clock"></i>
                    {totalHours}h Focused
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <i className="fas fa-check-circle"></i>
                    {completedTasksCount} Tasks Done
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Achievements Section */}
            <div className={`lg:col-span-7 rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Badges & Achievements</h2>
                <span className="text-xs font-bold text-blue-500">{earnedBadges.length} / {allBadges.length} Unlocked</span>
              </div>
              <BadgeGallery earnedBadges={earnedBadges} allBadges={allBadges} isDarkMode={isDarkMode} />
            </div>

            {/* Social Section */}
            <div className={`lg:col-span-5 rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
              <h2 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Social & Community</h2>
              <SocialSection isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
