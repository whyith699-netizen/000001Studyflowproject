import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase-config';
import { useLang } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import EditClassPage from './EditClassPage';
import ClassDetailModal from './ClassDetailModal';

const ClassesView = () => {
    const user = auth.currentUser;
    const { t } = useLang();
    const { confirm } = useConfirm();
    const [snapshot, loading, error] = useCollection(
        user ? query(collection(db, 'users', user.uid, 'classes'), orderBy('updatedAt', 'desc')) : null
    );

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);

    const deleteClass = async (classId) => {
         if (!user) return;
         const accepted = await confirm({
             title: t('deleteClass'),
             message: t('deleteConfirmClass'),
             confirmText: t('delete'),
             cancelText: t('cancel'),
             variant: 'danger',
         });
         if (!accepted) return;
         await deleteDoc(doc(db, 'users', user.uid, 'classes', classId));
    };

    const editClass = async (classId, updatedData) => {
        if (!user) return;
        try {
            const classRef = doc(db, 'users', user.uid, 'classes', classId);
            await updateDoc(classRef, {
                ...updatedData,
                updatedAt: new Date().toISOString(),
            });
            setShowEditModal(false);
        } catch (error) {
            console.error('Error updating class:', error);
            alert('Failed to update class: ' + error.message);
        }
    };

    const handleViewDetail = (cls) => {
        setSelectedClass(cls);
        setShowDetailModal(true);
    };

    const handleEditClass = (cls) => {
        setSelectedClass(cls);
        setShowEditModal(true);
    };

    if (loading) return <div className="text-gray-900 dark:text-slate-100">Loading classes...</div>;
    if (error) return <div className="text-gray-900 dark:text-slate-100">Error loading classes: {error.message}</div>;

    const classes = snapshot ? snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    const tasks = []; // You can add tasks collection if needed for ClassDetailModal

    return (
        <>
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('myClasses') || 'My Classes'}</h2>

                {classes.length === 0 ? (
                    <p className="text-gray-500">{t('noClassesFound') || 'No classes found. Add some from the extension!'}</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {classes.map(cls => (
                            <div key={cls.id} className="p-4 border rounded-lg hover:shadow-md transition bg-gradient-to-br from-white to-gray-50 cursor-pointer"
                                 onClick={() => handleViewDetail(cls)}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center text-lg">
                                            <i className={`fas ${cls.icon?.startsWith('fa-') ? cls.icon : 'fa-' + cls.icon || 'fa-graduation-cap'}`}></i>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-blue-600">{cls.name || "Untitled Class"}</h3>
                                            <p className="text-sm text-gray-600">{cls.schedule || cls.time || "No schedule"}</p>
                                        </div>
                                    </div>
                                </div>
                                {cls.room && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        <i className="fas fa-map-marker-alt mr-1"></i>{cls.room}
                                    </p>
                                )}
                                <div className="mt-4 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleEditClass(cls)}
                                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <i className="fas fa-edit mr-1"></i>{t('edit')}
                                    </button>
                                    <button
                                        onClick={() => deleteClass(cls.id)}
                                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        <i className="fas fa-trash mr-1"></i>{t('delete')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Class Modal */}
            {showEditModal && selectedClass && (
                <EditClassPage
                    cls={selectedClass}
                    isOpen={showEditModal}
                    onClose={() => { setShowEditModal(false); setSelectedClass(null); }}
                    onSubmit={(data) => editClass(selectedClass.id, data)}
                    isSubmitting={false}
                    isDarkMode={false}
                />
            )}

            {/* Class Detail Modal */}
            {showDetailModal && selectedClass && (
                <ClassDetailModal
                    cls={selectedClass}
                    tasks={tasks}
                    isOpen={showDetailModal}
                    onClose={() => { setShowDetailModal(false); setSelectedClass(null); }}
                    onEdit={handleEditClass}
                    onDelete={async (id) => {
                        await deleteClass(id);
                        setShowDetailModal(false);
                        setSelectedClass(null);
                    }}
                    onTaskClick={(task) => console.log('Task clicked:', task)}
                    isDarkMode={false}
                />
            )}
        </>
    );
};

export default ClassesView;
