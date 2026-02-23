import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, Users, User, Plus } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/schedule', icon: Calendar, label: 'Calendar' },
  { to: null, icon: Plus, label: 'Add', isFab: true },
  { to: '/focus', icon: Users, label: 'Groups' },
  { to: '/settings', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav-v2">
      {navItems.map((item, idx) => {
        if (item.isFab) {
          return (
            <button
              key="fab"
              className="nav-fab-center"
              onClick={() => navigate('/tasks')}
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          );
        }

        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item-v2 ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
