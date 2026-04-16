import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase-config';
import { classesService, tasksService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import Sidebar from './Sidebar';

// ==========================================
// ICON LIST (same as Extension AddClassPage - 653 icons)
// ==========================================
const ICONS = [
  // Education & School
  'graduation-cap','book','book-open','book-reader','chalkboard','chalkboard-teacher','school','university','pencil','pen',
  'pen-fancy','pen-nib','pen-clip','highlighter','eraser','ruler','ruler-combined','ruler-horizontal','ruler-vertical',
  'backpack','apple-whole','glasses','user-graduate','award','certificate','stamp','ribbon','medal','trophy',
  'ranking-star','clipboard','clipboard-list','clipboard-check','note-sticky','file','file-lines','file-pen','file-export',
  'file-import','file-zipper','file-circle-check','file-signature',
  // Math & Numbers
  'calculator','square-root-variable','infinity','superscript','subscript','percent','divide','plus','minus','equals',
  'pi','wave-square','chart-bar','chart-line','chart-pie','chart-area','chart-column','chart-gantt','chart-simple',
  'sort-numeric-down','sort-numeric-up','greater-than','less-than','greater-than-equal','less-than-equal','not-equal',
  'angle-left','angle-right','shapes','draw-polygon','vector-square','bezier-curve','circle','square','triangle-exclamation',
  // Science & Lab
  'atom','flask','flask-vial','vial','vials','vial-virus','dna','microscope','magnet','radiation','biohazard',
  'temperature-half','temperature-high','temperature-low','fire','fire-flame-curved','fire-flame-simple','droplet',
  'eye-dropper','syringe','bacteria','virus','disease','prescription-bottle','mortar-pestle','bong','filter',
  'filter-circle-xmark','diagram-project','diagram-next',
  // Space & Astronomy
  'sun','moon','star','meteor','rocket','shuttle-space','satellite','satellite-dish','earth-americas','earth-asia',
  'earth-europe','earth-africa','earth-oceania','globe','user-astronaut','explosion','burst','comet',
  // Technology & Devices
  'laptop','laptop-code','laptop-file','laptop-medical','computer','desktop','display','keyboard','mouse',
  'microchip','memory','hard-drive','server','database','wifi','bluetooth','usb','ethernet','network-wired',
  'mobile','mobile-screen','tablet','tablet-screen-button','tv','camera','camera-retro','video','microphone',
  'headphones','headset','print','fax','pager','sim-card','sd-card','compact-disc','floppy-disk',
  'plug','battery-full','battery-half','battery-quarter','solar-panel','tower-broadcast','tower-cell','signal',
  // Programming & CS
  'code','file-code','terminal','bug','bug-slash','code-branch','code-commit','code-compare','code-fork',
  'code-merge','code-pull-request','sitemap','project-diagram','cubes','cube','layer-group','object-group','object-ungroup',
  'puzzle-piece','shield-halved','lock','unlock','key','qrcode','barcode','hashtag','at','link','link-slash',
  // AI & Data Science
  'robot','brain','lightbulb','wand-magic-sparkles','circle-nodes',
  'magnifying-glass-chart','bars-progress','table','table-cells','table-columns','table-list',
  // Languages & Communication
  'language','spell-check','font','text-height','text-width','paragraph','align-left','align-center','align-right',
  'align-justify','list','list-ol','list-ul','list-check','quote-left','quote-right','comment','comments','message',
  'envelope','envelope-open','paper-plane','inbox','flag','flag-checkered','flag-usa','bullhorn','megaphone',
  // Literature & Writing
  'book-bookmark','book-journal-whills','book-skull','book-tanakh','book-atlas','book-bible','book-medical',
  'book-quran','scroll','scroll-torah','newspaper','feather','feather-pointed','pen-to-square','signature',
  'italic','bold','underline','strikethrough','indent','outdent','section','ellipsis',
  // Religion & Philosophy
  'hands-praying','pray','church','mosque','kaaba','cross','star-and-crescent','star-of-david','menorah',
  'om','yin-yang','dharmachakra','peace','place-of-worship','torii-gate','gopuram','vihara','hamsa','khanda',
  'dove','hand-holding-heart','heart','heart-pulse','ankh','bahai',
  // History & Archaeology
  'landmark','landmark-dome','landmark-flag','monument','archway','building-columns','scale-balanced','gavel',
  'chess-rook','chess-king','chess-queen','chess-knight','chess-bishop','chess-pawn','chess-board',
  'chess','castle','crown','dungeon','shield','skull-crossbones','person-digging','bone','skull',
  // Geography & Environment
  'map','map-location-dot','map-location','map-pin','location-dot','location-crosshairs','compass',
  'mountain','mountain-sun','mountain-city','tree','tree-city','seedling','leaf','clover','water','water-ladder',
  'volcano','hurricane','tornado','wind','cloud','cloud-sun','cloud-rain','cloud-bolt','cloud-showers-heavy',
  'snowflake','icicles','temperature-arrow-up','temperature-arrow-down',
  'city','building','buildings','house','igloo','tent','campground','road','bridge','bridge-water',
  // Economics & Business
  'coins','money-bill','money-bill-wave','money-bill-trend-up','money-bill-transfer','money-bill-1-wave','money-check',
  'money-check-dollar','credit-card','wallet','piggy-bank','dollar-sign','euro-sign','yen-sign','rupiah-sign',
  'bitcoin-sign','sack-dollar','sack-xmark','vault','briefcase',
  'receipt','cash-register','store','shop','cart-shopping','basket-shopping','bag-shopping','tags','tag',
  'file-invoice','file-invoice-dollar','arrow-trend-up','arrow-trend-down',
  // Civics & Law
  'building-flag','people-group','people-roof','people-pulling','people-arrows',
  'person-booth','box-ballot','id-card','id-badge','passport',
  // Arts & Design
  'palette','paint-brush','paintbrush','brush','pen-ruler','paint-roller','spray-can','spray-can-sparkles','swatchbook',
  'icons','wand-magic','wand-sparkles','drafting-compass','compass-drafting','eye','eye-slash',
  'image','images','panorama','crop','crop-simple','scissors','cut','copy','paste','clone','fill-drip','fill',
  // Music
  'music','guitar','drum','drum-steelpan','headphones-simple','radio','record-vinyl',
  'volume-high','volume-low','volume-off','volume-xmark','sliders','microphone-lines','microphone-slash','itunes-note',
  // Film & Theater
  'masks-theater','theater-masks','film','clapperboard','ticket','ticket-simple','photo-film',
  'camera-movie','popcorn',
  // Sports & PE
  'person-running','person-walking','person-swimming','person-biking','person-skiing','person-skating',
  'person-snowboarding','person-hiking','person-praying','basketball','football','volleyball','baseball-bat-ball',
  'baseball','golf-ball-tee','table-tennis-paddle-ball','bowling-ball','futbol','hockey-puck','lacrosse',
  'dumbbell','weight-hanging','weight-scale','stopwatch','stopwatch-20',
  'bullseye','crosshairs','bicycle','swimmer',
  // Medical & Health
  'stethoscope','pills','capsules','bandage','hospital','hospital-user','user-doctor','user-nurse',
  'wheelchair','wheelchair-move','crutch','tooth','lungs','lungs-virus','x-ray','joint',
  'hand-holding-medical','notes-medical','prescription','thermometer','kit-medical','heartbeat',
  'bed-pulse','staff-snake',
  // Social Studies & People
  'user','users','user-group','user-tie','user-secret','children','baby','child','person',
  'person-dress','person-cane','person-half-dress','handshake','handshake-angle','handshake-simple',
  'hands-holding','hands-holding-circle','hands-holding-child','people-carry-box','circle-user','address-book',
  'hand','hands','fist-raised','hand-peace',
  // Nature & Biology
  'paw','dog','cat','fish','fish-fins','crow',
  'bugs','spider','locust','mosquito','frog','hippo','otter','horse','horse-head',
  'dragon','kiwi-bird','shrimp','worm','cow','deer','elephant','monkey','snake','turtle',
  'wheat-awn','plant-wilt','flower','flower-daffodil','mushroom',
  // Engineering & Industry
  'gear','gears','cog','cogs','wrench','screwdriver','screwdriver-wrench','hammer','toolbox',
  'tools','bolt','bolt-lightning','industry','building-shield','hard-hat','helmet-safety',
  'ruler-triangle','bridge-suspension','crane','truck','car','bus','train','plane',
  'ship','helicopter','motorcycle','tractor',
  // Environment & Sustainability
  'recycle','smog','dumpster','trash','trash-can','oil-can','gas-pump',
  'faucet','faucet-drip','hand-holding-droplet','bucket',
  // Objects & School Supplies
  'paperclip','thumbtack','folder','folder-open','folder-plus','folder-minus','box','box-open',
  'box-archive','clock','hourglass','hourglass-half','hourglass-start','hourglass-end','calendar','calendar-days',
  'calendar-check','calendar-plus','calendar-minus','calendar-week','calendar-xmark','bell','bell-slash',
  'magnifying-glass','search','magnifying-glass-plus','magnifying-glass-minus',
  'dice','dice-d6','dice-d20','gamepad',
  // Symbols & Misc
  'gem','circle-check','circle-xmark','circle-info','circle-question','circle-exclamation','circle-plus','circle-minus',
  'check','xmark','question','exclamation','thumbs-up','thumbs-down','face-smile','face-laugh',
  'face-grin','face-frown','face-meh','gift','cake-candles','champagne-glasses',
  'ghost','hat-wizard','broom','candy-cane','cookie','mug-hot','coffee','utensils',
];

// Resolve class icon
const getClassIcon = (cls) => {
  const icon = cls.icon;
  if (!icon) return 'fa-graduation-cap';
  if (icon.startsWith('fa-')) return icon;
  return `fa-${icon}`;
};

const normalizeIconValue = (icon) => {
  const raw = (icon || 'graduation-cap').toString();
  return raw.startsWith('fa-') ? raw.slice(3) : raw;
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
// ICON PICKER COMPONENT (matching Extension)
// ==========================================
function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return ICONS;
    const q = search.toLowerCase();
    return ICONS.filter(i => i.includes(q));
  }, [search]);

  return (
    <>
      {/* Inline trigger — shows selected icon */}
      <button type="button" onClick={() => { setOpen(true); setSearch('') }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1a1a] hover:border-primary/50 cursor-pointer transition-colors w-full">
        <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center text-sm shadow-sm">
          <i className={`fas fa-${value || 'graduation-cap'}`}></i>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-medium text-gray-800 dark:text-white/85">{value || 'graduation-cap'}</p>
          <p className="text-[10px] text-gray-400 dark:text-white/30">Tap to change</p>
        </div>
        <i className="fas fa-chevron-right text-[10px] text-gray-300 dark:text-white/20"></i>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
          <div className="relative bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-gray-200 dark:border-white/[0.08] overflow-hidden"
            style={{ height: '70vh' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.06]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90">Choose Icon</h3>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            {/* Search */}
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-white/[0.06]">
              <div className="relative">
                <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-white/30"></i>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder="Search..." className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#1a1a1a] text-gray-800 dark:text-white/90 text-xs placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" />
              </div>
            </div>
            {/* Grid */}
            <div className="overflow-y-auto p-3" style={{ height: 'calc(70vh - 140px)' }}>
              <div className="grid grid-cols-8 gap-1.5">
                {filtered.map(ic => (
                  <button type="button" key={ic} onClick={() => { onChange(ic); setOpen(false) }}
                    className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all cursor-pointer ${
                      (value || 'graduation-cap') === ic
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-600 dark:hover:text-white/60'
                    }`}>
                    <i className={`fas fa-${ic}`}></i>
                  </button>
                ))}
              </div>
              {filtered.length === 0 && <p className="text-center text-xs text-gray-400 dark:text-white/30 py-6">No icons found</p>}
            </div>
            {/* Footer count */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-white/[0.06] text-center">
              <span className="text-[10px] text-gray-400 dark:text-white/30">{filtered.length} icons</span>
            </div>
          </div>
        </div>
      )}
    </>
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
  const { confirm } = useConfirm();

  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDay, setFilterDay] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);

  // Add class form
  const [formData, setFormData] = useState({ 
    name: '', icon: 'graduation-cap', room: '', description: '',
    schedules: [{day: 'monday', startTime: '', endTime: ''}], links: [{ title: '', url: '' }] 
  });
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
      const fullDay = DAY_MAP[filterDay] || filterDay;
      filtered = filtered.filter(c => c.days?.some(d => d.toLowerCase() === fullDay?.toLowerCase()));
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
  const closeClassFormModal = () => {
    setShowAddModal(false);
    setEditingClassId(null);
    setFormData({ 
      name: '', icon: 'graduation-cap', room: '', description: '',
      schedules: [{day: 'monday', startTime: '', endTime: ''}], links: [{ title: '', url: '' }] 
    });
  };

  const openAddClassModal = () => {
    setEditingClassId(null);
    setFormData({ 
      name: '', icon: 'graduation-cap', room: '', description: '',
      schedules: [{day: 'monday', startTime: '', endTime: ''}], links: [{ title: '', url: '' }] 
    });
    setShowAddModal(true);
  };

  const openEditClassModal = (cls) => {
    if (!cls) return;
    setEditingClassId(cls.id);
    
    let initSchedules = [{day: 'monday', startTime: '', endTime: ''}];
    if (cls.schedules?.length > 0) {
      initSchedules = cls.schedules.map(s => {
        let st = s.startTime || '', et = s.endTime || '';
        if (s.time && !st && !et) {
          const p = s.time.split(' - ');
          st = p[0]?.trim() || '';
          et = p[1]?.trim() || '';
        }
        return { day: s.day.toLowerCase(), startTime: st, endTime: et };
      });
    } else if (cls.days?.length > 0) {
      let st = '', et = '';
      if (cls.time) {
        const p = cls.time.split(' - ');
        st = p[0]?.trim() || '';
        et = p[1]?.trim() || '';
      }
      initSchedules = cls.days.map(d => ({ day: d.toLowerCase(), startTime: st, endTime: et }));
    }

    setFormData({
      name: cls.name || '',
      icon: normalizeIconValue(cls.icon),
      room: cls.room || '',
      description: cls.description || '',
      schedules: initSchedules,
      links: Array.isArray(cls.links) && cls.links.length > 0
        ? cls.links.map((l) => ({ title: l?.title || '', url: l?.url || '' }))
        : [{ title: '', url: '' }],
    });
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const validSchedules = formData.schedules.filter(s => s.day).map(s => {
        const formattedTime = s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : (s.startTime || '');
        return { day: s.day.toLowerCase(), time: formattedTime, startTime: s.startTime, endTime: s.endTime };
      });
      if (validSchedules.length === 0) validSchedules.push({ day: 'monday', time: '', startTime: '', endTime: '' });

      const daysList = [...new Set(validSchedules.map(s => s.day))];
      const scheduleString = validSchedules.map(s => `${s.day.substring(0,3)} ${s.time}`.trim()).join(', ');
      const firstTime = validSchedules[0]?.time || '';

      const payload = {
        name: formData.name.trim(),
        icon: formData.icon,
        room: formData.room.trim(),
        description: formData.description.trim(),
        schedule: scheduleString,
        days: daysList,
        time: firstTime,
        schedules: validSchedules,
        links: formData.links.filter(l => l.url.trim()),
      };

      if (editingClassId) {
        await classesService.updateClass(editingClassId, payload);
      } else {
        await classesService.addClass(payload);
      }

      closeClassFormModal();
    } catch (err) {
      console.error(`Failed to ${editingClassId ? 'edit' : 'add'} class:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    const accepted = await confirm({
      title: t('deleteClass'),
      message: t('confirmDelete'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'danger',
    });
    if (!accepted) return;
    try {
      await classesService.deleteClass(selectedClass.id);
      setShowDetailModal(false);
      setSelectedClass(null);
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const addSchedule = () => {
    setFormData(prev => ({ ...prev, schedules: [...prev.schedules, { day: 'monday', startTime: '', endTime: '' }] }));
  };
  const updateSchedule = (index, field, value) => {
    setFormData(prev => {
      const newSchedules = [...prev.schedules];
      newSchedules[index][field] = value;
      return { ...prev, schedules: newSchedules };
    });
  };
  const removeSchedule = (index) => {
    setFormData(prev => ({ ...prev, schedules: prev.schedules.filter((_, i) => i !== index) }));
  };

  const addLink = () => setFormData(prev => ({ ...prev, links: [...prev.links, { title: '', url: '' }] }));
  const updateLink = (i, field, val) => setFormData(prev => ({ ...prev, links: prev.links.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const removeLink = (i) => setFormData(prev => ({ ...prev, links: prev.links.filter((_, idx) => idx !== i) }));

  const typeIcons = { exam: 'fa-file-alt', individual: 'fa-user', group: 'fa-users', other: 'fa-sticky-note' };

  // Dark mode helpers
  const cardCls = isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const textMuted = isDarkMode ? 'text-slate-500' : 'text-gray-400';
  const borderSubtle = isDarkMode ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
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
              <button onClick={openAddClassModal}
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
                  <button onClick={openAddClassModal} className="mt-3 text-blue-500 text-sm font-medium hover:underline">
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
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={closeClassFormModal}>
          <div className={`rounded-[20px] p-6 lg:p-8 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-[#1e1e1e] border border-white/10' : 'bg-white'
          }`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <h2 className={`text-xl lg:text-2xl font-bold ${textPrimary}`}>{editingClassId ? t('editClass') : t('addClass')}</h2>
              <button type="button" onClick={closeClassFormModal} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                <i className={`fas fa-times text-lg ${textMuted}`}></i>
              </button>
            </div>

            <form onSubmit={handleAddClass} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('className') || 'Class Name'}</label>
                    <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('exampleMath') || 'e.g. Mathematics'} required
                      className={`w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${
                        isDarkMode ? 'bg-[#151515] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Teacher Name */}
                  <div className="space-y-2">
                    <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('teacherLabel') || 'Teacher Name'}</label>
                    <input type="text" 
                      placeholder="teacherPlaceholder"
                      className={`w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${
                        isDarkMode ? 'bg-[#151515] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Room Number */}
                  <div className="space-y-2">
                    <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('roomLabel') || 'Room Number'}</label>
                    <input type="text" value={formData.room} onChange={e => setFormData(prev => ({ ...prev, room: e.target.value }))}
                      placeholder="roomPlaceholder"
                      className={`w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${
                        isDarkMode ? 'bg-[#151515] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Select Class Icon */}
                  <div className="space-y-2">
                    <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('selectIcon') || 'Select Class Icon'}</label>
                    <div className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      isDarkMode ? 'bg-[#151515] border-white/10 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-500'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-500/20">
                          <i className={`fas fa-${formData.icon || 'graduation-cap'}`}></i>
                        </div>
                        <div>
                          <p className={`text-[15px] font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.icon || 'Icon Category'}</p>
                          <p className="text-[13px] text-gray-400">Search icon...</p>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-gray-400 pr-2 block"></i>
                      {/* Hidden overlay or picker trigger could go here */}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('classLinks') || 'Links'}</label>
                      <button type="button" onClick={addLink} className="text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5">
                        <i className="fas fa-plus"></i> Add Link
                      </button>
                    </div>
                    {formData.links.length <= 1 && !formData.links[0]?.url ? (
                      <div className={`py-4 rounded-xl border border-dashed text-center text-[13px] ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                        No links added yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.links.map((link, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={link.title} onChange={e => updateLink(i, 'title', e.target.value)} placeholder="Title"
                              className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#151515] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                            <input type="url" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} placeholder="URL"
                              className={`flex-[2] px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#151515] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                            <button type="button" onClick={() => removeLink(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                  {/* Schedules (Dynamic Stack) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('classSchedule') || 'Class Schedule'}</label>
                       <button type="button" onClick={addSchedule} className="text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5">
                         <i className="fas fa-plus"></i> Add Schedule
                       </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.schedules.map((sched, index) => (
                        <div key={index} className={`relative p-4 pl-12 rounded-xl border relative shadow-sm transition-all ${isDarkMode ? 'bg-[#151515] border-white/10' : 'bg-white border-gray-200'} group`}>
                          {/* Left handle/number */}
                          <div className={`absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r rounded-l-xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                            <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                          </div>

                          {/* Delete button (Show if > 1 schedule) */}
                          {formData.schedules.length > 1 && (
                            <button type="button" onClick={() => removeSchedule(index)}
                              className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600">
                              <i className="fas fa-times"></i>
                            </button>
                          )}

                          <div className="space-y-4">
                            {/* Day Selection Row */}
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map(day => (
                                <button key={day} type="button" onClick={() => updateSchedule(index, 'day', day)}
                                  className={`w-9 h-9 flex justify-center items-center rounded-full text-[12px] font-bold border transition-all ${
                                    sched.day === day
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                                      : isDarkMode ? 'bg-[#1e1e1e] border-white/10 text-gray-400 hover:border-gray-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                                  }`}>
                                  {t(day.substring(0, 3).toLowerCase()).substring(0, 1).toUpperCase()}
                                </button>
                              ))}
                            </div>

                            {/* Times Row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="relative">
                                 <input type="time" required
                                   value={sched.startTime || ''} 
                                   onChange={e => updateSchedule(index, 'startTime', e.target.value)}
                                   className={`w-full pl-3 pr-8 py-2 rounded-lg border text-[13px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                                     isDarkMode ? 'bg-[#1e1e1e] border-white/10 text-white [color-scheme:dark]' : 'bg-gray-50/50 border-gray-200 text-gray-900 [color-scheme:light]'
                                   }`}
                                 />
                                 <i className="far fa-clock absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                              </div>
                              <div className="relative">
                                 <input type="time" required
                                   value={sched.endTime || ''} 
                                   onChange={e => updateSchedule(index, 'endTime', e.target.value)}
                                   className={`w-full pl-3 pr-8 py-2 rounded-lg border text-[13px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                                     isDarkMode ? 'bg-[#1e1e1e] border-white/10 text-white [color-scheme:dark]' : 'bg-gray-50/50 border-gray-200 text-gray-900 [color-scheme:light]'
                                   }`}
                                 />
                                 <i className="far fa-clock absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Course Description */}
                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className={`block text-[13px] font-semibold text-gray-700 dark:text-gray-300`}>{t('courseDescription') || 'Course Description'}</label>
                    <textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Briefly describe the course objectives..."
                      className={`w-full flex-1 min-h-[140px] px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none ${
                        isDarkMode ? 'bg-[#151515] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Info Box */}
                  <div className={`p-4 rounded-xl flex items-start gap-3 mt-4 ${isDarkMode ? 'bg-blue-500/10 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDarkMode ? 'bg-blue-500 text-[#1e1e1e]' : 'bg-blue-600 text-white'}`}>
                      <i className="fas fa-info text-[10px]"></i>
                    </div>
                    <p className="text-[13px] leading-relaxed">Notifications will be sent to all enrolled students automatically.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`pt-6 mt-2 border-t flex justify-end items-center gap-4 ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <button type="button" onClick={closeClassFormModal} className={`px-6 py-2.5 text-[15px] font-bold transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || !formData.name.trim()}
                  className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[15px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                  {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white/80"></div> : <i className="fas fa-check-circle"></i>}
                  {editingClassId ? t('save') : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ CLASS DETAIL MODAL ============ */}
      {showDetailModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[1000] animate-fade-in p-4" onClick={() => { setShowDetailModal(false); setSelectedClass(null); }}>
          <div className="rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto border bg-white dark:bg-[#121212] border-gray-200 dark:border-white/[0.08]"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl text-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <i className={`fas ${getClassIcon(selectedClass)}`}></i>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">{selectedClass.name}</h2>
                  {selectedClass.days?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {selectedClass.days.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-medium capitalize">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditClassModal(selectedClass)}
                  className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80 transition-colors cursor-pointer"
                  title={t('editClass')}
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button onClick={handleDeleteClass}
                  className="text-gray-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer" title={t('deleteClass')}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-link text-blue-500 text-sm"></i>
                <h3 className="text-sm font-semibold flex-1 text-gray-900 dark:text-white/90">{t('classLinks')}</h3>
                <span className="text-[10px] text-gray-400 dark:text-white/30">{(selectedClass.links || []).filter(l => l.url).length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {(selectedClass.links || []).filter(l => l.url).length > 0 ? (
                  selectedClass.links.filter(l => l.url).map((link, i) => {
                    let hostname = '';
                    try { hostname = new URL(link.url).hostname; } catch { hostname = link.url; }
                    const faviconSrc = getFaviconUrl(link.url);
                    return (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg transition-all no-underline border border-transparent bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#242424] hover:border-gray-200 dark:hover:border-white/[0.06]">
                        {faviconSrc ? (
                          <img src={faviconSrc} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                            onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-[#242424]">
                            <i className="fas fa-globe text-xs text-gray-400 dark:text-white/30"></i>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-gray-800 dark:text-white/85">{link.title || hostname}</div>
                          <div className="text-[11px] truncate text-gray-400 dark:text-white/30">{hostname}</div>
                        </div>
                        <i className="fas fa-external-link-alt text-[10px] flex-shrink-0 text-gray-300 dark:text-white/15"></i>
                      </a>
                    );
                  })
                ) : (
                  <p className="text-center text-sm py-4 text-gray-400 dark:text-white/40">{t('noLinks')}</p>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-tasks text-blue-500 text-sm"></i>
                <h3 className="text-sm font-semibold flex-1 text-gray-900 dark:text-white/90">{t('classTasks')}</h3>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-medium">
                  {selectedClassTasks.filter(t => !t.completed).length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {selectedClassTasks.length > 0 ? selectedClassTasks.map(task => {
                  const taskType = task.type || 'other';
                  const daysUntil = task.dueDate && !task.completed ? getDaysUntilDue(task.dueDate) : null;
                  const dueClass = daysUntil !== null ? (daysUntil <= 1 ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : daysUntil <= 3 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20') : '';
                  const dueText = daysUntil !== null ? (daysUntil < 0 ? t('overdue') : daysUntil === 0 ? t('dueToday') : daysUntil === 1 ? t('dueTomorrow') : t('dueInDays').replace('{n}', daysUntil)) : '';

                  return (
                    <div key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg transition-all border border-transparent bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#242424] hover:border-gray-200 dark:hover:border-white/[0.06]">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <i className={`fas ${typeIcons[taskType] || typeIcons.other}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${task.completed ? 'line-through opacity-50 text-gray-400 dark:text-white/30' : 'text-gray-800 dark:text-white/85'}`}>
                          {task.title || task.text || 'Untitled Task'}
                        </div>
                        <div className="text-[11px] capitalize text-gray-400 dark:text-white/30">{taskType}</div>
                      </div>
                      {dueText && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${dueClass}`}>{dueText}</span>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-center text-sm py-4 text-gray-400 dark:text-white/40">{t('noTasksForClass')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CoursesPage;
