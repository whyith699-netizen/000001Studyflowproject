import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useLang } from '../../contexts/LanguageContext';

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#6366f1'];

const StudyDistributionChart = ({ studyDistribution, isDarkMode }) => {
  const { t } = useLang();

  const LABELS = {
    morning: t('morningLabel'),
    afternoon: t('afternoonLabel'),
    evening: t('eveningLabel'),
    night: t('nightLabel'),
  };

  const total = Object.values(studyDistribution).reduce((a, b) => a + b, 0);

  const data = Object.entries(studyDistribution)
    .filter(([, val]) => val > 0)
    .map(([key, val]) => ({
      name: LABELS[key] || key,
      value: val,
      pct: total > 0 ? Math.round((val / total) * 100) : 0
    }));

  if (data.length === 0) {
    return (
      <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <i className="fas fa-clock text-purple-500 mr-1.5"></i>{t('studyDistribution')}
        </h3>
        <p className={`text-xs text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('noDataYet')}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <i className="fas fa-clock text-purple-500 mr-1.5"></i>{t('studyDistribution')}
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${Math.round(value / 60 * 10) / 10}h`}
            contentStyle={{
              background: isDarkMode ? '#1e293b' : '#fff',
              border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
              borderRadius: '8px',
              fontSize: '11px',
              color: isDarkMode ? '#e2e8f0' : '#1f2937'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {data.map((entry, index) => (
          <span key={entry.name} className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
            <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>{entry.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default StudyDistributionChart;
