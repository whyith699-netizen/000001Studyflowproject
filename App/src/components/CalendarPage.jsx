import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { tasksService, calendarEventsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import Sidebar from './Sidebar';

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth()    === d2.getMonth()    &&
  d1.getDate()     === d2.getDate();

const toDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isInRange = (dateStr, startStr, endStr) => {
  if (!startStr) return false;
  return dateStr >= startStr && dateStr <= (endStr || startStr);
};

const daysBetween = (s, e) => Math.round((new Date(e) - new Date(s)) / 86400000);

const COLORS = {
  task:     { bar: '#3b82f6', barDark: '#2563eb', light: 'bg-blue-100',   text: 'text-blue-700',   dBg: 'bg-blue-900/30',   dTx: 'text-blue-300',   dot: 'bg-blue-500'   },
  exam:     { bar: '#ef4444', barDark: '#dc2626', light: 'bg-red-100',    text: 'text-red-700',    dBg: 'bg-red-900/30',    dTx: 'text-red-300',    dot: 'bg-red-500'    },
  event:    { bar: '#a855f7', barDark: '#9333ea', light: 'bg-purple-100', text: 'text-purple-700', dBg: 'bg-purple-900/30', dTx: 'text-purple-300', dot: 'bg-purple-500' },
  reminder: { bar: '#eab308', barDark: '#ca8a04', light: 'bg-yellow-100', text: 'text-yellow-700', dBg: 'bg-yellow-900/30', dTx: 'text-yellow-300', dot: 'bg-yellow-500' },
  week:     { bar: '#22c55e', barDark: '#16a34a', light: 'bg-green-100',  text: 'text-green-700',  dBg: 'bg-green-900/30',  dTx: 'text-green-300',  dot: 'bg-green-500'  },
};

const ICON = {
  task: 'fa-check-circle', exam: 'fa-file-alt', event: 'fa-star',
  reminder: 'fa-bell', week: 'fa-layer-group',
};

/* ─────────────────────────────────────────────────
   Component
───────────────────────────────────────────────── */
const CalendarPage = () => {
  const user           = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t, lang }    = useLang();
  const today          = new Date();

  const [activeTab, setActiveTab]       = useState('calendar');
  const [currentDate, setCurrentDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay]   = useState(today);
  const [tasks, setTasks]               = useState([]);
  const [calEvents, setCalEvents]       = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSaving, setIsSaving]         = useState(false);
  const [isMultiDay, setIsMultiDay]     = useState(false);
  const [formData, setFormData]         = useState({
    title: '', type: 'event', date: toDateStr(today), endDate: '', time: '', description: '',
  });

  useEffect(() => {
    const u1 = tasksService.subscribeToTasks(d => setTasks(d));
    const u2 = calendarEventsService.subscribeToEvents(d => setCalEvents(d));
    return () => { u1(); u2(); };
  }, []);

  /* ── Parsing ── */
  const parseDue = (v) => {
    if (!v) return null;
    if (typeof v === 'number') return toDateStr(new Date(v));
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return v.substring(0, 10);
  };
  const parseTime = (v) => (v && typeof v === 'string' && v.length > 10) ? v.substring(11, 16) : '';

  /* ── Merged events ── */
  const allEvents = [
    ...tasks.filter(t => t.dueDate).map(t => {
      const ds = parseDue(t.dueDate);
      return ds ? {
        id: t.id, title: t.text, type: t.type === 'exam' ? 'exam' : 'task',
        date: ds, endDate: ds, time: parseTime(t.dueDate),
        description: t.className ? `📚 ${t.className}` : '',
        source: 'task', multiDay: false,
      } : null;
    }).filter(Boolean),
    ...calEvents.map(e => ({
      ...e,
      date:     e.date || e.startDate || '',
      endDate:  e.endDate || e.date || '',
      multiDay: !!(e.endDate && e.endDate !== (e.date || e.startDate || '')),
      source:   'event',
    })),
  ];

  /* ── Grid ── */
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const flat = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (flat.length % 7 !== 0) flat.push(null);
  const weeks = [];
  for (let i = 0; i < flat.length; i += 7) weeks.push(flat.slice(i, i + 7));

  const dayToStr = (day) => day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;

  /* ── Spanning bar calculation ── */
  const getWeekBars = (week) => {
    const colDates = week.map(dayToStr);
    const validCols = [];
    colDates.forEach((d, i) => { if (d) validCols.push(i); });
    if (!validCols.length) return [];

    const weekStart = colDates[validCols[0]];
    const weekEnd   = colDates[validCols[validCols.length - 1]];

    // Track occupied rows to avoid overlapping bars
    const rowOccupancy = [];

    const bars = [];
    allEvents.forEach(ev => {
      if (!ev.multiDay) return;
      if (!ev.endDate) return;
      if (ev.date > weekEnd || ev.endDate < weekStart) return;

      // Find start column
      let startCol = -1;
      for (let i = 0; i < 7; i++) {
        if (colDates[i] && colDates[i] >= ev.date) {
          // If event starts before this week, use first valid column
          if (colDates[i] > ev.date) {
            startCol = validCols[0];
          } else {
            startCol = i;
          }
          break;
        }
      }
      if (startCol < 0) startCol = validCols[0];

      // Find end column
      let endCol = -1;
      for (let i = 6; i >= 0; i--) {
        if (colDates[i] && colDates[i] <= ev.endDate) {
          // If event ends after this week, use last valid column
          if (colDates[i] < ev.endDate) {
            endCol = validCols[validCols.length - 1];
          } else {
            endCol = i;
          }
          break;
        }
      }
      if (endCol < 0) endCol = validCols[validCols.length - 1];

      const leftPct  = (startCol / 7) * 100;
      const widthPct = ((endCol - startCol + 1) / 7) * 100;
      const startsHere = ev.date >= weekStart && ev.date <= weekEnd;
      const endsHere   = ev.endDate >= weekStart && ev.endDate <= weekEnd;

      // Find available row (avoid overlap)
      let rowIndex = 0;
      while (true) {
        const overlaps = rowOccupancy.some(row =>
          row.row === rowIndex &&
          ((startCol >= row.start && startCol <= row.end) ||
           (endCol >= row.start && endCol <= row.end) ||
           (startCol <= row.start && endCol >= row.end))
        );
        if (!overlaps) break;
        rowIndex++;
      }

      rowOccupancy.push({ row: rowIndex, start: startCol, end: endCol });

      bars.push({ ev, leftPct, widthPct, startsHere, endsHere, rowIndex });
    });

    // Sort by row index for consistent rendering
    return bars.sort((a, b) => a.rowIndex - b.rowIndex);
  };

  /* ── Selected day ── */
  const selectedDayStr = toDateStr(selectedDay);
  const selDayEvts = allEvents
    .filter(e => isInRange(selectedDayStr, e.date, e.endDate))
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  /* ── Roadmap ── */
  const roadmapDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

  /* ── Handlers ── */
  const openAdd = (dateStr) => {
    setEditingEvent(null); setIsMultiDay(false);
    setFormData({ title: '', type: 'event', date: dateStr || toDateStr(selectedDay), endDate: '', time: '', description: '' });
    setShowModal(true);
  };
  const openEdit = (ev) => {
    if (ev.source === 'task') return;
    setEditingEvent(ev);
    setIsMultiDay(!!(ev.endDate && ev.endDate !== ev.date));
    setFormData({ title: ev.title, type: ev.type, date: ev.date, endDate: ev.endDate || ev.date, time: ev.time || '', description: ev.description || '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingEvent(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setIsSaving(true);
    const payload = { ...formData, endDate: isMultiDay && formData.endDate ? formData.endDate : formData.date };
    try {
      editingEvent
        ? await calendarEventsService.updateEvent(editingEvent.id, payload)
        : await calendarEventsService.addEvent(payload);
      closeModal();
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };
  const handleDel = async (ev) => {
    if (ev.source === 'task') return;
    await calendarEventsService.deleteEvent(ev.id);
  };

  const MONTHS = lang === 'id'
    ? ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = lang === 'id'
    ? ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const card = `rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`;

  /* ─────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */
  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 w-full px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3">

          {/* Header */}
          <div className={`${card} p-3`}>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <i className="fas fa-calendar-days text-blue-500 mr-2"></i>{t('calendarTitle')}
                </h1>
                <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('calendarSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex rounded-lg p-1 gap-1 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  {['calendar','roadmap'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab ? 'bg-blue-600 text-white shadow-sm'
                          : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      }`}>
                      <i className={`fas ${tab === 'calendar' ? 'fa-calendar-alt' : 'fa-route'} mr-1.5`}></i>
                      {t(tab === 'calendar' ? 'calTab' : 'roadmapTab')}
                    </button>
                  ))}
                </div>
                <button onClick={() => openAdd()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm flex items-center gap-2">
                  <i className="fas fa-plus"></i> {t('addEvent')}
                </button>
              </div>
            </div>
          </div>

          {/* ═══ CALENDAR TAB ═══ */}
          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">

              {/* Calendar Grid */}
              <div className={`lg:col-span-2 ${card} p-4 flex flex-col gap-2 overflow-y-auto`}>

                {/* Month nav */}
                <div className="flex items-center justify-between mb-1">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {MONTHS[month]} {year}
                  </h2>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {DAYS.map(d => (
                    <div key={d} className={`text-center text-xs font-semibold py-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
                  ))}
                </div>

                {/* Week rows */}
                {weeks.map((week, wIdx) => {
                  const bars = getWeekBars(week);
                  // Build a map: colIndex -> array of bars for that column
                  const colBarsMap = new Map();
                  bars.forEach(bar => {
                    for (let col = 0; col < 7; col++) {
                      const colDate = week[col] ? dayToStr(week[col]) : null;
                      if (!colDate) continue;
                      // Check if this bar should be visible in this column
                      if (bar.ev.date <= colDate && bar.ev.endDate >= colDate) {
                        if (!colBarsMap.has(col)) colBarsMap.set(col, []);
                        colBarsMap.get(col).push(bar);
                      }
                    }
                  });

                  return (
                    <div key={wIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                      {week.map((day, col) => {
                        if (!day) return (
                          <div key={`e-${wIdx}-${col}`} style={{ minHeight: 100 }}
                            className={`rounded-md ${isDarkMode ? 'bg-slate-800/20' : 'bg-gray-50/40'}`} />
                        );
                        const cellDate   = new Date(year, month, day);
                        const isToday    = isSameDay(cellDate, today);
                        const isSel      = isSameDay(cellDate, selectedDay);
                        const dateStr    = dayToStr(day);
                        const singleEvs  = allEvents.filter(e => !e.multiDay && e.date === dateStr);
                        const dayBars    = colBarsMap.get(col) || [];

                        return (
                          <div key={day} onClick={() => setSelectedDay(cellDate)}
                            style={{ minHeight: 100 }}
                            className={`rounded-md px-1 pb-1 cursor-pointer transition-all flex flex-col gap-1 ${
                              isSel ? isDarkMode ? 'bg-blue-900/40 ring-1 ring-blue-500' : 'bg-blue-50 ring-1 ring-blue-400'
                                : isToday ? isDarkMode ? 'bg-blue-900/10 ring-1 ring-blue-700' : 'bg-blue-50/60 ring-1 ring-blue-200'
                                  : isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'
                            }`}>
                            {/* Date number */}
                            <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full self-end ${
                              isToday ? 'bg-blue-600 text-white'
                                : isSel ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                  : isDarkMode ? 'text-slate-300' : 'text-gray-700'
                            }`}>{day}</span>

                            {/* Multi-day bars for this day */}
                            {dayBars.map(({ ev, rowIndex, startsHere, endsHere }) => {
                              const c = COLORS[ev.type] || COLORS.event;
                              const barColor = isDarkMode ? c.barDark : c.bar;
                              return (
                                <div
                                  key={ev.id + '-' + rowIndex}
                                  onClick={e => { e.stopPropagation(); openEdit(ev); }}
                                  className={`flex items-center px-1.5 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-90 truncate`}
                                  style={{
                                    backgroundColor: barColor,
                                    color: 'white',
                                    borderRadius: `${startsHere ? '6px 0 0 6px' : endsHere ? '0 6px 6px 0' : '0'}`,
                                    opacity: 0.95,
                                    minHeight: 18,
                                  }}
                                  title={`${ev.title} (${ev.date} → ${ev.endDate})`}
                                >
                                  {startsHere && (
                                    <>
                                      <i className={`fas ${ICON[ev.type]} text-[8px] mr-1 flex-shrink-0`}></i>
                                      <span className="truncate">{ev.title}</span>
                                    </>
                                  )}
                                  {!startsHere && !endsHere && (
                                    <div style={{ width: 8, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1 }}></div>
                                  )}
                                  {endsHere && !startsHere && (
                                    <>
                                      <div style={{ width: 8, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1 }}></div>
                                      <span className="truncate">{ev.title}</span>
                                    </>
                                  )}
                                </div>
                              );
                            })}

                            {/* Single-day events */}
                            {singleEvs.slice(0, 2).map(ev => {
                              const c = COLORS[ev.type] || COLORS.event;
                              return (
                                <div key={ev.id}
                                  onClick={e => { e.stopPropagation(); openEdit(ev); }}
                                  className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium cursor-pointer truncate hover:opacity-80 ${isDarkMode ? `${c.dBg} ${c.dTx}` : `${c.light} ${c.text}`}`}
                                  title={ev.title}>
                                  <i className={`fas ${ICON[ev.type]} text-[8px] flex-shrink-0`}></i>
                                  <span className="truncate">{ev.title}</span>
                                </div>
                              );
                            })}
                            {singleEvs.length > 2 && (
                              <span className={`text-[9px] px-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                +{singleEvs.length - 2} {t('moreEvents')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Day Detail Panel */}
              <div className={`${card} p-4 flex flex-col gap-3`}>
                <div className={`flex items-center justify-between pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                  <div>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{lang === 'id' ? 'Detail' : 'Details'}</p>
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedDay.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                  </div>
                  <button onClick={() => openAdd(toDateStr(selectedDay))} className="text-blue-500 hover:text-blue-700 p-1" title={t('addEvent')}>
                    <i className="fas fa-plus-circle text-lg"></i>
                  </button>
                </div>

                {selDayEvts.length === 0 ? (
                  <div className={`flex-1 flex flex-col items-center justify-center gap-2 py-10 ${isDarkMode ? 'text-slate-700' : 'text-gray-200'}`}>
                    <i className="fas fa-calendar-check text-4xl"></i>
                    <p className="text-xs">{t('noEventsDay')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto">
                    {selDayEvts.map(ev => {
                      const c = COLORS[ev.type] || COLORS.event;
                      return (
                        <div key={ev.id} className={`rounded-lg p-3 border flex flex-col gap-1.5 ${isDarkMode ? `${c.dBg} border-slate-700` : `${c.light} border-transparent`}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <i className={`fas ${ICON[ev.type]} ${isDarkMode ? c.dTx : c.text} text-sm flex-shrink-0`}></i>
                              <p className={`text-sm font-semibold truncate ${isDarkMode ? c.dTx : c.text}`}>{ev.title}</p>
                            </div>
                            {ev.source !== 'task' && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openEdit(ev)} className={`p-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} hover:opacity-80`}>
                                  <i className="fas fa-pen text-xs"></i>
                                </button>
                                <button onClick={() => handleDel(ev)} className="p-1 text-gray-400 hover:text-red-500">
                                  <i className="fas fa-trash text-xs"></i>
                                </button>
                              </div>
                            )}
                          </div>
                          {ev.multiDay && (
                            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              <i className="fas fa-arrows-left-right opacity-60"></i>
                              {ev.date} → {ev.endDate}
                              <span className="opacity-60 ml-1">({daysBetween(ev.date, ev.endDate) + 1} {lang === 'id' ? 'hari' : 'days'})</span>
                            </p>
                          )}
                          {ev.time && !ev.multiDay && (
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                              <i className="fas fa-clock mr-1 opacity-60"></i>{ev.time}
                            </p>
                          )}
                          {ev.description && <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{ev.description}</p>}
                          <div className="flex gap-2 flex-wrap mt-0.5">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDarkMode ? `${c.dBg} ${c.dTx}` : `${c.light} ${c.text}`}`}>
                              {t(`evType_${ev.type}`)}
                            </span>
                            {ev.multiDay && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                <i className="fas fa-layer-group text-[8px]"></i>
                                {lang === 'id' ? 'Multi-hari' : 'Multi-day'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ ROADMAP TAB ═══ */}
          {activeTab === 'roadmap' && (
            <div className="flex flex-col gap-4 flex-1">
              <div className={`rounded-xl p-4 border flex items-center gap-4 flex-wrap ${isDarkMode ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-800/30' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                  <i className="fas fa-route text-blue-500 text-xl"></i>
                </div>
                <div>
                  <h2 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('roadmapTitle')}</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('roadmapSubtitle')}</p>
                </div>
                <div className="ml-auto flex gap-3 flex-wrap">
                  {['task','exam','event','week','reminder'].map(type => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${COLORS[type].dot}`}></div>
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t(`evType_${type}`)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex flex-col">
                <div className={`absolute left-[7.5rem] top-0 bottom-0 w-px ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                {roadmapDays.map(day => {
                  const dateStr  = toDateStr(day);
                  const dayEvs   = allEvents.filter(e => isInRange(dateStr, e.date, e.endDate)).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
                  const isToday2 = isSameDay(day, today);
                  const isPast   = day < today && !isToday2;

                  return (
                    <div key={dateStr} className={`flex gap-0 items-start group ${dayEvs.length === 0 && !isToday2 ? 'opacity-30' : ''}`}>
                      <div className="w-28 flex-shrink-0 text-right pr-4 pt-3 pb-3">
                        <p className={`text-xs font-semibold ${isToday2 ? 'text-blue-500' : isPast ? (isDarkMode ? 'text-slate-600' : 'text-gray-300') : isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                          {day.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })}
                        </p>
                        <p className={`text-sm font-bold ${isToday2 ? 'text-blue-500' : isPast ? (isDarkMode ? 'text-slate-600' : 'text-gray-300') : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                          {day.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="relative flex items-center justify-center w-4 flex-shrink-0 mt-4">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          isToday2 ? 'bg-blue-500 border-blue-500 scale-125'
                            : dayEvs.length > 0 ? 'bg-blue-400 border-blue-300'
                              : isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300'
                        }`}></div>
                      </div>
                      <div className="flex-1 pl-4 py-3 flex flex-col gap-2">
                        {isToday2 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full self-start">
                            <i className="fas fa-circle text-[6px] animate-pulse"></i> {t('today')}
                          </span>
                        )}
                        {dayEvs.length === 0 && isToday2 && (
                          <p className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>{t('noEventsDay')}</p>
                        )}
                        {dayEvs.map(ev => {
                          const c = COLORS[ev.type] || COLORS.event;
                          const isStart = ev.date === dateStr;
                          const isEnd = ev.endDate === dateStr;
                          return (
                            <div key={ev.id + dateStr} onClick={() => openEdit(ev)}
                              className={`flex items-start gap-3 rounded-lg p-2.5 cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden
                                ${isDarkMode ? `${c.dBg} border border-slate-700` : `${c.light} border border-transparent`}`}>
                              {ev.multiDay && <div className={`absolute left-0 top-0 bottom-0 w-1 ${COLORS[ev.type]?.dot || 'bg-purple-500'}`}></div>}
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`}>
                                <i className={`fas ${ICON[ev.type]} text-sm ${isDarkMode ? c.dTx : c.text}`}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-sm font-semibold truncate ${isDarkMode ? c.dTx : c.text}`}>{ev.title}</p>
                                  {ev.multiDay && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                      {isStart ? '▶ Start' : isEnd ? '■ End' : '● Ongoing'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {ev.multiDay ? (
                                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                      <i className="fas fa-arrows-left-right mr-1 opacity-60"></i>
                                      {ev.date} → {ev.endDate} ({daysBetween(ev.date, ev.endDate) + 1} {lang === 'id' ? 'hari' : 'days'})
                                    </span>
                                  ) : ev.time && (
                                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                      <i className="fas fa-clock mr-1 opacity-60"></i>{ev.time}
                                    </span>
                                  )}
                                  {ev.description && <span className={`text-xs truncate max-w-[200px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{ev.description}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={() => openAdd(dateStr)}
                          className={`self-start text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500 hover:text-blue-400' : 'text-gray-300 hover:text-blue-500'}`}>
                          <i className="fas fa-plus"></i> {t('addEvent')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ═══ MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className={`rounded-xl p-6 w-full max-w-md shadow-2xl ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingEvent ? t('editEvent') : t('addEvent')}
              </h2>
              <button onClick={closeModal} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <input type="text" value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder={t('eventTitle')} autoFocus
                className={`w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />

              {/* Type */}
              <div className="grid grid-cols-5 gap-1.5">
                {['event','task','exam','reminder','week'].map(type => {
                  const c = COLORS[type];
                  const active = formData.type === type;
                  return (
                    <button key={type} type="button"
                      onClick={() => { setFormData(p => ({ ...p, type })); if (type === 'week') setIsMultiDay(true); }}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        active ? 'text-white border-transparent' : isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                      style={active ? { backgroundColor: c.bar } : {}}>
                      <i className={`fas ${ICON[type]} text-sm`}></i>
                      {t(`evType_${type}`)}
                    </button>
                  );
                })}
              </div>

              {/* Multi-day toggle */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <i className={`fas fa-layer-group text-sm ${isMultiDay ? 'text-green-500' : isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}></i>
                <span className={`text-sm flex-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {lang === 'id' ? 'Berlangsung beberapa hari' : 'Spans multiple days'}
                </span>
                <button type="button" onClick={() => setIsMultiDay(p => !p)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isMultiDay ? 'bg-green-500' : isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                  <span className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition"
                    style={{ transform: isMultiDay ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
              </div>

              {/* Date inputs */}
              {!isMultiDay ? (
                <div className="flex gap-2">
                  <input type="date" value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  <input type="time" value={formData.time}
                    onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className={`flex items-end gap-2 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-green-50 border border-green-100'}`}>
                    <div className="flex-1">
                      <p className={`text-[10px] font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-green-600'}`}>
                        {lang === 'id' ? '📅 Mulai' : '📅 Start'}
                      </p>
                      <input type="date" value={formData.date}
                        onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-green-400 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-green-200 text-gray-900'}`} />
                    </div>
                    <i className={`fas fa-arrow-right mb-2.5 ${isDarkMode ? 'text-slate-500' : 'text-green-400'}`}></i>
                    <div className="flex-1">
                      <p className={`text-[10px] font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-green-600'}`}>
                        {lang === 'id' ? '📅 Selesai' : '📅 End'}
                      </p>
                      <input type="date" value={formData.endDate} min={formData.date}
                        onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-green-400 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-green-200 text-gray-900'}`} />
                    </div>
                  </div>
                  {formData.date && formData.endDate && formData.endDate >= formData.date && (
                    <p className={`text-xs text-center ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      <i className="fas fa-layer-group mr-1"></i>
                      {daysBetween(formData.date, formData.endDate) + 1} {lang === 'id' ? 'hari' : 'days'}
                    </p>
                  )}
                </div>
              )}

              <textarea value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder={t('eventDesc')} rows={2}
                className={`w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />

              <div className="flex gap-3 pt-1">
                {editingEvent && (
                  <button type="button"
                    onClick={async () => { await handleDel(editingEvent); closeModal(); }}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50">
                    <i className="fas fa-trash mr-2"></i>{t('delete')}
                  </button>
                )}
                <button type="button" onClick={closeModal}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {t('cancel')}
                </button>
                <button type="submit"
                  disabled={isSaving || !formData.title.trim() || (isMultiDay && !formData.endDate)}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
