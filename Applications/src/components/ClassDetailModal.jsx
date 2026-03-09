import { useState, useMemo } from 'react'
import { useLang } from '../contexts/LanguageContext'

function getFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  } catch {
    return null
  }
}

function getDaysUntilDue(dueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

export default function ClassDetailModal({ 
  cls, 
  tasks, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onTaskClick,
  isDarkMode = false 
}) {
  const { t } = useLang()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const classTasks = useMemo(() => {
    if (!cls) return []
    const filtered = tasks.filter(t => t.classId === cls.id)
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
      return 0
    })
    return filtered
  }, [tasks, cls])

  const pendingCount = classTasks.filter(t => !t.completed).length

  if (!isOpen || !cls) return null

  const links = Array.isArray(cls.links) ? cls.links : []
  const typeIcons = { exam: 'fa-file-alt', individual: 'fa-user', group: 'fa-users', other: 'fa-sticky-note' }
  
  // Normalize icon value (ensure it has 'fa-' prefix)
  const classIcon = cls.icon?.startsWith('fa-') ? cls.icon : 'fa-' + (cls.icon || 'graduation-cap')

  const bgClass = isDarkMode ? 'bg-slate-900' : 'bg-white'
  const textClass = isDarkMode ? 'text-slate-200' : 'text-gray-900'
  const borderClass = isDarkMode ? 'border-slate-700' : 'border-gray-200'
  const cardBgClass = isDarkMode ? 'bg-slate-800/60' : 'bg-gray-50/80'
  const textMutedClass = isDarkMode ? 'text-slate-400' : 'text-gray-500'
  const textSubtleClass = isDarkMode ? 'text-slate-500' : 'text-gray-400'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"></div>
        
        <div 
          className={`relative ${bgClass} rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border ${borderClass} overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <header className={`flex justify-between items-center px-4 py-3 border-b ${borderClass} flex-shrink-0`}>
            <div className="flex items-center gap-3">
              <button onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}>
                <i className="fas fa-arrow-left text-sm"></i>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">
                  <i className={`fas ${classIcon}`}></i>
                </div>
                <h1 className={`text-lg font-semibold ${textClass}`}>{t('classDetails')}</h1>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => onEdit?.(cls)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
                title={t('editClass')}>
                <i className="fas fa-edit text-sm"></i>
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-red-900/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                title={t('deleteClass')}>
                <i className="fas fa-trash text-sm"></i>
              </button>
            </div>
          </header>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {/* Class Info Card */}
            <div className={`rounded-xl border p-4 ${cardBgClass} ${borderClass}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center text-lg flex-shrink-0">
                  <i className={`fas ${classIcon}`}></i>
                </div>
                <h2 className={`text-xl font-semibold ${textClass}`}>{cls.name}</h2>
              </div>

              {/* Day tags */}
              {cls.days && cls.days.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {cls.days.map(day => (
                    <span key={day} className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-xs font-medium">
                      {t(day) || day}
                    </span>
                  ))}
                </div>
              )}
              
              {cls.room && (
                <p className={`text-sm ${textMutedClass} mt-2`}>
                  <i className="fas fa-map-marker-alt mr-1.5"></i>{cls.room}
                </p>
              )}
              {cls.time && (
                <p className={`text-sm ${textMutedClass} mt-1`}>
                  <i className="far fa-clock mr-1.5"></i>{cls.time}
                </p>
              )}
            </div>

            {/* Links Section */}
            <div className={`rounded-xl border p-4 ${cardBgClass} ${borderClass}`}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-white/[0.06]">
                <i className="fas fa-link text-blue-600 text-sm"></i>
                <h3 className={`text-sm font-semibold flex-1 ${textClass}`}>{t('classLinks')}</h3>
                <span className={`text-[10px] ${textSubtleClass}`}>{links.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {links.length > 0 ? links.map((link, i) => {
                  let hostname = ''
                  try { hostname = new URL(link.url).hostname } catch { hostname = link.url }
                  const faviconSrc = getFaviconUrl(link.url)

                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all no-underline border border-transparent ${
                        isDarkMode 
                          ? 'bg-slate-800 hover:bg-slate-700 hover:border-slate-600' 
                          : 'bg-white hover:bg-gray-50 hover:border-gray-200'
                      }`}>
                      {faviconSrc ? (
                        <img src={faviconSrc} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                          <i className="fas fa-globe text-gray-400 text-xs"></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${textClass}`}>{link.title || hostname}</div>
                        <div className={`text-[11px] ${textSubtleClass} truncate`}>{hostname}</div>
                      </div>
                      <i className="fas fa-external-link-alt text-[10px] text-gray-300 dark:text-white/15 flex-shrink-0"></i>
                    </a>
                  )
                }) : (
                  <p className={`text-center text-sm ${textSubtleClass} py-6`}>{t('noLinks')}</p>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className={`rounded-xl border p-4 ${cardBgClass} ${borderClass}`}>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-white/[0.06]">
                <i className="fas fa-tasks text-blue-600 text-sm"></i>
                <h3 className={`text-sm font-semibold flex-1 ${textClass}`}>{t('classTasks')}</h3>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-medium">{pendingCount}</span>
              </div>
              <div className="flex flex-col gap-2">
                {classTasks.length > 0 ? classTasks.map(task => {
                  const taskType = task.type || 'other'
                  const daysUntil = task.dueDate && !task.completed ? getDaysUntilDue(task.dueDate) : null
                  const dueClass = daysUntil !== null 
                    ? (daysUntil <= 1 ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                      : daysUntil <= 3 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' 
                      : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20') 
                    : ''
                  const dueText = daysUntil !== null 
                    ? (daysUntil < 0 ? t('overdue') 
                      : daysUntil === 0 ? t('dueToday') 
                      : daysUntil === 1 ? t('dueTomorrow') 
                      : t('dueInDays', { n: daysUntil })) 
                    : ''

                  return (
                    <div key={task.id} onClick={() => onTaskClick?.(task)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer border border-transparent ${
                        isDarkMode 
                          ? 'bg-slate-800 hover:bg-slate-700 hover:border-slate-600' 
                          : 'bg-white hover:bg-gray-50 hover:border-gray-200'
                      }`}>
                      {/* Type icon */}
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 bg-blue-600/10 text-blue-600">
                        <i className={`fas ${typeIcons[taskType] || typeIcons.other}`}></i>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${
                          task.completed 
                            ? 'line-through opacity-50 text-gray-400 dark:text-white/30' 
                            : textClass
                        }`}>
                          {task.title || 'Untitled Task'}
                        </div>
                        <div className={`text-[11px] ${textSubtleClass} capitalize`}>{taskType}</div>
                      </div>
                      {/* Due badge */}
                      {dueText && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${dueClass}`}>
                          {dueText}
                        </span>
                      )}
                    </div>
                  )
                }) : (
                  <p className={`text-center text-sm ${textSubtleClass} py-6`}>{t('noTasksForClass')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70"></div>
          <div className={`relative ${bgClass} rounded-2xl shadow-2xl w-full max-w-xs border ${borderClass} overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${borderClass}`}>
              <h3 className={`text-sm font-semibold ${textClass}`}>{t('deleteClass')}</h3>
            </div>
            <div className={`p-4 ${textMutedClass} text-sm`}>
              {t('deleteConfirmClass').replace('this', `"${cls.name}"`)}
            </div>
            <div className={`flex gap-2 p-4 border-t ${borderClass}`}>
              <button onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {t('cancel')}
              </button>
              <button onClick={() => { onDelete?.(cls.id); setShowDeleteConfirm(false); onClose() }}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
