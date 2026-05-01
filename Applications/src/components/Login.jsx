import React, { useState, useEffect } from "react";
import {
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { auth } from "../firebase-config";
import { userService } from "../services/firestore-service";
import { useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LanguageContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import studyFlowLogo from "../assets/StudyFlow_logo.jpg";

const Login = () => {
  const { t } = useLang();
  const { isDarkMode } = useDarkMode();
  const isNativePlatform = Capacitor.isNativePlatform();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isNativePlatform) {
      SocialLogin.initialize({
        google: {
          webClientId:
            "912149378367-lei8llrsc6p5b08b1ltih3bbl8krk33u.apps.googleusercontent.com",
        },
      }).catch((err) => {
        console.error("SocialLogin init error:", err);
      });
    }
  }, [isNativePlatform]);

  const syncProfile = async (firebaseUser) => {
    const fallbackDisplayName =
      firebaseUser.email?.split("@")[0] || "StudyFlow User";
    try {
      await userService.updateProfile({
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || fallbackDisplayName,
        photoURL: firebaseUser.photoURL || null,
        lastLogin: new Date().toISOString(),
      });
    } catch (profileError) {
      console.error("Profile sync failed after login:", profileError);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      if (!normalizedIdentifier || !password) {
        setError("Please fill username/email and password.");
        return;
      }
      if (!normalizedIdentifier.includes("@")) {
        setError("Username login is not available yet. Please use email.");
        return;
      }

      const result = await signInWithEmailAndPassword(
        auth,
        normalizedIdentifier,
        password,
      );
      await syncProfile(result.user);
    } catch (err) {
      console.error("Email login failed:", err);
      const messages = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email format.",
        "auth/too-many-requests": "Too many failed attempts. Try again later.",
      };
      setError(messages[err.code] || err.message || "Failed to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      let result;

      if (isNativePlatform) {
        const response = await SocialLogin.login({
          provider: "google",
          options: {},
        });

        const idToken = response?.result?.idToken;
        if (!idToken) {
          throw new Error("Gagal mendapatkan token dari Google. Coba lagi.");
        }

        const credential = GoogleAuthProvider.credential(idToken);
        result = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        result = await signInWithPopup(auth, provider);
      }

      await syncProfile(result.user);
    } catch (err) {
      console.error("Login failed:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);

      let errorMessage = "Failed to login with Google. ";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage += "Login popup was closed.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage += "Popup blocked by browser. Please allow popups.";
      } else if (err.code === "auth/unauthorized-domain") {
        errorMessage +=
          "This domain is not authorized. Please add it to Firebase Console.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage += "Google Sign-In is not enabled in Firebase Console.";
      } else if (err.message?.includes("Gagal")) {
        errorMessage = err.message;
      } else {
        errorMessage += err.message || "Please try again.";
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "sf-dark-shell" : "bg-gray-50"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className={isDarkMode ? "sf-dark-muted" : "text-gray-500"}>
            Checking login status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${
        isDarkMode ? "sf-dark-shell" : "bg-gray-50"
      }`}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div
            className={`w-full max-w-[8.5rem] sm:max-w-[9.5rem] rounded-3xl p-2 shadow-lg ${
              isDarkMode
                ? "bg-white/95 shadow-blue-500/20 ring-1 ring-white/10"
                : "bg-white shadow-blue-600/15"
            }`}
          >
            <img
              src={studyFlowLogo}
              alt="Logo Study Flow dengan tanda centang panah biru dan topi wisuda"
              width="1280"
              height="698"
              className="block h-auto w-full object-contain"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>
        <h2
          className={`text-center text-3xl font-extrabold ${
            isDarkMode ? "sf-dark-text" : "text-gray-900"
          }`}
        >
          Study Flow
        </h2>
        <p
          className={`mt-2 text-center text-sm ${
            isDarkMode ? "sf-dark-muted" : "text-gray-600"
          }`}
        >
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className={`py-8 px-4 shadow sm:rounded-lg sm:px-10 border ${
            isDarkMode
              ? "sf-dark-card sf-dark-border"
              : "bg-white border-transparent"
          }`}
        >
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-5">
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                  isDarkMode ? "sf-dark-muted" : "text-gray-500"
                }`}
              >
                {t("usernameOrEmail")}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm ${
                  isDarkMode
                    ? "sf-dark-elevated sf-dark-border sf-dark-text placeholder:text-slate-500"
                    : "border-gray-300"
                }`}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                  isDarkMode ? "sf-dark-muted" : "text-gray-500"
                }`}
              >
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm ${
                    isDarkMode
                      ? "sf-dark-elevated sf-dark-border sf-dark-text placeholder:text-slate-500"
                      : "border-gray-300"
                  }`}
                  placeholder="********"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode
                      ? "text-slate-500 hover:text-slate-300"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <i
                    className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                  ></i>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-2 py-3 px-4 border rounded-lg shadow-sm text-sm font-medium transition-colors disabled:opacity-60 ${
                isDarkMode
                  ? "sf-accent-btn"
                  : "border-transparent text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-700"
              }`}
            >
              {isSubmitting && <i className="fas fa-spinner fa-spin"></i>}
              {t("signIn")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div
              className={`flex-1 h-px ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`}
            ></div>
            <span
              className={`text-[10px] uppercase tracking-wider ${
                isDarkMode ? "sf-dark-muted" : "text-gray-400"
              }`}
            >
              or
            </span>
            <div
              className={`flex-1 h-px ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`}
            ></div>
          </div>

          <div>
            <button
              onClick={handleLogin}
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-3 py-3 px-4 border rounded-lg shadow-sm text-sm font-medium transition-colors disabled:opacity-60 ${
                isDarkMode
                  ? "sf-accent-btn"
                  : "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("signInWithGoogle")}
            </button>
          </div>

          <div className="mt-6">
            <p
              className={`text-center text-xs ${
                isDarkMode ? "sf-dark-muted" : "text-gray-500"
              }`}
            >
              By signing in, you agree to sync your study data across devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
