import React, { useMemo, useRef, useState } from 'react';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_TASK } from '../../services/attachments-service';
import Select from '../Select';

const TYPE_OPTIONS = [
  { value: 'individual', icon: 'fa-user' },
  { value: 'group', icon: 'fa-users' },
  { value: 'exam', icon: 'fa-file-alt' },
];

const PRIORITY_OPTIONS = [
  { value: 'low' },
  { value: 'medium' },
  { value: 'high' },
];

const baseInputCls = 'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100';
const sectionTitleCls = 'text-[11px] font-semibold uppercase tracking-wider';

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function TaskForm({
  initialValues = {},
  classes = [],
  onSubmit,
  isSubmitting = false,
  mode = 'create',
  isDarkMode = false,
  t,
  onCancel,
  submitLabel,
  onToggleComplete,
  onDelete,
}) {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState(initialValues.title || initialValues.text || '');
  const [classId, setClassId] = useState(initialValues.classId || '');
  const [type, setType] = useState(initialValues.type || 'individual');
  const [priority, setPriority] = useState(initialValues.priority || 'medium');
  const [dueDate, setDueDate] = useState(toDateTimeLocal(initialValues.dueDate));
  const [description, setDescription] = useState(initialValues.description || '');
  const [links, setLinks] = useState(Array.isArray(initialValues.links) ? initialValues.links : []);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [newFiles, setNewFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const darkInput = isDarkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500'
    : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500';

  const selectedClassName = useMemo(
    () => classes.find((item) => item.id === classId)?.name || null,
    [classes, classId]
  );

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === classId) || null,
    [classes, classId]
  );

  const isEditMode = mode === 'edit' && initialValues?.id;
  const isCompleted = initialValues.completed || false;

  const dueDateDisplay = useMemo(() => {
    if (!dueDate) return '';
    try {
      return new Date(dueDate).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  }, [dueDate]);

  const pushLink = () => {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) return;
    setLinks((prev) => [...prev, { title: linkTitle.trim(), url: trimmedUrl }]);
    setLinkTitle('');
    setLinkUrl('');
  };

  const removeLink = (index) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    const nextFiles = [...newFiles];
    const nextErrors = [];
    const remainingSlots = Math.max(0, MAX_FILES_PER_TASK - nextFiles.length);

    selected.slice(0, remainingSlots).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        nextErrors.push(`${file.name}: ${t('fileTooLarge')}`);
        return;
      }
      nextFiles.push(file);
    });

    if (selected.length > remainingSlots) {
      nextErrors.push(t('tooManyFiles'));
    }

    setNewFiles(nextFiles);
    setUploadErrors(nextErrors);
    event.target.value = '';
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setUploadErrors([]);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    try {
      const result = await onSubmit?.({
        title: trimmedTitle,
        text: trimmedTitle,
        classId: classId || null,
        className: selectedClassName,
        type,
        priority,
        dueDate: dueDate || null,
        description: description.trim(),
        links: links.filter((link) => link?.url?.trim()),
        newFiles,
      });

      if (Array.isArray(result?.attachmentErrors) && result.attachmentErrors.length > 0) {
        setUploadErrors(result.attachmentErrors.map((item) => `${item.name}: ${item.error}`));
      }
    } catch (error) {
      setSubmitError(error?.message || t('saveFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Status indicator header for edit mode */}
      {isEditMode && (
        <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-blue-900/30 bg-blue-900/10' : 'border-blue-200 bg-blue-50'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                {title || 'Task Title'}
              </p>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {isCompleted ? t('completed') || 'Completed' : t('pending') || 'Pending'}
                {selectedClass ? ` · ${selectedClass.name}` : ''}
                {dueDateDisplay ? ` · Due ${dueDateDisplay}` : ''}
              </p>
            </div>
            {(onToggleComplete || onDelete) && (
              <div className="flex gap-1.5 flex-shrink-0">
                {onToggleComplete && (
                  <button
                    type="button"
                    onClick={onToggleComplete}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' 
                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                    }`}
                    title={isCompleted ? t('markPending') : t('markComplete')}
                  >
                    <i className={`fas ${isCompleted ? 'fa-undo' : 'fa-check'} text-xs`}></i>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-800 text-slate-400 hover:bg-red-900/20 hover:text-red-400' 
                        : 'bg-white text-gray-500 hover:bg-red-50 hover:text-red-500 border border-gray-200'
                    }`}
                    title={t('deleteTask')}
                  >
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${isEditMode ? '' : ''}`}>
      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('basicInfo')}</p>
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('taskTitle')}
            className={`${baseInputCls} ${darkInput}`}
            autoFocus
            required
          />
          <Select
            value={classId}
            onChange={(value) => setClassId(value)}
            options={[
              { value: '', label: t('selectClass') },
              ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
            ]}
            placeholder={t('selectClass')}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('typePriority')}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 min-w-0">
          <div className="min-w-0">
            <p className={`mb-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('taskType')}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                    type === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isDarkMode
                      ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <i className={`fas ${option.icon} mr-1 text-[10px]`}></i>
                  {t(option.value)}
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className={`mb-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('priority')}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                    priority === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isDarkMode
                      ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(option.value)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('details')}</p>
        <div className="mt-2 space-y-2">
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${baseInputCls} ${darkInput}`}
          />
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('taskDescription')}
            className={`${baseInputCls} ${darkInput} resize-none`}
          />
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
                  <span className={`truncate text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {link.title || link.url}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="ml-auto text-xs text-red-500 transition-colors hover:text-red-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1fr,auto] min-w-0">
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder={t('linkTitle')}
              className={`${baseInputCls} ${darkInput}`}
            />
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={t('linkUrl')}
              className={`${baseInputCls} ${darkInput}`}
            />
            <button
              type="button"
              onClick={pushLink}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <i className="fas fa-plus mr-1"></i>
              {t('addLink')}
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50/80'}`}>
        <p className={`${sectionTitleCls} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('attachments')}</p>
        <div className="mt-2 space-y-2">
          {newFiles.length > 0 && (
            <div className="space-y-1.5">
              {newFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                    isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <i className="fas fa-file text-xs text-blue-500"></i>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{file.name}</p>
                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    className="text-xs text-red-500 transition-colors hover:text-red-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={addFiles} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors ${
              isDarkMode
                ? 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400'
                : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
            }`}
          >
            <i className="fas fa-cloud-upload-alt mr-1"></i>
            {t('uploadFiles')} ({Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB)
          </button>
          {uploadErrors.length > 0 && (
            <div className="space-y-1">
              {uploadErrors.map((error, index) => (
                <p key={`${error}-${index}`} className="break-words text-xs text-red-500">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

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
          disabled={isSubmitting || !title.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('saving') : submitLabel || (mode === 'edit' ? t('save') : t('addTask'))}
        </button>
      </div>
    </form>
    </div>
  );
}

export default TaskForm;
