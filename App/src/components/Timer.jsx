import React, { useState, useEffect, useCallback } from 'react';
import { tasksService, studySessionsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';

const Timer = ({ mode = 'compact', onTimeUpdate }) => {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const [timerMode, setTimerMode] = useState('pomodoro'); // pomodoro, shortBreak, longBreak
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const timerModes = {
    pomodoro: { label: 'Pomodoro', time: 25 * 60 },
    shortBreak: { label: 'Short Break', time: 5 * 60 },
    longBreak: { label: 'Long Break', time: 15 * 60 }
  };

  // Subscribe to tasks for task selection
  useEffect(() => {
    const unsubscribe = tasksService.subscribeToTasks((fetchedTasks) => {
      setTasks(fetchedTasks.filter(t => !t.completed));
    });
    return () => unsubscribe();
  }, []);

  const switchMode = useCallback((newMode) => {
    setTimerMode(newMode);
    setTimeLeft(timerModes[newMode].time);
    setIsRunning(false);
    setSessionStartTime(null);
  }, []);

  // Save session when timer completes
  const saveSession = async () => {
    const duration = Math.floor((timerModes[timerMode].time - timeLeft) / 60);
    if (duration > 0) {
      try {
        await studySessionsService.addSession({
          type: timerMode,
          duration: timerModes[timerMode].time / 60,
          taskId: selectedTask?.id || null,
          taskName: selectedTask?.text || null
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsRunning(false);
            // Save completed session
            saveSession();
            // Play notification sound or show alert
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Timer Complete!', { body: `${timerModes[timerMode].label} session finished.` });
            }
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode]);

  useEffect(() => {
    if (onTimeUpdate) {
      onTimeUpdate(timeLeft, isRunning);
    }
  }, [timeLeft, isRunning, onTimeUpdate]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const formatTime = (num) => num.toString().padStart(2, '0');

  const toggleTimer = () => {
    if (!isRunning && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
    setIsRunning(!isRunning);
  };
  
  const resetTimer = () => {
    setTimeLeft(timerModes[timerMode].time);
    setIsRunning(false);
    setSessionStartTime(null);
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setShowTaskModal(false);
  };

  // Full Focus Mode Layout
  if (mode === 'full') {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center rounded-2xl p-8 md:p-16 shadow-lg border relative overflow-hidden ${isDarkMode ? 'bg-[#1A2633] border-slate-800' : 'bg-white border-slate-100'}`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        {/* Mode Tabs */}
        <div className={`flex gap-2 p-1 rounded-full mb-12 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {Object.entries(timerModes).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                timerMode === key
                  ? isDarkMode ? 'bg-[#1A2633] shadow-sm text-blue-400 font-bold' : 'bg-white shadow-sm text-blue-600 font-bold'
                  : isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-white/50 text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-4 md:gap-8 mb-12 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className={`flex w-32 h-32 md:w-48 md:h-48 items-center justify-center rounded-2xl border-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-7xl md:text-9xl font-black leading-none tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatTime(minutes)}
              </p>
            </div>
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Minutes</span>
          </div>
          
          <div className="flex flex-col gap-4 -mt-8">
            <div className="w-2 h-2 rounded-full bg-blue-300"></div>
            <div className="w-2 h-2 rounded-full bg-blue-300"></div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className={`flex w-32 h-32 md:w-48 md:h-48 items-center justify-center rounded-2xl border-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-7xl md:text-9xl font-black leading-none tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatTime(seconds)}
              </p>
            </div>
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Seconds</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md">
          <button
            onClick={toggleTimer}
            className={`flex w-full cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white gap-3 text-lg font-bold transition-all active:scale-95 shadow-lg ${isDarkMode ? '' : 'shadow-blue-200'}`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {isRunning ? 'pause' : 'play_arrow'}
            </span>
            <span>{isRunning ? 'Pause Timer' : 'Start Timer'}</span>
          </button>
          <button
            onClick={resetTimer}
            className={`text-sm font-medium flex items-center gap-2 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset Timer
          </button>
        </div>
      </div>
    );
  }

  // Compact Dashboard Layout
  return (
    <>
      <div className={`rounded-2xl p-4 shadow-sm border ${isDarkMode ? 'bg-[#1A2633] border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('currentFocus')}</h2>
          <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wide ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            {timerModes[timerMode].label}
          </span>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full">
            <div className="flex gap-4">
              {/* Hours */}
              <div className="flex grow basis-0 flex-col items-center gap-2">
                <div className={`flex w-full aspect-square md:aspect-auto md:h-24 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(hours)}
                  </p>
                </div>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hours</p>
              </div>
              
              <div className={`text-4xl md:text-5xl font-black self-center pb-6 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>:</div>
              
              {/* Minutes */}
              <div className="flex grow basis-0 flex-col items-center gap-2">
                <div className={`flex w-full aspect-square md:aspect-auto md:h-24 items-center justify-center rounded-2xl relative overflow-hidden ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <div className={`absolute bottom-0 left-0 w-full h-[40%] ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`}></div>
                  <p className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter z-10 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatTime(minutes)}
                  </p>
                </div>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Minutes</p>
              </div>
              
              <div className={`text-4xl md:text-5xl font-black self-center pb-6 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>:</div>
              
              {/* Seconds */}
              <div className="flex grow basis-0 flex-col items-center gap-2">
                <div className={`flex w-full aspect-square md:aspect-auto md:h-24 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(seconds)}
                  </p>
                </div>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Seconds</p>
              </div>
            </div>
          </div>
          
          <div className="flex md:flex-col gap-3 w-full md:w-auto">
            <button
              onClick={toggleTimer}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">{isRunning ? 'pause' : 'play_arrow'}</span>
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              className={`flex-1 rounded-xl h-12 px-6 font-medium transition-all active:scale-95 flex items-center justify-center gap-2 border ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'}`}
            >
              <span className="material-symbols-outlined">restart_alt</span>
              Reset
            </button>
          </div>
        </div>
        
        <div className={`mt-3 pt-3 border-t flex items-center justify-between text-sm ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Task: <strong className={`ml-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTask?.text || 'No task selected'}</strong>
          </span>
          <button 
            onClick={() => setShowTaskModal(true)}
            className="text-blue-600 hover:underline font-medium"
          >
            Change Task
          </button>
        </div>
      </div>

      {/* Task Selection Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1A2633]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Task</h2>
              <button 
                onClick={() => setShowTaskModal(false)} 
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* No task option */}
              <button
                onClick={() => handleSelectTask(null)}
                className={`w-full text-left p-4 rounded-xl mb-2 transition-colors ${
                  !selectedTask 
                    ? isDarkMode ? 'bg-blue-900/30 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-500'
                    : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No task (Free focus)</span>
              </button>

              {tasks.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">task_alt</span>
                  <p className="text-sm">No pending tasks</p>
                </div>
              ) : (
                tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`w-full text-left p-4 rounded-xl mb-2 transition-colors ${
                      selectedTask?.id === task.id 
                        ? isDarkMode ? 'bg-blue-900/30 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-500'
                        : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{task.text}</span>
                    {task.dueDate && (
                      <span className="block text-xs text-gray-500 mt-1">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Timer;
