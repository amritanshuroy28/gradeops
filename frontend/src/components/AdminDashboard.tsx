import { useState, useEffect } from 'react';

interface Stats {
  storage: { disk_percent: number; upload_dir_size: number; artifacts_dir_size: number; disk_total: number; disk_used: number; };
  submissions: number;
  answers: number;
  status_counts: { graded: number; reviewed: number; pending: number; };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [examId, setExamId] = useState('1');
  const [plagChecking, setPlagChecking] = useState(false);
  const [plagResult, setPlagResult] = useState<any>(null);
  const [examSummary, setExamSummary] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, summaryRes] = await Promise.all([
          fetch('http://localhost:8000/monitor/stats'),
          fetch(`http://localhost:8000/monitor/exam-summary/${examId}`)
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (summaryRes.ok) setExamSummary(await summaryRes.json());
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [examId]);

  const handlePlagiarismCheck = async () => {
    if (!examId) return;
    setPlagChecking(true); setPlagResult(null);
    try {
      const res = await fetch(`http://localhost:8000/review/plagiarism-check/${examId}`);
      if (!res.ok) throw new Error('Failed to run scan');
      setPlagResult(await res.json());
    } catch (err: any) {
      setPlagResult({ error: err.message });
    } finally {
      setPlagChecking(false);
    }
  };

  if (loading && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 animate-fade-in">
      <svg className="w-8 h-8 animate-spin text-violet-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
      <p className="font-bold">Loading System Telemetry...</p>
    </div>
  );

  const formatMB = (bytes: number = 0) => (bytes / 1024 / 1024).toFixed(1);
  const diskPct = stats?.storage?.disk_percent || 0;
  
  // Storage sizes real calculations
  const uploadBytes = stats?.storage?.upload_dir_size || 0;
  const artifactBytes = stats?.storage?.artifacts_dir_size || 0;
  const totalAppBytes = uploadBytes + artifactBytes;
  
  // Calculate relative percentages for visual bars (relative to total app storage)
  const uploadPct = totalAppBytes > 0 ? (uploadBytes / totalAppBytes) * 100 : 0;
  const artifactPct = totalAppBytes > 0 ? (artifactBytes / totalAppBytes) * 100 : 0;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-lg shadow-violet-500/30">⚙️</div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Telemetry</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitoring engine health and plagiarism detection.</p>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Scans', val: stats?.submissions || 0, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'AI Graded',   val: stats?.status_counts?.graded || 0,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'TA Reviewed', val: stats?.status_counts?.reviewed || 0, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Queue Depth', val: stats?.status_counts?.pending || 0,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
            <div className="flex items-center justify-between">
               <p className={`text-4xl font-black ${c.color}`}>{c.val}</p>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.bg} ${c.color}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Storage & Services */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md p-8 flex flex-col">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            Infrastructure Health
          </h3>
          
          <div className="space-y-6 flex-1">
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Uploads Volume</span>
                <span>{formatMB(uploadBytes)} MB ({uploadPct.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Processed Artifacts (Images)</span>
                <span>{formatMB(artifactBytes)} MB ({artifactPct.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${artifactPct}%` }} />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Server Disk Usage</span>
                <span className={diskPct > 85 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>{diskPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div className={`h-full rounded-full transition-all duration-500 ${diskPct > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${diskPct}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-4">
            {['Database', 'API Server', 'NVIDIA NIM'].map(s => (
               <div key={s} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s}</span>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-bold">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                  </div>
               </div>
            ))}
          </div>
        </div>

        {/* Exam Summary & Plagiarism */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Plagiarism Engine
            </h3>
            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-black uppercase rounded shadow-sm border border-indigo-200 dark:border-indigo-700">Beta</span>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
            Run NLP similarity checks across all submissions for a specific exam to automatically identify potentially copied logic using SentenceTransformers.
          </p>

          <div className="flex gap-3 mb-6">
            <div className="flex-1">
               <label className="sr-only">Exam ID</label>
               <input type="text" value={examId} onChange={e => setExamId(e.target.value)} placeholder="Exam ID" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-4 focus:ring-indigo-500/20 outline-none dark:text-white" />
            </div>
            <button onClick={handlePlagiarismCheck} disabled={plagChecking || !examId} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors flex items-center gap-2">
               {plagChecking ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg> : 'Run Scan'}
            </button>
          </div>

          {examSummary && !examSummary.error && (
             <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600 dark:text-slate-400">Avg Score: <span className="text-slate-900 dark:text-white">{examSummary.average_score}</span></span>
                <span className="text-slate-600 dark:text-slate-400">Total Answers: <span className="text-slate-900 dark:text-white">{examSummary.total_answers}</span></span>
             </div>
          )}

          {plagResult && (
             <div className="flex-1 border-t border-slate-100 dark:border-slate-700 pt-6">
                {plagResult.error ? (
                   <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {plagResult.error}
                   </div>
                ) : (
                   <div>
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="font-bold text-slate-800 dark:text-white text-sm">Scan Results</h4>
                         <span className="text-xs text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{plagResult.total_checked} Papers Checked</span>
                      </div>
                      
                      {plagResult.suspicious_pairs?.length > 0 ? (
                         <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin pr-2">
                            {plagResult.suspicious_pairs.map((p: any, i: number) => (
                               <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-xl">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                     <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Ans {p.answer_1_id}</span>
                                     <span>↔</span>
                                     <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Ans {p.answer_2_id}</span>
                                  </div>
                                  <span className="text-sm font-black text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded">{(p.similarity*100).toFixed(1)}% Sim</span>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <div className="p-6 text-center text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            ✅ No high similarity pairs detected!
                         </div>
                      )}
                   </div>
                )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
