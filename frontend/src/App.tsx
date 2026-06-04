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
  }[] = [
    {
      key: 'instructor',
      label: 'Instructor',
      subtitle: 'Upload exams & define rubrics',
      emoji: '📚',
    },
    {
      key: 'ta',
      label: 'Teaching Assistant',
      subtitle: 'Review & approve AI grades',
      emoji: '✅',
    },
    {
      key: 'admin',
      label: 'Administrator',
      subtitle: 'System monitoring & analytics',
      emoji: '⚙️',
    },
  ];

  /* ── Landing Page ─────────────────────────────────────────────────────── */
  if (!role) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg)' }}>

        {/* Warm atmospheric gradient wash — barely visible */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] animate-float"
            style={{ background: 'rgba(220, 170, 140, 0.12)', animationDelay: '0s' }}
          />
          <div
            className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full blur-[120px] animate-float"
            style={{ background: 'rgba(180, 160, 200, 0.10)', animationDelay: '1.5s' }}
          />
          <div
            className="absolute -bottom-20 left-1/4 w-[350px] h-[350px] rounded-full blur-[120px] animate-float"
            style={{ background: 'rgba(160, 190, 210, 0.08)', animationDelay: '0.8s' }}
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          id="theme-toggle-landing"
          className="btn-pill absolute top-5 right-5 z-20 w-10 h-10"
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
          <div className="card-featured p-8 md:p-12" style={{ background: 'var(--bg-elevated)' }}>

            {/* Logo + title */}
            <div className="text-center mb-10">
              <div
                className="inline-flex items-center justify-center w-20 h-20 mb-6 animate-float"
                style={{
                  background: 'var(--btn-primary-bg)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: 'var(--shadow-inset-btn)',
                }}
              >
                <span className="text-4xl" style={{ filter: 'brightness(0) invert(1)' }}>🎓</span>
              </div>
              <h1
                className="text-display-hero mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                GRADEOPS
              </h1>
              <p className="text-body-large" style={{ color: 'var(--text-muted)' }}>
                AI-Powered Human-in-the-Loop Exam Grading
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="badge">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success-dot)' }} />
                  VLM-Powered OCR
                </span>
                <span className="badge">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0.5s' }} />
                  Agentic Grading
                </span>
              </div>
            </div>

            {/* Role cards */}
            <p className="text-label text-center mb-5" style={{ color: 'var(--text-faint)' }}>
              Select your role to continue
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roleOptions.map((opt, i) => (
                <button
                  key={opt.key}
                  id={`role-${opt.key}`}
                  onClick={() => setRole(opt.key)}
                  className="group relative flex flex-col items-center text-center card p-6 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up cursor-pointer"
                  style={{ animationDelay: `${i * 80}ms` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-interactive)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div
                    className="w-14 h-14 flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110 duration-300"
                    style={{
                      background: 'var(--btn-primary-bg)',
                      borderRadius: 'var(--radius-card)',
                      boxShadow: 'var(--shadow-inset-btn)',
                    }}
                  >
                    <span style={{ filter: 'brightness(0) invert(1)' }}>{opt.emoji}</span>
                  </div>
                  <h3 className="font-semibold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {opt.label}
                  </h3>
                  <p className="text-caption mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {opt.subtitle}
                  </p>

                  {/* Arrow on hover */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <svg className="w-4 h-4" style={{ color: 'var(--text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Backend status */}
            {!backendReady && (
              <div className="alert alert-warning mt-6 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-2.5-2.732-2.5s-1.962 1.667-2.732 2.5L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                Backend server is currently unreachable. Start the FastAPI server to continue.
              </div>
            )}

            <div className="mt-8 pt-6 text-center text-caption" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-faint)' }}>
              Human-in-the-Loop AI · NVIDIA NIM · LangChain
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Authenticated Layout ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen transition-colors duration-300 flex flex-col font-sans" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md transition-colors duration-300" style={{ background: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Left: logo + role */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--btn-primary-bg)',
                borderRadius: 'var(--radius-compact)',
                boxShadow: 'var(--shadow-inset-btn)',
              }}
            >
              <span className="text-lg leading-none" style={{ filter: 'brightness(0) invert(1)' }}>🎓</span>
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              GRADEOPS
            </span>
            <div className="hidden sm:block w-px h-5" style={{ background: 'var(--border)' }} />
            <span className="badge hidden sm:inline-flex">
              {role === 'instructor' ? 'Instructor Portal' : role === 'ta' ? 'TA Review' : 'Admin Dashboard'}
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              id="theme-toggle-app"
              className="btn-pill w-9 h-9"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button
              id="switch-role-btn"
              onClick={() => setRole(null)}
              className="btn-ghost text-sm font-semibold"
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
