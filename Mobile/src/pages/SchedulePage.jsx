import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { classesService } from '../services/firestore-service';
import { SkeletonCard } from '../components/Skeleton';
import { ArrowLeft, CalendarDays, Users, MoreHorizontal, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'EEEE'));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('Week');

  useEffect(() => {
    if (!user) return;
    const unsub = classesService.subscribeToClasses((c) => {
      setClasses(c);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        day: format(date, 'EEEE'),
        shortDay: format(date, 'EEE').toUpperCase(),
        dayNumber: format(date, 'dd'),
        isToday: format(new Date(), 'EEEE') === format(date, 'EEEE'),
      };
    });
  }, []);

  const dayClasses = classes.filter((c) =>
    c.schedule && c.schedule.some((s) => s.day === selectedDay)
  ).sort((a, b) => {
    const timeA = a.schedule.find(s => s.day === selectedDay)?.time || '';
    const timeB = b.schedule.find(s => s.day === selectedDay)?.time || '';
    return timeA.localeCompare(timeB);
  });

  // Generate session card data from classes
  const getSessionStatus = (index) => {
    const statuses = [
      { label: 'IN PROGRESS', color: 'blue', timeRange: '14:00 - 15:30' },
      { label: 'STARTS IN 2H', color: 'orange', timeRange: '17:30 - 18:30' },
      { label: 'TONIGHT', color: 'purple', timeRange: '20:00 - 21:00' },
    ];
    return statuses[index % statuses.length];
  };

  const subjectBadges = ['MATHEMATICS', 'HISTORY', 'SCIENCE', 'ENGLISH', 'PHYSICS'];
  const subjectColors = ['blue', 'amber', 'green', 'purple', 'red'];

  return (
    <div className="page-container calendar-v2">
      {/* Calendar Header */}
      <div className="cal-header">
        <div className="cal-header-left">
          <button className="cal-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={22} />
          </button>
          <h1 className="cal-title">Study Calendar</h1>
        </div>
        <button className="cal-icon-btn">
          <CalendarDays size={22} />
        </button>
      </div>

      {/* Month + View Toggle */}
      <div className="cal-controls">
        <button className="cal-month-selector">
          {format(new Date(), 'MMMM yyyy')} <span className="cal-caret">›</span>
        </button>
        <div className="cal-view-toggle">
          <button
            className={`cal-view-btn ${viewMode === 'Week' ? 'active' : ''}`}
            onClick={() => setViewMode('Week')}
          >
            Week
          </button>
          <button
            className={`cal-view-btn ${viewMode === 'Month' ? 'active' : ''}`}
            onClick={() => setViewMode('Month')}
          >
            Month
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="cal-day-selector">
        {weekDays.map((d) => (
          <button
            key={d.day}
            className={`cal-day-btn ${selectedDay === d.day ? 'active' : ''}`}
            onClick={() => setSelectedDay(d.day)}
          >
            <span className="cal-day-label">{d.shortDay}</span>
            <span className="cal-day-number">{d.dayNumber}</span>
            {d.isToday && <span className="cal-day-dots">
              <span className="cal-dot blue" />
              <span className="cal-dot blue" />
            </span>}
          </button>
        ))}
      </div>

      {/* Today's Sessions */}
      <div className="cal-section-header">
        <span className="cal-section-title">Today's Sessions</span>
        <span className="cal-section-badge">{dayClasses.length} Scheduled</span>
      </div>

      {loading ? (
        <SkeletonCard count={3} />
      ) : dayClasses.length > 0 ? (
        <div className="cal-sessions-list">
          {dayClasses.map((cls, index) => {
            const status = getSessionStatus(index);
            const badgeColor = subjectColors[index % subjectColors.length];
            const badgeText = cls.name || cls.className || subjectBadges[index % subjectBadges.length];
            const scheduleEntry = cls.schedule.find(s => s.day === selectedDay);
            const timeStr = scheduleEntry?.time || status.timeRange;

            return (
              <div key={cls.id} className={`cal-session-card border-${status.color}`}>
                <div className="cal-session-top">
                  <span className={`cal-session-status ${status.color}`}>
                    {index === 0 && <span className="cal-status-dot" />}
                    {status.label}
                  </span>
                  <span className="cal-session-time">{timeStr}</span>
                </div>
                <div className="cal-session-title">{badgeText}</div>
                <div className="cal-session-meta">
                  <span className={`cal-subject-badge ${badgeColor}`}>
                    {badgeText.toUpperCase()}
                  </span>
                  <span className="cal-participants">
                    <Users size={12} />
                    {4 + index * 4} joined
                  </span>
                </div>
                <div className="cal-session-footer">
                  <div className="cal-avatars">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="cal-avatar-circle" style={{
                        background: ['#6366f1', '#f472b6', '#10b981'][i],
                        zIndex: 3 - i,
                        marginLeft: i > 0 ? '-8px' : '0'
                      }} />
                    ))}
                    <span className="cal-avatar-more">+{3 + index * 3}</span>
                  </div>
                  {index === 0 ? (
                    <button className="cal-join-btn">Join Now</button>
                  ) : (
                    <button className="cal-more-btn">
                      <MoreHorizontal size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>Free day!</h3>
          <p>No sessions on {selectedDay}</p>
        </div>
      )}

      {/* Live Session Banner */}
      {dayClasses.length > 0 && (
        <div className="cal-live-banner">
          <div className="cal-live-icon">
            <CalendarDays size={20} />
          </div>
          <div className="cal-live-info">
            <div className="cal-live-title">Next: {dayClasses[0]?.name || 'Advanced Calculus'}</div>
            <div className="cal-live-subtitle">Live in 5 mins</div>
          </div>
          <button className="cal-live-join-btn">Join Session</button>
        </div>
      )}
    </div>
  );
}
