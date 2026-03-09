import { useState, useMemo, useEffect } from 'react'
import { useLang } from '../contexts/LanguageContext'
import ClassForm from './forms/ClassForm'

export default function EditClassPage({ 
  cls, 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting = false,
  isDarkMode = false 
}) {
  const { t } = useLang()

  const [name, setName] = useState(cls?.name || '')
  const [room, setRoom] = useState(cls?.room || '')
  const [icon, setIcon] = useState(cls?.icon || 'fa-graduation-cap')
  
  // Migrate old days+time to schedules format
  const [schedules, setSchedules] = useState(() => {
    if (cls?.schedules?.length) return cls.schedules
    if (cls?.days?.length) return cls.days.map(d => ({ day: d.toLowerCase(), time: cls.time || '' }))
    return []
  })
  
  const [links, setLinks] = useState(cls?.links || [])
  const [editingLinkIndex, setEditingLinkIndex] = useState(null)

  // Reset form when class changes
  useEffect(() => {
    if (cls) {
      setName(cls.name || '')
      setRoom(cls.room || '')
      setIcon(cls.icon || 'fa-graduation-cap')
      if (cls?.schedules?.length) {
        setSchedules(cls.schedules)
      } else if (cls?.days?.length) {
        setSchedules(cls.days.map(d => ({ day: d.toLowerCase(), time: cls.time || '' })))
      } else {
        setSchedules([])
      }
      setLinks(cls?.links || [])
    }
  }, [cls])

  const handleLinkSave = (linkData) => {
    if (editingLinkIndex === null) return
    if (editingLinkIndex === -1) {
      setLinks(prev => [...prev, linkData])
    } else {
      setLinks(prev => {
        const newLinks = [...prev]
        newLinks[editingLinkIndex] = linkData
        return newLinks
      })
    }
    setEditingLinkIndex(null)
  }

  const removeLink = (index) => {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (data) => {
    if (!name.trim()) return
    
    // Get schedules from ClassForm (already managed internally)
    const finalSchedules = schedules
    const days = [...new Set(finalSchedules.map(s => s.day))]
    const time = finalSchedules.length > 0 ? finalSchedules[0].time : ''
    
    await onSubmit?.({
      ...data,
      name: name.trim(),
      room: room.trim(),
      icon,
      schedule: finalSchedules.map(s => `${s.day.substring(0,3)} ${s.time}`).join(', '),
      days,
      time,
      schedules: finalSchedules,
      links: links.filter(link => link?.url?.trim()),
    })
    
    onClose?.()
  }

  if (!isOpen || !cls) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 ${isDarkMode ? '' : ''}`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
      
      <div 
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-700' 
            : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex justify-between items-center px-4 py-3 border-b flex-shrink-0 ${
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
            {t('editClass')}
          </h2>
          <button onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'
            }`}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Preview Card */}
        <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-slate-700 bg-blue-900/10' : 'border-gray-100 bg-blue-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shadow-sm">
              <i className={`fas fa-${icon.replace('fa-', '')}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                {name || 'Class Name'}
              </p>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {room || 'No room'} · {schedules.length > 0 
                  ? schedules.map(s => `${s.day.substring(0,3)} ${s.time}`).join(', ') 
                  : 'No schedule'}
              </p>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <ClassForm
            initialValues={{
              name,
              room,
              icon,
              schedules,
              links,
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            mode="edit"
            isDarkMode={isDarkMode}
            t={t}
            onCancel={onClose}
            submitLabel={t('save')}
          />
        </div>
      </div>
    </div>
  )
}
