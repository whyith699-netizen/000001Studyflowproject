import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase-config';
import { classesService, tasksService, uniformsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import Sidebar from './Sidebar';
import ClassForm from './forms/ClassForm';

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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Uniforms handlers
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

      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0">
        <div className="flex-1 w-full px-4 py-4 md:px-6 md:py-5 flex flex-col">
          {/* Header with Tabs */}
          <div className={`rounded-xl p-3 border shadow-sm mb-3 ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl">
                  <i className="fas fa-calendar-alt text-blue-600 text-lg"></i>
                </div>
                <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('scheduleTitle')}</h1>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('scheduleSubtitle')}</p>
                </div>
              </div>
              
              {/* Add Button based on active tab */}
              {activeTab === 'classes' && (
                <button
                  onClick={() => setShowAddClassModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <i className="fas fa-plus"></i>
                  {t('addClass')}
                </button>
              )}

            </div>

            {/* Tabs */}
            <div className={`flex gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
              {[
                { id: 'classes', labelKey: 'classesTab', icon: 'fa-chalkboard' },
                { id: 'uniforms', labelKey: 'uniformsTab', icon: 'fa-tshirt' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? isDarkMode ? 'sf-dark-card text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className={`rounded-xl p-3 border shadow-sm flex-1 flex flex-col min-h-0 ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Classes Tab */}
                {activeTab === 'classes' && (
                  <div>
                    {/* Search & Day Filter */}
                    <div className="flex flex-col gap-2 mb-3">
                      {/* Search */}
                      <div className="relative">
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}></i>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder={t('search')}
                          className={`w-full py-2 pl-8 pr-3 border rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all ${
                            isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      {/* Day Filter */}
                      <div
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))' }}
                      >
                        {['All', ...DAYS.map(d => d.value)].map(day => {
                          const label = day === 'All' ? t('allDays') : t(DAYS.find(d => d.value === day)?.shortKey || day);
                          return (
                            <button
                              key={day}
                              onClick={() => setFilterDay(day)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center whitespace-nowrap transition-all ${
                                filterDay === day
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {filteredClasses.map(cls => {
                          const classTasks = getClassTasks(cls.id);
                          return (
                            <div
                              key={cls.id}
                              className={`group flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:bg-blue-600 hover:border-blue-600 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}
                              onClick={() => { setSelectedClass(cls); setShowClassDetailModal(true); }}
                            >
                              <div className={`w-10 h-10 flex items-center justify-center rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all relative flex-shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-gray-600'}`}>
                                <i className={`fas ${getClassIcon(cls)}`}></i>
                                {classTasks.length > 0 && (
                                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {classTasks.length}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm font-medium group-hover:text-white truncate block ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                  {cls.name}
                                </span>
                                {cls.days?.length > 0 && (
                                  <span className={`text-xs group-hover:text-blue-200 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                    {cls.days.map(d => t(DAYS.find(day => day.value === d)?.shortKey || d)).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
      {showClassDetailModal && selectedClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className={`rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'sf-dark-card border sf-dark-border' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <i className={`fas ${selectedClass.icon || 'fa-chalkboard-teacher'}`}></i>
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedClass.name}</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {selectedClass.days?.length > 0 
                      ? selectedClass.days.map(d => t(DAYS.find(day => day.value === d)?.labelKey || d)).join(', ')
                      : t('noScheduleYet')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setEditingClass(selectedClass);
                    setShowEditClassModal(true);
                    setShowClassDetailModal(false);
                  }}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  title={t('editClass')}
                >
                  <i className={`fas fa-edit ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}></i>
                </button>
                <button onClick={() => { setShowClassDetailModal(false); setSelectedClass(null); }} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                  <i className={`fas fa-times ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}></i>
                </button>
              </div>
            </div>

            {/* Links */}
            {selectedClass.links?.filter(l => l.url).length > 0 && (
              <div className="mb-5">
                <h3 className={`text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('link')}</h3>
                <div className="space-y-2">
                  {selectedClass.links.filter(l => l.url).map((link, i) => (
                    <button key={i} onClick={() => window.open(link.url, '_blank')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left group ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-blue-50'}`}>
                      <i className={`fas fa-external-link-alt ${isDarkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-600'}`}></i>
                      <span className={`flex-1 text-sm font-medium truncate ${isDarkMode ? 'text-slate-300 group-hover:text-blue-400' : 'text-gray-700 group-hover:text-blue-600'}`}>{link.title || link.url}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="mb-5">
              <h3 className={`text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('tasks')} ({getClassTasks(selectedClass.id).length})</h3>
              {getClassTasks(selectedClass.id).length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('noTasks')}</p>
              ) : (
                <div className="space-y-2">
                  {getClassTasks(selectedClass.id).map(task => (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                      <div className={`p-1.5 rounded ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><i className="fas fa-tasks text-xs"></i></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{task.title || task.text}</p>
                        {task.dueDate && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('dueDate')}: {new Date(task.dueDate).toLocaleDateString('id-ID')}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingClass(selectedClass);
                  setShowEditClassModal(true);
                  setShowClassDetailModal(false);
                }}
                className={`flex-1 px-4 py-2.5 border rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className="fas fa-edit"></i> {t('editClass')}
              </button>
              <button onClick={() => handleDeleteClass(selectedClass.id)} className={`flex-1 px-4 py-2.5 border border-red-200 rounded-lg font-medium text-red-600 flex items-center justify-center gap-2 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}>
                <i className="fas fa-trash-alt"></i> {t('delete')}
              </button>
              <button onClick={() => { setShowClassDetailModal(false); setSelectedClass(null); }} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

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

