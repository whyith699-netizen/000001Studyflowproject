import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const TimerContext = createContext(null);

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
};

export const TimerProvider = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerMode, setTimerMode] = useState('pomodoro'); // pomodoro | shortBreak | longBreak
  const intervalRef = useRef(null);

  const startTicking = useCallback(() => {
    if (intervalRef.current) return; // already ticking
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const timerStart = useCallback((mode) => {
    if (mode) setTimerMode(mode);
    setIsRunning(true);
    startTicking();
  }, [startTicking]);

  const timerPause = useCallback(() => {
    setIsRunning(false);
    stopTicking();
  }, [stopTicking]);

  const timerReset = useCallback(() => {
    setIsRunning(false);
    stopTicking();
    setElapsedSeconds(0);
  }, [stopTicking]);

  // Only pomodoro time counts as study time
  const liveElapsedMinutes = timerMode === 'pomodoro' && (isRunning || elapsedSeconds > 0)
    ? elapsedSeconds / 60
    : 0;

  return (
    <TimerContext.Provider value={{
      isRunning,
      elapsedSeconds,
      timerMode,
      liveElapsedMinutes,
      timerStart,
      timerPause,
      timerReset,
      setTimerMode,
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export default TimerContext;
