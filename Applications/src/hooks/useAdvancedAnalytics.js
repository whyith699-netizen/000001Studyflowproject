import { useState, useEffect, useMemo } from 'react';
import { tasksService, classesService, studySessionsService, userService } from '../services/firestore-service';
import { startOfWeek, isWithinInterval } from 'date-fns';

export const useAdvancedAnalytics = (period = 'week') => {
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [dataLoaded, setDataLoaded] = useState({ tasks: false, classes: false, sessions: false });

  useEffect(() => {
    const unsubTasks = tasksService.subscribeToTasks((data) => {
      setTasks(data);
      setDataLoaded(prev => ({ ...prev, tasks: true }));
    });
    const unsubClasses = classesService.subscribeToClasses((data) => {
      setClasses(data);
      setDataLoaded(prev => ({ ...prev, classes: true }));
    });
    const unsubSessions = studySessionsService.subscribeToSessions((data) => {
      setSessions(data);
      setDataLoaded(prev => ({ ...prev, sessions: true }));
    });
    const unsubProfile = userService.subscribeToProfile(setProfile);

    return () => {
      unsubTasks();
      unsubClasses();
      unsubSessions();
      unsubProfile();
    };
  }, []);

  const loading = !dataLoaded.tasks || !dataLoaded.classes || !dataLoaded.sessions;

  const analyticsData = useMemo(() => {
    const now = new Date();
    let startDate;
    if (period === 'week') startDate = startOfWeek(now);
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else startDate = new Date(0); // All time

    const filteredSessions = sessions.filter(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      return isWithinInterval(date, { start: startDate, end: now });
    });

    // 1. Subject Breakdown (Focus Time per Class)
    const subjectMinutes = {};
    filteredSessions.forEach(s => {
      const id = s.classId || 'uncategorized';
      subjectMinutes[id] = (subjectMinutes[id] || 0) + (s.duration || 0);
    });

    const subjectBreakdown = classes.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      minutes: subjectMinutes[c.id] || 0
    })).filter(item => item.minutes > 0);

    if (subjectMinutes['uncategorized']) {
      subjectBreakdown.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        color: '#94a3b8',
        minutes: subjectMinutes['uncategorized']
      });
    }

    // 2. Heatmap Data (Time of Day vs Day of Week)
    // 7 days (0-6) x 24 hours (0-23)
    const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));
    filteredSessions.forEach(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      const day = date.getDay();
      const hour = date.getHours();
      heatmap[day][hour] += (s.duration || 0);
    });

    // 3. Task Completion Stats per Class
    const taskStats = {};
    tasks.forEach(t => {
      const id = t.classId || 'uncategorized';
      if (!taskStats[id]) taskStats[id] = { completed: 0, total: 0 };
      taskStats[id].total++;
      if (t.completed) taskStats[id].completed++;
    });

    const classTaskStats = classes.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      ... (taskStats[c.id] || { completed: 0, total: 0 })
    }));

    // 4. Productivity Score Calculation
    // Base Score: 40 points for Focus Time (target 15h/week)
    // 30 points for Task Completion Rate
    // 30 points for Consistency (Streak)
    const weekFocusMins = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const focusScore = Math.min(40, (weekFocusMins / (15 * 60)) * 40);
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 30 : 0;
    
    const streak = profile?.streak || 0;
    const streakScore = Math.min(30, (streak / 7) * 30);

    const productivityScore = Math.round(focusScore + taskScore + streakScore);

    return {
      subjectBreakdown,
      heatmap,
      classTaskStats,
      productivityScore,
      totalFocusMinutes: weekFocusMins,
      completedTasksCount: completedTasks,
      totalTasksCount: totalTasks
    };
  }, [sessions, tasks, classes, profile, period]);

  return { ...analyticsData, loading };
};
