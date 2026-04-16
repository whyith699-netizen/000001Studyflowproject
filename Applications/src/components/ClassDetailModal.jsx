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
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

// Helper function to get icon class - same logic as ClassesView
function getClassIcon(icon) {
  if (!icon || !icon.trim()) {
    return 'fa-graduation-cap'
  }
  if (icon.startsWith('fa-')) {
    return icon
  }
  return `fa-${icon}`
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
  const canEditClass = typeof onEdit === 'function'
  const canDeleteClass = typeof onDelete === 'function'

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

  // Use helper function for consistent icon rendering
  const classIcon = getClassIcon(cls.icon)

  const bgClass = isDarkMode ? 'bg-black' : 'bg-white'
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900'
  const borderClass = isDarkMode ? 'border-gray-800' : 'border-gray-200'
  const cardBgClass = isDarkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50/80'
  const textMutedClass = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const textSubtleClass = isDarkMode ? 'text-gray-500' : 'text-gray-400'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"></div>

        <div
          className={`relative ${bgClass} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] md:max-h-[80vh] flex flex-col border ${borderClass} overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <header className={`flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b ${borderClass} flex-shrink-0 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
            <div className="flex items-center gap-3 md:gap-4">
              <button onClick={onClose}
                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'}`}>
                <i className="fas fa-arrow-left text-sm md:text-base"></i>
              </button>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm md:text-base flex-shrink-0 shadow-sm shadow-blue-600/20">
                  <i className={`fas ${classIcon}`}></i>
                </div>
                <div>
                  <h1 className={`text-base md:text-lg font-bold ${textClass}`}>{cls.name}</h1>
                  <p className={`text-[11px] md:text-xs ${textMutedClass} flex items-center gap-1.5`}>
                     {t('classDetails')}
                  </p>
                </div>
              </div>
            </div>
            {(canEditClass || canDeleteClass) && (
              <div className="flex gap-1.5 md:gap-2">
                {canEditClass && (
                  <button onClick={() => onEdit?.(cls)}
                    className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
                    title={t('editClass')}>
                    <i className="fas fa-edit text-xs md:text-sm"></i>
                  </button>
                )}
                {canDeleteClass && (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-red-900/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-50 hover:text-red-500 border border-gray-200 shadow-sm'}`}
                    title={t('deleteClass')}>
                    <i className="fas fa-trash text-xs md:text-sm"></i>
                  </button>
                )}
              </div>
            )}
          </header>

          {/* Content - Scrollable Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 max-w-full">
              
              {/* Left Column (Info & Links) */}
              <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-4">
                
                {/* Class Info Card */}
                <div className={`rounded-xl border p-4 md:p-5 ${cardBgClass} ${borderClass} shadow-sm`}>
                  
                  {/* Day tags */}
                  {cls.days && cls.days.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {cls.days.map(day => (
                        <span key={day} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                          {t(day) || day}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 flex justify-center pt-0.5 ${textMutedClass}`}>
                         <i className="fas fa-chalkboard-teacher text-[13px]"></i>
                      </div>
                      <div>
                         <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${textSubtleClass}`}>{t('teacherName')}</p>
                         <p className={`text-sm font-medium ${textClass}`}>{cls.teacher || t('notSetYet', 'Not set')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className={`w-8 flex justify-center pt-0.5 ${textMutedClass}`}>
                         <i className="fas fa-map-marker-alt text-[13px]"></i>
                      </div>
                      <div>
                         <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${textSubtleClass}`}>{t('roomLabel')}</p>
                         <p className={`text-sm font-medium ${textClass}`}>{cls.room || '-'}</p>
                      </div>
                    </div>

                    {cls.schedules && cls.schedules.length > 0 ? (
                      <div className="flex items-start gap-3">
                        <div className={`w-8 flex justify-center pt-0.5 ${textMutedClass}`}>
                           <i className="far fa-clock text-[13px]"></i>
                        </div>
                        <div className="flex-1">
                           <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${textSubtleClass}`}>{t('classSchedule') || 'SCHEDULES'}</p>
                           <div className="space-y-1.5">
                             {cls.schedules.map((s, i) => (
                               <div key={i} className={`flex items-center text-sm ${textClass}`}>
                                 <span className="capitalize font-semibold min-w-[50px] mr-2">{t(s.day) || s.day}</span>
                                 <span className={textMutedClass}>{s.time || `${s.startTime || ''} - ${s.endTime || ''}`}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={`w-8 flex justify-center pt-0.5 ${textMutedClass}`}>
                           <i className="far fa-clock text-[13px]"></i>
                        </div>
                        <div>
                           <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${textSubtleClass}`}>{t('time')}</p>
                           <p className={`text-sm font-medium ${textClass}`}>{cls.time || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {cls.description && (
                    <div className={`mt-5 pt-4 border-t ${borderClass}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${textSubtleClass}`}>{t('courseDescription')}</p>
                      <p className={`text-sm leading-relaxed ${textMutedClass}`}>{cls.description}</p>
                    </div>
                  )}
                </div>

                {/* Links Section */}
                <div className={`rounded-xl border p-4 md:p-5 ${cardBgClass} ${borderClass} shadow-sm`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      <i className="fas fa-link text-sm"></i>
                    </div>
                    <h3 className={`text-sm font-semibold flex-1 ${textClass}`}>{t('classLinks')}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{links.length}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {links.length > 0 ? links.map((link, i) => {
                      let hostname = ''
                      try { hostname = new URL(link.url).hostname } catch { hostname = link.url }
                      const faviconSrc = getFaviconUrl(link.url)

                      return (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all no-underline border border-transparent group ${
                            isDarkMode
                              ? 'bg-[#111] hover:bg-[#1a1a1a] hover:border-gray-700'
                              : 'bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm'
                          }`}>
                          {faviconSrc ? (
                            <img src={faviconSrc} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-gray-800"
                              onError={e => { e.target.style.display = 'none' }} />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              <i className="fas fa-globe text-sm"></i>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${textClass}`}>{link.title || hostname}</div>
                            <div className={`text-[11px] mt-0.5 ${textSubtleClass} truncate`}>{hostname}</div>
                          </div>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                            <i className="fas fa-external-link-alt text-[10px]"></i>
                          </div>
                        </a>
                      )
                    }) : (
                      <div className={`flex flex-col items-center justify-center py-6 text-center rounded-xl border border-dashed ${isDarkMode ? 'border-gray-800 bg-[#111]' : 'border-gray-300 bg-gray-50'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400'}`}>
                           <i className="fas fa-link"></i>
                        </div>
                        <p className={`text-sm font-medium ${textMutedClass}`}>{t('noLinksAdded', 'No links added')}</p>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>

              {/* Right Column (Tasks) */}
              <div className="md:col-span-12 lg:col-span-7 flex flex-col gap-4 max-h-[100%]">
                <div className={`rounded-xl border p-4 md:p-5 flex flex-col h-full ${cardBgClass} ${borderClass} shadow-sm`}>
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <i className="fas fa-tasks text-sm"></i>
                    </div>
                    <h3 className={`text-base font-bold flex-1 ${textClass}`}>{t('classTasks')}</h3>
                    <div className={`flex gap-3 text-xs font-medium`}>
                       <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></span>
                          <span className={textMutedClass}>{pendingCount} {t('pendingLabel', 'Pending')}</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 pb-1">
                    {classTasks.length > 0 ? classTasks.map(task => {
                      const taskType = task.type || 'other'
                      const daysUntil = task.dueDate && !task.completed ? getDaysUntilDue(task.dueDate) : null
                      const dueClass = daysUntil !== null
                        ? (daysUntil <= 1 ? 'text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-900/30'
                          : daysUntil <= 3 ? 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-900/30'
                          : 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-900/30')
                        : ''
                      const dueText = daysUntil !== null
                        ? (daysUntil < 0 ? t('overdue')
                          : daysUntil === 0 ? t('dueToday')
                          : daysUntil === 1 ? t('dueTomorrow')
                          : t('dueInDays', { n: daysUntil }))
                        : ''

                      return (
                        <div key={task.id} onClick={() => onTaskClick?.(task)}
                          className={`flex items-center gap-3 md:gap-4 p-3.5 rounded-xl transition-all cursor-pointer border ${
                            isDarkMode
                              ? 'bg-[#111] border-gray-800 hover:bg-[#1a1a1a] hover:border-gray-700'
                              : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100'
                          }`}>
                          {/* Type icon */}
                          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                             task.completed ? (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400') : 
                             (isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                          }`}>
                            <i className={`fas ${typeIcons[taskType] || typeIcons.other}`}></i>
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className={`text-sm md:text-base font-semibold truncate mb-0.5 ${
                              task.completed
                                ? 'line-through opacity-50 text-gray-400 dark:text-white/30'
                                : textClass
                            }`}>
                              {task.title || 'Untitled Task'}
                            </div>
                            <div className={`text-[11px] md:text-xs font-medium ${textSubtleClass} capitalize flex items-center gap-1.5`}>
                              <span>{t(taskType) || taskType}</span>
                              {task.priority && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                                  <span className={task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'}>
                                     {t(task.priority) || task.priority} priority
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Due badge */}
                          {dueText && !task.completed && (
                            <span className={`text-[10px] md:text-[11px] font-bold px-2.5 py-1 rounded-md border flex-shrink-0 shadow-sm whitespace-nowrap ${dueClass}`}>
                              {dueText}
                            </span>
                          )}
                          {task.completed && (
                            <span className={`text-[10px] md:text-[11px] font-bold px-2.5 py-1 rounded-md border flex-shrink-0 shadow-sm whitespace-nowrap ${isDarkMode ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                               <i className="fas fa-check mr-1"></i> {t('completedLabel', 'Done')}
                            </span>
                          )}
                        </div>
                      )
                    }) : (
                      <div className={`flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed ${isDarkMode ? 'border-gray-800 bg-[#111]' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-white shadow-sm text-gray-400'}`}>
                           <i className="fas fa-check-double text-lg"></i>
                        </div>
                        <p className={`text-sm font-medium ${textMutedClass}`}>{t('noTasksForClass')}</p>
                        <p className={`text-xs mt-1 ${textSubtleClass}`}>You're all caught up!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {canDeleteClass && showDeleteConfirm && (
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
                    ? 'border-gray-800 text-gray-300 hover:bg-[#1a1a1a]'
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
