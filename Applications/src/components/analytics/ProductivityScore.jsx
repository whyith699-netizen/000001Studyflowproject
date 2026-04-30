import React from 'react';

const ProductivityScore = ({ score, isDarkMode }) => {
  // Determine color based on score
  const getColor = (s) => {
    if (s >= 80) return 'text-emerald-500';
    if (s >= 50) return 'text-blue-500';
    return 'text-amber-500';
  };

  const getBgColor = (s) => {
    if (s >= 80) return 'bg-emerald-500/10';
    if (s >= 50) return 'bg-blue-500/10';
    return 'bg-amber-500/10';
  };

  const getLabel = (s) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Great';
    if (s >= 40) return 'Good';
    return 'Needs Focus';
  };

  return (
    <div className={`rounded-xl p-4 border shadow-sm flex flex-col items-center justify-center text-center ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-xs font-semibold mb-3 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Productivity Score</h3>
      
      <div className="relative flex items-center justify-center w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className={isDarkMode ? 'text-slate-800' : 'text-gray-100'}
          />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={364.4}
            strokeDashoffset={364.4 - (364.4 * score) / 100}
            strokeLinecap="round"
            className={`${getColor(score)} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{score}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${getBgColor(score)} ${getColor(score)}`}>
            {getLabel(score)}
          </span>
        </div>
      </div>
      
      <p className={`text-xs mt-4 max-w-[180px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        Based on focus sessions, task completion, and consistency.
      </p>
    </div>
  );
};

export default ProductivityScore;
