
import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase-config';

const TasksView = () => {
    const user = auth.currentUser;
    const [snapshot, loading, error] = useCollection(
        user ? query(collection(db, 'users', user.uid, 'tasks'), orderBy('updatedAt', 'desc')) : null
    );

    const toggleTask = async (task) => {
        if (!user) return;
        await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), {
            completed: !task.completed,
            updatedAt: new Date()
        });
    };

    const deleteTask = async (taskId) => {
         if (!user) return;
         if (window.confirm('Delete this task?')) {
             await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
         }
    };

    if (loading) return <div>Loading tasks...</div>;
    if (error) return <div>Error loading tasks: {error.message}</div>;

    const tasks = snapshot ? snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">My Tasks</h2>
            
            {tasks.length === 0 ? (
                <p className="text-gray-500">No tasks found. Add some from the extension!</p>
            ) : (
                <ul className="space-y-3">
                    {tasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100 transition">
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={task.completed || false} 
                                    onChange={() => toggleTask(task)}
                                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className={`${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    {task.title || task.text || "Untitled Task"}
                                </span>
                            </div>
                            <button 
                                onClick={() => deleteTask(task.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TasksView;
