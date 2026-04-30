import React from 'react';

const BadgeGallery = ({ earnedBadges, allBadges, isDarkMode }) => {
  const isEarned = (badgeId) => earnedBadges.some(b => b.id === badgeId);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {allBadges.map((badge) => {
        const earned = isEarned(badge.id);
        return (
          <div 
            key={badge.id} 
            className={`group relative p-4 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 ${
              earned 
                ? isDarkMode 
                  ? 'bg-blue-900/20 border-blue-500/30' 
                  : 'bg-blue-50 border-blue-200' 
                : isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 grayscale opacity-40' 
                  : 'bg-gray-50 border-gray-100 grayscale opacity-40'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
              earned ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <i className={`fas ${badge.icon} text-xl`}></i>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              earned 
                ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                : isDarkMode ? 'text-slate-500' : 'text-gray-400'
            }`}>
              {badge.name}
            </span>

            {/* Tooltip on Hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              <p className="font-bold mb-1">{badge.name}</p>
              <p className="opacity-80">{badge.description}</p>
              {!earned && <p className="mt-1 text-blue-400 font-medium">Locked</p>}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgeGallery;
