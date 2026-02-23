import React from 'react';

export function SkeletonCard({ count = 3 }) {
  return (
    <div className="item-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats-grid">
      <div className="skeleton skeleton-stat" />
      <div className="skeleton skeleton-stat" />
      <div className="skeleton skeleton-stat" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-text ${i === lines - 1 ? 'short' : 'medium'}`} />
      ))}
    </div>
  );
}
