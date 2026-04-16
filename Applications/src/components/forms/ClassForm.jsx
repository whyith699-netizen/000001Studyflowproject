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
const EMPTY_SCHEDULE = { day: 'monday', startTime: '', endTime: '' };

const baseInputCls = 'w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100';

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
  const [teacher, setTeacher] = useState(initialValues.teacher || '');
  const [room, setRoom] = useState(initialValues.room || '');
  const [description, setDescription] = useState(initialValues.description || '');

  // Normalize icon: remove 'fa-' prefix if present for consistency
  const normalizeIcon = (iconValue) => {
    if (!iconValue) return 'graduation-cap';
    return iconValue.startsWith('fa-') ? iconValue.slice(3) : iconValue;
  };
  const [icon, setIcon] = useState(normalizeIcon(initialValues.icon));

  const initialSchedules = useMemo(() => {
    if (Array.isArray(initialValues.schedules) && initialValues.schedules.length > 0) {
      return initialValues.schedules.map((entry) => {
        const day = DAYS.includes((entry?.day || '').toLowerCase())
          ? entry.day.toLowerCase()
          : 'monday';

        let startTime = entry?.startTime || '';
        let endTime = entry?.endTime || '';

        if ((!startTime || !endTime) && entry?.time) {
          const [start = '', end = ''] = entry.time.split(' - ').map((part) => part.trim());
          startTime = startTime || start;
          endTime = endTime || end;
        }

        return { day, startTime, endTime };
      });
    }

    if (Array.isArray(initialValues.days) && initialValues.days.length > 0) {
      const [start = '', end = ''] = (initialValues.time || '')
        .split(' - ')
        .map((part) => part.trim());

      return initialValues.days.map((dayValue) => ({
        day: DAYS.includes((dayValue || '').toLowerCase())
          ? dayValue.toLowerCase()
          : 'monday',
        startTime: start,
        endTime: end,
      }));
    }

    return [EMPTY_SCHEDULE];
  }, [initialValues]);

  const [schedules, setSchedules] = useState(initialSchedules);

  const [iconSearch, setIconSearch] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Links State
  const [links, setLinks] = useState(Array.isArray(initialValues.links) ? initialValues.links : []);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);

  useImperativeHandle(ref, () => ({
    flushPending() {
      return null;
    },
    getSchedules() {
      return schedules.map((entry) => {
        const formattedTime = entry.startTime && entry.endTime
          ? `${entry.startTime} - ${entry.endTime}`
          : (entry.startTime || '');
        return {
          day: entry.day,
          time: formattedTime,
          startTime: entry.startTime,
          endTime: entry.endTime,
        };
      });
    }
  }), [schedules]);

  const darkInput = isDarkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
    : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500';

  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return CLASS_ICONS;
    return CLASS_ICONS.filter((ic) => ic.toLowerCase().includes(query));
  }, [iconSearch]);

  const dayOptions = useMemo(
    () =>
      DAYS.map((day) => ({
        value: day,
        label: t(day) || day.charAt(0).toUpperCase() + day.slice(1),
      })),
    [t],
  );

  const addSchedule = () => {
    setSchedules((prev) => [...prev, { ...EMPTY_SCHEDULE }]);
  };

  const updateSchedule = (index, field, value) => {
    setSchedules((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      ),
    );
  };

  const removeSchedule = (index) => {
    setSchedules((prev) => {
      const next = prev.filter((_, entryIndex) => entryIndex !== index);
      return next.length > 0 ? next : [{ ...EMPTY_SCHEDULE }];
    });
  };

  const addLink = () => {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) return;
    if (editingLinkIndex !== null && editingLinkIndex >= 0) {
      setLinks((prev) => prev.map((link, idx) => 
        idx === editingLinkIndex ? { title: linkTitle.trim(), url: trimmedUrl } : link
      ));
    } else {
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
    setShowLinkModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const cleanSchedules = schedules
      .filter((entry) => entry?.day)
      .map((entry) => {
        const startTime = (entry.startTime || '').trim();
        const endTime = (entry.endTime || '').trim();
        const formattedTime = startTime && endTime ? `${startTime} - ${endTime}` : (startTime || '');
        return {
          day: entry.day.toLowerCase(),
          time: formattedTime,
          startTime,
          endTime,
        };
      });

    if (cleanSchedules.length === 0) {
      setSubmitError('Please add at least one schedule.');
      return;
    }

    const days = [...new Set(cleanSchedules.map((entry) => entry.day))];
    const firstTime = cleanSchedules[0]?.time || '';

    try {
      await onSubmit?.({
        name: trimmedName,
        teacher: teacher.trim(),
        room: room.trim(),
        icon,
        description: description.trim(),
        schedules: cleanSchedules,
        days,
        time: firstTime,
        links: links.filter((link) => link?.url?.trim()),
      });
    } catch (error) {
      setSubmitError(error?.message || t('saveFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="overflow-x-hidden pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t("className")}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t("exampleMath") || "e.g. Advanced Mathematics"} className={`${baseInputCls} ${darkInput}`} required autoFocus />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t("teacherName")}</label>
            <input type="text" value={teacher} onChange={e => setTeacher(e.target.value)} placeholder={t("teacherPlaceholder") || "e.g. Dr. Sarah Jenkins"} className={`${baseInputCls} ${darkInput}`} />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t("roomNumber")}</label>
            <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder={t("roomPlaceholder") || "e.g. 302-B"} className={`${baseInputCls} ${darkInput}`} />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t("selectClassIcon")}</label>
            <button type="button" onClick={() => setShowIconPicker(true)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-blue-500' : 'border-gray-200 bg-white hover:border-blue-500 shadow-sm'}`}>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm text-lg">
                <i className={`fas fa-${icon}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>Math & Science Category</p>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{t("searchIcon") || "Tap to change icon"}</p>
              </div>
              <i className={`fas fa-chevron-right text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}></i>
            </button>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-2 flex justify-between items-center ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {t("classLinks") || "Class Links"}
              <button type="button" onClick={() => { setLinkTitle(''); setLinkUrl(''); setEditingLinkIndex(null); setShowLinkModal(true); }} className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 font-bold cursor-pointer">
                <i className="fas fa-plus text-[10px]"></i> Add Link
              </button>
            </label>
            <div className="space-y-2">
              {links.length === 0 ? (
                <div className={`p-4 rounded-xl border border-dashed flex items-center justify-center ${isDarkMode ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
                  <p className="text-xs">{t("noLinksAdded") || "No links added yet."}</p>
                </div>
              ) : (
                links.map((link, index) => (
                  <div key={`${link.url}-${index}`} className={`flex items-center gap-3 rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      <i className="fas fa-link"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{link.title || (t("untitledLink") || "Untitled Link")}</p>
                      <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{link.url}</p>
                    </div>
                    <button type="button" onClick={() => editLink(index)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-blue-400' : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}>
                      <i className="fas fa-pen textxs"></i>
                    </button>
                    <button type="button" onClick={() => removeLink(index)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-600'}`}>
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {t("classSchedule") || t("scheduleBuilder") || "Class Schedule"}
              </label>
              <button
                type="button"
                onClick={addSchedule}
                className="text-blue-600 hover:text-blue-700 transition-colors text-xs font-semibold flex items-center gap-1"
              >
                <i className="fas fa-plus text-[10px]"></i>
                Add Schedule
              </button>
            </div>
            <div className="space-y-3">
              {schedules.map((entry, index) => (
                <div
                  key={`${entry.day}-${index}`}
                  className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white shadow-sm'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      Slot {index + 1}
                    </p>
                    {schedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSchedule(index)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isDarkMode
                            ? 'text-slate-400 hover:bg-red-900/20 hover:text-red-400'
                            : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                        }`}
                        aria-label="Remove schedule"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t("dayLabel") || "Day"}
                      </label>
                      <Select
                        value={entry.day}
                        onChange={(value) => updateSchedule(index, 'day', value)}
                        options={dayOptions}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t("startTime")}
                        </label>
                        <input
                          type="time"
                          required
                          value={entry.startTime}
                          onChange={(event) => updateSchedule(index, 'startTime', event.target.value)}
                          className={`${baseInputCls} ${darkInput} [color-scheme:light] ${isDarkMode ? '[color-scheme:dark]' : ''}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t("endTime")}
                        </label>
                        <input
                          type="time"
                          required
                          value={entry.endTime}
                          onChange={(event) => updateSchedule(index, 'endTime', event.target.value)}
                          className={`${baseInputCls} ${darkInput} [color-scheme:light] ${isDarkMode ? '[color-scheme:dark]' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t("courseDescription")}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("courseDescPlaceholder") || "Briefly describe the course objectives..."} rows={4} className={`${baseInputCls} ${darkInput} resize-none`}></textarea>
          </div>

          <div className={`p-4 rounded-xl flex items-start gap-3 ${isDarkMode ? 'bg-blue-900/20 text-blue-300 border border-blue-900/50' : 'bg-blue-50 text-slate-600 border border-blue-100'}`}>
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] mt-0.5 flex-shrink-0">
              <i className="fas fa-info"></i>
            </div>
            <p className="text-[11px] leading-relaxed font-medium">{t("notificationInfo") || "Notifications will be sent automatically"}</p>
          </div>
        </div>
      </div>

      {submitError && <p className="text-xs text-red-500 mb-4">{submitError}</p>}
      
      <div className={`flex justify-end gap-3 pt-5 items-center border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
        <button type="button" onClick={onCancel} className={`text-sm font-semibold transition-colors px-4 py-2 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>{t("cancel")}</button>
        <button type="submit" disabled={isSubmitting || !name.trim()} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors flex items-center gap-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-md">
          <i className="fas fa-check-circle"></i>
          {isSubmitting ? t('saving') : submitLabel || (mode === 'edit' ? t('save') : 'Add Class')}
        </button>
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setShowIconPicker(false)}>
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}></div>
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col border overflow-hidden ${isDarkMode ? 'bg-[#121212] border-white/[0.08]' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>{t("chooseIcon") || "Choose Icon"}</h3>
              <button onClick={() => setShowIconPicker(false)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? 'text-white/40 hover:bg-[#1a1a1a]' : 'text-gray-400 hover:bg-gray-100'}`}>
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className={`px-4 py-2.5 border-b ${isDarkMode ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="relative">
                <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
                <input type="text" value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} autoFocus placeholder={t('searchIcon') || "Search..."} className={`w-full pl-7 pr-3 py-1.5 rounded-lg border text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'border-white/[0.08] bg-[#1a1a1a] text-white/90' : 'border-gray-200 bg-gray-50 text-gray-800'}`} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 scrollbar-none">
              <div className="grid grid-cols-8 gap-1.5">
                {filteredIcons.map((ic) => (
                  <button key={ic} type="button" onClick={() => { setIcon(ic); setShowIconPicker(false); setIconSearch(''); }} className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all cursor-pointer ${icon === ic ? 'bg-blue-600 text-white shadow-sm' : isDarkMode ? 'text-white/45 hover:bg-[#1a1a1a] hover:text-white/70' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                    <i className={`fas fa-${ic}`}></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setShowLinkModal(false)}>
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/60' : 'bg-black/40'}`}></div>
          <div className={`relative rounded-2xl shadow-xl w-full max-w-sm border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                {editingLinkIndex !== null ? 'Edit Link' : 'Add Link'}
              </h3>
              <button type="button" onClick={() => setShowLinkModal(false)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}>
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t("linkName") || "Link Title (Optional)"}</label>
                <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="e.g. Zoom Meeting" className={`${baseInputCls} ${darkInput}`} autoFocus />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>URL <span className="text-red-500">*</span></label>
                <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className={`${baseInputCls} ${darkInput}`} required />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowLinkModal(false)} className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t("cancel")}</button>
                <button type="button" onClick={addLink} disabled={!linkUrl.trim()} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">{t("save") || "Save Link"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default forwardRef(ClassForm);
