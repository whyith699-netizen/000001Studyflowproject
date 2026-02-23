import React from 'react';

export default function StatsCard({ icon: Icon, value, label, variant = 'primary' }) {
  return (
    <div className={`stat-card ${variant}`}>
      {Icon && (
        <div className={`stat-icon ${variant}`}>
          <Icon size={18} />
        </div>
      )}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
