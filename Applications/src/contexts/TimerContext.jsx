import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase-config";
import {
  studySessionsService,
  userService,
} from "../services/firestore-service";
import {
  notifyTimerComplete,
  playTimerTransitionCue,
} from "../services/notification-service";

const TimerContext = createContext(null);

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
};

const DEFAULT_TIMER_SETTINGS = {
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  soundEnabled: true,
  breakTypePreference: "shortBreak",
};

const clamp = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const normalizeTimerSettings = (settings = {}) => ({
  pomodoroMinutes: clamp(
    settings.pomodoroMinutes,
    1,
    120,
    DEFAULT_TIMER_SETTINGS.pomodoroMinutes,
  ),
  shortBreakMinutes: clamp(
    settings.shortBreakMinutes,
    1,
    30,
    DEFAULT_TIMER_SETTINGS.shortBreakMinutes,
  ),
  longBreakMinutes: clamp(
    settings.longBreakMinutes,
    1,
    60,
    DEFAULT_TIMER_SETTINGS.longBreakMinutes,
  ),
  autoStartBreaks: Boolean(settings.autoStartBreaks),
  soundEnabled: settings.soundEnabled !== false,
  breakTypePreference:
    settings.breakTypePreference === "longBreak" ? "longBreak" : "shortBreak",
});

const buildTimerModes = (settings) => ({
  pomodoro: { label: "Focus Timer", time: settings.pomodoroMinutes * 60 },
  shortBreak: { label: "Short Break", time: settings.shortBreakMinutes * 60 },
  longBreak: { label: "Long Break", time: settings.longBreakMinutes * 60 },
});
const CHATBOT_START_POMODORO_EVENT = "studyflow:chatbot:start-pomodoro";
const resolvePopupUrl = () => {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const popupUrl = new URL(baseUrl, window.location.origin);
  popupUrl.searchParams.set("miniTimer", "1");
  return popupUrl.toString();
};

export const useTimerPopup = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimerPopup must be used within TimerProvider");
  const broadcastTimerState = useCallback(() => {
    const popup = window.__pomodoroPopup;
    if (!popup || popup.closed) return;

    popup.postMessage(
      {
        type: "SYNC_TIMER_STATE",
        payload: {
          isRunning: ctx.isRunning,
          timeLeft: ctx.timeLeft,
          timerMode: ctx.timerMode,
          elapsedSeconds: ctx.elapsedSeconds,
          currentModeDuration: ctx.currentModeDuration,
          hours: ctx.hours,
          minutes: ctx.minutes,
          seconds: ctx.seconds,
        },
      },
      window.location.origin,
    );
  }, [
    ctx.elapsedSeconds,
    ctx.hours,
    ctx.isRunning,
    ctx.minutes,
    ctx.seconds,
    ctx.timeLeft,
    ctx.timerMode,
    ctx.currentModeDuration,
  ]);

  const openMiniTimerPopup = useCallback(() => {
    // Check if popup is already open
    if (window.__pomodoroPopup && !window.__pomodoroPopup.closed) {
      window.__pomodoroPopup.focus();
      broadcastTimerState();
      return;
    }

    const popupWidth = 400;
    const popupHeight = 520;
    const screenX = window.screenX + (window.innerWidth - popupWidth) / 2;
    const screenY = window.screenY + (window.innerHeight - popupHeight) / 2;

    const popup = window.open(
      resolvePopupUrl(),
      "PomodoroTimer",
      `width=${popupWidth},height=${popupHeight},left=${screenX},top=${screenY},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`,
    );

    if (popup) {
      window.__pomodoroPopup = popup;

      // Send initial timer state to popup after it loads
      const checkPopupLoaded = setInterval(() => {
        try {
          if (popup && !popup.closed) {
            broadcastTimerState();
            clearInterval(checkPopupLoaded);
          }
        } catch {
          // Popup might be closed
          clearInterval(checkPopupLoaded);
        }
      }, 200);

      // Clean up when popup closes
      const checkClosed = setInterval(() => {
        if (popup && popup.closed) {
          window.__pomodoroPopup = null;
          clearInterval(checkClosed);
        }
      }, 500);
    } else {
      console.error("Failed to open popup. Please allow popups for this site.");
    }
  }, [broadcastTimerState]);

  useEffect(() => {
    broadcastTimerState();
  }, [broadcastTimerState]);

  return { ...ctx, openMiniTimerPopup };
};

export const TimerProvider = ({ children }) => {
  const initialSettings = normalizeTimerSettings(DEFAULT_TIMER_SETTINGS);
  const initialModes = buildTimerModes(initialSettings);

  const [timerSettings, setTimerSettings] = useState(initialSettings);
  const [timerModes, setTimerModes] = useState(initialModes);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialModes.pomodoro.time);
  const [timerMode, setTimerMode] = useState("pomodoro");
  const [currentModeDuration, setCurrentModeDuration] = useState(
    initialModes.pomodoro.time,
  );
  const [selectedTask, setSelectedTask] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [pendingBreakChoice, setPendingBreakChoice] = useState(false);
  const [breakTypePreference, setBreakTypePreference] = useState(
    initialSettings.breakTypePreference,
  );

  const intervalRef = useRef(null);
  const transitionCueTimeoutRef = useRef(null);
  const isRunningRef = useRef(isRunning);
  const timerModeRef = useRef(timerMode);
  const pendingBreakChoiceRef = useRef(pendingBreakChoice);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    timerModeRef.current = timerMode;
  }, [timerMode]);

  useEffect(() => {
    pendingBreakChoiceRef.current = pendingBreakChoice;
  }, [pendingBreakChoice]);

  const applyProfileSettings = useCallback((profile) => {
    const nextSettings = normalizeTimerSettings(
      profile?.settings || DEFAULT_TIMER_SETTINGS,
    );
    const nextModes = buildTimerModes(nextSettings);
    setTimerSettings(nextSettings);
    setTimerModes(nextModes);
    setBreakTypePreference(nextSettings.breakTypePreference);

    if (!isRunningRef.current && !pendingBreakChoiceRef.current) {
      const activeMode = timerModeRef.current;
      const nextDuration =
        nextModes[activeMode]?.time || nextModes.pomodoro.time;
      setCurrentModeDuration(nextDuration);
      setTimeLeft(nextDuration);
    }
  }, []);

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();

      if (!user) {
        applyProfileSettings({ settings: DEFAULT_TIMER_SETTINGS });
        return;
      }

      unsubscribeProfile = userService.subscribeToProfile((profile) => {
        applyProfileSettings(profile);
      });
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, [applyProfileSettings]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const elapsedSeconds = Math.max(currentModeDuration - timeLeft, 0);
  const liveElapsedMinutes =
    timerMode === "pomodoro" && (isRunning || elapsedSeconds > 0)
      ? elapsedSeconds / 60
      : 0;

  const savePomodoroSession = useCallback(
    async (durationMinutes) => {
      if (durationMinutes > 0) {
        try {
          await studySessionsService.addSession({
            type: "pomodoro",
            duration: durationMinutes,
            taskId: selectedTask?.id || null,
            taskName: selectedTask?.title || selectedTask?.text || null,
          });
        } catch (error) {
          console.error("Failed to save pomodoro session:", error);
        }
      }
    },
    [selectedTask],
  );

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearTransitionCueTimeout = useCallback(() => {
    if (transitionCueTimeoutRef.current) {
      clearTimeout(transitionCueTimeoutRef.current);
      transitionCueTimeoutRef.current = null;
    }
  }, []);

  const scheduleTransitionCue = useCallback(
    (eventType, delayMs = 0) => {
      clearTransitionCueTimeout();
      if (!timerSettings.soundEnabled) return;

      transitionCueTimeoutRef.current = setTimeout(() => {
        playTimerTransitionCue({
          eventType,
          soundEnabled: true,
        }).catch((error) => {
          console.error("Failed to play timer transition cue:", error);
        });
        transitionCueTimeoutRef.current = null;
      }, delayMs);
    },
    [clearTransitionCueTimeout, timerSettings.soundEnabled],
  );

  useEffect(
    () => () => clearTransitionCueTimeout(),
    [clearTransitionCueTimeout],
  );

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimerInterval();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearTimerInterval();
    };
  }, [isRunning, timeLeft, clearTimerInterval]);

  const prevTimeLeftRef = useRef(timeLeft);
  useEffect(() => {
    if (prevTimeLeftRef.current > 0 && timeLeft === 0 && !isRunning) {
      const completedMode = timerMode;
      const completedDurationMinutes = Math.floor(currentModeDuration / 60);
      const completedLabel = timerModes[completedMode]?.label || "Timer";

      if (completedMode === "pomodoro" && completedDurationMinutes > 0) {
        savePomodoroSession(completedDurationMinutes);
      }

      notifyTimerComplete({
        title: "Timer Complete!",
        body: `${completedLabel} session finished.`,
        soundEnabled: timerSettings.soundEnabled,
        tone: "complete",
      });

      if (completedMode === "pomodoro") {
        if (timerSettings.autoStartBreaks) {
          const breakMode = timerSettings.breakTypePreference;
          const breakDuration =
            timerModes[breakMode]?.time || timerModes.shortBreak.time;
          setPendingBreakChoice(false);
          setTimerMode(breakMode);
          setCurrentModeDuration(breakDuration);
          setTimeLeft(breakDuration);
          setSessionStartTime(Date.now());
          setIsRunning(true);
          scheduleTransitionCue("break-start", 850);
        } else {
          setPendingBreakChoice(true);
        }
      } else {
        const pomodoroDuration = timerModes.pomodoro.time;
        setPendingBreakChoice(false);
        setTimerMode("pomodoro");
        setCurrentModeDuration(pomodoroDuration);
        setTimeLeft(pomodoroDuration);
        setSessionStartTime(null);
      }
    }

    prevTimeLeftRef.current = timeLeft;
  }, [
    timeLeft,
    isRunning,
    timerMode,
    timerModes,
    currentModeDuration,
    savePomodoroSession,
    timerSettings.autoStartBreaks,
    timerSettings.breakTypePreference,
    timerSettings.soundEnabled,
    scheduleTransitionCue,
  ]);

  const switchMode = useCallback(
    (newMode) => {
      if (!timerModes[newMode]) return;

      clearTimerInterval();
      clearTransitionCueTimeout();
      const modeDuration = timerModes[newMode].time;
      setPendingBreakChoice(false);
      setTimerMode(newMode);
      setCurrentModeDuration(modeDuration);
      setTimeLeft(modeDuration);
      setIsRunning(false);
      setSessionStartTime(null);
    },
    [timerModes, clearTimerInterval, clearTransitionCueTimeout],
  );

  const toggleTimer = useCallback(() => {
    if (!isRunning && timeLeft <= 0) {
      setTimeLeft(currentModeDuration);
    }
    if (!isRunning && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
    setPendingBreakChoice(false);
    setIsRunning((prev) => !prev);
  }, [isRunning, sessionStartTime, timeLeft, currentModeDuration]);

  const resetTimer = useCallback(() => {
    const elapsed = currentModeDuration - timeLeft;
    if (elapsed > 60 && timerMode === "pomodoro" && !pendingBreakChoice) {
      const duration = Math.floor(elapsed / 60);
      savePomodoroSession(duration);
    }

    clearTimerInterval();
    clearTransitionCueTimeout();
    const resetDuration =
      timerModes[timerMode]?.time || timerModes.pomodoro.time;
    setPendingBreakChoice(false);
    setCurrentModeDuration(resetDuration);
    setTimeLeft(resetDuration);
    setIsRunning(false);
    setSessionStartTime(null);
  }, [
    timerMode,
    timeLeft,
    currentModeDuration,
    timerModes,
    savePomodoroSession,
    clearTimerInterval,
    clearTransitionCueTimeout,
    pendingBreakChoice,
  ]);

  const startPomodoroFromChatbot = useCallback(() => {
    const pomodoroDuration = timerModes.pomodoro.time;
    clearTimerInterval();
    clearTransitionCueTimeout();
    setPendingBreakChoice(false);
    setTimerMode("pomodoro");
    setCurrentModeDuration(pomodoroDuration);
    setTimeLeft(pomodoroDuration);

    // Start timer in next tick to ensure React has processed the above updates
    requestAnimationFrame(() => {
      setSessionStartTime(Date.now());
      setIsRunning(true);
    });
  }, [timerModes, clearTimerInterval, clearTransitionCueTimeout]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleStartPomodoro = () => {
      startPomodoroFromChatbot();
    };

    window.addEventListener(CHATBOT_START_POMODORO_EVENT, handleStartPomodoro);
    return () =>
      window.removeEventListener(
        CHATBOT_START_POMODORO_EVENT,
        handleStartPomodoro,
      );
  }, [startPomodoroFromChatbot]);

  const onChooseBreak = useCallback(
    (mode) => {
      if (mode !== "shortBreak" && mode !== "longBreak") return;

      const duration = timerModes[mode]?.time;
      if (!duration) return;

      clearTimerInterval();
      clearTransitionCueTimeout();
      setPendingBreakChoice(false);
      setTimerMode(mode);
      setCurrentModeDuration(duration);
      setTimeLeft(duration);
      setSessionStartTime(Date.now());
      setIsRunning(true);
      scheduleTransitionCue("break-start");
    },
    [
      timerModes,
      clearTimerInterval,
      clearTransitionCueTimeout,
      scheduleTransitionCue,
    ],
  );

  const dismissBreakChoice = useCallback(() => {
    const pomodoroDuration = timerModes.pomodoro.time;
    clearTimerInterval();
    clearTransitionCueTimeout();
    setPendingBreakChoice(false);
    setTimerMode("pomodoro");
    setCurrentModeDuration(pomodoroDuration);
    setTimeLeft(pomodoroDuration);
    setSessionStartTime(null);
    setIsRunning(false);
  }, [timerModes, clearTimerInterval, clearTransitionCueTimeout]);

  const syncTimerStateToRequester = useCallback((sourceWindow) => {
    if (!sourceWindow || sourceWindow.closed) return;

    sourceWindow.postMessage(
      {
        type: "SYNC_TIMER_STATE",
        payload: {
          isRunning,
          timeLeft,
          timerMode,
          elapsedSeconds,
          currentModeDuration,
          hours,
          minutes,
          seconds,
        },
      },
      window.location.origin,
    );
  }, [
    currentModeDuration,
    elapsedSeconds,
    hours,
    isRunning,
    minutes,
    seconds,
    timeLeft,
    timerMode,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleWindowMessage = (event) => {
      if (event.origin !== window.location.origin) return;

      switch (event.data?.type) {
        case "REQUEST_TIMER_STATE":
          syncTimerStateToRequester(event.source);
          break;
        case "START_TIMER":
          if (!isRunning) toggleTimer();
          break;
        case "PAUSE_TIMER":
          if (isRunning) toggleTimer();
          break;
        case "RESET_TIMER":
          resetTimer();
          break;
        case "SWITCH_MODE":
          if (event.data?.payload?.mode) {
            switchMode(event.data.payload.mode);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [isRunning, resetTimer, switchMode, syncTimerStateToRequester, toggleTimer]);

  // Electron IPC bridge — purely additive, no UI change
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return undefined;

    // Send timer state to main process for tray display
    const interval = setInterval(() => {
      api.sendTimerState({
        isRunning,
        timeLeft,
        timerMode,
        hours,
        minutes,
        seconds,
        currentModeDuration,
      });
    }, 1000);

    // Listen for timer actions from main process (hotkeys / tray menu)
    api.onTimerAction((action) => {
      switch (action) {
        case "toggle":
          toggleTimer();
          break;
        case "reset":
          resetTimer();
          break;
        default:
          break;
      }
    });

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode, hours, minutes, seconds, currentModeDuration, toggleTimer, resetTimer]);

  return (
    <TimerContext.Provider
      value={{
        isRunning,
        timeLeft,
        timerMode,
        selectedTask,
        pendingBreakChoice,
        timerSettings,
        breakTypePreference,
        hours,
        minutes,
        seconds,
        liveElapsedMinutes,
        elapsedSeconds,
        currentModeDuration,
        timerModes,
        switchMode,
        toggleTimer,
        resetTimer,
        startPomodoroFromChatbot,
        setSelectedTask,
        onChooseBreak,
        dismissBreakChoice,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export default TimerContext;
