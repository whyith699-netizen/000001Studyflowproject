import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../firebase-config';
import { classesService, tasksService } from '../services/firestore-service';
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

// Resolve class icon - handles both 'fa-book' and 'book' formats (Extension compatibility)
const getClassIcon = (cls) => {
  const icon = cls.icon;
  if (!icon) return 'fa-graduation-cap';
  if (icon.startsWith('fa-')) return icon;
  return `fa-${icon}`;
};

const DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
];

const CoursesPage = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { courseId } = useParams();
  
  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filterDay, setFilterDay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    icon: 'fa-chalkboard-teacher',
    days: [],
    links: [{ title: '', url: '' }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubClasses = classesService.subscribeToClasses((fetchedClasses) => {
      setClasses(fetchedClasses);
      setLoading(false);
    });
    
    const unsubTasks = tasksService.subscribeToTasks((fetchedTasks) => {
      setTasks(fetchedTasks);
    });
    
    return () => {
      unsubClasses();
      unsubTasks();
    };
  }, []);

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDay = filterDay === 'all' || cls.days?.includes(filterDay);
    return matchesSearch && matchesDay;
  });

  // Get tasks for a specific class
  const getClassTasks = (classId) => {
    return tasks.filter(t => t.classId === classId && !t.completed);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await classesService.addClass({
        name: formData.name.trim(),
        icon: formData.icon,
        days: formData.days,
        links: formData.links.filter(l => l.url.trim())
      });
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add class:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await classesService.deleteClass(classId);
      setShowDetailModal(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
    setShowDetailModal(true);
  };

  const openLink = (url) => {
    window.open(url, '_blank');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: 'fa-chalkboard-teacher',
      days: [],
      links: [{ title: '', url: '' }]
    });
    setShowIconPicker(false);
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const addLink = () => {
    setFormData(prev => ({
      ...prev,
      links: [...prev.links, { title: '', url: '' }]
    }));
  };

  const updateLink = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeLink = (index) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 w-full px-4 py-4 md:px-6 md:py-5">
          {/* Header */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mb-4">
            {/* Top Row: Title & Add Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl">
                  <i className="fas fa-chalkboard text-blue-600 text-lg"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">My Classes</h1>
                  <p className="text-xs text-gray-500">{classes.length} classes total</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                <i className="fas fa-plus"></i>
                Add Class
              </button>
            </div>

            {/* Bottom Row: Search & Day Filter */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-shrink-0">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search classes..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm w-48 focus:w-56 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              {/* Day Filter */}
              <div className="flex gap-1.5 flex-1 overflow-x-auto">
                <button
                  onClick={() => setFilterDay('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                    filterDay === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => setFilterDay(day.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                      filterDay === day.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Classes Grid */}
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <i className="fas fa-chalkboard text-2xl mb-2 opacity-30"></i>
                <p className="text-sm">No classes found</p>
                {classes.length === 0 && (
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 text-blue-600 text-sm font-medium hover:underline"
                  >
                    Add your first class
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filteredClasses.map(cls => {
                  const classTasks = getClassTasks(cls.id);
                  return (
                    <div
                      key={cls.id}
                      className="group flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-blue-600 rounded-full border border-gray-100 hover:border-blue-600 cursor-pointer transition-all hover:shadow-md"
                      onClick={() => handleClassClick(cls)}
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 flex items-center justify-center bg-white group-hover:bg-blue-500 rounded-full text-gray-600 group-hover:text-white transition-all relative flex-shrink-0">
                        <i className={`fas ${getClassIcon(cls)} text-sm`}></i>
                        {classTasks.length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {classTasks.length}
                          </span>
                        )}
                      </div>
                      
                      {/* Class Name */}
                      <span className="text-sm font-medium text-gray-700 group-hover:text-white truncate transition-colors">
                        {cls.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add Class</h2>
              <button 
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-400"></i>
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              {/* Class Name with Icon Picker */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Class Name
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-11 h-11 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <i className={`fas ${formData.icon}`}></i>
                    </button>
                    
                    {showIconPicker && (
                      <div className="absolute top-14 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10 w-64">
                        <div className="grid grid-cols-4 gap-2">
                          {CLASS_ICONS.map(({ icon, label }) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, icon }));
                                setShowIconPicker(false);
                              }}
                              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                                formData.icon === icon
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                              }`}
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
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Mathematics"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Schedule Days */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Schedule Days
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        formData.days.includes(day.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Links (Classroom, Resources, etc.)
                </label>
                <div className="space-y-2">
                  {formData.links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => updateLink(index, 'title', e.target.value)}
                        placeholder="Link name"
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(index, 'url', e.target.value)}
                        placeholder="URL"
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                      />
                      {formData.links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLink}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 text-blue-600 text-xs font-medium hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <i className="fas fa-plus"></i>
                  Add Link
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  'Add Class'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {showDetailModal && selectedClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-xl text-blue-600 text-xl">
                  <i className={`fas ${selectedClass.icon || 'fa-chalkboard-teacher'}`}></i>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedClass.name}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedClass.days?.length > 0 
                      ? selectedClass.days.map(d => d.charAt(0).toUpperCase() + d.slice(0, 2)).join(', ')
                      : 'No schedule set'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedClass(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-times text-gray-400"></i>
              </button>
            </div>

            {/* Links Section */}
            {selectedClass.links?.filter(l => l.url).length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Links</h3>
                <div className="flex flex-col gap-2">
                  {selectedClass.links.filter(l => l.url).map((link, index) => (
                    <button
                      key={index}
                      onClick={() => openLink(link.url)}
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors group text-left"
                    >
                      <i className="fas fa-external-link-alt text-gray-400 group-hover:text-blue-600"></i>
                      <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-blue-600 truncate">
                        {link.title || link.url}
                      </span>
                      <i className="fas fa-chevron-right text-gray-300 group-hover:text-blue-400"></i>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Tasks ({getClassTasks(selectedClass.id).length})
              </h3>
              {getClassTasks(selectedClass.id).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No tasks for this class</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {getClassTasks(selectedClass.id).map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-1.5 rounded ${
                        task.type === 'exam' ? 'bg-red-100 text-red-600' :
                        task.type === 'group' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <i className={`fas ${
                          task.type === 'exam' ? 'fa-file-alt' :
                          task.type === 'group' ? 'fa-users' : 'fa-user'
                        } text-xs`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.text}</p>
                        {task.dueDate && (
                          <p className="text-[10px] text-gray-400">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteClass(selectedClass.id)}
                className="flex-1 px-4 py-2.5 border border-red-200 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash-alt"></i>
                Delete
              </button>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedClass(null); }}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
