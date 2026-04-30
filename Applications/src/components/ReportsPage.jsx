import React, { useState } from 'react';
import { auth } from '../firebase-config';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useAdvancedAnalytics } from '../hooks/useAdvancedAnalytics';
import Sidebar from './Sidebar';
import ProductivityScore from './analytics/ProductivityScore';
import TimeOfDayHeatmap from './analytics/TimeOfDayHeatmap';
import SubjectBreakdownChart from './analytics/SubjectBreakdownChart';
import TaskCompletionStats from './analytics/TaskCompletionStats';

const ReportsPage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  const {
    subjectBreakdown,
    heatmap,
    classTaskStats,
    productivityScore,
    totalFocusMinutes,
    completedTasksCount,
    totalTasksCount,
    loading
  } = useAdvancedAnalytics(selectedPeriod);

  const totalHours = Math.floor(totalFocusMinutes / 60);
  const remainingMinutes = Math.floor(totalFocusMinutes % 60);

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />
      
      <main
        className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-4">
          {/* Header */}
          <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
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
            <div className="flex flex-col gap-4">
              {/* Top Row: Score and Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <ProductivityScore score={productivityScore} isDarkMode={isDarkMode} />
                </div>
                
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <div className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-blue-50 rounded-xl">
                        <i className="fas fa-stopwatch text-blue-600"></i>
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('totalFocusTime')}</span>
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalHours}h {remainingMinutes}m</p>
                      <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Focus sessions logged in this period</p>
                    </div>
                  </div>

                  <div className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-emerald-50 rounded-xl">
                        <i className="fas fa-check-double text-emerald-600"></i>
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Task Completion</span>
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{completedTasksCount}/{totalTasksCount}</p>
                      <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Tasks finished vs total assigned</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Row: Heatmap */}
              <div className="w-full">
                <TimeOfDayHeatmap heatmapData={heatmap} isDarkMode={isDarkMode} />
              </div>

              {/* Bottom Row: Breakdown and Subject Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SubjectBreakdownChart data={subjectBreakdown} isDarkMode={isDarkMode} />
                <TaskCompletionStats data={classTaskStats} isDarkMode={isDarkMode} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
