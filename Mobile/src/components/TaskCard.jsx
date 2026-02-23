import React from 'react';
import { Check, Clock, Trash2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

export default function TaskCard({ task, onToggle, onDelete }) {
  const priorityClass = task.priority === 'high' ? 'priority-high' 
    : task.priority === 'medium' ? 'priority-medium' 
    : 'priority-low';

  const deadlineStr = task.deadline 
    ? format(new Date(task.deadline), 'MMM d, h:mm a') 
    : null;

  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !task.completed;

  return (
    <div className={`task-card ${priorityClass}`}>
      <button
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={() => onToggle?.(task.id, !task.completed)}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && <Check size={14} />}
      </button>

      <div className="task-body">
        <div className={`task-title ${task.completed ? 'completed' : ''}`}>
          {task.title}
        </div>
        <div className="task-meta">
          {deadlineStr && (
            <span className={`task-badge deadline ${isOverdue ? '' : ''}`}>
              <Clock size={11} />
              {deadlineStr}
            </span>
          )}
          {task.className && (
            <span className="task-badge class-name">{task.className}</span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {onDelete && (
          <button
            className="btn-icon"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
