import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [error, setError] = useState('');

  const mapFirebaseError = (err) => {
    if (!err?.code) return 'Google sign-in failed. Please try again.';
    if (err.code === 'auth/unauthorized-domain') {
      return `Domain belum diizinkan di Firebase Auth. Tambahkan "${window.location.hostname}" pada Authorized domains.`;
    }
    if (err.code === 'auth/operation-not-supported-in-this-environment') {
      return 'Metode login ini tidak didukung di environment saat ini.';
    }
    if (err.code === 'auth/web-storage-unsupported') {
      return 'Browser/WebView memblokir storage untuk login Firebase.';
    }
    if (err.code === 'auth/popup-closed-by-user') {
      return 'Login dibatalkan sebelum selesai.';
    }
    return `Login gagal (${err.code}).`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSignIn = async () => {
    setError('');
    try {
      await signIn();
    } catch (err) {
      setError(mapFirebaseError(err));
    }
  };

  return (
    <div className="login-page">
      <div className="login-logo">SF</div>
      <h1 className="login-title">StudyFlow</h1>
      <p className="login-subtitle">Your personal study companion</p>

      <button className="login-btn" onClick={handleSignIn}>
        <img 
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
          alt="Google"
        />
        Continue with Google
      </button>
      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
