import React, { useState, useEffect } from "react";
import { auth } from "../firebase-config";
import {
  tasksService,
  classesService,
  userService,
  uniformsService,
} from "../services/firestore-service";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useLang } from "../contexts/LanguageContext";
import { useTimerPopup } from "../contexts/TimerContext";
import Sidebar from "./Sidebar";
import Timer from "./Timer";
import WeeklyProgress from "./WeeklyProgress";
import StudyGoals from "./StudyGoals";
import TaskForm from "./forms/TaskForm";
import ClassDetailModal from "./ClassDetailModal";
import { getQuoteOfTheDay } from "../utils/quotes";

const DAYS_MAP = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DAYS_LABEL = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const toDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Resolve class icon - handles both 'fa-book' and 'book' formats (Extension compatibility)
const getClassIcon = (cls) => {
  const icon = cls.icon;
  if (!icon) return "fa-graduation-cap";
  if (icon.startsWith("fa-")) return icon;
  return `fa-${icon}`;
};

const Dashboard = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { openMiniTimerPopup } = useTimerPopup();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const streak = profile?.streak || 0;
  const [isAdding, setIsAdding] = useState(false);
  const [uniforms, setUniforms] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStreakClaimModal, setShowStreakClaimModal] = useState(false);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);
  const [dailyQuote, setDailyQuote] = useState({ text: "", author: "" });
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load daily quote
  useEffect(() => {
    setDailyQuote(getQuoteOfTheDay());
  }, []);

  useEffect(() => {
    const unsubClasses = classesService.subscribeToClasses((fetchedClasses) => {
      setClasses(fetchedClasses);
    });
    const unsubTasks = tasksService.subscribeToTasks((fetchedTasks) => {
      setTasks(fetchedTasks);
    });

    const unsubUniforms = uniformsService.subscribeToUniforms((data) => {
      setUniforms(data);
    });

    const unsubProfile = userService.subscribeToProfile((data) => {
      setProfile(data);
      if (data) {
        const today = toDateKey();
        const lastClaimDate = data.lastStreakClaimDate || null;
        if (lastClaimDate !== today) {
          setShowStreakClaimModal(true);
        } else {
          setShowStreakClaimModal(false);
        }
      }
    });

    return () => {
      unsubClasses();
      unsubTasks();
      unsubUniforms();
      unsubProfile();
    };
  }, []);

  const handleOpenClassDetail = (cls) => {
    setSelectedClass(cls);
    setShowClassDetailModal(true);
  };

  const handleCloseClassDetail = () => {
    setShowClassDetailModal(false);
    setSelectedClass(null);
  };

  // Derived data
  const todayKey = DAYS_MAP[currentTime.getDay()];
  const todayLabel = DAYS_LABEL[currentTime.getDay()];
  const todayUniform = uniforms[todayKey] || null;
  const todayClasses = classes.filter(
    (cls) =>
      cls.days &&
      cls.days.some((d) => d.toLowerCase() === todayKey.toLowerCase()),
  );

  const handleAddTask = async (payload) => {
    setIsAdding(true);
    try {
      const result = await tasksService.addTask(payload);
      setShowAddTaskModal(false);
      return result;
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const handleClaimStreak = async () => {
    setIsClaimingStreak(true);
    try {
      const result = await userService.claimLoginStreak();
      if (result && typeof result.streak === "number") {
        setProfile((prev) => ({
          ...prev,
          streak: result.streak,
          lastStreakClaimDate: toDateKey(),
        }));
      }
      setShowStreakClaimModal(false);
    } catch (error) {
      console.error("Failed to claim streak:", error);
    } finally {
      setIsClaimingStreak(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div
      className={`flex lg:h-screen w-full lg:overflow-hidden ${isDarkMode ? "sf-dark-shell" : "bg-gradient-to-br from-slate-50 to-white"}`}
    >
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex-1 w-full px-4 py-3 flex flex-col gap-3 lg:h-full lg:overflow-hidden">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 lg:overflow-hidden">
            {/* LEFT COLUMN — Info Widgets */}
            <div className="lg:col-span-3 flex flex-col gap-3 lg:h-full min-h-0">
              {/* Live Clock & Date */}
              <div
                className={`rounded-2xl p-3 border shadow-sm ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
              >
                <div
                  className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
                >
                  <i className="fas fa-clock text-blue-600"></i>
                  <h3
                    className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("timeAndDate")}
                  </h3>
                </div>
                <div className="text-center">
                  <p
                    className={`text-3xl font-black tracking-wider font-mono ${isDarkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {formatTime(currentTime)}
                  </p>
                  <p
                    className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                  >
                    {todayLabel}, {formatDate(currentTime)}
                  </p>
                </div>
              </div>

              {/* Today's Uniform */}
              <div
                className={`rounded-2xl p-3 border shadow-sm ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
              >
                <div
                  className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
                >
                  <i className="fas fa-tshirt text-blue-500"></i>
                  <h3
                    className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("todayUniform")}
                  </h3>
                </div>
                {todayUniform ? (
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-blue-900/20" : "bg-blue-50"}`}
                    >
                      <i className="fas fa-tshirt text-blue-500 text-lg"></i>
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      >
                        {todayUniform}
                      </p>
                      <p
                        className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {todayLabel}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-center py-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    <i className="fas fa-tshirt text-xl mb-1 opacity-30"></i>
                    <p className="text-xs">{t("notSet")}</p>
                  </div>
                )}
              </div>

              {/* Today's Schedule */}
              <div
                className={`rounded-2xl p-3 border shadow-sm flex-1 min-h-0 flex flex-col ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
              >
                <div
                  className={`flex items-center gap-2 mb-2 pb-2 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
                >
                  <i className="fas fa-book text-blue-500"></i>
                  <h3
                    className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("todaySchedule")}
                  </h3>
                  <span
                    className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${isDarkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}
                  >
                    {todayClasses.length} {t("classes")}
                  </span>
                </div>
                {todayClasses.length > 0 ? (
                  <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                    <div className="flex flex-col gap-1.5">
                      {todayClasses.map((cls) => (
                        <button
                          type="button"
                          key={cls.id}
                          onClick={() => handleOpenClassDetail(cls)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-50 hover:bg-gray-100"}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isDarkMode ? "bg-blue-900/30" : "bg-blue-50"}`}
                          >
                            <i
                              className={`fas ${getClassIcon(cls)} text-blue-600`}
                            ></i>
                          </div>
                          <p
                            className={`font-medium text-sm truncate ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {cls.name}
                          </p>
                          <i
                            className={`fas fa-chevron-right ml-auto text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                          ></i>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-center py-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    <i className="fas fa-calendar-check text-xl mb-1 opacity-30"></i>
                    <p className="text-xs">{t("noClassToday")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CENTER COLUMN — Header, Timer & Progress */}
            <div className="lg:col-span-6 flex flex-col gap-3 lg:h-full min-h-0">
              {/* Welcome Header */}
              <div
                className={`rounded-2xl p-4 border shadow-sm ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
              >
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h1
                      className={`text-xl md:text-2xl font-bold leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t("welcomeBack")},{" "}
                      {user?.displayName?.split(" ")[0] || "Student"}
                    </h1>
                    <div className="flex items-center gap-2">
                      <i
                        className={`fas fa-bolt ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}
                      ></i>
                      <p
                        className={`text-sm ${isDarkMode ? "sf-accent-text" : "text-gray-500"}`}
                      >
                        {t("streakMessage", { n: streak })}! {t("keepItUp")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddTaskModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2 ${
                      isDarkMode
                        ? "sf-accent-btn"
                        : "bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                    }`}
                  >
                    <i className="fas fa-plus"></i>
                    {t("newTask")}
                  </button>
                </div>
              </div>

              <Timer mode="compact" onPopup={openMiniTimerPopup} />

              <div className="flex-1 min-h-0 flex flex-col lg:overflow-hidden">
                <WeeklyProgress />
              </div>
            </div>

            {/* RIGHT COLUMN — Tasks & Quote */}
            <div className="lg:col-span-3 flex flex-col gap-3 lg:h-full min-h-0">
              {/* Quote of the Day */}
              <div
                className={`rounded-2xl p-5 shadow-sm relative flex-shrink-0 border ${
                  isDarkMode
                    ? "sf-dark-card sf-dark-border sf-dark-text"
                    : "bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white border-white/[0.06]"
                }`}
              >
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <i className="fas fa-quote-right text-6xl"></i>
                </div>
                <p
                  className={`text-xs font-medium mb-2 uppercase tracking-wider ${
                    isDarkMode ? "sf-accent-text" : "text-blue-100"
                  }`}
                >
                  {t("quoteOfTheDay")}
                </p>
                <p className="text-lg font-semibold leading-relaxed relative z-10">
                  "{dailyQuote.text}"
                </p>
                <p
                  className={`mt-3 text-sm font-medium relative z-10 ${
                    isDarkMode ? "sf-dark-muted" : "text-blue-200"
                  }`}
                >
                  &mdash; {dailyQuote.author}
                </p>
              </div>

              <StudyGoals />
            </div>
          </div>
        </div>
      </main>

      {showStreakClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-sm rounded-3xl border p-0 shadow-2xl overflow-hidden ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-100"}`}
          >
            <div
              className={`p-5 relative ${isDarkMode ? "sf-dark-elevated" : "bg-gradient-to-br from-blue-50 to-emerald-50"}`}
            >
              <div
                className={`absolute -top-5 -right-5 w-24 h-24 rounded-full blur-2xl ${
                  isDarkMode ? "bg-blue-500/15" : "bg-blue-500/15"
                }`}
              ></div>
              <div
                className={`absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl ${
                  isDarkMode ? "bg-blue-400/15" : "bg-emerald-500/15"
                }`}
              ></div>

              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "sf-accent-soft" : "bg-white"}`}
                >
                  <i
                    className={`fas fa-trophy ${isDarkMode ? "sf-accent-text" : "text-blue-500"}`}
                  ></i>
                </div>
                <div>
                  <h3
                    className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("claimStudyStreakTitle")}
                  </h3>
                  <p
                    className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                  >
                    {t("claimStudyStreakSubtitle")}
                  </p>
                </div>
              </div>

              <div
                className={`relative z-10 mt-4 rounded-2xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-900/40" : "border-white bg-white/70"}`}
              >
                <p
                  className={`text-xs uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                >
                  {t("studyStreak")}
                </p>
                <div className="flex items-end gap-2">
                  <span
                    className={`text-4xl font-black leading-none ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {streak}
                  </span>
                  <span
                    className={`text-sm mb-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                  >
                    {t("days")}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div
                className={`rounded-xl p-3 mt-3 ${isDarkMode ? "bg-slate-800" : "bg-gray-50"}`}
              >
                <div className="flex gap-1.5">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${i < Math.min(streak, 7) ? "bg-blue-500" : isDarkMode ? "bg-slate-700" : "bg-gray-200"}`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleClaimStreak}
                disabled={isClaimingStreak}
                className={`mt-4 w-full rounded-2xl disabled:opacity-60 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? "sf-accent-btn"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isClaimingStreak ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    {t("claiming")}
                  </>
                ) : (
                  <>
                    <i className="fas fa-gift"></i>
                    {t("claimNow")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-x-hidden"
          onClick={() => setShowAddTaskModal(false)}
        >
          <div
            className={`w-full max-w-2xl rounded-xl border p-4 shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {t("addTask")}
              </h2>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
              >
                <i
                  className={`fas fa-times ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                ></i>
              </button>
            </div>
            <TaskForm
              classes={classes}
              onSubmit={handleAddTask}
              isSubmitting={isAdding}
              mode="create"
              isDarkMode={isDarkMode}
              t={t}
              onCancel={() => setShowAddTaskModal(false)}
            />
          </div>
        </div>
      )}

      {showClassDetailModal && selectedClass && (
        <ClassDetailModal
          cls={selectedClass}
          tasks={tasks}
          isOpen={showClassDetailModal}
          onClose={handleCloseClassDetail}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default Dashboard;
