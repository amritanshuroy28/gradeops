import { useState, useEffect } from 'react';
import UploadPortal from './components/UploadPortal';
import ReviewDashboard from './components/ReviewDashboard';
import AdminDashboard from './components/AdminDashboard';
import { API_BASE } from './config';

type Role = 'instructor' | 'ta' | 'admin';

function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [backendReady, setBackendReady] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const health = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (!res.ok) throw new Error('Backend unavailable');
        setBackendReady(true);
      } catch {
        setBackendReady(false);
      }
    };
    health();

    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const roleOptions: {
    key: Role;
    label: string;
    subtitle: string;
    emoji: string;
    gradient: string;
    ring: string;
    badge: string;
  }[] = [
    {
      key: 'instructor',
      label: 'Instructor',
      subtitle: 'Upload exams & define rubrics',
      emoji: '📚',
      gradient: 'from-indigo-500 to-violet-600',
      ring: 'ring-indigo-400/40',
      badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    },
    {
      key: 'ta',
      label: 'Teaching Assistant',
      subtitle: 'Review & approve AI grades',
      emoji: '✅',
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-400/40',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    {
      key: 'admin',
      label: 'Administrator',
      subtitle: 'System monitoring & analytics',
      emoji: '⚙️',
      gradient: 'from-violet-500 to-purple-600',
      ring: 'ring-violet-400/40',
      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    },
  ];

  const roleBadge: Record<Role, { label: string; cls: string }> = {
    instructor: { label: 'Instructor Portal', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' },
    ta:         { label: 'TA Review',         cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' },
    admin:      { label: 'Admin Dashboard',   cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30' },
  };

  /* ── Landing Page ─────────────────────────────────────────────────────── */
  if (!role) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 overflow-hidden transition-colors duration-300">
        
        {/* Animated mesh background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-400/20 dark:bg-indigo-500/10 blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-violet-400/20 dark:bg-violet-500/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-cyan-400/15 dark:bg-cyan-500/8 blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />
          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          id="theme-toggle-landing"
          className="absolute top-5 right-5 z-20 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all hover:scale-105"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>

        {/* Card */}
        <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-2xl shadow-slate-200/60 dark:shadow-black/40 p-8 md:p-12">
            
            {/* Logo + title */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40 mb-6 transition-transform hover:scale-105 animate-float">
                <span className="text-4xl">🎓</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                GRADE<span className="gradient-text">OPS</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                AI-Powered Human-in-the-Loop Exam Grading
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  VLM-Powered OCR
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  Agentic Grading
                </span>
              </div>
            </div>

            {/* Role cards */}
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-5">Select your role to continue</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roleOptions.map((opt, i) => (
                <button
                  key={opt.key}
                  id={`role-${opt.key}`}
                  onClick={() => setRole(opt.key)}
                  className={`group relative flex flex-col items-center text-center rounded-2xl border-2 border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-6 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/30 animate-fade-in-up`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Gradient background glow on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${opt.gradient} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center text-2xl shadow-lg mb-4 transition-transform group-hover:scale-110 duration-300`}>
                    {opt.emoji}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">{opt.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{opt.subtitle}</p>
                  
                  {/* Arrow on hover */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Backend status */}
            {!backendReady && (
              <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm font-medium animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-2.5-2.732-2.5s-1.962 1.667-2.732 2.5L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                Backend server is currently unreachable. Start the FastAPI server to continue.
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              Human-in-the-Loop AI · NVIDIA NIM · LangChain
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Authenticated Layout ──────────────────────────────────────────────── */
  const badge = roleBadge[role];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col font-sans text-slate-900 dark:text-white">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-colors duration-300">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: logo + role */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 flex-shrink-0">
              <span className="text-lg leading-none">🎓</span>
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">GRADEOPS</span>
            <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <span className={`hidden sm:inline text-xs font-bold px-3 py-1.5 rounded-lg border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              id="theme-toggle-app"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button
              id="switch-role-btn"
              onClick={() => setRole(null)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Switch Role</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 animate-fade-in">
        {role === 'instructor' && <UploadPortal />}
        {role === 'ta'         && <ReviewDashboard />}
        {role === 'admin'      && <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
