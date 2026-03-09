import React from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { ACTION_STATUS, ACTION_META, formatActionParams } from '../../services/chatbot-actions';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useLang } from '../../contexts/LanguageContext';

/**
 * Action Confirmation Card
 * Displays action details and allows user to confirm or cancel before execution.
 */
function ActionConfirmation({ action, status = ACTION_STATUS.PENDING, onConfirm, onCancel, resultMessage }) {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();

  if (!action) return null;

  const meta = ACTION_META[action.type] || { label: 'Aksi', icon: 'A', color: 'slate' };
  const details = formatActionParams(action.type, action.params || {});

  const colorMap = {
    blue: {
      bg: isDarkMode ? 'bg-blue-950/20' : 'bg-blue-50',
      border: isDarkMode ? 'border-blue-900/30' : 'border-blue-200',
      text: isDarkMode ? 'text-blue-300' : 'text-blue-800',
      btn: 'bg-blue-600 hover:bg-blue-700',
    },
    amber: {
      bg: isDarkMode ? 'bg-amber-950/20' : 'bg-amber-50',
      border: isDarkMode ? 'border-amber-900/30' : 'border-amber-200',
      text: isDarkMode ? 'text-amber-300' : 'text-amber-800',
      btn: 'bg-amber-600 hover:bg-amber-700',
    },
    green: {
      bg: isDarkMode ? 'bg-emerald-950/20' : 'bg-emerald-50',
      border: isDarkMode ? 'border-emerald-900/30' : 'border-emerald-200',
      text: isDarkMode ? 'text-emerald-300' : 'text-emerald-800',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
    },
    red: {
      bg: isDarkMode ? 'bg-red-950/20' : 'bg-red-50',
      border: isDarkMode ? 'border-red-900/30' : 'border-red-200',
      text: isDarkMode ? 'text-red-300' : 'text-red-800',
      btn: 'bg-red-600 hover:bg-red-700',
    },
    purple: {
      bg: isDarkMode ? 'bg-violet-950/20' : 'bg-violet-50',
      border: isDarkMode ? 'border-violet-900/30' : 'border-violet-200',
      text: isDarkMode ? 'text-violet-300' : 'text-violet-800',
      btn: 'bg-violet-600 hover:bg-violet-700',
    },
    teal: {
      bg: isDarkMode ? 'bg-teal-950/20' : 'bg-teal-50',
      border: isDarkMode ? 'border-teal-900/30' : 'border-teal-200',
      text: isDarkMode ? 'text-teal-300' : 'text-teal-800',
      btn: 'bg-teal-600 hover:bg-teal-700',
    },
    indigo: {
      bg: isDarkMode ? 'bg-indigo-950/20' : 'bg-indigo-50',
      border: isDarkMode ? 'border-indigo-900/30' : 'border-indigo-200',
      text: isDarkMode ? 'text-indigo-300' : 'text-indigo-800',
      btn: 'bg-indigo-600 hover:bg-indigo-700',
    },
    slate: {
      bg: isDarkMode ? 'bg-slate-900/20' : 'bg-slate-50',
      border: isDarkMode ? 'border-slate-700/50' : 'border-slate-200',
      text: isDarkMode ? 'text-slate-300' : 'text-slate-800',
      btn: 'bg-slate-700 hover:bg-slate-800',
    },
  };

  const colors = colorMap[meta.color] || colorMap.slate;
  const detailLabelText = isDarkMode ? 'text-slate-400' : 'text-slate-700';
  const detailValueText = isDarkMode ? 'text-slate-200' : 'text-slate-900';
  const dividerClass = isDarkMode ? 'border-slate-700' : 'border-slate-300';
  const resultClass = status === ACTION_STATUS.SUCCESS
    ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-700')
    : (isDarkMode ? 'text-red-400' : 'text-red-700');
  const cancelButtonClass = isDarkMode
    ? 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800'
    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

  return (
    <div className={`my-2 overflow-hidden rounded-xl border ${colors.border} ${colors.bg} transition-colors animate-fade-in`}>
      <div className={`flex items-center gap-2 border-b ${colors.border} px-3 py-2`}>
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border border-current/20 text-xs font-semibold ${isDarkMode ? 'bg-slate-900/40' : 'bg-white/80'}`}>
          {meta.icon}
        </span>
        <span className={`text-sm font-semibold ${colors.text}`}>{meta.label}</span>
        {status === ACTION_STATUS.EXECUTING && (
          <Loader2 className="ml-auto h-4 w-4 animate-spin text-slate-400" />
        )}
        {status === ACTION_STATUS.SUCCESS && (
          <Check className="ml-auto h-4 w-4 text-emerald-500" />
        )}
        {(status === ACTION_STATUS.FAILED || status === ACTION_STATUS.CANCELLED) && (
          <X className="ml-auto h-4 w-4 text-slate-400" />
        )}
      </div>

      {details.length > 0 && (
        <div className={`space-y-1.5 px-3 py-2 ${status === ACTION_STATUS.PENDING ? 'pb-3' : ''}`}>
          {details.map((detail, idx) => (
            <div key={idx} className="flex items-baseline gap-2 text-xs">
              <span className={`min-w-[72px] font-medium ${detailLabelText}`}>{detail.label}:</span>
              <span className={`break-all ${detailValueText}`}>{detail.value || '-'}</span>
            </div>
          ))}
        </div>
      )}

      {action.confirmationMessage && status === ACTION_STATUS.PENDING && (
        <div className={`border-t border-dashed px-3 py-2 text-xs ${dividerClass} ${detailLabelText}`}>
          {action.confirmationMessage}
        </div>
      )}

      {resultMessage && (status === ACTION_STATUS.SUCCESS || status === ACTION_STATUS.FAILED) && (
        <div className={`border-t border-dashed px-3 py-2 text-xs ${colors.border} ${resultClass}`}>
          {resultMessage}
        </div>
      )}

      {status === ACTION_STATUS.CANCELLED && (
        <div className={`border-t border-dashed px-3 py-2 text-xs ${dividerClass} ${detailLabelText}`}>
          {t('chatActionCancelled') || 'Action cancelled.'}
        </div>
      )}

      {status === ACTION_STATUS.PENDING && (
        <div className={`flex items-center gap-2 border-t px-3 py-2 ${dividerClass}`}>
          <button
            type="button"
            onClick={() => onConfirm(action)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors ${colors.btn}`}
          >
            <Check className="h-3 w-3" />
            {t('confirm') || 'Confirm'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${cancelButtonClass}`}
          >
            <X className="h-3 w-3" />
            {t('cancel') || 'Cancel'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionConfirmation;
