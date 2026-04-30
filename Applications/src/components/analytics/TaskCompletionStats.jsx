import React from 'react';

const TaskCompletionStats = ({ data, isDarkMode }) => {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Task Completion by Subject</h3>
      
      <div className="flex flex-col gap-4">
        {data.length === 0 ? (
          <div className="text-center py-6">
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No task data available</p>
          </div>
        ) : (
          data.map((item) => {
            const percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            return (
              <div key={item.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{item.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {item.completed}/{item.total} Tasks ({percentage}%)
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: item.color 
                    }}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskCompletionStats;
