import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tasksService, classesService, userService } from '../services/firestore-service';
import { SkeletonCard } from '../components/Skeleton';
import {
  Bell, ChevronRight, Trophy, Play, Pause,
  RotateCcw, SkipForward, Clock, Check, Flame, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Timer state for Active Session
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionSubject, setSessionSubject] = useState('Organic Chemistry Revision');

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(tasksService.subscribeToTasks((t) => {
      setTasks(t);
      setLoading(false);
    }));
    unsubs.push(userService.subscribeToProfile((p) => setProfile(p)));
    return () => unsubs.forEach((fn) => fn());
  }, [user]);

  useEffect(() => {
    let interval;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? (setTimerRunning(false), 0) : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const totalStudyHours = profile?.totalStudyTime
    ? (profile.totalStudyTime / 3600).toFixed(1)
    : '0.0';

  const streak = profile?.streak || 12;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.displayName || 'Student';
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / (25 * 60)) * 100;

  const handleToggle = async (taskId, completed) => {
    try { await tasksService.toggleTask(taskId, completed); }
    catch (err) { console.error('Toggle error:', err); }
  };

  // Daily goals from pending tasks
  const dailyGoals = pendingTasks.slice(0, 4).map((t) => ({
    id: t.id,
    title: t.title,
    time: t.deadline ? format(new Date(t.deadline), 'h:mm a') : null,
    priority: t.priority,
    completed: t.completed,
    className: t.className,
    status: t.status
  }));

  return (
    <div className="page-container dashboard-v2">
      {/* Top Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          {user?.photoURL ? (
            <img className="dash-avatar" src={user.photoURL} alt="" />
          ) : (
            <div className="dash-avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="dash-greeting-sub">{greeting()},</div>
            <div className="dash-greeting-name">{displayName}</div>
          </div>
        </div>
        <button className="dash-notification-btn">
          <Bell size={22} />
          <span className="notification-dot" />
        </button>
      </div>

      {/* Streak Card */}
      <div className="streak-card">
        <div className="streak-content">
          <div className="streak-label">Current Streak</div>
          <div className="streak-value">
            <span className="streak-number">{streak}</span>
            <span className="streak-unit">Days</span>
          </div>
          <div className="streak-milestone">
            <Flame size={14} />
            <span>{streak >= 15 ? 'Milestone reached!' : `${15 - streak} days until 15-day milestone!`}</span>
          </div>
        </div>
        <div className="streak-badge">
          <Trophy size={28} />
        </div>
        <div className="streak-decoration" />
      </div>

      {/* Active Session */}
      <div className="dash-section-header">
        <span className="dash-section-title">Active Session</span>
        <button className="session-mode-badge" onClick={() => navigate('/focus')}>
          FOCUS MODE
        </button>
      </div>

      <div className="active-session-card">
        <div className="session-subject">{sessionSubject}</div>
        <div className="session-timer">{formatTime(timeLeft)}</div>
        <div className="session-progress-bar">
          <div className="session-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="session-controls">
          <button className="session-ctrl-btn" onClick={() => setTimeLeft(25 * 60)}>
            <RotateCcw size={20} />
          </button>
          <button
            className="session-ctrl-btn main"
            onClick={() => setTimerRunning(!timerRunning)}
          >
            {timerRunning ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="session-ctrl-btn" onClick={() => navigate('/focus')}>
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Daily Goals */}
      <div className="dash-section-header">
        <span className="dash-section-title">Daily Goals</span>
        <button className="dash-section-action" onClick={() => navigate('/tasks')}>
          View All <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <SkeletonCard count={3} />
      ) : dailyGoals.length > 0 ? (
        <div className="goals-list">
          {dailyGoals.map((goal) => (
            <div key={goal.id} className={`goal-card ${goal.completed ? 'completed' : ''}`}>
              <button
                className={`goal-checkbox ${goal.completed ? 'checked' : ''}`}
                onClick={() => handleToggle(goal.id, !goal.completed)}
              >
                {goal.completed && <Check size={12} />}
              </button>
              <div className="goal-body">
                <div className={`goal-title ${goal.completed ? 'done' : ''}`}>
                  {goal.title}
                </div>
                <div className="goal-meta">
                  {goal.time && (
                    <span className="goal-badge time">
                      <Clock size={10} /> {goal.time}
                    </span>
                  )}
                  {goal.completed ? (
                    <span className="goal-badge status done">DONE</span>
                  ) : goal.priority === 'high' ? (
                    <span className="goal-badge status high">HIGH PRIORITY</span>
                  ) : goal.status === 'in-progress' ? (
                    <span className="goal-badge status progress">IN PROGRESS</span>
                  ) : (
                    <span className="goal-badge status morning">MORNING</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Check size={48} />
          <h3>All caught up!</h3>
          <p>No goals for today 🎉</p>
        </div>
      )}

      {/* Bottom Stats */}
      <div className="bottom-stats">
        <div className="bottom-stat-card">
          <div className="bottom-stat-label">FOCUS TIME</div>
          <div className="bottom-stat-value">
            {totalStudyHours}<span className="bottom-stat-unit">h</span>
          </div>
          <div className="bottom-stat-change positive">+12%</div>
        </div>
        <div className="bottom-stat-card">
          <div className="bottom-stat-label">COMPLETED</div>
          <div className="bottom-stat-value">
            {completedTasks.length}<span className="bottom-stat-unit">/{tasks.length} tasks</span>
          </div>
          <button className="bottom-stat-fab" onClick={() => navigate('/tasks')}>
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
