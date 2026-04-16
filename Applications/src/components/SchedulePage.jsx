import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase-config';
import { classesService, tasksService, uniformsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import Sidebar from './Sidebar';
import ClassForm from './forms/ClassForm';
import ClassDetailModal from './ClassDetailModal';
// Resolve class icon - handles both 'fa-book' and 'book' formats (Extension compatibility)
const getClassIcon = (cls) => {
  const icon = cls.icon;
  if (!icon) return 'fa-graduation-cap';
  if (icon.startsWith('fa-')) return icon;
  return `fa-${icon}`;
};

const SchedulePage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('classes');
  
  // Days definition using translation keys
  const DAYS = [
    { value: 'monday', labelKey: 'monday', shortKey: 'senin' },
    { value: 'tuesday', labelKey: 'tuesday', shortKey: 'selasa' },
    { value: 'wednesday', labelKey: 'wednesday', shortKey: 'rabu' },
    { value: 'thursday', labelKey: 'thursday', shortKey: 'kamis' },
    { value: 'friday', labelKey: 'friday', shortKey: 'jumat' },
    { value: 'saturday', labelKey: 'saturday', shortKey: 'sabtu' },
    { value: 'sunday', labelKey: 'sunday', shortKey: 'minggu' },
  ];

  // Classes state
  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingClass, setEditingClass] = useState(null);

  // Search & filter for classes
  const [searchQuery] = useState('');
  const [filterDay, setFilterDay] = useState('All');
  // Uniforms state
  const [uniforms, setUniforms] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [uniformInput, setUniformInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubClasses = classesService.subscribeToClasses((data) => {
      setClasses(data);
      setLoading(false);
    });
    
    const unsubTasks = tasksService.subscribeToTasks((data) => {
      setTasks(data);
    });
    

    const unsubUniforms = uniformsService.subscribeToUniforms((data) => {
      setUniforms(data);
    });
    
    return () => {
      unsubClasses();
      unsubTasks();

      unsubUniforms();
    };
  }, []);

  // Helper functions
  const getClassTasks = (classId) => tasks.filter(t => t.classId === classId && !t.completed);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    let result = classes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q));
    }
    if (filterDay !== 'All') {
      // Build all possible name variants for matching (monday, mon, senin, etc.)
      const dayDef = DAYS.find(d => d.value === filterDay);
      if (dayDef) {
        const variants = [
          dayDef.value,                          // monday
          dayDef.value.charAt(0).toUpperCase() + dayDef.value.slice(1), // Monday
          dayDef.value.slice(0, 3),              // mon
          dayDef.value.charAt(0).toUpperCase() + dayDef.value.slice(1, 3), // Mon
          dayDef.shortKey,                       // senin
          dayDef.shortKey.charAt(0).toUpperCase() + dayDef.shortKey.slice(1), // Senin
        ].map(v => v.toLowerCase());

        result = result.filter(c =>
          c.days?.some(d => variants.includes(d.toLowerCase()))
        );
      }
    }
    return result;
  }, [classes, searchQuery, filterDay, DAYS]);

  // Classes handlers
  const handleAddClass = async (payload) => {
    setIsSubmitting(true);
    try {
      await classesService.addClass(payload);
      setShowAddClassModal(false);
    } catch (error) {
      console.error('Failed to add class:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    const accepted = await confirm({
      title: t('deleteClass'),
      message: t('deleteConfirmClass'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'danger',
    });
    if (!accepted) return;
    try {
      await classesService.deleteClass(classId);
      setShowClassDetailModal(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  const handleEditClass = async (payload) => {
    if (!editingClass?.id) return;
    setIsSubmitting(true);
    try {
      await classesService.updateClass(editingClass.id, payload);
      setShowEditClassModal(false);
      setEditingClass(null);
    } catch (error) {
      console.error('Failed to update class:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUniform = async (day) => {
    if (!uniformInput.trim()) return;
    const updated = { ...uniforms, [day]: uniformInput.trim() };
    try {
      await uniformsService.saveUniforms(updated);
      setEditingDay(null);
      setUniformInput('');
    } catch (error) {
      console.error('Failed to save uniform:', error);
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex-1 w-full px-4 py-4 md:px-6 md:py-5 flex flex-col">
          {/* Header */}
          <div className={`rounded-xl p-4 border shadow-sm mb-4 md:mb-6 ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <i className="fas fa-stream text-blue-500 text-lg"></i>
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('scheduleTitle')}</h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('scheduleSubtitle')}</p>
              </div>
            </div>
          </div>

          {/* Main Container */}
          <div className={`rounded-2xl p-5 md:p-8 shadow-sm flex-1 flex flex-col min-h-0 overflow-y-auto ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border border-gray-100'}`}>
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              {/* Tabs */}
              <div className="flex gap-8 relative items-center">
                {[
                  { id: 'classes', labelKey: 'classesTab' },
                  { id: 'uniforms', labelKey: 'uniformsTab' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative pb-3 text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'text-blue-600'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {t(tab.labelKey)}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-[-17px] left-0 w-full h-[2px] bg-blue-600 rounded-t-md"></div>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Add Button based on active tab */}
              {activeTab === 'classes' && (
                <button
                  onClick={() => setShowAddClassModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  <i className="fas fa-plus font-normal"></i>
                  {t('addClass')}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Classes Tab */}
                {activeTab === 'classes' && (
                  <div>
                    {/* Day Filter */}
                    <div className="flex flex-wrap gap-3 mb-8 items-center bg-gray-50/50 p-1.5 rounded-2xl w-fit border border-gray-100/50">
                      <button
                        onClick={() => setFilterDay('All')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-none border ${
                          filterDay === 'All'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-transparent' : 'bg-white text-gray-700 hover:bg-gray-50 border-transparent'
                        }`}
                      >
                        {t('allDays') || 'All Days'}
                      </button>
                      {DAYS.map(d => {
                        const day = d.value;
                        const label = d.shortKey.charAt(0).toUpperCase() + d.shortKey.slice(1, 4);
                        return (
                          <button
                            key={day}
                            onClick={() => setFilterDay(day)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-none border ${
                              filterDay === day
                                ? 'bg-white text-gray-800 border-gray-200'
                                : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-transparent' : 'bg-transparent text-gray-500 hover:bg-white border-transparent'
                            }`}
                          >
                            {/* Shortened Translation */}
                            {t(d.shortKey) ? t(d.shortKey).charAt(0).toUpperCase() + t(d.shortKey).slice(1, 3) : label}
                          </button>
                        );
                      })}
                    </div>

                    {filteredClasses.length === 0 ? (
                      <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        <i className="fas fa-chalkboard text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm">{searchQuery || filterDay !== 'All' ? t('noClassesFound') : t('noClassesYet')}</p>
                        {classes.length === 0 && (
                          <button onClick={() => setShowAddClassModal(true)} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
                            {t('addFirstClass')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {filteredClasses.map((cls) => {
                          const classTasks = getClassTasks(cls.id);

                          return (
                            <div
                              key={cls.id}
                              className={`group relative flex flex-col p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}`}
                              onClick={() => { setSelectedClass(cls); setShowClassDetailModal(true); }}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative flex-shrink-0 ${isDarkMode ? 'bg-slate-700 text-blue-400 border border-slate-600' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                  <i className={`fas ${getClassIcon(cls)} text-xl`}></i>
                                  {classTasks.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                      {classTasks.length}
                                    </span>
                                  )}
                                </div>
                                {cls.room && (
                                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100/80 text-gray-500'}`}>
                                    {cls.room}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <h3 className={`text-base font-bold mb-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {cls.name}
                                </h3>
                                <p className={`text-[11px] mb-3 truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                  {t('teacherName')}: {cls.teacher || t('notSetYet', 'Belum diatur')}
                                </p>
                              </div>
                              
                              <div className={`space-y-2 text-[11px] font-medium pt-4 mt-2 border-t ${isDarkMode ? 'border-slate-700 text-slate-300' : 'border-gray-50 text-gray-500'}`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-4 flex justify-center ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                    <i className="far fa-clock text-[13px]"></i>
                                  </div>
                                  <span>{cls.time || '00:00 - 00:00'}</span>
                                </div>
                                {cls.days?.length > 0 && (
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-4 flex justify-center ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                      <i className="far fa-calendar text-[13px]"></i>
                                    </div>
                                    <span>
                                      {cls.days.map(d => {
                                        const found = DAYS.find(day => day.value === d);
                                        return found ? (found.value.charAt(0).toUpperCase() + found.value.slice(1)) : d;
                                      }).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* dashed "New Subject" card */}
                        <div
                          className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:bg-gray-50 ${isDarkMode ? 'border-slate-600 hover:bg-slate-800' : 'border-gray-200'}`}
                          onClick={() => setShowAddClassModal(true)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-[#94a3b8] text-white hover:bg-[#64748b]'}`}>
                            <i className="fas fa-plus text-sm"></i>
                          </div>
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#64748b]'}`}>
                            New Subject
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Uniforms Tab */}
                {activeTab === 'uniforms' && (
                  <div>
                    <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('uniformDescription')}</p>
                    <div className="space-y-3">
                      {DAYS.map(day => (
                        <div key={day.value} className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                          <div className="w-16 text-center">
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{t(day.labelKey)}</span>
                          </div>
                          
                          {editingDay === day.value ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={uniformInput}
                                onChange={(e) => setUniformInput(e.target.value)}
                                placeholder={t('uniformPlaceholder')}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveUniform(day.value)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                              >
                                {t('save')}
                              </button>
                              <button
                                onClick={() => { setEditingDay(null); setUniformInput(''); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                              >
                                {t('cancel')}
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                {uniforms[day.value] ? (
                                  <span className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                    <i className="fas fa-tshirt mr-2"></i>
                                    {uniforms[day.value]}
                                  </span>
                                ) : (
                                  <span className={`text-sm italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('notSetYet')}</span>
                                )}
                              </div>
                              
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditingDay(day.value); setUniformInput(uniforms[day.value] || ''); }}
                                  className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-x-hidden" onClick={() => setShowAddClassModal(false)}>
          <div className={`w-full max-w-2xl rounded-xl border p-4 shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('addClass')}</h2>
              <button onClick={() => setShowAddClassModal(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <i className={`fas fa-times ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}></i>
              </button>
            </div>
            <ClassForm
              onSubmit={handleAddClass}
              isSubmitting={isSubmitting}
              mode="create"
              isDarkMode={isDarkMode}
              t={t}
              onCancel={() => setShowAddClassModal(false)}
            />
          </div>
        </div>
      )}



      {/* Class Detail Modal */}
      <ClassDetailModal
        cls={selectedClass}
        tasks={tasks}
        isOpen={showClassDetailModal && !!selectedClass}
        onClose={() => { setShowClassDetailModal(false); setSelectedClass(null); }}
        onEdit={(cls) => {
          setEditingClass(cls);
          setShowEditClassModal(true);
          setShowClassDetailModal(false);
        }}
        onDelete={(classId) => handleDeleteClass(classId)}
        isDarkMode={isDarkMode}
      />

      {/* Edit Class Modal */}
      {showEditClassModal && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-x-hidden" onClick={() => { setShowEditClassModal(false); setEditingClass(null); }}>
          <div className={`w-full max-w-2xl rounded-xl border p-4 shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('editClass')}</h2>
              <button onClick={() => { setShowEditClassModal(false); setEditingClass(null); }} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <i className={`fas fa-times ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}></i>
              </button>
            </div>
            <ClassForm
              initialValues={editingClass}
              onSubmit={handleEditClass}
              isSubmitting={isSubmitting}
              mode="edit"
              isDarkMode={isDarkMode}
              t={t}
              onCancel={() => { setShowEditClassModal(false); setEditingClass(null); }}
              submitLabel={t('save')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;

