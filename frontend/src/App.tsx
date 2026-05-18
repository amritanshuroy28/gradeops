import { useState, useEffect } from 'react';
import UploadPortal from './components/UploadPortal';
import ReviewDashboard from './components/ReviewDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [role, setRole] = useState<'instructor' | 'ta' | 'admin' | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const health = async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        if (!res.ok) throw new Error('Backend unavailable');
      } catch (err) {
        setBackendReady(false);
        console.error('Backend connection failed:', err);
      }
    };
    health();

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const roleOptions: { key: 'instructor' | 'ta' | 'admin'; label: string; subtitle: string; icon: string; bgAccent: string; hoverBg: string; textAccent: string; darkBgAccent: string; darkHoverBg: string; darkTextAccent: string }[] = [
    {
      key: 'instructor',
      label: 'Instructor Portal',
      subtitle: 'Upload exams & configure rubrics',
      icon: '📚',
      bgAccent: 'bg-indigo-50',
      hoverBg: 'hover:bg-indigo-100/80 hover:border-indigo-300',
      textAccent: 'text-indigo-600',
      darkBgAccent: 'dark:bg-indigo-500/10',
      darkHoverBg: 'dark:hover:bg-indigo-500/20 dark:hover:border-indigo-500/50',
      darkTextAccent: 'dark:text-indigo-400'
    },
    {
      key: 'ta',
      label: 'TA Review',
      subtitle: 'Review & validate grading',
      icon: '✅',
      bgAccent: 'bg-emerald-50',
      hoverBg: 'hover:bg-emerald-100/80 hover:border-emerald-300',
      textAccent: 'text-emerald-600',
      darkBgAccent: 'dark:bg-emerald-500/10',
      darkHoverBg: 'dark:hover:bg-emerald-500/20 dark:hover:border-emerald-500/50',
      darkTextAccent: 'dark:text-emerald-400'
    },
    {
      key: 'admin',
      label: 'Admin Dashboard',
      subtitle: 'System stats & monitoring',
      icon: '⚙️',
      bgAccent: 'bg-violet-50',
      hoverBg: 'hover:bg-violet-100/80 hover:border-violet-300',
      textAccent: 'text-violet-600',
      darkBgAccent: 'dark:bg-violet-500/10',
      darkHoverBg: 'dark:hover:bg-violet-500/20 dark:hover:border-violet-500/50',
      darkTextAccent: 'dark:text-violet-400'
    }
  ];

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-100/50 dark:from-indigo-900/20 to-transparent pointer-events-none transition-colors duration-300" />
        
        {/* Theme Toggle Top Right */}
        <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          {isDark ? (
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>

        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 md:p-12 animate-fade-in-up transition-colors duration-300">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 dark:bg-indigo-500 shadow-lg shadow-indigo-600/30 dark:shadow-indigo-500/20 mb-6 transition-transform hover:scale-105">
              <span className="text-4xl text-white">🎓</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">
              Welcome to <span className="text-indigo-600 dark:text-indigo-400">GRADEOPS</span>
            </h1>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium tracking-wide transition-colors">
              AI-Powered Exam Grading System
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {roleOptions.map((opt, i) => (
              <button
                key={opt.key}
                onClick={() => { setRole(opt.key); setLoading(true); }}
                disabled={loading}
                className={`group flex flex-col items-center text-center rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-6 py-8 transition-all duration-300 ${opt.hoverBg} ${opt.darkHoverBg} disabled:opacity-50`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl ${opt.bgAccent} ${opt.darkBgAccent} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm dark:shadow-none`}>
                  <span className="text-3xl" aria-hidden="true">{opt.icon}</span>
                </div>
                <h3 className={`font-bold text-lg leading-tight text-slate-900 dark:text-slate-100 group-hover:${opt.textAccent} ${opt.darkTextAccent} transition-colors`}>{opt.label}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 transition-colors">{opt.subtitle}</p>
              </button>
            ))}
          </div>

          {!backendReady && (
            <div className="mt-8 flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400 text-sm font-medium bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl animate-fade-in border border-rose-100 dark:border-rose-500/20">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-2.5-2.732-2.5s-1.962 1.667-2.732 2.5L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Backend server is currently unavailable.
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-700 text-center transition-colors duration-300">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
              Empowering educators with Human-in-the-Loop AI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roleConfig = {
    instructor: { label: 'Instructor Portal', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' },
    ta: { label: 'TA Review', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' },
    admin: { label: 'Admin Dashboard', color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30' }
  };

  const currentRole = roleConfig[role];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm dark:shadow-none transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 shadow-md shadow-indigo-600/20 dark:shadow-none flex items-center justify-center transition-colors duration-300">
              <span className="text-lg text-white">🎓</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight transition-colors duration-300">
                GRADEOPS
              </h1>
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2 transition-colors duration-300"></div>
            <span className={`text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg border shadow-sm dark:shadow-none transition-colors duration-300 ${currentRole.color}`}>
              {currentRole.label}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {isDark ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button
              onClick={() => setRole(null)}
              className="group flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm dark:shadow-none hover:shadow"
            >
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Switch Role</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        {role === 'instructor' && <UploadPortal />}
        {role === 'ta' && <ReviewDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
