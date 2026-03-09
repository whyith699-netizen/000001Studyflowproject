import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase-config';
import { tasksService } from '../services/firestore-service';
import { syncTaskDeadlineReminders } from '../services/notification-service';

const MobileReminderSync = () => {
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let unsubscribeTasks = () => {};

    const queueSync = (tasks, userId) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        syncTaskDeadlineReminders(tasks, userId).catch((error) => {
          console.error('Deadline reminder sync failed:', error);
        });
      }, 300);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeTasks();

      if (!user) {
        return;
      }

      unsubscribeTasks = tasksService.subscribeToTasks((tasks) => {
        queueSync(tasks, user.uid);
      });
    });

    return () => {
      unsubscribeTasks();
      unsubscribeAuth();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return null;
};

export default MobileReminderSync;
