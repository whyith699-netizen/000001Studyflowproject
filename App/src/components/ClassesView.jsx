
import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase-config';

const ClassesView = () => {
    const user = auth.currentUser;
    const [snapshot, loading, error] = useCollection(
        user ? query(collection(db, 'users', user.uid, 'classes'), orderBy('updatedAt', 'desc')) : null
    );

    const deleteClass = async (classId) => {
         if (!user) return;
         if (window.confirm('Delete this class?')) {
             await deleteDoc(doc(db, 'users', user.uid, 'classes', classId));
         }
    };

    if (loading) return <div>Loading classes...</div>;
    if (error) return <div>Error loading classes: {error.message}</div>;

    const classes = snapshot ? snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">My Classes</h2>
            
            {classes.length === 0 ? (
                <p className="text-gray-500">No classes found. Add some from the extension!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.map(cls => (
                        <div key={cls.id} className="p-4 border rounded-lg hover:shadow-md transition bg-gradient-to-br from-white to-gray-50">
                            <h3 className="text-lg font-bold text-blue-600">{cls.name || "Untitled Class"}</h3>
                            <p className="text-sm text-gray-600">{cls.schedule || cls.time || "No schedule"}</p>
                            <p className="text-sm text-gray-500 mt-1">{cls.location || cls.room}</p>
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={() => deleteClass(cls.id)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClassesView;
