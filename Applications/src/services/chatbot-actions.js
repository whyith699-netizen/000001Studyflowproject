/**
 * Chatbot Actions Service
 * Parses structured JSON actions from AI responses and executes them.
 */

import {
  tasksService,
  classesService,
  calendarEventsService,
  userService,
} from './firestore-service';

export const ACTION_TYPES = {
  ADD_TASK: 'add_task',
  UPDATE_TASK: 'update_task',
  COMPLETE_TASK: 'complete_task',
  DELETE_TASK: 'delete_task',
  ADD_CLASS: 'add_class',
  ADD_EVENT: 'add_event',
  START_POMODORO_TIMER: 'start_pomodoro_timer',
};

export const ACTION_STATUS = {
  PENDING: 'pending',
  EXECUTING: 'executing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const ACTION_META = {
  [ACTION_TYPES.ADD_TASK]: {
    label: 'Add Task',
    icon: 'T',
    color: 'blue',
    description: 'Add a new task to the task list',
  },
  [ACTION_TYPES.UPDATE_TASK]: {
    label: 'Update Task',
    icon: 'U',
    color: 'amber',
    description: 'Update an existing task',
  },
  [ACTION_TYPES.COMPLETE_TASK]: {
    label: 'Complete Task',
    icon: 'C',
    color: 'green',
    description: 'Mark a task as complete',
  },
  [ACTION_TYPES.DELETE_TASK]: {
    label: 'Delete Task',
    icon: 'D',
    color: 'red',
    description: 'Delete a task from the list',
  },
  [ACTION_TYPES.ADD_CLASS]: {
    label: 'Add Class',
    icon: 'CL',
    color: 'purple',
    description: 'Add a new class or subject',
  },
  [ACTION_TYPES.ADD_EVENT]: {
    label: 'Add Event',
    icon: 'E',
    color: 'teal',
    description: 'Add a new event to the calendar',
  },
  [ACTION_TYPES.START_POMODORO_TIMER]: {
    label: 'Start Timer',
    icon: 'T',
    color: 'indigo',
    description: 'Start focus timer - auto-starts after confirmation',
  },
};

const toIsoDate = (input) => {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
};

const normalizeRelativeDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (text === 'today' || text === 'hari ini') return toIsoDate(base);
  if (text === 'tomorrow' || text === 'besok') {
    base.setDate(base.getDate() + 1);
    return toIsoDate(base);
  }
  if (text === 'lusa' || text === 'day after tomorrow') {
    base.setDate(base.getDate() + 2);
    return toIsoDate(base);
  }

  return toIsoDate(text);
};

/**
 * Try to extract a structured action JSON from AI response text.
 * @param {string} responseText
 * @returns {{ hasAction: boolean, action?: object, cleanResponse?: string }}
 */
export function parseActionFromResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return { hasAction: false };
  }

  const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/i;
  const hiddenJsonRegex = /<!--ACTION_JSON\s*(\{[\s\S]*?\})\s*-->/i;
  const rawJsonRegex = /(\{"action"\s*:\s*"[^"]+?"[\s\S]*?\})/;

  let jsonStr = null;
  let match = responseText.match(jsonBlockRegex);
  if (match) jsonStr = match[1];

  if (!jsonStr) {
    match = responseText.match(hiddenJsonRegex);
    if (match) jsonStr = match[1];
  }

  if (!jsonStr) {
    match = responseText.match(rawJsonRegex);
    if (match) jsonStr = match[1];
  }

  if (!jsonStr) {
    return { hasAction: false };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const cleanResponse = responseText
      .replace(jsonBlockRegex, '')
      .replace(hiddenJsonRegex, '')
      .replace(rawJsonRegex, '')
      .trim();

    if (!parsed.action || !ACTION_META[parsed.action]) {
      return {
        hasAction: false,
        cleanResponse: cleanResponse || '',
      };
    }

    return {
      hasAction: true,
      action: {
        type: parsed.action,
        params: parsed.params || {},
        confirmationMessage: parsed.confirmationMessage || parsed.confirmation_message || '',
        meta: ACTION_META[parsed.action],
      },
      cleanResponse: cleanResponse || parsed.confirmationMessage || '',
    };
  } catch {
    return { hasAction: false };
  }
}

/**
 * Execute a confirmed action.
 * @param {object} actionData - { type, params }
 * @returns {Promise<{ success: boolean, result?: object, error?: string, message?: string }>}
 */
export async function executeAction(actionData) {
  const { type, params } = actionData;

  try {
    switch (type) {
      case ACTION_TYPES.ADD_TASK:
        return await executeAddTask(params);
      case ACTION_TYPES.UPDATE_TASK:
        return await executeUpdateTask(params);
      case ACTION_TYPES.COMPLETE_TASK:
        return await executeCompleteTask(params);
      case ACTION_TYPES.DELETE_TASK:
        return await executeDeleteTask(params);
      case ACTION_TYPES.ADD_CLASS:
        return await executeAddClass(params);
      case ACTION_TYPES.ADD_EVENT:
        return await executeAddEvent(params);
      case ACTION_TYPES.START_POMODORO_TIMER:
        return await executeStartPomodoroTimer(params);
      default:
        return { success: false, error: `Unknown action type: ${type}` };
    }
  } catch (error) {
    console.error(`[chatbot-actions] Failed to execute ${type}:`, error);
    return { success: false, error: error.message || 'Failed to execute action' };
  }
}

async function executeAddTask(params) {
  const taskData = {
    title: params.title || params.text,
    text: params.title || params.text,
    type: params.type || 'individual',
    classId: params.classId || null,
    className: params.className || null,
    priority: params.priority || 'medium',
    dueDate: params.dueDate || params.deadline || null,
    description: params.description || '',
    links: Array.isArray(params.links) ? params.links : [],
    files: [],
  };

  if (!taskData.title) {
    return { success: false, error: 'Task title is required' };
  }

  const result = await tasksService.addTask(taskData);
  return {
    success: true,
    result,
    message: `Task "${taskData.title}" added successfully!`,
  };
}

async function executeUpdateTask(params) {
  if (!params.taskId) {
    return { success: false, error: 'Task ID is required for update' };
  }

  const updates = {};
  if (params.title) updates.title = params.title;
  if (params.text) updates.text = params.text;
  if (params.priority) updates.priority = params.priority;
  if (params.dueDate) updates.dueDate = params.dueDate;
  if (params.description !== undefined) updates.description = params.description;

  const result = await tasksService.updateTask(params.taskId, updates);
  return {
    success: true,
    result,
    message: 'Task updated successfully!',
  };
}

async function executeCompleteTask(params) {
  if (!params.taskId) {
    return { success: false, error: 'Task ID is required' };
  }

  await tasksService.toggleTask(params.taskId, true);
  return {
    success: true,
    message: 'Task marked as complete!',
  };
}

async function executeDeleteTask(params) {
  if (!params.taskId) {
    return { success: false, error: 'Task ID is required' };
  }

  await tasksService.deleteTask(params.taskId);
  return {
    success: true,
    message: 'Task deleted successfully!',
  };
}

async function executeAddClass(params) {
  const classData = {
    name: params.name || params.title,
    icon: params.icon || '',
    color: params.color || '#4F46E5',
    days: Array.isArray(params.days) ? params.days : [],
    time: params.time || '',
    room: params.room || '',
    schedules: Array.isArray(params.schedules) ? params.schedules : [],
    links: Array.isArray(params.links) ? params.links : [],
  };

  if (!classData.name) {
    return { success: false, error: 'Class name is required' };
  }

  const result = await classesService.addClass(classData);
  return {
    success: true,
    result,
    message: `Class "${classData.name}" added successfully!`,
  };
}

async function executeAddEvent(params) {
  const resolvedDate = normalizeRelativeDate(
    params.date || params.startDate || params.when || params.day,
  );
  const resolvedEndDate = normalizeRelativeDate(params.endDate || params.until);

  const eventData = {
    title: params.title || params.name,
    date: resolvedDate || '',
    endDate: resolvedEndDate || null,
    time: params.time || '',
    description: params.description || '',
  };

  if (!eventData.title) {
    return { success: false, error: 'Event title is required' };
  }
  if (!eventData.date) {
    return { success: false, error: 'Event date is required (YYYY-MM-DD)' };
  }

  const result = await calendarEventsService.addEvent(eventData);
  return {
    success: true,
    result,
    message: `Event "${eventData.title}" added to calendar successfully!`,
  };
}

async function executeStartPomodoroTimer(params) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Timer control is not available in this environment' };
  }

  window.dispatchEvent(
    new CustomEvent('studyflow:chatbot:start-pomodoro', {
      detail: {
        source: 'chatbot',
        requestedAt: new Date().toISOString(),
        ...params,
      },
    }),
  );

  return {
    success: true,
    message: 'Focus timer started! Your session is now running.',
  };
}

/**
 * Format action params for confirmation card.
 * @param {string} actionType
 * @param {object} params
 * @returns {Array<{ label: string, value: string }>}
 */
export function formatActionParams(actionType, params) {
  const details = [];

  switch (actionType) {
    case ACTION_TYPES.ADD_TASK:
      if (params.title || params.text) details.push({ label: 'Title', value: params.title || params.text });
      if (params.type) details.push({ label: 'Type', value: params.type });
      if (params.priority) details.push({ label: 'Priority', value: params.priority });
      if (params.dueDate || params.deadline) details.push({ label: 'Deadline', value: params.dueDate || params.deadline });
      if (params.className) details.push({ label: 'Class', value: params.className });
      if (params.description) details.push({ label: 'Description', value: params.description });
      // Show links count or individual links
      if (params.links && Array.isArray(params.links)) {
        if (params.links.length > 0) {
          details.push({ label: 'Links', value: `${params.links.length} link(s)` });
        }
      }
      // Show files count or individual files
      if (params.files && Array.isArray(params.files)) {
        if (params.files.length > 0) {
          details.push({ label: 'Files', value: `${params.files.length} file(s)` });
        }
      }
      break;
    case ACTION_TYPES.UPDATE_TASK:
      if (params.taskId) details.push({ label: 'Task ID', value: params.taskId });
      if (params.title || params.text) details.push({ label: 'Title', value: params.title || params.text });
      if (params.type) details.push({ label: 'Type', value: params.type });
      if (params.priority) details.push({ label: 'Priority', value: params.priority });
      if (params.dueDate) details.push({ label: 'Deadline', value: params.dueDate });
      if (params.description) details.push({ label: 'Description', value: params.description });
      if (params.links && Array.isArray(params.links) && params.links.length > 0) {
        details.push({ label: 'Links', value: `${params.links.length} link(s)` });
      }
      if (params.files && Array.isArray(params.files) && params.files.length > 0) {
        details.push({ label: 'Files', value: `${params.files.length} file(s)` });
      }
      break;
    case ACTION_TYPES.ADD_CLASS:
      if (params.name || params.title) details.push({ label: 'Name', value: params.name || params.title, editable: true });
      if (params.icon) details.push({ label: 'Icon', value: params.icon, editable: true });
      if (params.color) details.push({ label: 'Color', value: params.color, editable: true });
      if (params.days && Array.isArray(params.days)) details.push({ label: 'Days', value: params.days.join(', '), editable: true });
      if (params.time) details.push({ label: 'Time', value: params.time, editable: true });
      if (params.room) details.push({ label: 'Room', value: params.room, editable: true });
      if (params.schedules && Array.isArray(params.schedules)) details.push({ label: 'Schedules', value: `${params.schedules.length} schedule(s)`, editable: true });
      if (params.links && Array.isArray(params.links) && params.links.length > 0) {
        details.push({ label: 'Links', value: `${params.links.length} link(s)`, editable: true });
      }
      break;
    case ACTION_TYPES.ADD_EVENT:
      if (params.title || params.name) details.push({ label: 'Title', value: params.title || params.name });
      if (params.date || params.startDate || params.when) {
        details.push({ label: 'Date', value: params.date || params.startDate || params.when });
      }
      if (params.endDate || params.until) details.push({ label: 'End', value: params.endDate || params.until });
      if (params.time) details.push({ label: 'Time', value: params.time });
      if (params.description) details.push({ label: 'Description', value: params.description });
      break;
    case ACTION_TYPES.START_POMODORO_TIMER:
      details.push({ label: 'Mode', value: 'Focus Timer' });
      if (params.duration) details.push({ label: 'Duration', value: `${params.duration} minutes` });
      break;
    case ACTION_TYPES.COMPLETE_TASK:
    case ACTION_TYPES.DELETE_TASK:
      if (params.taskId) details.push({ label: 'Task ID', value: params.taskId });
      if (params.title) details.push({ label: 'Title', value: params.title });
      break;
    default:
      Object.entries(params).forEach(([key, value]) => {
        if (value && typeof value !== 'object') {
          details.push({ label: key, value: String(value) });
        } else if (Array.isArray(value) && value.length > 0) {
          details.push({ label: key, value: `${value.length} item(s)` });
        }
      });
  }

  return details;
}

export default {
  parseActionFromResponse,
  executeAction,
  formatActionParams,
  ACTION_TYPES,
  ACTION_STATUS,
  ACTION_META,
};
