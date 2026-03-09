import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { TimerProvider } from './contexts/TimerContext';
import { SidebarCollapseProvider } from './contexts/SidebarCollapseContext';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FocusMode from './components/FocusMode';
import CoursesPage from './components/CoursesPage';
import TasksPage from './components/TasksPage';
import SchedulePage from './components/SchedulePage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import CalendarPage from './components/CalendarPage';
import NotesPage from './components/NotesPage';
import PrivateRoute from './components/PrivateRoute';
import MobileReminderSync from './components/MobileReminderSync';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { isNativePlatform, isNotesFeatureEnabled } from './config/featureFlags';

const normalizeRouterBase = (baseUrl) => {
  if (!baseUrl || baseUrl === './' || baseUrl === '/') return '/';

  let normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized || '/';
};

const basename = isNativePlatform ? '/' : normalizeRouterBase(import.meta.env.BASE_URL);

function App() {
  return (
    <LanguageProvider>
      <DarkModeProvider>
        <TimerProvider>
          <SidebarCollapseProvider>
            <ConfirmDialogProvider>
              <MobileReminderSync />
              <BrowserRouter basename={basename}>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/focus"
                    element={
                      <PrivateRoute>
                        <FocusMode />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/courses"
                    element={
                      <PrivateRoute>
                        <CoursesPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <PrivateRoute>
                        <TasksPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/schedule"
                    element={
                      <PrivateRoute>
                        <SchedulePage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <PrivateRoute>
                        <CalendarPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PrivateRoute>
                        <ReportsPage />
                      </PrivateRoute>
                    }
                  />
                  {isNotesFeatureEnabled ? (
                    <Route
                      path="/notes"
                      element={
                        <PrivateRoute>
                          <NotesPage />
                        </PrivateRoute>
                      }
                    />
                  ) : (
                    <Route path="/notes" element={<Navigate to="/dashboard" replace />} />
                  )}
                  <Route
                    path="/settings"
                    element={
                      <PrivateRoute>
                        <SettingsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                {/* Chatbot Widget - Available on all authenticated pages */}
                <ChatbotWidget />
              </BrowserRouter>
            </ConfirmDialogProvider>
          </SidebarCollapseProvider>
        </TimerProvider>
      </DarkModeProvider>
    </LanguageProvider>
  );
}

export default App;
