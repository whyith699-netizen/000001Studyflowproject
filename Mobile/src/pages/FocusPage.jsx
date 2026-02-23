import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studySessionsService, userService } from '../services/firestore-service';
import { SkeletonCard } from '../components/Skeleton';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, isAfter, startOfDay } from 'date-fns';

const PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
];

export default function FocusPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const unsub = studySessionsService.subscribeToSessions((s) => {
      setSessions(s);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const handleTimerComplete = useCallback(async () => {
    // Play notification sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      gain.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => { oscillator.stop(); ctx.close(); }, 500);
    } catch (e) {}

    // Save session
    try {
      await studySessionsService.addSession({
        duration: duration,
        type: 'pomodoro',
        date: new Date().toISOString()
      });
    } catch (err) {
      console.error('Save session error:', err);
    }
  }, [duration]);

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setTimeLeft(duration);
  };

  const selectPreset = (seconds) => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setDuration(seconds);
    setTimeLeft(seconds);
  };

  const progress = (timeLeft / duration) * 100;
  const circumference = 2 * Math.PI * 96;
  const dashOffset = circumference - (progress / 100) * circumference;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Weekly chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(day);
    const dayEnd = startOfDay(subDays(day, -1));
    const dayMinutes = sessions
      .filter((s) => {
        const d = new Date(s.date);
        return isAfter(d, dayStart) && !isAfter(d, dayEnd);
      })
      .reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
    return {
      day: format(day, 'EEE'),
      minutes: Math.round(dayMinutes),
    };
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Focus Mode</h1>
        <p className="page-subtitle">Stay focused and productive</p>
      </div>

      {/* Timer Presets */}
      <div className="filter-tabs" style={{ justifyContent: 'center' }}>
        {PRESETS.map((p) => (
          <button
            key={p.seconds}
            className={`filter-tab ${duration === p.seconds ? 'active' : ''}`}
            onClick={() => selectPreset(p.seconds)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="timer-container">
        <div className="timer-circle">
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle className="track" cx="110" cy="110" r="96" />
            <circle
              className="progress"
              cx="110" cy="110" r="96"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="timer-display">
            <div className="timer-time">{formatTime(timeLeft)}</div>
            <div className="timer-label">{isRunning ? 'Focusing...' : 'Ready'}</div>
          </div>
        </div>

        <div className="timer-controls">
          <button className="btn btn-primary" onClick={toggleTimer}>
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button className="btn btn-secondary" onClick={resetTimer}>
            <RotateCcw size={20} />
            Reset
          </button>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="chart-container">
        <h3>This Week's Focus</h3>
        {loading ? (
          <SkeletonCard count={1} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '12px'
                }}
                formatter={(val) => [`${val} min`, 'Focus']}
              />
              <Bar
                dataKey="minutes"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
