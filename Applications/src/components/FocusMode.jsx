import React, { useState, useEffect, useMemo } from "react";
import { auth } from "../firebase-config";
import {
  userService,
  studySessionsService,
  tasksService,
} from "../services/firestore-service";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useLang } from "../contexts/LanguageContext";
import { useTimerPopup } from "../contexts/TimerContext";
import { useAdvancedAnalytics } from "../hooks/useAdvancedAnalytics";
import { getQuoteOfTheDay } from "../utils/quotes";
import Timer from "./Timer";
import Sidebar from "./Sidebar";

const FocusMode = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { openMiniTimerPopup } = useTimerPopup();
  const { focusStats } = useAdvancedAnalytics('all');
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [incompleteTasks, setIncompleteTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile?.streak) setStreak(profile.streak);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadUserData();

    const unsubSessions = studySessionsService.subscribeToSessions(
      (fetchedSessions) => {
        const pomodoroOnly = fetchedSessions.filter(
          (session) => session.type === "pomodoro",
        );
        setSessions(pomodoroOnly);
        setLoading(false);
      },
    );

    const unsubTasks = tasksService.subscribeToTasks((fetchedTasks) => {
      const incomplete = fetchedTasks
        .filter(task => !task.completed)
        .slice(0, 5);
      setIncompleteTasks(incomplete);
    });

    return () => {
      unsubSessions();
      unsubTasks();
    };
  }, []);

  // Group sessions for display (Today / Yesterday / Earlier)
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const displaySessions = sessions.slice(0, 7);
    const groups = { today: [], yesterday: [], earlier: [] };

    displaySessions.forEach(s => {
      const d = new Date(s.completedAt || s.timestamp || s.createdAt);
      if (d >= todayStart) groups.today.push(s);
      else if (d >= yesterdayStart) groups.yesterday.push(s);
      else groups.earlier.push(s);
    });

    return groups;
  }, [sessions]);

  const quote = getQuoteOfTheDay();

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return t("mAgo", { n: minutes });
    if (hours < 24) return t("hAgo", { n: hours });
    if (days === 1) return t("yesterday");
    return t("daysAgo", { n: days });
  };

  const renderSessionGroup = (label, items) => {
    if (items.length === 0) return null;
    return (
      <div key={label} className="mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}>
          {label}
        </span>
        <div className="space-y-3 mt-2">
          {items.map((session) => (
            <div key={session.id} className="flex justify-between items-start">
              <div>
                <p className={`font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  {session.taskName || t("focusSession")}
                </p>
                <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                  {t("focusMinutes", { n: session.duration })}
                </p>
              </div>
              <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                {formatTimeAgo(session.completedAt || session.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex h-screen w-full overflow-hidden ${isDarkMode ? "sf-dark-shell" : "bg-gradient-to-br from-slate-50 to-white"}`}
    >
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col h-full overflow-y-auto md:pb-0"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex-1 w-full px-4 py-3 pb-32 md:px-6 md:py-4 md:pb-0">
          {/* Header */}
          <div className={`rounded-xl p-3 border shadow-sm mb-3 ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <i className="fas fa-clock text-blue-600 text-xl"></i>
                <div>
                  <h1 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {t("focusModeTitle")}
                  </h1>
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t("focusModeSubtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={openMiniTimerPopup}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all active:scale-95 shadow-md"
                title="Open Mini Timer in Popup Window"
              >
                <span className="material-symbols-outlined text-lg">open_in_new</span>
                <span className="hidden sm:inline">Mini Timer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Column: Timer */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <Timer mode="full" hideBreakTabs />

              {/* Motivational Quote */}
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <i className={`fas fa-quote-left text-xs ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}></i>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {t('quoteOfTheDay')}
                  </span>
                </div>
                <p className={`text-sm italic ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className={`text-[10px] mt-1 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                  — {quote.author}
                </p>
              </div>
            </div>

            {/* Right Column: Widgets */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Focus Statistics Card */}
              <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
                  <i className="fas fa-chart-bar text-blue-500"></i>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {t('focusStats')}
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {focusStats.todayTotal}m
                    </p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('today')}</p>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {focusStats.weekAvg}m
                    </p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('weekAvg')}</p>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {focusStats.longestSession}m
                    </p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('longest')}</p>
                  </div>
                </div>
              </div>

              {/* Study Streak */}
              <div className={`rounded-xl p-3 border shadow-sm relative overflow-hidden ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i className={`fas fa-bolt text-6xl ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}></i>
                </div>
                <div className="relative z-10">
                  <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
                    <i className={`fas fa-bolt ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}></i>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {t("studyStreak")}
                    </h3>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <p className={`text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-800"}`}>{streak}</p>
                    <p className={`text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("days")}</p>
                  </div>
                  <p className={`text-xs font-medium flex items-center gap-1 ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}>
                    <i className="fas fa-arrow-up"></i>
                    {streak > 0 ? t("keepItUpStreak") : t("startSession")}
                  </p>
                  <div className="flex gap-1 mt-4">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i < Math.min(streak, 7) ? "bg-blue-500" : isDarkMode ? "bg-slate-700" : "bg-gray-200"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tasks to Focus On */}
              {incompleteTasks.length > 0 && (
                <div className={`rounded-xl p-3 border shadow-sm ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}>
                  <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
                    <i className="fas fa-crosshairs text-blue-500"></i>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {t('tasksToFocus')}
                    </h3>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                      {incompleteTasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {incompleteTasks.map(task => (
                      <div key={task.id} className={`flex items-center gap-2 p-1.5 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`}></span>
                        <span className={`text-xs truncate ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                          {task.title || task.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expanded Session History */}
              <div className={`rounded-xl p-3 border shadow-sm flex-1 ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}>
                <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
                  <i className="fas fa-history text-blue-500"></i>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {t("recentSessions")}
                  </h3>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className={`text-center py-6 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    <i className="fas fa-clock text-2xl mb-2 opacity-40"></i>
                    <p className="text-xs">{t("noSessionsYet")}</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[300px]">
                    {renderSessionGroup(t('today'), groupedSessions.today)}
                    {renderSessionGroup(t('yesterday'), groupedSessions.yesterday)}
                    {renderSessionGroup(t('earlier'), groupedSessions.earlier)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FocusMode;
