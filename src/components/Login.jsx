
import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
