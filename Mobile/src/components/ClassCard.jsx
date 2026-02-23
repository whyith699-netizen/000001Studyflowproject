import React from 'react';
import { MapPin, Clock, ExternalLink } from 'lucide-react';

export default function ClassCard({ cls, onClick }) {
  const getScheduleStr = () => {
    if (!cls.schedule || cls.schedule.length === 0) return null;
    return cls.schedule.map(s => `${s.day} ${s.time || ''}`).join(', ');
  };

  const detectLinkType = (url) => {
    if (!url) return 'Link';
    if (url.includes('zoom.us') || url.includes('zoom.')) return '🔗 Zoom';
    if (url.includes('drive.google')) return '📁 Drive';
    if (url.includes('classroom.google')) return '📚 Classroom';
    return '🔗 Link';
  };

  return (
    <div className="class-card" onClick={onClick}>
      <div className="class-card-header">
        <span className="class-name">{cls.name || cls.className || 'Unnamed Class'}</span>
      </div>

      {cls.room && (
        <div className="class-detail">
          <MapPin size={14} />
          <span>{cls.room}</span>
        </div>
      )}

      {getScheduleStr() && (
        <div className="class-detail">
          <Clock size={14} />
          <span>{getScheduleStr()}</span>
        </div>
      )}

      {cls.quickLinks && cls.quickLinks.length > 0 && (
        <div className="class-links">
          {cls.quickLinks.slice(0, 3).map((link, i) => (
            <a
              key={i}
              href={link.url || link}
              target="_blank"
              rel="noopener noreferrer"
              className="class-link-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              {detectLinkType(typeof link === 'string' ? link : link.url)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
