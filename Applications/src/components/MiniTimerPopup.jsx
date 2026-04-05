import React, { useState, useEffect } from "react";
import { useTimer } from "../contexts/TimerContext";
import { useDarkMode } from "../contexts/DarkModeContext";

const MiniTimerPopup = () => {
  const { isDarkMode } = useDarkMode();
  const { timerModes } = useTimer();

  const [isPopupWindow, setIsPopupWindow] = useState(false);
  const [hasParentController, setHasParentController] = useState(false);
  const [popupTimerState, setPopupTimerState] = useState({
    isRunning: false,
    timeLeft: timerModes.pomodoro?.time || 0,
    timerMode: "pomodoro",
    hours: 0,
    minutes: 25,
    seconds: 0,
    elapsedSeconds: 0,
    currentModeDuration: timerModes.pomodoro?.time || 0,
  });

  // Detect if we're in a popup window
  useEffect(() => {
    const hasOpener = window.opener !== null;
    setIsPopupWindow(hasOpener);
    setHasParentController(hasOpener && !window.opener.closed);
  }, []);

  const formatTime = (num) => num.toString().padStart(2, "0");
  const { isRunning, timeLeft, timerMode, hours, minutes, seconds, elapsedSeconds, currentModeDuration } =
    popupTimerState;
  const totalSeconds = currentModeDuration || elapsedSeconds + timeLeft;
  const progressPercent =
    totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;

  const modeVisual = {
    pomodoro: {
      bg: isDarkMode
        ? "bg-gradient-to-br from-slate-900 to-slate-800"
        : "bg-gradient-to-br from-blue-50 to-indigo-50",
      text: isDarkMode ? "text-blue-400" : "text-blue-600",
      ring: "ring-blue-500",
      progress: "bg-blue-500",
    },
    shortBreak: {
      bg: isDarkMode
        ? "bg-gradient-to-br from-slate-900 to-slate-800"
        : "bg-gradient-to-br from-emerald-50 to-teal-50",
      text: isDarkMode ? "text-emerald-400" : "text-emerald-600",
      ring: "ring-emerald-500",
      progress: "bg-emerald-500",
    },
    longBreak: {
      bg: isDarkMode
        ? "bg-gradient-to-br from-slate-900 to-slate-800"
        : "bg-gradient-to-br from-amber-50 to-orange-50",
      text: isDarkMode ? "text-amber-400" : "text-amber-600",
      ring: "ring-amber-500",
      progress: "bg-amber-500",
    },
  };

  const activeVisual = modeVisual[timerMode] || modeVisual.pomodoro;
  const currentModeLabel = timerModes[timerMode]?.label || "Focus Timer";

  // Sync state from parent window and request the latest state when the popup loads.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "SYNC_TIMER_STATE" && event.data?.payload) {
        setPopupTimerState((current) => ({
          ...current,
          ...event.data.payload,
        }));
      }
    };

    window.addEventListener("message", handleMessage);

    if (window.opener && !window.opener.closed) {
      setHasParentController(true);
      window.opener.postMessage(
        {
          type: "REQUEST_TIMER_STATE",
        },
        window.location.origin,
      );
    }

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendCommandToParent = (type, payload) => {
    if (!window.opener || window.opener.closed) {
      setHasParentController(false);
      return;
    }

    window.opener.postMessage(
      {
        type,
        payload,
      },
      window.location.origin,
    );
  };

  return (
    <div
      className={`min-h-screen ${activeVisual.bg} flex flex-col items-center justify-center p-4`}
    >
      {/* Mode Label */}
      <div
        className={`mb-4 px-4 py-2 rounded-full text-sm font-semibold ${
          isDarkMode
            ? "bg-slate-800/80 text-gray-300"
            : "bg-white/80 text-gray-600"
        }`}
      >
        {currentModeLabel}
      </div>

      {/* Timer Display - Circular Progress */}
      <div className="relative mb-6">
        {/* Progress Ring */}
        <svg className="w-48 h-48 transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke={isDarkMode ? "#334155" : "#e2e8f0"}
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke={
              timerMode === "pomodoro"
                ? "#3b82f6"
                : timerMode === "shortBreak"
                  ? "#10b981"
                  : "#f59e0b"
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 88}`}
            strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPercent / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`text-5xl font-black tabular-nums tracking-tight ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => sendCommandToParent(isRunning ? "PAUSE_TIMER" : "START_TIMER")}
          disabled={!hasParentController}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
            isRunning
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRunning ? "Pause" : "Start"}
        >
          <span className="material-symbols-outlined text-2xl">
            {isRunning ? "pause" : "play_arrow"}
          </span>
        </button>

        <button
          onClick={() => sendCommandToParent("RESET_TIMER")}
          disabled={!hasParentController}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
            isDarkMode
              ? "bg-slate-700 hover:bg-slate-600 text-gray-300"
              : "bg-white hover:bg-gray-50 text-gray-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Reset"
        >
          <span className="material-symbols-outlined text-2xl">
            restart_alt
          </span>
        </button>
      </div>

      {/* Mode Switcher */}
      <div
        className={`flex gap-2 p-1 rounded-full ${
          isDarkMode ? "bg-slate-800/60" : "bg-white/60"
        }`}
      >
        {Object.entries(timerModes).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => sendCommandToParent("SWITCH_MODE", { mode: key })}
            disabled={!hasParentController}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              timerMode === key
                ? isDarkMode
                  ? "bg-slate-700 text-white shadow-sm"
                  : "bg-white text-gray-900 shadow-sm"
                : isDarkMode
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-900"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {label.split(" ")[0]}
          </button>
        ))}
      </div>

      {!hasParentController && (
        <p
          className={`mt-2 text-center text-xs ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Open this mini timer from the main StudyFlow app so it can sync with the active timer.
        </p>
      )}

      {/* Close button (only in popup) */}
      {isPopupWindow && (
        <button
          onClick={() => window.close()}
          className={`mt-4 text-xs font-medium ${
            isDarkMode
              ? "text-gray-500 hover:text-gray-300"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Close Window
        </button>
      )}
    </div>
  );
};

export default MiniTimerPopup;
