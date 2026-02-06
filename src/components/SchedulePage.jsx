import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { classesService, tasksService, examsService, uniformsService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import Sidebar from './Sidebar';

// Font Awesome icon options for classes
const CLASS_ICONS = [
  { icon: 'fa-chalkboard-teacher', label: 'Teacher' },
  { icon: 'fa-calculator', label: 'Math' },
  { icon: 'fa-flask', label: 'Science' },
  { icon: 'fa-book', label: 'Book' },
  { icon: 'fa-globe', label: 'Geography' },
  { icon: 'fa-laptop-code', label: 'Coding' },
  { icon: 'fa-palette', label: 'Art' },
  { icon: 'fa-music', label: 'Music' },
  { icon: 'fa-dumbbell', label: 'Sports' },
  { icon: 'fa-microscope', label: 'Biology' },
  { icon: 'fa-language', label: 'Language' },
  { icon: 'fa-brain', label: 'Psychology' },
  { icon: 'fa-atom', label: 'Physics' },
  { icon: 'fa-landmark', label: 'History' },
  { icon: 'fa-coins', label: 'Economics' },
  { icon: 'fa-cross', label: 'Religion' },
];

const DAYS = [
  { value: 'monday', label: 'Senin', short: 'Sen' },
  { value: 'tuesday', label: 'Selasa', short: 'Sel' },
  { value: 'wednesday', label: 'Rabu', short: 'Rab' },
  { value: 'thursday', label: 'Kamis', short: 'Kam' },
  { value: 'friday', label: 'Jumat', short: 'Jum' },
  { value: 'saturday', label: 'Sabtu', short: 'Sab' },
];

const UNIFORM_PRESETS = [
  { name: 'Putih Abu-abu', color: '#6B7280' },
  { name: 'Batik', color: '#92400E' },
  { name: 'Pramuka', color: '#854D0E' },
  { name: 'Olahraga', color: '#DC2626' },
  { name: 'Bebas Rapi', color: '#2563EB' },
  { name: 'Jas Almamater', color: '#1E40AF' },
];

const SchedulePage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('classes');
  
  // Classes state
  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [classFormData, setClassFormData] = useState({
    name: '',
    icon: 'fa-chalkboard-teacher',
    days: [],
    links: [{ title: '', url: '' }]
  });
  
  // Exams state
  const [exams, setExams] = useState([]);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [examFormData, setExamFormData] = useState({ title: '', subject: '', date: '', time: '' });
  
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
    
    const unsubExams = examsService.subscribeToExams((data) => {
      setExams(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    });
    
    const unsubUniforms = uniformsService.subscribeToUniforms((data) => {
      setUniforms(data);
    });
    
    return () => {
      unsubClasses();
      unsubTasks();
      unsubExams();
      unsubUniforms();
    };
  }, []);

  // Helper functions
  const getClassTasks = (classId) => tasks.filter(t => t.classId === classId && !t.completed);
  
  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(dateStr);
    examDate.setHours(0, 0, 0, 0);
    return Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days) => {
    if (days < 0) return 'bg-gray-100 text-gray-500';
    if (days === 0) return 'bg-red-100 text-red-600';
    if (days <= 3) return 'bg-orange-100 text-orange-600';
    if (days <= 7) return 'bg-yellow-100 text-yellow-600';
    return 'bg-green-100 text-green-600';
  };

  // Classes handlers
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!classFormData.name.trim()) return;
    setIsSubmitting(true);
    try {
      await classesService.addClass({
        name: classFormData.name.trim(),
        icon: classFormData.icon,
        days: classFormData.days,
        links: classFormData.links.filter(l => l.url.trim())
      });
      setShowAddClassModal(false);
      resetClassForm();
    } catch (error) {
      console.error('Failed to add class:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!confirm('Hapus kelas ini?')) return;
    try {
      await classesService.deleteClass(classId);
      setShowClassDetailModal(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  const resetClassForm = () => {
    setClassFormData({ name: '', icon: 'fa-chalkboard-teacher', days: [], links: [{ title: '', url: '' }] });
    setShowIconPicker(false);
  };

  const toggleDay = (day) => {
    setClassFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  // Exams handlers
  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!examFormData.title.trim() || !examFormData.date) return;
    setIsSubmitting(true);
    try {
      await examsService.addExam(examFormData);
      setExamFormData({ title: '', subject: '', date: '', time: '' });
      setShowAddExamModal(false);
    } catch (error) {
      console.error('Failed to add exam:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('Hapus ujian ini?')) return;
    try {
      await examsService.deleteExam(examId);
    } catch (error) {
      console.error('Failed to delete exam:', error);
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

  const handlePresetClick = async (day, preset) => {
    const updated = { ...uniforms, [day]: preset };
    try {
      await uniformsService.saveUniforms(updated);
    } catch (error) {
      console.error('Failed to save uniform:', error);
    }
  };

  const upcomingExams = exams.filter(e => getDaysUntil(e.date) >= 0);
  const pastExams = exams.filter(e => getDaysUntil(e.date) < 0);

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-4 md:px-6 md:py-5">
          {/* Header with Tabs */}
          <div className={`rounded-xl p-4 border shadow-sm mb-4 ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl">
                  <i className="fas fa-calendar-alt text-blue-600 text-lg"></i>
                </div>
                <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Jadwal</h1>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Kelola kelas, ujian, dan seragam</p>
                </div>
              </div>
              
              {/* Add Button based on active tab */}
              {activeTab === 'classes' && (
                <button
                  onClick={() => setShowAddClassModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <i className="fas fa-plus"></i>
                  Tambah Kelas
                </button>
              )}
              {activeTab === 'exams' && (
                <button
                  onClick={() => setShowAddExamModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <i className="fas fa-plus"></i>
                  Tambah Ujian
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
              {[
                { id: 'classes', label: 'Kelas', icon: 'fa-chalkboard' },
                { id: 'exams', label: 'Ujian', icon: 'fa-file-alt' },
                { id: 'uniforms', label: 'Seragam', icon: 'fa-tshirt' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? isDarkMode ? 'bg-[#1e293b] text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className={`rounded-xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-gray-100'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Classes Tab */}
                {activeTab === 'classes' && (
                  <div>
                    {classes.length === 0 ? (
                      <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        <i className="fas fa-chalkboard text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm">Belum ada kelas</p>
                        <button onClick={() => setShowAddClassModal(true)} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
                          Tambah kelas pertama
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {classes.map(cls => {
                          const classTasks = getClassTasks(cls.id);
                          return (
                            <div
                              key={cls.id}
                              className={`group flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:bg-blue-600 hover:border-blue-600 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}
                              onClick={() => { setSelectedClass(cls); setShowClassDetailModal(true); }}
                            >
                              <div className={`w-10 h-10 flex items-center justify-center rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all relative flex-shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-gray-600'}`}>
                                <i className={`fas ${cls.icon || 'fa-chalkboard-teacher'}`}></i>
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
                                    {cls.days.map(d => DAYS.find(day => day.value === d)?.short).join(', ')}
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

                {/* Exams Tab */}
                {activeTab === 'exams' && (
                  <div>
                    {upcomingExams.length === 0 && pastExams.length === 0 ? (
                      <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        <i className="fas fa-file-alt text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm">Belum ada ujian</p>
                        <button onClick={() => setShowAddExamModal(true)} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
                          Tambah ujian pertama
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Upcoming */}
                        {upcomingExams.length > 0 && (
                          <div>
                            <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Akan Datang</h3>
                            <div className="space-y-2">
                              {upcomingExams.map(exam => {
                                const days = getDaysUntil(exam.date);
                                return (
                                  <div key={exam.id} className={`flex items-center gap-4 p-3 rounded-xl transition-colors group ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border text-center ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-100'}`}>
                                      <span className="text-[10px] font-bold text-red-500 uppercase">
                                        {new Date(exam.date).toLocaleDateString('id-ID', { month: 'short' })}
                                      </span>
                                      <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                        {new Date(exam.date).getDate()}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{exam.title}</p>
                                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{exam.subject} {exam.time && `• ${exam.time}`}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(days)}`}>
                                      {days === 0 ? 'Hari ini' : days === 1 ? 'Besok' : `${days} hari`}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteExam(exam.id)}
                                      className={`p-2 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}
                                    >
                                      <i className="fas fa-trash-alt"></i>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Past */}
                        {pastExams.length > 0 && (
                          <div>
                            <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Sudah Lewat</h3>
                            <div className="space-y-2 opacity-60">
                              {pastExams.slice(0, 5).map(exam => (
                                <div key={exam.id} className={`flex items-center gap-4 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                    <i className={`fas fa-check ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}></i>
                                  </div>
                                  <div className="flex-1">
                                    <p className={`font-medium line-through ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{exam.title}</p>
                                    <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{new Date(exam.date).toLocaleDateString('id-ID')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Uniforms Tab */}
                {activeTab === 'uniforms' && (
                  <div>
                    <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Atur seragam untuk setiap hari sekolah</p>
                    <div className="space-y-3">
                      {DAYS.map(day => (
                        <div key={day.value} className={`flex items-center gap-4 p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                          <div className="w-16 text-center">
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{day.label}</span>
                          </div>
                          
                          {editingDay === day.value ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={uniformInput}
                                onChange={(e) => setUniformInput(e.target.value)}
                                placeholder="Nama seragam..."
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveUniform(day.value)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => { setEditingDay(null); setUniformInput(''); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                              >
                                Batal
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
                                  <span className={`text-sm italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Belum diatur</span>
                                )}
                              </div>
                              
                              <div className="flex gap-1">
                                {UNIFORM_PRESETS.slice(0, 4).map(preset => (
                                  <button
                                    key={preset.name}
                                    onClick={() => handlePresetClick(day.value, preset.name)}
                                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'}`}
                                    title={preset.name}
                                  >
                                    {preset.name.split(' ')[0]}
                                  </button>
                                ))}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tambah Kelas</h2>
              <button onClick={() => { setShowAddClassModal(false); resetClassForm(); }} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <i className={`fas fa-times ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}></i>
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Nama Kelas</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className={`w-11 h-11 flex items-center justify-center border rounded-lg ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                      <i className={`fas ${classFormData.icon}`}></i>
                    </button>
                    {showIconPicker && (
                      <div className={`absolute top-14 left-0 border rounded-xl shadow-lg p-3 z-10 w-64 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="grid grid-cols-4 gap-2">
                          {CLASS_ICONS.map(({ icon, label }) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => { setClassFormData(prev => ({ ...prev, icon })); setShowIconPicker(false); }}
                              className={`w-12 h-12 flex items-center justify-center rounded-lg ${classFormData.icon === icon ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                              title={label}
                            >
                              <i className={`fas ${icon}`}></i>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={classFormData.name}
                    onChange={(e) => setClassFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Matematika"
                    className={`flex-1 px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Hari</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        classFormData.days.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !classFormData.name.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {isSubmitting ? 'Menyimpan...' : 'Tambah Kelas'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {showAddExamModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 w-full max-w-md shadow-xl ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tambah Ujian</h2>
              <button onClick={() => setShowAddExamModal(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <i className={`fas fa-times ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}></i>
              </button>
            </div>

            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Nama Ujian</label>
                <input
                  type="text"
                  value={examFormData.title}
                  onChange={(e) => setExamFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: UTS Matematika"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Mata Pelajaran</label>
                <input
                  type="text"
                  value={examFormData.subject}
                  onChange={(e) => setExamFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Contoh: Matematika"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tanggal</label>
                  <input
                    type="date"
                    value={examFormData.date}
                    onChange={(e) => setExamFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Waktu</label>
                  <input
                    type="time"
                    value={examFormData.time}
                    onChange={(e) => setExamFormData(prev => ({ ...prev, time: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-gray-50 border-gray-200 focus:bg-white'}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !examFormData.title.trim() || !examFormData.date}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {isSubmitting ? 'Menyimpan...' : 'Tambah Ujian'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {showClassDetailModal && selectedClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <i className={`fas ${selectedClass.icon || 'fa-chalkboard-teacher'}`}></i>
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedClass.name}</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {selectedClass.days?.length > 0 
                      ? selectedClass.days.map(d => DAYS.find(day => day.value === d)?.label).join(', ')
                      : 'Belum ada jadwal'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowClassDetailModal(false); setSelectedClass(null); }} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <i className={`fas fa-times ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}></i>
              </button>
            </div>

            {/* Links */}
            {selectedClass.links?.filter(l => l.url).length > 0 && (
              <div className="mb-5">
                <h3 className={`text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Link</h3>
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
              <h3 className={`text-xs font-medium uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tugas ({getClassTasks(selectedClass.id).length})</h3>
              {getClassTasks(selectedClass.id).length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Tidak ada tugas</p>
              ) : (
                <div className="space-y-2">
                  {getClassTasks(selectedClass.id).map(task => (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                      <div className={`p-1.5 rounded ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><i className="fas fa-tasks text-xs"></i></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{task.text}</p>
                        {task.dueDate && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Due: {new Date(task.dueDate).toLocaleDateString('id-ID')}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleDeleteClass(selectedClass.id)} className={`flex-1 px-4 py-2.5 border border-red-200 rounded-lg font-medium text-red-600 flex items-center justify-center gap-2 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}>
                <i className="fas fa-trash-alt"></i> Hapus
              </button>
              <button onClick={() => { setShowClassDetailModal(false); setSelectedClass(null); }} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
