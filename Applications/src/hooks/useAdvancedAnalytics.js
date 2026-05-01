import { useState, useEffect, useMemo } from 'react';
import { tasksService, classesService, studySessionsService, userService } from '../services/firestore-service';
import { startOfWeek, isWithinInterval, subWeeks, startOfMonth, subMonths } from 'date-fns';

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
    else startDate = new Date(0);

    const filteredSessions = sessions.filter(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      return isWithinInterval(date, { start: startDate, end: now });
    });

    // Previous period data for comparison
    let prevStartDate;
    const periodDuration = now.getTime() - startDate.getTime();
    prevStartDate = new Date(startDate.getTime() - periodDuration);
    const prevFilteredSessions = sessions.filter(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      return isWithinInterval(date, { start: prevStartDate, end: startDate });
    });

    // 1. Subject Breakdown
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

    // 2. Heatmap Data
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
      ...(taskStats[c.id] || { completed: 0, total: 0 })
    }));

    // 4. Productivity Score
    const weekFocusMins = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const focusScore = Math.min(40, (weekFocusMins / (15 * 60)) * 40);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 30 : 0;

    const streak = profile?.streak || 0;
    const streakScore = Math.min(30, (streak / 7) * 30);

    const productivityScore = Math.round(focusScore + taskScore + streakScore);

    // 5. Daily Breakdown (per-day aggregation)
    const dailyBreakdown = {};
    filteredSessions.forEach(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      const dayStr = date.toISOString().split('T')[0];
      if (!dailyBreakdown[dayStr]) dailyBreakdown[dayStr] = { minutes: 0, sessions: 0 };
      dailyBreakdown[dayStr].minutes += (s.duration || 0);
      dailyBreakdown[dayStr].sessions++;
    });

    const dailyBreakdownArray = Object.entries(dailyBreakdown)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Previous period daily breakdown for trend chart
    const prevDailyBreakdown = {};
    prevFilteredSessions.forEach(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      const dayStr = date.toISOString().split('T')[0];
      if (!prevDailyBreakdown[dayStr]) prevDailyBreakdown[dayStr] = { minutes: 0 };
      prevDailyBreakdown[dayStr].minutes += (s.duration || 0);
    });

    // 6. Study Distribution (Morning/Afternoon/Evening/Night)
    const studyDistribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    filteredSessions.forEach(s => {
      const date = new Date(s.completedAt || s.timestamp || s.createdAt);
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) studyDistribution.morning += (s.duration || 0);
      else if (hour >= 12 && hour < 17) studyDistribution.afternoon += (s.duration || 0);
      else if (hour >= 17 && hour < 21) studyDistribution.evening += (s.duration || 0);
      else studyDistribution.night += (s.duration || 0);
    });

    // 7. Longest session
    const longestSession = filteredSessions.reduce((max, s) => Math.max(max, s.duration || 0), 0);

    // 8. Best day
    const bestDayEntry = Object.entries(dailyBreakdown).sort(([, a], [, b]) => b.minutes - a.minutes)[0];
    const bestDay = bestDayEntry ? { date: bestDayEntry[0], minutes: bestDayEntry[1].minutes } : null;

    // 9. Avg session length
    const avgSessionLength = filteredSessions.length > 0
      ? Math.round(weekFocusMins / filteredSessions.length)
      : 0;

    // 10. Insights (structured data — text generated in InsightsCard for i18n)
    const insights = [];
    if (bestDay) {
      insights.push({ type: 'best', date: bestDay.date, hours: (bestDay.minutes / 60).toFixed(1) });
    }
    const totalDistMins = Object.values(studyDistribution).reduce((a, b) => a + b, 0);
    if (totalDistMins > 0) {
      const sorted = Object.entries(studyDistribution).sort(([, a], [, b]) => b - a)[0];
      insights.push({ type: 'peak', period: sorted[0], pct: Math.round((sorted[1] / totalDistMins) * 100) });
    }
    if (streak >= 3) insights.push({ type: 'streak', count: streak });
    if (completedTasks / (totalTasks || 1) >= 0.8) insights.push({ type: 'tasks', rate: Math.round((completedTasks / (totalTasks || 1)) * 100) });
    if (longestSession >= 60) insights.push({ type: 'session', minutes: longestSession });
    if (insights.length === 0) insights.push({ type: 'start' });

    // Prev period data for comparison
    const prevTotalMinutes = prevFilteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    return {
      subjectBreakdown,
      heatmap,
      classTaskStats,
      productivityScore,
      totalFocusMinutes: weekFocusMins,
      completedTasksCount: completedTasks,
      totalTasksCount: totalTasks,
      prevPeriodData: { totalMinutes: prevTotalMinutes, dailyBreakdown: prevDailyBreakdown, sessionCount: prevFilteredSessions.length },
      dailyBreakdown: dailyBreakdownArray,
      studyDistribution,
      longestSession,
      bestDay,
      avgSessionLength,
      insights
    };
  }, [sessions, tasks, classes, profile, period]);

  // Focus stats (always computed from all sessions, not period-filtered)
  const focusStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStartDate = new Date(todayStart);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());

    const todaySessions = sessions.filter(s => {
      const d = new Date(s.completedAt || s.timestamp || s.createdAt);
      return d >= todayStart;
    });

    const weekSessions = sessions.filter(s => {
      const d = new Date(s.completedAt || s.timestamp || s.createdAt);
      return d >= weekStartDate;
    });
    const weekTotal = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      todayTotal: todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      weekAvg: weekSessions.length > 0 ? Math.round(weekTotal / 7) : 0,
      longestSession: sessions.reduce((max, s) => Math.max(max, s.duration || 0), 0),
      todayCount: todaySessions.length
    };
  }, [sessions]);

  // Monthly summary (always computed for current month)
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthSessions = sessions.filter(s => {
      const d = new Date(s.completedAt || s.timestamp || s.createdAt);
      return d >= monthStart;
    });
    const monthMinutes = monthSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    const monthCompleted = tasks.filter(task => {
      if (!task.completed) return false;
      const d = new Date(task.completedAt || task.updatedAt || task.createdAt);
      return d >= monthStart;
    }).length;

    return {
      monthHours: (monthMinutes / 60).toFixed(1),
      sessionCount: monthSessions.length,
      completedTasks: monthCompleted,
      streak: profile?.streak || 0
    };
  }, [sessions, tasks, profile]);

  return { ...analyticsData, rawSessions: sessions, focusStats, monthlySummary, loading };
};
