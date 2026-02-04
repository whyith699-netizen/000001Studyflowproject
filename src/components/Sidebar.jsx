import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';

const Sidebar = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { path: '/dashboard', icon: 'fa-th-large', label: 'Dashboard' },
    { path: '/focus', icon: 'fa-clock', label: 'Focus Mode' },
    { path: '/courses', icon: 'fa-chalkboard', label: 'Courses' },
    { path: '/schedule', icon: 'fa-calendar-alt', label: 'Schedule' },
    { path: '/reports', icon: 'fa-chart-bar', label: 'Reports' },
    { path: '/settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 transition-colors duration-200 hidden md:flex">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-5">
          {/* Logo & User Profile */}
          <div className="flex items-center gap-3 px-2 pb-4 border-b border-gray-100">
            <div 
              className="w-10 h-10 rounded-xl shadow-sm relative bg-blue-600 text-white flex items-center justify-center font-bold text-base"
            >
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-gray-900 text-sm font-semibold leading-normal truncate">
                {user?.displayName || 'StudyFlow'}
              </h1>
              <p className="text-gray-400 text-xs font-normal leading-normal truncate">
                {user?.email || 'Premium Plan'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`
                }
              >
                <i className={`fas ${item.icon} text-base w-5 text-center`}></i>
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Action */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg hover:bg-red-50 text-red-500 transition-colors"
          >
            <i className="fas fa-sign-out-alt text-base w-5 text-center"></i>
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
