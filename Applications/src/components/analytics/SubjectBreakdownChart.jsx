import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, isDarkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-2 rounded-lg border shadow-lg ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
        <p className="text-xs font-bold">{payload[0].name}</p>
        <p className="text-xs text-blue-500">{payload[0].value} minutes</p>
      </div>
    );
  }
  return null;
};

const SubjectBreakdownChart = ({ data, isDarkMode }) => {
  if (data.length === 0) {
    return (
      <div className={`rounded-xl p-6 border shadow-sm flex flex-col items-center justify-center text-center ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <i className="fas fa-chart-pie text-gray-400"></i>
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No subject data yet</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border shadow-sm flex flex-col h-full ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Focus by Subject</h3>
      
      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="minutes"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
                  {payload.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SubjectBreakdownChart;
