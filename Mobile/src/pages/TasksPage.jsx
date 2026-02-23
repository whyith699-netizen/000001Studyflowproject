import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tasksService, classesService } from '../services/firestore-service';
import TaskCard from '../components/TaskCard';
import FAB from '../components/FAB';
import Modal from '../components/Modal';
import { SkeletonCard } from '../components/Skeleton';
import { Inbox } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', deadline: '', priority: 'medium', classId: '', className: '', status: 'todo'
  });

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(tasksService.subscribeToTasks((t) => {
      setTasks(t);
      setLoading(false);
    }));
    unsubs.push(classesService.subscribeToClasses((c) => setClasses(c)));
    return () => unsubs.forEach((fn) => fn());
  }, [user]);

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'done') return t.completed;
    if (filter === 'todo') return !t.completed && t.status !== 'in-progress';
    if (filter === 'in-progress') return t.status === 'in-progress';
    return true;
  });

  const handleToggle = async (taskId, completed) => {
    try { await tasksService.toggleTask(taskId, completed); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (taskId) => {
    try { await tasksService.deleteTask(taskId); }
    catch (err) { console.error(err); }
  };

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    try {
      await tasksService.addTask(newTask);
      setNewTask({ title: '', deadline: '', priority: 'medium', classId: '', className: '', status: 'todo' });
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">{tasks.filter(t => !t.completed).length} pending · {tasks.filter(t => t.completed).length} completed</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <SkeletonCard count={5} />
      ) : filtered.length > 0 ? (
        <div className="item-list">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Inbox size={48} />
          <h3>No tasks here</h3>
          <p>Tap + to add a new task</p>
        </div>
      )}

      <FAB onClick={() => setShowModal(true)} />

      {/* Add Task Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Task">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            placeholder="e.g. Finish Math homework"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Deadline</label>
          <input
            className="form-input"
            type="datetime-local"
            value={newTask.deadline}
            onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Priority</label>
          <select
            className="form-select"
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Class (optional)</label>
          <select
            className="form-select"
            value={newTask.classId}
            onChange={(e) => {
              const cls = classes.find(c => c.id === e.target.value);
              setNewTask({
                ...newTask,
                classId: e.target.value,
                className: cls ? (cls.name || cls.className) : ''
              });
            }}
          >
            <option value="">No class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name || cls.className}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary btn-full mt-16" onClick={handleAdd}>
          Add Task
        </button>
      </Modal>
    </div>
  );
}
