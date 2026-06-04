import { useState, useEffect } from 'react';
import { API_BASE } from '../config';

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
          fetch(`${API_BASE}/monitor/stats`),
          fetch(`${API_BASE}/monitor/exam-summary/${examId}`)
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
      const res = await fetch(`${API_BASE}/review/plagiarism-check/${examId}`);
      if (!res.ok) throw new Error('Failed to run scan');
      setPlagResult(await res.json());
    } catch (err: any) {
      setPlagResult({ error: err.message });
    } finally {
      setPlagChecking(false);
    }
  };

  if (loading && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in" style={{ color: 'var(--text-muted)' }}>
      <svg className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
      <p className="font-semibold">Loading System Telemetry...</p>
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

  const metricCards = [
    { label: 'Total Scans', val: stats?.submissions || 0 },
    { label: 'AI Graded',   val: stats?.status_counts?.graded || 0 },
    { label: 'TA Reviewed', val: stats?.status_counts?.reviewed || 0 },
    { label: 'Queue Depth', val: stats?.status_counts?.pending || 0 },
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-12 h-12 flex items-center justify-center text-xl"
          style={{
            background: 'var(--btn-primary-bg)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-inset-btn)',
          }}
        >
          <span style={{ filter: 'brightness(0) invert(1)' }}>⚙️</span>
        </div>
        <div>
          <h2 className="text-sub-heading" style={{ color: 'var(--text-primary)' }}>System Telemetry</h2>
          <p className="text-body" style={{ color: 'var(--text-muted)' }}>Monitoring engine health and plagiarism detection.</p>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metricCards.map((c, i) => (
          <div key={i} className="card p-6">
            <p className="text-label mb-1" style={{ color: 'var(--text-faint)' }}>{c.label}</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '2.25rem', letterSpacing: '-1px' }}>{c.val}</p>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--text-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Storage & Services */}
        <div className="card-featured p-8 flex flex-col" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h3 className="text-card-title font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            Infrastructure Health
          </h3>

          <div className="space-y-6 flex-1">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Uploads Volume</span>
                <span>{formatMB(uploadBytes)} MB ({uploadPct.toFixed(0)}%)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Processed Artifacts (Images)</span>
                <span>{formatMB(artifactBytes)} MB ({artifactPct.toFixed(0)}%)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${artifactPct}%` }} />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Server Disk Usage</span>
                <span style={{ color: diskPct > 85 ? 'var(--score-low)' : 'var(--score-high)' }}>{diskPct.toFixed(1)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill transition-all duration-500" style={{ width: `${diskPct}%`, background: diskPct > 85 ? 'var(--score-low)' : 'var(--score-high)' }} />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 grid grid-cols-3 gap-4" style={{ borderTop: '1px solid var(--border)' }}>
            {['Database', 'API Server', 'NVIDIA NIM'].map(s => (
              <div key={s} className="card-compact p-3 flex flex-col items-center justify-center gap-2">
                <span className="text-label" style={{ color: 'var(--text-faint)', fontSize: '0.625rem' }}>{s}</span>
                <div className="flex items-center gap-1.5 px-2 py-1 text-caption font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success-dot)' }} /> Online
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Summary & Plagiarism */}
        <div className="card-featured p-8 flex flex-col" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-card-title font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--warning-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Plagiarism Engine
            </h3>
            <span className="badge font-semibold" style={{ fontSize: '0.625rem' }}>Beta</span>
          </div>

          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Run NLP similarity checks across all submissions for a specific exam to automatically identify potentially copied logic using SentenceTransformers.
          </p>

          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <label className="sr-only">Exam ID</label>
              <input type="text" value={examId} onChange={e => setExamId(e.target.value)} placeholder="Exam ID"
                className="input font-semibold" />
            </div>
            <button onClick={handlePlagiarismCheck} disabled={plagChecking || !examId}
              className="btn-primary px-6 py-3 font-semibold flex items-center gap-2">
              {plagChecking ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg> : 'Run Scan'}
            </button>
          </div>

          {examSummary && !examSummary.error && (
            <div className="mb-6 p-4 card-compact flex justify-between items-center text-sm font-semibold" style={{ background: 'var(--bg-muted)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Avg Score: <span style={{ color: 'var(--text-primary)' }}>{examSummary.average_score}</span></span>
              <span style={{ color: 'var(--text-muted)' }}>Total Answers: <span style={{ color: 'var(--text-primary)' }}>{examSummary.total_answers}</span></span>
            </div>
          )}

          {plagResult && (
            <div className="flex-1 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
              {plagResult.error ? (
                <div className="alert alert-error">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {plagResult.error}
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Scan Results</h4>
                    <span className="badge">{plagResult.total_checked} Papers Checked</span>
                  </div>

                  {plagResult.suspicious_pairs?.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin pr-2">
                      {plagResult.suspicious_pairs.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 card-compact" style={{ borderColor: 'var(--error-border)' }}>
                          <div className="flex items-center gap-2 text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            <span className="px-2 py-1" style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>Ans {p.answer_1_id}</span>
                            <span>↔</span>
                            <span className="px-2 py-1" style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>Ans {p.answer_2_id}</span>
                          </div>
                          <span className="text-sm font-semibold px-2 py-1" style={{ color: 'var(--error-text)', background: 'var(--error-bg)', borderRadius: 'var(--radius-sm)' }}>
                            {(p.similarity*100).toFixed(1)}% Sim
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-success font-semibold text-center justify-center">
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
