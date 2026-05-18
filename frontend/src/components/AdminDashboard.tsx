import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plagChecking, setPlagChecking] = useState(false);
  const [plagResult, setPlagResult] = useState<any>(null);
  const [examId, setExamId] = useState<string>('1');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:8000/monitor/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePlagiarismCheck = async () => {
    if (!examId) return;
    setPlagChecking(true);
    setPlagResult(null);
    try {
      const res = await fetch(`http://localhost:8000/review/plagiarism-check/${examId}`);
      if (!res.ok) throw new Error('Failed to check plagiarism');
      const data = await res.json();
      setPlagResult(data);
    } catch (err: any) {
      console.error(err);
      setPlagResult({ error: err.message });
    } finally {
      setPlagChecking(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 animate-fade-in transition-colors">
      <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-6 shadow-sm transition-colors">
        <svg className="w-8 h-8 animate-spin text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
      </div>
      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Loading system metrics...</p>
    </div>
  );

  const storage = stats?.storage || {};
  const statusCounts = stats?.status_counts || {};
  const diskPercent = storage?.disk_percent || 0;

  const statCards = [
    { label: 'Total Submissions', value: stats?.submissions || 0, icon: '📄', color: 'bg-indigo-500 text-indigo-50 shadow-indigo-500/30 dark:shadow-indigo-900/40' },
    { label: 'AI Graded', value: statusCounts?.graded || 0, icon: '🤖', color: 'bg-emerald-500 text-emerald-50 shadow-emerald-500/30 dark:shadow-emerald-900/40' },
    { label: 'TA Reviewed', value: statusCounts?.reviewed || 0, icon: '✅', color: 'bg-violet-500 text-violet-50 shadow-violet-500/30 dark:shadow-violet-900/40' },
    { label: 'Pending Review', value: statusCounts?.pending || 0, icon: '⏳', color: 'bg-amber-500 text-amber-50 shadow-amber-500/30 dark:shadow-amber-900/40' },
  ];

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto pb-12">
      <div className="text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">Admin Dashboard</h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg mt-3 font-medium transition-colors">System monitoring, health checks, and advanced analytics.</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className={`p-6 rounded-3xl shadow-xl flex items-center justify-between transition-transform hover:-translate-y-1 duration-300 ${card.color}`}>
            <div className="space-y-1">
              <p className="text-sm font-bold uppercase tracking-wider opacity-80">{card.label}</p>
              <p className="text-4xl font-black">{card.value}</p>
            </div>
            <div className="text-4xl opacity-90">{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Storage & Health */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-8 flex flex-col transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">Storage & Health</h3>
          </div>
          
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between text-base font-bold text-slate-700 dark:text-slate-300 transition-colors">
                <span>Uploads Volume</span>
                <span>{((storage?.upload_dir_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner transition-colors">
                <div className="bg-indigo-500 dark:bg-indigo-400 h-full rounded-full transition-all duration-1000" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-base font-bold text-slate-700 dark:text-slate-300 transition-colors">
                <span>Cropped Artifacts</span>
                <span>{((storage?.artifacts_dir_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner transition-colors">
                <div className="bg-violet-500 dark:bg-violet-400 h-full rounded-full transition-all duration-1000" style={{ width: '40%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-base font-bold text-slate-700 dark:text-slate-300 transition-colors">
                <span>Total Disk Usage</span>
                <span className={diskPercent > 80 ? 'text-rose-600 dark:text-rose-400' : ''}>{diskPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner transition-colors">
                <div className={`h-full rounded-full transition-all duration-1000 ${diskPercent > 80 ? 'bg-rose-500 dark:bg-rose-400' : 'bg-emerald-500 dark:bg-emerald-400'}`} style={{ width: `${diskPercent}%` }}></div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t-2 border-dashed border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4 transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Database</span>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-black shadow-sm transition-colors">Online</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">API Server</span>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-black shadow-sm transition-colors">Running</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-colors">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">NVIDIA NIM</span>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-black shadow-sm transition-colors">Active</span>
            </div>
          </div>
        </div>

        {/* Plagiarism Detection */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-8 flex flex-col transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">Plagiarism Engine</h3>
            </div>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-500/30 transition-colors">Beta</span>
          </div>
          
          <div className="space-y-6 flex-1">
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed transition-colors">
              Run NLP similarity checks across all submissions for a specific exam to automatically identify potentially copied logic.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 dark:text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </span>
                <input
                  type="text"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  placeholder="Enter Exam ID"
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-base font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={handlePlagiarismCheck}
                disabled={plagChecking || !examId}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-bold shadow-lg shadow-indigo-600/30 dark:shadow-indigo-900/30 hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                {plagChecking ? (
                  <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg> Scanning...</>
                ) : 'Run Check'}
              </button>
            </div>

            {plagResult && (
              <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 animate-fade-in transition-colors">
                {plagResult.error ? (
                  <div className="text-rose-600 dark:text-rose-400 text-base font-bold flex items-center gap-3 bg-rose-100 dark:bg-rose-500/20 p-4 rounded-xl transition-colors">
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {plagResult.error}
                  </div>
                ) : (
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 dark:text-white mb-4 flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-3 transition-colors">
                      Scan Results
                      <span className="text-sm bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-500/30 transition-colors">{plagResult.total_checked} Papers Checked</span>
                    </h4>
                    
                    {plagResult.suspicious_pairs && plagResult.suspicious_pairs.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                        {plagResult.suspicious_pairs.map((pair: any, idx: number) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-100 dark:border-rose-500/30 shadow-sm hover:border-rose-300 dark:hover:border-rose-500 transition-colors">
                            <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                              <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors">Ans {pair.answer_1_id}</span>
                              <svg className="w-4 h-4 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors">Ans {pair.answer_2_id}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 shadow-inner hidden sm:block transition-colors">
                                <div className="bg-rose-500 dark:bg-rose-400 h-full rounded-full" style={{ width: `${pair.similarity * 100}%` }}></div>
                              </div>
                              <span className="text-base font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-lg transition-colors">{(pair.similarity * 100).toFixed(1)}% Sim</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-base text-emerald-600 dark:text-emerald-400 font-bold flex flex-col items-center justify-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/30 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        No high similarity pairs detected!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
