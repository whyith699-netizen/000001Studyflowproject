import React, { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import Select from '../Select';

const CLASS_ICONS = [
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

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Helper to create day options for Select component
const getDayOptions = (t) => DAYS.map((day) => ({ value: day, label: t(day) }));

const baseInputCls = 'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100';
const sectionTitleCls = 'text-[11px] font-semibold uppercase tracking-wider';

const toInitialSchedules = (initialValues) => {
  if (Array.isArray(initialValues.schedules) && initialValues.schedules.length > 0) {
    return initialValues.schedules.map((item) => ({
      day: item.day || 'monday',
      time: item.time || '',
    }));
  }
  if (Array.isArray(initialValues.days) && initialValues.days.length > 0) {
    return initialValues.days.map((day) => ({ day, time: initialValues.time || '' }));
  }
  return [];
};

function ClassForm({
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  mode = 'create',
  isDarkMode = false,
  t,
  onCancel,
  submitLabel,
}, ref) {
  const [name, setName] = useState(initialValues.name || '');
  const [room, setRoom] = useState(initialValues.room || '');
  const [icon, setIcon] = useState(initialValues.icon || 'fa-graduation-cap');
  const [schedules, setSchedules] = useState(toInitialSchedules(initialValues));
  const [links, setLinks] = useState(Array.isArray(initialValues.links) ? initialValues.links : []);
  const [newDay, setNewDay] = useState('monday');
  const [newTime, setNewTime] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Expose flushPending to parent ref
  useImperativeHandle(ref, () => ({
    flushPending() {
      // For ClassForm, schedules are managed internally
      // This is here for compatibility with EditClassPage
      // In the future, you can add pending day/time logic here
      return null;
    },
    getSchedules() {
      return schedules;
    }
  }), [schedules]);

  const darkInput = isDarkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500'
    : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500';

  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return CLASS_ICONS;
    return CLASS_ICONS.filter((ic) => ic.toLowerCase().includes(query));
  }, [iconSearch]);

  const addSchedule = () => {
    if (!newDay) return;
    setSchedules((prev) => [...prev, { day: newDay, time: newTime || '' }]);
    setNewTime('');
  };

  const removeSchedule = (index) => {
    setSchedules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateSchedule = (index, field, value) => {
    setSchedules((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addLink = () => {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) return;
    if (editingLinkIndex !== null && editingLinkIndex >= 0) {
      // Edit existing link
      setLinks((prev) => prev.map((link, idx) => 
        idx === editingLinkIndex ? { title: linkTitle.trim(), url: trimmedUrl } : link
      ));
    } else {
      // Add new link
      setLinks((prev) => [...prev, { title: linkTitle.trim(), url: trimmedUrl }]);
    }
    setLinkTitle('');
    setLinkUrl('');
    setEditingLinkIndex(null);
    setShowLinkModal(false);
  };

  const removeLink = (index) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const editLink = (index) => {
    setLinkTitle(links[index]?.title || '');
    setLinkUrl(links[index]?.url || '');
    setEditingLinkIndex(index);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const cleanSchedules = schedules
      .map((entry) => ({ day: entry.day, time: entry.time || '' }))
      .filter((entry) => DAYS.includes(entry.day));
    const days = [...new Set(cleanSchedules.map((entry) => entry.day))];

    try {
      await onSubmit?.({
        name: trimmedName,
        room: room.trim(),
        icon,
        schedules: cleanSchedules,
        days,
        time: cleanSchedules[0]?.time || '',
        links: links.filter((link) => link?.url?.trim()),
      });
    } catch (error) {
      setSubmitError(error?.message || t('saveFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('basicInfo')}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 min-w-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('addClassName')}
            className={`${baseInputCls} ${darkInput}`}
            required
            autoFocus
          />
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={t('roomLabel')}
            className={`${baseInputCls} ${darkInput}`}
          />
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('iconLabel')}</p>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowIconPicker(true)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              isDarkMode ? 'border-slate-600 bg-slate-800 hover:border-blue-500' : 'border-gray-200 bg-white hover:border-blue-500'
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <i className={`fas fa-${icon}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{icon}</p>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Tap to change</p>
            </div>
            <i className={`fas fa-chevron-right text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}></i>
          </button>
        </div>
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setShowIconPicker(false)}>
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}></div>
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col border overflow-hidden ${
            isDarkMode
              ? 'bg-[#121212] border-white/[0.08]'
              : 'bg-white border-gray-200'
          }`} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>Choose Icon</h3>
              <button onClick={() => setShowIconPicker(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? 'text-white/40 hover:bg-[#1a1a1a]' : 'text-gray-400 hover:bg-gray-100'}`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            {/* Search */}
            <div className={`px-4 py-2.5 border-b ${isDarkMode ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="relative">
                <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder={t('searchIcon')}
                  autoFocus
                  className={`w-full pl-7 pr-3 py-1.5 rounded-lg border text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode
                      ? 'border-white/[0.08] bg-[#1a1a1a] text-white/90'
                      : 'border-gray-200 bg-gray-50 text-gray-800'
                  }`}
                />
              </div>
            </div>
            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-8 gap-1.5">
                {filteredIcons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => { setIcon(ic); setShowIconPicker(false); setIconSearch(''); }}
                    className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all cursor-pointer ${
                      icon === ic
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDarkMode
                        ? 'text-white/45 hover:bg-[#1a1a1a] hover:text-white/70'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}>
                    <i className={`fas fa-${ic}`}></i>
                  </button>
                ))}
              </div>
              {filteredIcons.length === 0 && (
                <p className={`text-center text-xs py-6 ${isDarkMode ? 'text-white/35' : 'text-gray-400'}`}>No icons found</p>
              )}
            </div>
            {/* Footer count */}
            <div className={`px-4 py-2 border-t text-center ${isDarkMode ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <span className={`text-[10px] ${isDarkMode ? 'text-white/35' : 'text-gray-400'}`}>{filteredIcons.length} icons</span>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('scheduleBuilder')}</p>
        <div className="mt-2 space-y-2">
          {schedules.length > 0 && (
            <div className="space-y-1.5">
              {schedules.map((entry, index) => (
                <div key={`${entry.day}-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,120px,auto]">
                  <Select
                    value={entry.day}
                    onChange={(value) => updateSchedule(index, 'day', value)}
                    options={getDayOptions(t)}
                    isDarkMode={isDarkMode}
                  />
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                    className={`${baseInputCls} ${darkInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSchedule(index)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,120px,auto]">
            <Select
              value={newDay}
              onChange={(value) => setNewDay(value)}
              options={getDayOptions(t)}
              isDarkMode={isDarkMode}
            />
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className={`${baseInputCls} ${darkInput}`} />
            <button
              type="button"
              onClick={addSchedule}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <i className="fas fa-plus mr-1"></i>
              {t('add')}
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('links')}</p>
        <div className="mt-2 space-y-2">
          {links.length > 0 && (
            <div className="space-y-1.5">
              {links.map((link, index) => (
                <div
                  key={`${link.url}-${index}`}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 min-w-0 ${
                    isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <i className="fas fa-link text-[10px] text-blue-500"></i>
                  <span className={`truncate text-xs flex-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {link.title || link.url}
                  </span>
                  <button
                    type="button"
                    onClick={() => { editLink(index); setShowLinkModal(true); }}
                    className="text-xs text-blue-500 transition-colors hover:text-blue-600 mr-1"
                    title={t('edit')}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="text-xs text-red-500 transition-colors hover:text-red-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => { setLinkTitle(''); setLinkUrl(''); setEditingLinkIndex(null); setShowLinkModal(true); }}
            className={`w-full rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors ${
              isDarkMode
                ? 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400'
                : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
            }`}
          >
            <i className="fas fa-plus mr-1"></i>
            {t('addLink')}
          </button>
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setShowLinkModal(false)}>
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}></div>
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-sm border overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                {editingLinkIndex !== null ? t('editLink') : t('addLink')}
              </h3>
              <button onClick={() => setShowLinkModal(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'
                }`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('linkTitle')}
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder={t('linkTitle')}
                  className={`${baseInputCls} ${darkInput}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('linkUrl')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className={`${baseInputCls} ${darkInput}`}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    isDarkMode
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={addLink}
                  disabled={!linkUrl.trim()}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {submitError && <p className="text-xs text-red-500">{submitError}</p>}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCancel}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
            isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('saving') : submitLabel || (mode === 'edit' ? t('save') : t('addClass'))}
        </button>
      </div>
    </form>
  );
}

export default forwardRef(ClassForm);
