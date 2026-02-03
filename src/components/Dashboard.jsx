import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useNavigate } from 'react-router-dom';
import TasksView from './TasksView';
import ClassesView from './ClassesView';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'classes'

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex-shrink-0 hidden md:block relative">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <span className="text-3xl">📚</span> Study Flow
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'tasks' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span>✨</span> Tasks
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'classes' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span>🏫</span> Classes
          </button>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t bg-gray-50">
           <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {user?.displayName?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
           </div>
           <button 
             onClick={handleLogout}
             className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
           >
             Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm md:hidden p-4 flex justify-between items-center z-10">
           <h1 className="text-xl font-bold text-blue-600">Study Flow</h1>
           <button onClick={handleLogout} className="text-sm text-red-600">Logout</button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">
                        {activeTab === 'tasks' ? 'Your Tasks' : 'Class Schedule'}
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Manage your {activeTab} synced from your extension.
                    </p>
                </div>

                {/* Mobile Tabs */}
                <div className="md:hidden flex space-x-1 bg-white p-1 rounded-xl shadow mb-6">
                    <button 
                        onClick={() => setActiveTab('tasks')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'tasks' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                    >
                        Tasks
                    </button>
                    <button 
                        onClick={() => setActiveTab('classes')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'classes' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                    >
                        Classes
                    </button>
                </div>

                {activeTab === 'tasks' ? <TasksView /> : <ClassesView />}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

