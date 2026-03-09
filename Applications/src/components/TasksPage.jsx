import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase-config';
import { classesService, tasksService } from '../services/firestore-service';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLang } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import Sidebar from './Sidebar';
import TaskForm from './forms/TaskForm';

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = {
    pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word',
    xls: 'fa-file-excel', xlsx: 'fa-file-excel',
    ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
    jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image', gif: 'fa-file-image',
    zip: 'fa-file-archive', rar: 'fa-file-archive',
    mp4: 'fa-file-video', mp3: 'fa-file-audio',
    js: 'fa-file-code', py: 'fa-file-code', html: 'fa-file-code',
    txt: 'fa-file-alt',
  };
  return map[ext] || 'fa-file';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const TasksPage = () => {
  const user = auth.currentUser;
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const { confirm } = useConfirm();

  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);

  // Add task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubClasses = classesService.subscribeToClasses(fetched => setClasses(fetched));
    const unsubTasks = tasksService.subscribeToTasks(fetched => { setTasks(fetched); setLoading(false); });
    return () => { unsubClasses(); unsubTasks(); };
  }, []);

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return tasks.filter(t => !t.completed);
    if (filter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }, [tasks, filter]);

  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);
  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || '';

  const priorityColors = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-emerald-400' };
  const priorityLabels = { high: t('high'), medium: t('medium'), low: t('low') };
  const typeIcons = { individual: 'fa-user', group: 'fa-users', exam: 'fa-file-alt', other: 'fa-sticky-note' };

  const handleToggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      await tasksService.toggleTask(taskId, !task.completed);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const accepted = await confirm({
      title: t('deleteTask'),
      message: t('confirmDelete'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'danger',
    });
    if (!accepted) return false;
    try {
      await tasksService.deleteTask(taskId);
      return true;
    } catch (err) {
      console.error('Failed to delete task:', err);
      return false;
    }
  };

  const handleDeleteAllCompleted = async () => {
    const accepted = await confirm({
      title: t('deleteTask'),
      message: t('confirmDelete'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'danger',
    });
    if (!accepted) return;
    completedTasks.forEach(t => tasksService.deleteTask(t.id));
  };

  const downloadFile = (file) => {
    if (file?.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!file?.data) return;
    const a = document.createElement('a');
    a.href = file.data;
    a.download = file.name;
    a.click();
  };

  const handleAddTask = async (payload) => {
    setIsSubmitting(true);
    try {
      const result = await tasksService.addTask(payload);
      setShowAddModal(false);
      return result;
    } catch (err) {
      console.error('Failed to add task:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTask(null);
  };

  const handleUpdateTask = async (payload) => {
    if (!editingTask?.id) return;
    setIsUpdating(true);
    try {
      const result = await tasksService.updateTask(editingTask.id, payload);
      handleCloseEditModal();
      return result;
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editingTask?.id) return;
    const deleted = await handleDeleteTask(editingTask.id);
    if (deleted) {
      handleCloseEditModal();
    }
  };

  // Dark mode helpers
  const cardCls = isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-100';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const textMuted = isDarkMode ? 'text-slate-500' : 'text-gray-400';
  const borderSubtle = isDarkMode ? 'border-slate-700' : 'border-gray-200';
  const hoverBg = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100';

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'sf-dark-shell' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      <Sidebar user={user} />

      <main
        className="flex-1 flex flex-col h-full overflow-y-auto md:pb-0"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex-1 w-full px-4 py-4 pb-32 md:px-6 md:py-5 md:pb-0 flex flex-col gap-3">

          {/* Header */}
          <div className={`rounded-xl p-4 border shadow-sm flex-shrink-0 ${cardCls}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <i className="fas fa-tasks text-blue-500 text-lg"></i>
              </div>
              <div className="flex-1">
                <h1 className={`text-xl font-bold ${textPrimary}`}>{t('myTasksTitle')}</h1>
                <p className={`text-xs ${textSecondary}`}>{filteredTasks.length} {t('tasks')}</p>
              </div>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                <i className="fas fa-plus"></i> {t('addTask')}
              </button>
            </div>
          </div>

          {/* Task List Card */}
          <div className={`rounded-xl p-4 border shadow-sm flex-1 min-h-0 flex flex-col ${cardCls}`}>
            {/* Section Header */}
            <div className={`flex items-center gap-2 mb-3 pb-3 border-b ${borderSubtle}`}>
              <i className="fas fa-tasks text-blue-500 text-sm"></i>
              <h3 className={`text-sm font-semibold flex-1 ${textPrimary}`}>{t('allTasks')} ({filteredTasks.length})</h3>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-3">
              {['pending', 'completed', 'all'].map(f => (
                <button key={f} onClick={() => { setFilter(f); setExpandedId(null); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {f === 'pending' ? t('pendingLabel') : f === 'completed' ? t('completedLabel') : t('allTasks')}
                </button>
              ))}

              {/* Delete All Completed */}
              {filter === 'completed' && completedTasks.length > 0 && (
                <button onClick={handleDeleteAllCompleted}
                  className={`ml-auto px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/30' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                  }`}>
                  <i className="fas fa-trash-alt mr-1 text-[10px]"></i>{t('deleteAllCompleted')}
                </button>
              )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0" style={{ scrollbarWidth: 'none' }}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredTasks.length > 0 ? filteredTasks.map(task => {
                const isExpanded = expandedId === task.id;
                const taskLinks = task.links || [];
                const taskFiles = task.files || [];
                const hasDetails = task.description || taskLinks.length > 0 || taskFiles.length > 0;

                return (
                  <div key={task.id}
                    className={`rounded-lg transition-all border ${
                      isExpanded
                        ? isDarkMode ? 'sf-dark-card sf-dark-border' : 'border-gray-200 bg-white'
                        : isDarkMode
                          ? `border-transparent hover:border-slate-600 ${task.completed && !isExpanded ? 'bg-slate-800/50 opacity-60' : 'bg-slate-800'}`
                          : `border-transparent hover:border-gray-200 ${task.completed && !isExpanded ? 'bg-gray-50/50 opacity-60' : 'bg-gray-50'}`
                    }`}>

                    {/* Main row */}
                    <div className="flex items-center gap-3 p-2.5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                      {/* Checkbox */}
                      <button onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          task.completed
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : isDarkMode ? 'border-slate-500 hover:border-blue-500' : 'border-gray-300 hover:border-blue-500'
                        }`}>
                        {task.completed && <i className="fas fa-check text-[0.5rem]"></i>}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-1 h-4 rounded-full flex-shrink-0 ${priorityColors[task.priority] || 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium truncate ${
                            task.completed
                              ? isDarkMode ? 'line-through text-slate-500' : 'line-through text-gray-400'
                              : isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                            {task.title || task.text || 'Untitled Task'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-3">
                          {getClassName(task.classId) && (
                            <span className={`text-[0.65rem] truncate ${textSecondary}`}>{getClassName(task.classId)}</span>
                          )}
                          {task.dueDate && (
                            <span className={`text-[0.65rem] ${textMuted}`}>
                              <i className="far fa-calendar-alt mr-0.5"></i>
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {hasDetails && (
                            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[8px] ml-auto ${textMuted}`}></i>
                          )}
                        </div>
                      </div>

                      {/* Edit */}
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditTask(task); }}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-blue-600'
                        }`}
                        title={t('edit')}
                      >
                        <i className="fas fa-pen text-sm"></i>
                      </button>

                      {/* Delete */}
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/30'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                        }`}
                        title={t('delete')}
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className={`px-3 pb-3 pt-0 space-y-2.5 border-t mx-2.5 mt-0 ${borderSubtle}`}>
                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-2 pt-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <i className={`fas ${typeIcons[task.type] || typeIcons.other} text-[8px]`}></i>
                            {task.type || 'other'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority] || 'bg-gray-300'}`}></div>
                            {priorityLabels[task.priority] || 'Normal'}
                          </span>
                          {task.dueDate && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                              <i className="far fa-calendar-alt text-[8px]"></i>
                              {new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {getClassName(task.classId) && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                              <i className="fas fa-chalkboard text-[8px]"></i>
                              {getClassName(task.classId)}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {task.description && (
                          <div>
                            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{t('description')}</p>
                            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{task.description}</p>
                          </div>
                        )}

                        {/* Links */}
                        {taskLinks.length > 0 && (
                          <div>
                            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{t('links')}</p>
                            <div className="space-y-1">
                              {taskLinks.map((link, i) => {
                                let hostname = '';
                                try { hostname = new URL(link.url).hostname; } catch { hostname = link.url; }
                                return (
                                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs no-underline border transition-colors ${
                                      isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-600/50 hover:text-blue-400' : 'bg-gray-50 text-gray-600 border-gray-200 hover:text-blue-600'
                                    }`}>
                                    <i className="fas fa-link text-[8px] text-blue-500/50"></i>
                                    <span className="truncate">{link.title || hostname}</span>
                                    <i className={`fas fa-external-link-alt text-[7px] ml-auto ${textMuted}`}></i>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Files */}
                        {taskFiles.length > 0 && (
                          <div>
                            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{t('attachments')}</p>
                            <div className="space-y-1">
                              {taskFiles.map((file, i) => (
                                <div key={i} onClick={() => downloadFile(file)}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors border ${
                                    isDarkMode ? 'bg-slate-800 border-slate-600/50 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                  }`}>
                                  <i className={`fas ${getFileIcon(file.name)} text-sm text-blue-500/60`}></i>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs truncate ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{file.name}</p>
                                    <p className={`text-[9px] ${textMuted}`}>{formatFileSize(file.size)}</p>
                                  </div>
                                  <i className={`fas fa-download text-[10px] ${textMuted}`}></i>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No details */}
                        {!task.description && taskLinks.length === 0 && taskFiles.length === 0 && (
                          <p className={`text-xs italic ${textMuted}`}>{t('noAdditionalDetails')}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className={`text-center py-8 ${textMuted}`}>
                  {filter === 'pending' ? (
                    <><i className="fas fa-check-circle text-blue-500 mr-1"></i>{t('noTasks')}</>
                  ) : filter === 'completed' ? t('noTasksYet') : t('noTasks')}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ============ ADD TASK MODAL ============ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className={`rounded-xl p-4 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden border ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('addTask')}</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg transition-colors ${hoverBg}`}>
                <i className={`fas fa-times ${textMuted}`}></i>
              </button>
            </div>
            <TaskForm
              classes={classes}
              onSubmit={handleAddTask}
              isSubmitting={isSubmitting}
              mode="create"
              isDarkMode={isDarkMode}
              t={t}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* ============ EDIT TASK MODAL ============ */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseEditModal}>
          <div className={`rounded-xl p-4 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden border ${isDarkMode ? 'sf-dark-card sf-dark-border' : 'bg-white border-gray-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('edit')}</h2>
              <button onClick={handleCloseEditModal} className={`p-2 rounded-lg transition-colors ${hoverBg}`}>
                <i className={`fas fa-times ${textMuted}`}></i>
              </button>
            </div>
            <TaskForm
              initialValues={editingTask}
              classes={classes}
              onSubmit={handleUpdateTask}
              isSubmitting={isUpdating}
              mode="edit"
              isDarkMode={isDarkMode}
              t={t}
              onCancel={handleCloseEditModal}
              submitLabel={t('save')}
              onToggleComplete={() => handleToggleTask(editingTask.id)}
              onDelete={handleDeleteFromEdit}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default TasksPage;

