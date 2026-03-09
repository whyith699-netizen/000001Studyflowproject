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
import { notifyTimerComplete } from "../services/notification-service";

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
    settings.breakTypePreference === "longBreak"
      ? "longBreak"
      : "shortBreak",
});

const buildTimerModes = (settings) => ({
  pomodoro: { label: "Focus Timer", time: settings.pomodoroMinutes * 60 },
  shortBreak: { label: "Short Break", time: settings.shortBreakMinutes * 60 },
  longBreak: { label: "Long Break", time: settings.longBreakMinutes * 60 },
});
const CHATBOT_START_POMODORO_EVENT = "studyflow:chatbot:start-pomodoro";

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
            taskName: selectedTask?.text || null,
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
    timerSettings.soundEnabled,
  ]);

  const switchMode = useCallback(
    (newMode) => {
      if (!timerModes[newMode]) return;

      clearTimerInterval();
      const modeDuration = timerModes[newMode].time;
      setPendingBreakChoice(false);
      setTimerMode(newMode);
      setCurrentModeDuration(modeDuration);
      setTimeLeft(modeDuration);
      setIsRunning(false);
      setSessionStartTime(null);
    },
    [timerModes, clearTimerInterval],
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
    pendingBreakChoice,
  ]);

  const startPomodoroFromChatbot = useCallback(() => {
    const pomodoroDuration = timerModes.pomodoro.time;
    clearTimerInterval();
    setPendingBreakChoice(false);
    setTimerMode("pomodoro");
    setCurrentModeDuration(pomodoroDuration);
    setTimeLeft(pomodoroDuration);

    // Start timer in next tick to ensure React has processed the above updates
    requestAnimationFrame(() => {
      setSessionStartTime(Date.now());
      setIsRunning(true);
    });
  }, [timerModes, clearTimerInterval]);

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
      setPendingBreakChoice(false);
      setTimerMode(mode);
      setCurrentModeDuration(duration);
      setTimeLeft(duration);
      setSessionStartTime(Date.now());
      setIsRunning(true);
    },
    [timerModes, clearTimerInterval],
  );

  const dismissBreakChoice = useCallback(() => {
    const pomodoroDuration = timerModes.pomodoro.time;
    clearTimerInterval();
    setPendingBreakChoice(false);
    setTimerMode("pomodoro");
    setCurrentModeDuration(pomodoroDuration);
    setTimeLeft(pomodoroDuration);
    setSessionStartTime(null);
    setIsRunning(false);
  }, [timerModes, clearTimerInterval]);

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
