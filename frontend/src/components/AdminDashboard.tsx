import { useState, useEffect } from 'react';

interface StatsData {
  submissions: number;
  status_counts?: { graded?: number; reviewed?: number; pending?: number };
  storage?: {
    upload_dir_size?: number;
    artifacts_dir_size?: number;
    disk_percent?: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError('');
        const res = await fetch('http://localhost:8000/monitor/stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to fetch statistics');
      } finally { setLoading(false); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400 animate-fade-in">
      <svg className="w-10 h-10 animate-spin mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
      <p className="text-sm font-medium">Loading statistics...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-96 text-red-500 animate-fade-in">
      <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p className="font-semibold">{error}</p>
    </div>
  );

  const storage = stats?.storage || {};
  const statusCounts = stats?.status_counts || {};

  const statCards = [
    { label: 'Total Submissions', value: stats?.submissions || 0, color: 'blue', icon: M.Inbox(1) },
    { label: 'Graded', value: statusCounts?.graded || 0, color: 'emerald', icon: M.Check(1) },
    { label: 'Reviewed', value: statusCounts?.reviewed || 0, color: 'violet', icon: M.ClipboardCheck(1) },
    { label: 'Pending', value: statusCounts?.pending || 0, color: 'orange', icon: M.Clock(1) },
  ] as const;

  const colorMap: Record<string, { bg: string; text: string; bar: string; light: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500', light: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', light: 'border-emerald-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500', light: 'border-violet-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', light: 'border-orange-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-500', light: 'border-red-200' },
  };

  const total = (statusCounts.graded || 0) + (statusCounts.reviewed || 0) + (statusCounts.pending || 0);
  const progressTotal = total > 0 ? ((statusCounts.graded || 0) / total) * 100 : 0;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">System overview and health monitoring</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const c = colorMap[card.color];
          return (
            <div key={i} className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${c.light}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center`}>{card.icon}</div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{total > 0 ? Math.round((card.value / total) * 100) : 0}%</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-800">{card.value.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Overall Progress</h3>
          <span className="text-sm font-bold text-blue-600">{progressTotal.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-violet-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progressTotal}%` }}></div>
        </div>
        <div className="flex gap-4 mt-3 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Graded</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500"></span>Reviewed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400"></span>Pending</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            Storage Usage
          </h3>
          <div className="space-y-5">
            {[{ label: 'Upload Directory', value: (storage.upload_dir_size || 0) / 1024 / 1024, pct: 30 },
              { label: 'Artifacts Directory', value: (storage.artifacts_dir_size || 0) / 1024 / 1024, pct: 40 },
              { label: 'Disk Usage', value: storage.disk_percent || 0, isPercent: true, pct: storage.disk_percent || 0 }].map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">{s.label}</span>
                  <span className="font-bold text-slate-600">{s.isPercent ? `${s.value.toFixed(1)}%` : `${s.value.toFixed(2)} MB`}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${i === 2 ? (s.pct > 80 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-blue-500'}`} style={{ width: `${Math.min(100, s.pct)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            System Health
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Database', status: 'Connected', color: 'emerald' },
              { label: 'API Server', status: 'Running', color: 'emerald' },
              { label: 'AI Engine', status: 'Mock Mode', color: 'amber' },
            ].map((s, i) => {
              const c = colorMap[s.color];
              return (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${c.bar} animate-pulse`}></div>
                    <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.bg} ${c.text} border ${c.light}`}>{s.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const M = {
  Inbox: (k: number) => (<svg key={k} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-3.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293H9.414a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 016.586 13H4" /></svg>),
  Check: (k: number) => (<svg key={k} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>),
  ClipboardCheck: (k: number) => (<svg key={k} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>),
  Clock: (k: number) => (<svg key={k} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
};
