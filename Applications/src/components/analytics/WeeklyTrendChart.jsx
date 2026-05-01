import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLang } from '../../contexts/LanguageContext';

const WeeklyTrendChart = ({ dailyBreakdown, prevPeriodData, isDarkMode }) => {
  const { t } = useLang();
  const chartData = useMemo(() => {
    const currentMap = {};
    dailyBreakdown.forEach(d => {
      currentMap[d.date.slice(5)] = d.minutes;
    });

    const prevMap = {};
    if (prevPeriodData?.dailyBreakdown) {
      Object.entries(prevPeriodData.dailyBreakdown).forEach(([date, data]) => {
        prevMap[date.slice(5)] = data.minutes;
      });
    }

    const allKeys = new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]);
    return [...allKeys].sort().map(key => ({
      date: key,
      current: currentMap[key] || 0,
      previous: prevMap[key] || 0,
    }));
  }, [dailyBreakdown, prevPeriodData]);

  if (chartData.length === 0) {
    return (
      <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <i className="fas fa-chart-line text-blue-500 mr-1.5"></i>{t('weeklyTrend')}
        </h3>
        <p className={`text-xs text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('noDataYet')}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <i className="fas fa-chart-line text-blue-500 mr-1.5"></i>{t('weeklyTrend')}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: isDarkMode ? '#1e293b' : '#fff',
              border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
              borderRadius: '8px',
              fontSize: '11px',
              color: isDarkMode ? '#e2e8f0' : '#1f2937'
            }}
          />
          <Legend iconType="line" iconSize={8} wrapperStyle={{ fontSize: '10px', color: isDarkMode ? '#94a3b8' : '#6b7280' }} />
          <Line type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name={t('thisPeriod')} />
          <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={t('previousPeriod')} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyTrendChart;
