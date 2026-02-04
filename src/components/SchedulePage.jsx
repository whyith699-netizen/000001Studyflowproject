import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { examsService } from '../services/firestore-service';
import Sidebar from './Sidebar';

const SchedulePage = () => {
  const user = auth.currentUser;
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', subject: '', date: '', time: '' });

  useEffect(() => {
    const unsubscribe = examsService.subscribeToExams((fetchedExams) => {
      setExams(fetchedExams.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!newExam.title.trim() || !newExam.date) return;
    
    try {
      await examsService.addExam(newExam);
      setNewExam({ title: '', subject: '', date: '', time: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add exam:', error);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await examsService.deleteExam(examId);
    } catch (error) {
      console.error('Failed to delete exam:', error);
    }
  };

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

  const upcomingExams = exams.filter(e => getDaysUntil(e.date) >= 0);
  const pastExams = exams.filter(e => getDaysUntil(e.date) < 0);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      <Sidebar user={user} />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 md:px-10 md:py-10 flex flex-col gap-6">
          {/* Header */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-gray-900 text-2xl font-bold">Schedule</h1>
                <p className="text-gray-500 text-sm mt-1">Track your exams and important dates</p>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                <i className="fas fa-plus"></i>
                Add Exam
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upcoming Exams */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <i className="fas fa-calendar-alt text-blue-600"></i>
                  <h2 className="text-sm font-semibold text-gray-900">Upcoming Exams</h2>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : upcomingExams.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <i className="fas fa-calendar-check text-4xl mb-3 opacity-40"></i>
                    <p className="text-sm">No upcoming exams</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {upcomingExams.map((exam) => {
                      const daysUntil = getDaysUntil(exam.date);
                      return (
                        <div 
                          key={exam.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-xl border border-gray-100 text-center shrink-0">
                            <span className="text-xs font-bold text-red-500 uppercase">
                              {new Date(exam.date).toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span className="text-xl font-bold text-gray-800 leading-none">
                              {new Date(exam.date).getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 font-semibold truncate">{exam.title}</p>
                            <p className="text-gray-500 text-xs">
                              {exam.subject && `${exam.subject} • `}{exam.time || 'No time set'}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getUrgencyColor(daysUntil)}`}>
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          </span>
                          <button 
                            onClick={() => handleDeleteExam(exam.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <i className="fas fa-trash-alt text-red-500 text-sm"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past Exams */}
              {pastExams.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mt-6">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                    <i className="fas fa-history text-gray-400"></i>
                    <h2 className="text-sm font-semibold text-gray-500">Past Exams</h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {pastExams.slice(0, 5).map((exam) => (
                      <div key={exam.id} className="flex items-center gap-4 p-2 opacity-50">
                        <div className="flex flex-col items-center w-10 text-center">
                          <span className="text-xs text-gray-400">
                            {new Date(exam.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-sm font-bold text-gray-400">
                            {new Date(exam.date).getDate()}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm line-through truncate">{exam.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <i className="fas fa-chart-pie text-purple-500"></i>
                  <h3 className="text-sm font-semibold text-gray-900">Quick Stats</h3>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Total Exams</span>
                    <span className="text-xl font-bold text-gray-800">{exams.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Upcoming</span>
                    <span className="text-xl font-bold text-blue-600">{upcomingExams.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">This Week</span>
                    <span className="text-xl font-bold text-orange-500">
                      {exams.filter(e => getDaysUntil(e.date) >= 0 && getDaysUntil(e.date) <= 7).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Exam Countdown */}
              {upcomingExams.length > 0 && (
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 shadow-sm text-white">
                  <p className="text-xs font-medium text-blue-100 uppercase tracking-wider mb-2">Next Exam</p>
                  <h3 className="text-lg font-bold mb-1">{upcomingExams[0].title}</h3>
                  <p className="text-blue-100 text-sm mb-4">
                    {new Date(upcomingExams[0].date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="text-3xl font-black">
                    {getDaysUntil(upcomingExams[0].date) === 0 ? 'Today!' : 
                     getDaysUntil(upcomingExams[0].date) === 1 ? 'Tomorrow' :
                     `${getDaysUntil(upcomingExams[0].date)} days left`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add New Exam</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <i className="fas fa-times text-gray-400"></i>
              </button>
            </div>
            <form onSubmit={handleAddExam} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Exam Title</label>
                <input
                  type="text"
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  placeholder="e.g., Calculus Midterm"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Subject</label>
                <input
                  type="text"
                  value={newExam.subject}
                  onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Date</label>
                  <input
                    type="date"
                    value={newExam.date}
                    onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Time</label>
                  <input
                    type="time"
                    value={newExam.time}
                    onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
