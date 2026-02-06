import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DarkModeProvider } from './contexts/DarkModeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FocusMode from './components/FocusMode';
import CoursesPage from './components/CoursesPage';
import SchedulePage from './components/SchedulePage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter basename="/StudyFlowDasboarduser">
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
            path="/schedule" 
            element={
              <PrivateRoute>
                <SchedulePage />
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
      </BrowserRouter>
    </DarkModeProvider>
  );
}

export default App;
