import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase-config';
import { classesService, tasksService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import Sidebar from './Sidebar';

// ==========================================
// ICON LIST (same as Extension AddClassPage)
// ==========================================
const ICONS = [
  'graduation-cap','book','book-open','chalkboard','chalkboard-teacher','school','university','pencil','pen',
  'calculator','ruler','compass','laptop-code','code','terminal','database','server','microchip','memory','wifi',
  'flask','microscope','atom','dna','vial','vials','biohazard','radiation','magnet',
  'square-root-alt','infinity','divide','plus','minus','percent','subscript','superscript',
  'globe','globe-americas','globe-asia','globe-europe','earth-americas','earth-asia',
  'palette','paint-brush','paintbrush','brush','pen-fancy','pen-nib','pen-ruler','swatchbook',
  'music','guitar','drum','headphones-simple',
  'dumbbell','football','basketball','baseball','volleyball','table-tennis-paddle','bowling-ball',
  'heart','heart-pulse','stethoscope','pills','syringe','thermometer',
  'landmark','monument','building','building-columns','bank','church','mosque',
  'language','spell-check','font','paragraph','align-left','comment','comments','message',
  'camera','video','film','play','tv','desktop','mobile','tablet',
  'chart-line','chart-bar','chart-pie','chart-area','chart-simple',
  'coins','money-bill','credit-card','wallet','piggy-bank',
  'gavel','scale-balanced','handshake','briefcase',
  'brain','lightbulb','robot','wand-magic-sparkles',
  'sun','moon','star','meteor','rocket','satellite',
  'map','mountain','tree','seedling','leaf',
  'users','user','user-group','user-tie','children',
  'paw','dog','cat','fish','crow','spider','bug','frog',
  'car','bus','train','plane','bicycle','motorcycle','ship',
  'lock','key','shield','eye',
  'clock','calendar','calendar-days','calendar-check','bell',
  'magnifying-glass','gamepad','dice','puzzle-piece','chess',
  'gem','check','question','exclamation','thumbs-up','face-smile',
  'ghost','hat-wizard','cookie','mug-hot','utensils',
  'cross','pray','om','yin-yang','peace','star-and-crescent',
];

// Resolve class icon
const getClassIcon = (cls) => {
  const icon = cls.icon;
  if (!icon) return 'fa-graduation-cap';
  if (icon.startsWith('fa-')) return icon;
  return `fa-${icon}`;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const DAY_MAP = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday', Sun: 'sunday' };

function getFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

function getDaysUntilDue(dueDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000*60*60*24));
}

// ==========================================
// ICON PICKER COMPONENT
// ==========================================
function IconPicker({ value, onChange, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return ICONS;
    const q = search.toLowerCase();
    return ICONS.filter(i => i.includes(q));
  }, [search]);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-colors ${
          isDarkMode ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}>
        <i className={`fas fa-${value || 'graduation-cap'}`}></i>
      </button>
      {open && (
        <div className={`absolute top-14 left-0 z-50 rounded-xl border shadow-xl p-3 w-72 max-h-64 overflow-y-auto ${
          isDarkMode ? 'bg-[#1e293b] border-slate-600' : 'bg-white border-gray-200'
        }`}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search icons..."
            className={`w-full px-3 py-1.5 rounded-lg border text-sm mb-2 ${
              isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
            } focus:outline-none focus:border-blue-500`}
          />
          <div className="grid grid-cols-6 gap-1.5">
            {filtered.map(icon => (
              <button key={icon} type="button" onClick={() => { onChange(icon); setOpen(false); setSearch(''); }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all ${
                  value === icon
                    ? 'bg-blue-600 text-white'
                    : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`} title={icon}>
                <i className={`fas fa-${icon}`}></i>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// CONFIRM DIALOG
// ==========================================
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, isDarkMode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className={`rounded-xl p-5 w-full max-w-sm border shadow-2xl ${isDarkMode ? 'bg-[#1e293b] border-slate-600' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          <button onClick={onClose} className={`${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white border border-red-600 transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COURSES PAGE
// ==========================================
const CoursesPage = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();

  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDay, setFilterDay] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Add class form
  const [formData, setFormData] = useState({ name: '', icon: 'graduation-cap', days: [], links: [{ title: '', url: '' }] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [classPage, setClassPage] = useState(0);
  const classesPerPage = 18;

  useEffect(() => {
    const unsubClasses = classesService.subscribeToClasses(fetched => { setClasses(fetched); setLoading(false); });
    const unsubTasks = tasksService.subscribeToTasks(fetched => setTasks(fetched));
    return () => { unsubClasses(); unsubTasks(); };
  }, []);

  // Filter classes
  const filteredClasses = useMemo(() => {
    let filtered = classes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name?.toLowerCase().includes(q));
    }
    if (filterDay !== 'All') {
      const fullDay = DAY_MAP[filterDay];
      filtered = filtered.filter(c => c.days?.some(d => d.toLowerCase() === fullDay));
    }
    return filtered;
  }, [classes, searchQuery, filterDay]);

  // Paginate
  const paginatedClasses = useMemo(() => {
    const start = classPage * classesPerPage;
    return filteredClasses.slice(start, start + classesPerPage);
  }, [filteredClasses, classPage]);
  const totalPages = Math.ceil(filteredClasses.length / classesPerPage);

  // Task stats
  const taskStats = useMemo(() => {
    const pending = tasks.filter(t => !t.completed);
    return {
      total: pending.length,
      exam: pending.filter(t => t.type === 'exam').length,
      individual: pending.filter(t => t.type === 'individual').length,
      group: pending.filter(t => t.type === 'group').length,
    };
  }, [tasks]);

  // Get tasks for class
  const getClassTasks = (classId) => tasks.filter(t => t.classId === classId);
  const getClassPendingTasks = (classId) => tasks.filter(t => t.classId === classId && !t.completed);

  // Selected class data
  const selectedClassTasks = useMemo(() => {
    if (!selectedClass) return [];
    const filtered = tasks.filter(t => t.classId === selectedClass.id);
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      return 0;
    });
    return filtered;
  }, [tasks, selectedClass]);

  // Handlers
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await classesService.addClass({
        name: formData.name.trim(),
        icon: formData.icon,
        days: formData.days,
        links: formData.links.filter(l => l.url.trim()),
      });
      setShowAddModal(false);
      setFormData({ name: '', icon: 'graduation-cap', days: [], links: [{ title: '', url: '' }] });
    } catch (err) {
      console.error('Failed to add class:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    try {
      await classesService.deleteClass(selectedClass.id);
      setShowDetailModal(false);
      setSelectedClass(null);
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  const addLink = () => setFormData(prev => ({ ...prev, links: [...prev.links, { title: '', url: '' }] }));
  const updateLink = (i, field, val) => setFormData(prev => ({ ...prev, links: prev.links.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const removeLink = (i) => setFormData(prev => ({ ...prev, links: prev.links.filter((_, idx) => idx !== i) }));

  const typeIcons = { exam: 'fa-file-alt', individual: 'fa-user', group: 'fa-users', other: 'fa-sticky-note' };

  // Dark mode helpers
  const cardCls = isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const textMuted = isDarkMode ? 'text-slate-500' : 'text-gray-400';
  const bgSubtle = isDarkMode ? 'bg-slate-800' : 'bg-gray-50';
  const borderSubtle = isDarkMode ? 'border-slate-700' : 'border-gray-200';
  const hoverBg = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100';

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 w-full px-4 py-4 md:px-6 md:py-5 flex flex-col gap-3">

          {/* ============ MY CLASSES SECTION ============ */}
          <div className={`rounded-xl p-4 border shadow-sm flex-1 flex flex-col min-h-0 ${cardCls}`}>
            {/* Header */}
            <div className={`flex items-center gap-2.5 mb-3 pb-3 border-b ${borderSubtle}`}>
              <i className="fas fa-chalkboard text-blue-500 text-sm"></i>
              <h3 className={`text-sm font-semibold tracking-tight flex-1 ${textPrimary}`}>{t('myClasses')}</h3>

              {/* Search */}
              <div className="relative">
                <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}></i>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('search')}
                  className={`py-2 pl-8 pr-3 border rounded-lg text-sm transition-all focus:outline-none focus:border-blue-500 w-32 focus:w-40 ${
                    isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Add Class */}
              <button onClick={() => setShowAddModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            {/* Day Filter */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              {['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <button key={day} onClick={() => { setFilterDay(day); setClassPage(0); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex-1 min-w-0 text-center whitespace-nowrap transition-all ${
                    filterDay === day
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  }`}>
                  {day === 'All' ? t('allDays') : t(day.toLowerCase())}
                </button>
              ))}
            </div>

            {/* Class Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : paginatedClasses.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 flex-1 overflow-y-auto content-start" style={{ scrollbarWidth: 'none' }}>
                {paginatedClasses.map(cls => {
                  const pendingCount = getClassPendingTasks(cls.id).length;
                  return (
                    <div key={cls.id}
                      className="flex flex-col items-center text-center py-2 px-1 cursor-pointer group rounded-xl transition-all"
                      onClick={() => { setSelectedClass(cls); setShowDetailModal(true); }}>
                      <div className={`w-11 h-11 flex items-center justify-center rounded-xl text-lg transition-all relative group-hover:bg-blue-600 group-hover:text-white group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:shadow-blue-500/15 ${
                        isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <i className={`fas ${getClassIcon(cls)}`}></i>
                        {pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {pendingCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-[0.68rem] font-medium mt-2 truncate w-full px-0.5 leading-tight ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        {cls.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-8 ${textMuted}`}>
                <i className="fas fa-chalkboard text-2xl mb-2 opacity-30"></i>
                <p className="text-sm">{searchQuery || filterDay !== 'All' ? t('noClassesFound') : t('noClassesYet')}</p>
                {classes.length === 0 && (
                  <button onClick={() => setShowAddModal(true)} className="mt-3 text-blue-500 text-sm font-medium hover:underline">
                    {t('addFirstClass')}
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex justify-center items-center gap-2 mt-2.5 pt-2.5 border-t ${borderSubtle}`}>
                <button onClick={() => setClassPage(p => Math.max(0, p - 1))} disabled={classPage === 0}
                  className={`w-7 h-7 flex items-center justify-center rounded-md border disabled:opacity-30 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                  <i className="fas fa-chevron-left text-[0.6rem]"></i>
                </button>
                <span className={`text-xs min-w-[40px] text-center ${textSecondary}`}>{classPage + 1} / {totalPages}</span>
                <button onClick={() => setClassPage(p => Math.min(totalPages - 1, p + 1))} disabled={classPage >= totalPages - 1}
                  className={`w-7 h-7 flex items-center justify-center rounded-md border disabled:opacity-30 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                  <i className="fas fa-chevron-right text-[0.6rem]"></i>
                </button>
              </div>
            )}
          </div>

          {/* ============ MY TASKS SUMMARY ============ */}
          <div className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all flex-shrink-0 ${cardCls} hover:border-blue-500/30`}
            onClick={() => navigate('/tasks')}>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5 flex-1">
                <i className="fas fa-tasks text-lg text-blue-500"></i>
                <h3 className={`text-sm font-semibold tracking-tight ${textPrimary}`}>{t('myTasks')}</h3>
              </div>

              {/* Quick Stats */}
              <div className={`flex items-center gap-2.5 px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-gray-100 border-gray-200'}`}>
                <span className={`flex items-center gap-1 text-xs font-medium ${textSecondary}`}>
                  <i className="fas fa-file-alt text-[0.6rem] text-blue-500/60"></i>{taskStats.exam}
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium ${textSecondary}`}>
                  <i className="fas fa-user text-[0.6rem] text-blue-500/60"></i>{taskStats.individual}
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium ${textSecondary}`}>
                  <i className="fas fa-users text-[0.6rem] text-blue-500/60"></i>{taskStats.group}
                </span>
              </div>

              {/* Add Button */}
              <button onClick={(e) => { e.stopPropagation(); navigate('/tasks'); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                <i className="fas fa-plus text-xs"></i> {t('add')}
              </button>

              {/* Count Badge */}
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-white ${taskStats.total > 0 ? 'bg-blue-600' : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}>
                {taskStats.total}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============ ADD CLASS MODAL ============ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className={`rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto border ${isDarkMode ? 'bg-[#1e293b] border-slate-600' : 'bg-white border-gray-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('addClass')}</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg transition-colors ${hoverBg}`}>
                <i className={`fas fa-times ${textMuted}`}></i>
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              {/* Name + Icon */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${textSecondary}`}>{t('className')}</label>
                <div className="flex gap-2">
                  <IconPicker value={formData.icon} onChange={icon => setFormData(prev => ({ ...prev, icon }))} isDarkMode={isDarkMode} />
                  <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('exampleMath')} required
                    className={`flex-1 px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>

              {/* Schedule Days */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${textSecondary}`}>{t('dayLabel')}</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        formData.days.includes(day)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {DAY_LABELS[day] || day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wide mb-2 ${textSecondary}`}>{t('classLinks')}</label>
                <div className="space-y-2">
                  {formData.links.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={link.title} onChange={e => updateLink(i, 'title', e.target.value)}
                        placeholder={t('linkTitle')}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                        }`}
                      />
                      <input type="url" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)}
                        placeholder="URL"
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                        }`}
                      />
                      {formData.links.length > 1 && (
                        <button type="button" onClick={() => removeLink(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addLink}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 text-blue-500 text-xs font-medium hover:bg-blue-50 rounded-lg transition-colors">
                  <i className="fas fa-plus"></i> {t('addLink')}
                </button>
              </div>

              {/* Submit */}
              <button type="submit" disabled={isSubmitting || !formData.name.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> {t('saving')}</>
                ) : t('addClass')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============ CLASS DETAIL MODAL ============ */}
      {showDetailModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailModal(false); setSelectedClass(null); }}>
          <div className={`rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto border ${isDarkMode ? 'bg-[#1e293b] border-slate-600' : 'bg-white border-gray-200'}`}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <i className={`fas ${getClassIcon(selectedClass)}`}></i>
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>{selectedClass.name}</h2>
                  {selectedClass.days?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {selectedClass.days.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-medium capitalize">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowDeleteConfirm(true)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800/30' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}>
                  <i className="fas fa-trash text-sm"></i>
                </button>
                <button onClick={() => { setShowDetailModal(false); setSelectedClass(null); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            {/* Room / Time */}
            {selectedClass.room && (
              <p className={`text-sm mt-2 ${textSecondary}`}><i className={`fas fa-map-marker-alt mr-1.5 ${textMuted}`}></i>{selectedClass.room}</p>
            )}
            {selectedClass.time && (
              <p className={`text-sm mt-1 ${textSecondary}`}><i className={`far fa-clock mr-1.5 ${textMuted}`}></i>{selectedClass.time}</p>
            )}

            {/* Links */}
            <div className={`mt-4 pt-4 border-t ${borderSubtle}`}>
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-link text-blue-500 text-sm"></i>
                <h3 className={`text-sm font-semibold flex-1 ${textPrimary}`}>{t('classLinks')}</h3>
                <span className={`text-[10px] ${textMuted}`}>{(selectedClass.links || []).filter(l => l.url).length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {(selectedClass.links || []).filter(l => l.url).length > 0 ? (
                  selectedClass.links.filter(l => l.url).map((link, i) => {
                    let hostname = '';
                    try { hostname = new URL(link.url).hostname; } catch { hostname = link.url; }
                    const faviconSrc = getFaviconUrl(link.url);
                    return (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all no-underline border border-transparent ${
                          isDarkMode ? 'bg-slate-800 hover:bg-slate-700 hover:border-slate-600' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                        }`}>
                        {faviconSrc ? (
                          <img src={faviconSrc} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                            onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <i className={`fas fa-globe text-xs ${textMuted}`}></i>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{link.title || hostname}</div>
                          <div className={`text-[11px] truncate ${textMuted}`}>{hostname}</div>
                        </div>
                        <i className={`fas fa-external-link-alt text-[10px] flex-shrink-0 ${textMuted}`}></i>
                      </a>
                    );
                  })
                ) : (
                  <p className={`text-center text-sm py-4 ${textMuted}`}>{t('noLinks')}</p>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className={`mt-4 pt-4 border-t ${borderSubtle}`}>
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-tasks text-blue-500 text-sm"></i>
                <h3 className={`text-sm font-semibold flex-1 ${textPrimary}`}>{t('classTasks')}</h3>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-medium">
                  {selectedClassTasks.filter(t => !t.completed).length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {selectedClassTasks.length > 0 ? selectedClassTasks.map(task => {
                  const taskType = task.type || 'other';
                  const daysUntil = task.dueDate && !task.completed ? getDaysUntilDue(task.dueDate) : null;
                  const dueClass = daysUntil !== null ? (daysUntil <= 1 ? 'text-red-500 bg-red-50' : daysUntil <= 3 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50') : '';
                  const dueText = daysUntil !== null ? (daysUntil < 0 ? t('overdue') : daysUntil === 0 ? t('dueToday') : daysUntil === 1 ? t('dueTomorrow') : t('dueInDays').replace('{n}', daysUntil)) : '';

                  return (
                    <div key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all border border-transparent ${
                        isDarkMode ? 'bg-slate-800 hover:bg-slate-700 hover:border-slate-600' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                      }`}>
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <i className={`fas ${typeIcons[taskType] || typeIcons.other}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${task.completed ? 'line-through opacity-50' : ''} ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {task.title || task.text || 'Untitled Task'}
                        </div>
                        <div className={`text-[11px] capitalize ${textMuted}`}>{taskType}</div>
                      </div>
                      {dueText && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${dueClass}`}>{dueText}</span>
                      )}
                    </div>
                  );
                }) : (
                  <p className={`text-center text-sm py-4 ${textMuted}`}>{t('noTasksForClass')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteClass}
        title={t('deleteClass')}
        message={t('confirmDelete')}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default CoursesPage;
