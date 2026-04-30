import React from 'react';

const TimeOfDayHeatmap = ({ heatmapData, isDarkMode }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max value for scaling colors
  const maxMinutes = Math.max(...heatmapData.flat(), 1);

  const getIntensityColor = (minutes) => {
    if (minutes === 0) return isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100';
    
    const ratio = minutes / maxMinutes;
    if (ratio > 0.8) return 'bg-blue-600 border-blue-700';
    if (ratio > 0.6) return 'bg-blue-500 border-blue-600';
    if (ratio > 0.4) return 'bg-blue-400 border-blue-500';
    if (ratio > 0.2) return 'bg-blue-300 border-blue-400';
    return 'bg-blue-200 border-blue-300';
  };

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Productivity Heatmap</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-blue-100"></div>
            <div className="w-2 h-2 rounded-sm bg-blue-300"></div>
            <div className="w-2 h-2 rounded-sm bg-blue-600"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[600px]">
          {/* Header (Hours) */}
          <div className="flex mb-2">
            <div className="w-8"></div>
            <div className="flex-1 flex justify-between px-1">
              {hours.map(h => (
                <span key={h} className={`text-[9px] w-full text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {h === 0 || h === 12 || h === 23 ? `${h}:00` : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-1">
            {days.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-2">
                <span className={`text-[10px] w-8 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{day}</span>
                <div className="flex-1 flex gap-1">
                  {heatmapData[dayIdx].map((minutes, hourIdx) => (
                    <div
                      key={`${dayIdx}-${hourIdx}`}
                      title={`${day} at ${hourIdx}:00 - ${minutes} minutes`}
                      className={`h-4 flex-1 rounded-sm border transition-colors ${getIntensityColor(minutes)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <p className={`text-[10px] mt-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        Darker cells indicate hours with higher focus activity.
      </p>
    </div>
  );
};

export default TimeOfDayHeatmap;
