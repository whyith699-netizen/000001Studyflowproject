import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LanguageContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import studyFlowLogo from "../assets/StudyFlow_logo.jpg";

const Login = () => {
  const { t } = useLang();
  const { isDarkMode } = useDarkMode();
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('studyflow_token');
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering 
      ? { email, password, displayName }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('studyflow_token', data.token);
      localStorage.setItem('studyflow_user', JSON.stringify(data.user));

      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (err) {
      console.error("Auth failed:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${isDarkMode ? "sf-dark-shell" : "bg-gray-50"}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className={`w-full max-w-[8.5rem] sm:max-w-[9.5rem] rounded-3xl p-2 shadow-lg ${isDarkMode ? "bg-white/95 shadow-blue-500/20 ring-1 ring-white/10" : "bg-white shadow-blue-600/15"}`}>
            <img src={studyFlowLogo} alt="Logo Study Flow" className="block h-auto w-full object-contain" />
          </div>
        </div>
        <h2 className={`text-center text-3xl font-extrabold ${isDarkMode ? "sf-dark-text" : "text-gray-900"}`}>Study Flow</h2>
        
        {/* Toggle Login/Register */}
        <div className="mt-6 flex justify-center">
            <div className={`p-1 rounded-xl flex gap-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-200"}`}>
                <button 
                    onClick={() => { setIsRegistering(false); setError(null); }}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${!isRegistering ? (isDarkMode ? "bg-blue-600 text-white" : "bg-white text-blue-600 shadow-sm") : (isDarkMode ? "text-slate-400" : "text-gray-500")}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => { setIsRegistering(true); setError(null); }}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${isRegistering ? (isDarkMode ? "bg-blue-600 text-white" : "bg-white text-blue-600 shadow-sm") : (isDarkMode ? "text-slate-400" : "text-gray-500")}`}
                >
                    Register
                </button>
            </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`py-8 px-4 shadow sm:rounded-lg sm:px-10 border ${isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-transparent"}`}>
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${isDarkMode ? "sf-dark-muted" : "text-gray-500"}`}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all ${isDarkMode ? "sf-dark-elevated sf-dark-border sf-dark-text" : "border-gray-300 focus:border-blue-500"}`}
                  placeholder="Nama Lengkap"
                  required={isRegistering}
                />
              </div>
            )}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${isDarkMode ? "sf-dark-muted" : "text-gray-500"}`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all ${isDarkMode ? "sf-dark-elevated sf-dark-border sf-dark-text" : "border-gray-300 focus:border-blue-500"}`}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${isDarkMode ? "sf-dark-muted" : "text-gray-500"}`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all ${isDarkMode ? "sf-dark-elevated sf-dark-border sf-dark-text" : "border-gray-300 focus:border-blue-500"}`}
                  placeholder="********"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border rounded-xl shadow-lg text-sm font-bold transition-all transform active:scale-[0.98] ${isDarkMode ? "sf-accent-btn shadow-blue-500/20" : "text-white bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"}`}
            >
              {isSubmitting && <i className="fas fa-spinner fa-spin"></i>}
              {isRegistering ? "BUAT AKUN BARU" : "MASUK KE DASHBOARD"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className={`text-xs ${isDarkMode ? "sf-dark-muted" : "text-gray-500"}`}>
              {isRegistering ? "Sudah punya akun?" : "Belum punya akun?"} 
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                className={`ml-1 font-bold ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}
              >
                {isRegistering ? "Klik untuk Login" : "Daftar Sekarang"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
