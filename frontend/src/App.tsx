import { useState, useEffect } from 'react';
import UploadPortal from './components/UploadPortal';
import ReviewDashboard from './components/ReviewDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [role, setRole] = useState<'instructor' | 'ta' | 'admin' | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(true);

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
  }, []);

  const roleOptions: { key: 'instructor' | 'ta' | 'admin'; label: string; subtitle: string; icon: string; gradient: string; hoverGradient: string; borderAccent: string }[] = [
    {
      key: 'instructor',
      label: 'Instructor Portal',
      subtitle: 'Upload exams & configure rubrics',
      icon: '📚',
      gradient: 'from-blue-600 to-indigo-700',
      hoverGradient: 'hover:from-blue-700 hover:to-indigo-800',
      borderAccent: 'ring-blue-500/30 hover:ring-blue-500/50'
    },
    {
      key: 'ta',
      label: 'TA Review',
      subtitle: 'Review & validate grading',
      icon: '✅',
      gradient: 'from-emerald-600 to-teal-700',
      hoverGradient: 'hover:from-emerald-700 hover:to-teal-800',
      borderAccent: 'ring-emerald-500/30 hover:ring-emerald-500/50'
    },
    {
      key: 'admin',
      label: 'Admin Dashboard',
      subtitle: 'System stats & monitoring',
      icon: '⚙️',
      gradient: 'from-violet-600 to-purple-700',
      hoverGradient: 'hover:from-violet-700 hover:to-purple-800',
      borderAccent: 'ring-violet-500/30 hover:ring-violet-500/50'
    }
  ];

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.06),transparent_50%)]" />

        <div className="relative w-full max-w-lg animate-fade-in-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/20 mb-6">
              <span className="text-4xl">🎓</span>
            </div>
            <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-300 tracking-tight">
              GRADEOPS
            </h1>
            <p className="mt-3 text-slate-400 text-sm font-medium tracking-wide uppercase">
              AI-Powered Exam Grading System
            </p>
          </div>

          <div className="space-y-3">
            {roleOptions.map((opt, i) => (
              <button
                key={opt.key}
                onClick={() => { setRole(opt.key); setLoading(true); }}
                disabled={loading}
                className={`group w-full relative overflow-hidden rounded-xl bg-gradient-to-r ${opt.gradient} ${opt.hoverGradient} disabled:opacity-50 text-white text-left px-6 py-5 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 hover:-translate-y-0.5 ring-2 ring-transparent ${opt.borderAccent}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-5 relative z-10">
                  <div className="text-3xl group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg leading-tight">{opt.label}</div>
                    <div className="text-white/70 text-sm mt-0.5">{opt.subtitle}</div>
                  </div>
                  <svg className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {!backendReady && (
            <div className="mt-6 flex items-center justify-center gap-2 text-amber-400/80 text-sm animate-fade-in">
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-2.5-2.732-2.5s-1.962 1.667-2.732 2.5L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Backend server is not responding
            </div>
          )}

          <div className="mt-10 text-center">
            <p className="text-slate-500 text-xs">
              Secured & Automated. Powered by AI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = role === 'instructor' ? '📚 Instructor' : role === 'ta' ? '✅ TA' : '⚙️ Admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-sm">🎓</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              GRADEOPS
            </h1>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/50">
              {roleLabel}
            </span>
          </div>
          <button
            onClick={() => setRole(null)}
            className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors duration-200 border border-transparent hover:border-red-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1" />
            </svg>
            Switch Role
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 animate-fade-in">
        {role === 'instructor' && <UploadPortal />}
        {role === 'ta' && <ReviewDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
