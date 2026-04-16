import React, { useState, useEffect } from "react";
import { auth } from "../firebase-config";
import {
  userService,
  studySessionsService,
} from "../services/firestore-service";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useLang } from "../contexts/LanguageContext";
import { useTimerPopup } from "../contexts/TimerContext";
import Timer from "./Timer";
import Sidebar from "./Sidebar";

const FocusMode = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { openMiniTimerPopup } = useTimerPopup();
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState([]);
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
        setSessions(pomodoroOnly.slice(0, 3));
        setLoading(false);
      },
    );

    return () => {
      unsubSessions();
    };
  }, []);

  const formatTimeAgo = (timestamp) => {
    // eslint-disable-next-line react-hooks/purity -- time-ago formatting requires current time
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
          <div
            className={`rounded-xl p-3 border shadow-sm mb-3 ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <i className="fas fa-clock text-blue-600 text-xl"></i>
                <div>
                  <h1
                    className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("focusModeTitle")}
                  </h1>
                  <p
                    className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                  >
                    {t("focusModeSubtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={openMiniTimerPopup}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all active:scale-95 shadow-md"
                title="Open Mini Timer in Popup Window"
              >
                <span className="material-symbols-outlined text-lg">
                  open_in_new
                </span>
                <span className="hidden sm:inline">Mini Timer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Column: Timer */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <Timer mode="full" hideBreakTabs />
            </div>

            {/* Right Column: Widgets */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Study Streak */}
              <div
                className={`rounded-xl p-3 border shadow-sm relative overflow-hidden ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i
                    className={`fas fa-bolt text-6xl ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}
                  ></i>
                </div>
                <div className="relative z-10">
                  <div
                    className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
                  >
                    <i
                      className={`fas fa-bolt ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}
                    ></i>
                    <h3
                      className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t("studyStreak")}
                    </h3>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <p
                      className={`text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      {streak}
                    </p>
                    <p
                      className={`text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                    >
                      {t("days")}
                    </p>
                  </div>
                  <p
                    className={`text-xs font-medium flex items-center gap-1 ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}
                  >
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

              {/* Recent Sessions */}
              <div
                className={`rounded-xl p-3 border shadow-sm flex-1 ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
              >
                <div
                  className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
                >
                  <i className="fas fa-history text-blue-500"></i>
                  <h3
                    className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("recentSessions")}
                  </h3>
                </div>
                <div
                  className={`relative pl-4 border-l-2 space-y-4 ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div
                      className={`text-center py-6 -ml-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      <i className="fas fa-clock text-2xl mb-2 opacity-40"></i>
                      <p className="text-xs">{t("noSessionsYet")}</p>
                    </div>
                  ) : (
                    sessions.map((session, index) => (
                      <div key={session.id} className="relative">
                        <div
                          className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 ${isDarkMode ? "sf-dark-border" : "border-white"} ${
                            index === 0
                              ? "bg-blue-500"
                              : isDarkMode
                                ? "bg-slate-600"
                                : "bg-gray-300"
                          }`}
                        ></div>
                        <div className="flex justify-between items-start mb-0.5">
                          <p
                            className={`font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {session.taskName || t("focusSession")}
                          </p>
                          {index === 0 ? (
                            <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {t("recent")}
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                            >
                              {formatTimeAgo(
                                session.completedAt || session.createdAt,
                              )}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                        >
                          {t("focusMinutes", { n: session.duration })}
                        </p>
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
