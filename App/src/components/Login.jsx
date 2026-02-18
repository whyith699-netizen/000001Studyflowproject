import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // User is not signed in
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      // Add prompt to select account
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      // Navigation will be handled by onAuthStateChanged
    } catch (err) {
      console.error("Login failed:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      // More descriptive error messages
      let errorMessage = "Failed to login with Google. ";
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage += "Login popup was closed.";
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage += "Popup blocked by browser. Please allow popups.";
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage += "This domain is not authorized. Please add it to Firebase Console.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage += "Google Sign-In is not enabled in Firebase Console.";
      } else {
        errorMessage += err.message || "Please try again.";
      }
      
      setError(errorMessage);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Checking login status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <span className="material-symbols-outlined text-white text-4xl">school</span>
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Study Flow
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleLogin}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
          
          <div className="mt-6">
            <p className="text-center text-xs text-gray-500">
              By signing in, you agree to sync your study data across devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
