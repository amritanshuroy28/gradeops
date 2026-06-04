import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

interface Answer {
  id: string;
  student_id: string;
  question: string;
  image_url: string;
  extracted_text: string;
  ai_score: number;
  max_score: number;
  all_pages?: string[];
  justification: Record<string, { condition: string; explanation: string; score_awarded: number; met: boolean }>;
}

export default function ReviewDashboard() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideComment, setOverrideComment] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadAnswers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/review/pending`);
      const data = await res.json();
      setAnswers(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnswers();
    const interval = autoRefresh ? setInterval(loadAnswers, 5000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, loadAnswers]);

  const current = answers[currentIndex];

  useEffect(() => {
    if (current) {
      setScore(current.ai_score?.toString() || '0');
      setFeedback(null);
      setShowOverride(false);
      setOverrideComment('');
      setPageIndex(0);
    }
  }, [current?.id]);

  const pages = current?.all_pages?.length ? current.all_pages : [current?.image_url].filter(Boolean);
  const totalPages = pages?.length || 0;
  const currentPageUrl = pages?.[pageIndex] || '';

  const removeAndAdvance = () => {
    const next = answers.filter((_, i) => i !== currentIndex);
    setAnswers(next);
    if (currentIndex >= next.length) setCurrentIndex(Math.max(0, next.length - 1));
  };

  const handleApprove = useCallback(async () => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/review/${current.id}/approve?final_score=${score}`, { method: 'POST' });
      setFeedback({ type: 'success', text: 'Approved!' });
      setTimeout(() => { removeAndAdvance(); setSubmitting(false); }, 400);
    } catch {
      setFeedback({ type: 'error', text: 'Failed to approve.' });
      setSubmitting(false);
    }
  }, [current, score, submitting]);

  const handleOverride = useCallback(async () => {
    if (!current || submitting || !overrideComment.trim()) return;
    setSubmitting(true);
    try {
      const p = new URLSearchParams({ final_score: score, comments: overrideComment });
      await fetch(`${API_BASE}/review/${current.id}/override?${p}`, { method: 'POST' });
      setFeedback({ type: 'success', text: 'Overridden!' });
      setTimeout(() => { removeAndAdvance(); setSubmitting(false); setShowOverride(false); }, 400);
    } catch {
      setFeedback({ type: 'error', text: 'Failed to override.' });
      setSubmitting(false);
    }
  }, [current, score, overrideComment, submitting]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Enter' && !showOverride) { e.preventDefault(); handleApprove(); }
      else if ((e.key === 'r' || e.key === 'R') && !showOverride) { e.preventDefault(); setShowOverride(true); }
      else if (e.key === 'Escape' && showOverride) setShowOverride(false);
      else if (e.key === 'ArrowRight' && !showOverride) setPageIndex(p => Math.min(p + 1, totalPages - 1));
      else if (e.key === 'ArrowLeft' && !showOverride) setPageIndex(p => Math.max(p - 1, 0));
      else if (e.key === ']') setCurrentIndex(i => Math.min(i + 1, answers.length - 1));
      else if (e.key === '[') setCurrentIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleApprove, showOverride, totalPages, answers.length]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]" style={{ color: 'var(--text-muted)' }}>
      <svg className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
      <p className="font-semibold">Loading submissions...</p>
    </div>
  );

  if (!current) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]" style={{ color: 'var(--text-muted)' }}>
      <div className="w-24 h-24 flex items-center justify-center mb-6" style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-container)' }}>
        <span className="text-5xl">🎉</span>
      </div>
      <h2 className="text-sub-heading" style={{ color: 'var(--text-primary)' }}>Inbox Zero!</h2>
      <p className="mt-2 font-medium">All grading decisions reviewed.</p>
      <button onClick={loadAnswers} className="btn-ghost mt-6 px-6 py-3 font-semibold">
        Check Again
      </button>
    </div>
  );

  const pct = Math.min(100, Math.max(0, (parseFloat(score || '0') / current.max_score) * 100)) || 0;
  const scoreColor = pct >= 80 ? 'var(--score-high)' : pct >= 60 ? 'var(--score-mid)' : 'var(--score-low)';

  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto pb-12 relative">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sub-heading" style={{ color: 'var(--text-primary)' }}>TA Review</h2>
          <span className="badge">{answers.length} pending</span>
        </div>
        <div className="flex items-center gap-3 card-compact px-4 py-2">
          <button onClick={loadAnswers} className="p-2 transition-colors cursor-pointer" style={{ color: 'var(--text-faint)' }} title="Refresh"
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
          </button>
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`toggle-track ${autoRefresh ? 'active' : ''}`}>
              <div className="toggle-thumb" />
            </div>
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Auto-Refresh</span>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Submission Switcher */}
      {answers.length > 1 && (
        <div className="flex items-center gap-3 mb-5 card p-3">
          <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
            className="btn-ghost px-3 py-2 text-sm font-semibold disabled:opacity-30 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            [ Prev
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{current.student_id}</span>
            <span className="text-caption ml-2" style={{ color: 'var(--text-faint)' }}>— {current.question}</span>
            <span className="text-caption ml-3" style={{ color: 'var(--text-faint)' }}>({currentIndex + 1}/{answers.length})</span>
          </div>
          <button onClick={() => setCurrentIndex(i => Math.min(answers.length - 1, i + 1))} disabled={currentIndex === answers.length - 1}
            className="btn-ghost px-3 py-2 text-sm font-semibold disabled:opacity-30 flex items-center gap-1">
            Next ]
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Left: Single Page Viewer */}
        <div className="xl:col-span-8 flex flex-col gap-4">

          {/* Page image — keeping dark viewer for document contrast */}
          <div className="overflow-hidden relative min-h-[500px] flex flex-col" style={{ background: '#0f0e0d', borderRadius: 'var(--radius-container)', border: '1px solid var(--border)' }}>
            {/* Page header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ background: '#1a1917', borderBottom: '1px solid #2d2b27' }}>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success-dot)' }} />
                <span className="text-sm font-semibold" style={{ color: '#f0ede6' }}>{current.student_id} · {current.question}</span>
              </div>
              <span className="text-caption font-semibold px-3 py-1" style={{ background: '#242320', color: '#9c9a94', borderRadius: 'var(--radius-compact)' }}>
                Page {pageIndex + 1} of {totalPages}
              </span>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0f0e0d' }}>
              {currentPageUrl ? (
                <img
                  key={currentPageUrl}
                  src={currentPageUrl}
                  alt={`Page ${pageIndex + 1}`}
                  className="max-h-[620px] max-w-full object-contain"
                  style={{ borderRadius: 'var(--radius-card)', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                />
              ) : (
                <p className="font-medium" style={{ color: '#9c9a94' }}>No image available</p>
              )}
            </div>

            {/* Page navigation */}
            <div className="flex items-center justify-between px-5 py-3 gap-4" style={{ background: '#1a1917', borderTop: '1px solid #2d2b27' }}>
              <button onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}
                className="flex items-center gap-2 px-4 py-2 font-semibold text-sm disabled:opacity-30 transition-colors cursor-pointer"
                style={{ background: '#242320', color: '#f0ede6', borderRadius: 'var(--radius-compact)', border: 'none' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Prev Page
              </button>

              {/* Dot strip */}
              <div className="flex gap-1.5 overflow-x-auto max-w-xs flex-wrap justify-center">
                {pages?.map((_, i) => (
                  <button key={i} onClick={() => setPageIndex(i)}
                    className="flex-shrink-0 transition-all cursor-pointer border-none"
                    style={{
                      width: i === pageIndex ? '12px' : '10px',
                      height: i === pageIndex ? '12px' : '10px',
                      borderRadius: 'var(--radius-pill)',
                      background: i === pageIndex ? '#f0ede6' : '#3a3733',
                      transform: i === pageIndex ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              <button onClick={() => setPageIndex(p => Math.min(p + 1, totalPages - 1))} disabled={pageIndex === totalPages - 1}
                className="flex items-center gap-2 px-4 py-2 font-semibold text-sm disabled:opacity-30 transition-colors cursor-pointer"
                style={{ background: '#242320', color: '#f0ede6', borderRadius: 'var(--radius-compact)', border: 'none' }}>
                Next Page
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Thumbnail strip */}
          {totalPages > 1 && (
            <div className="card p-4">
              <p className="text-label mb-3" style={{ color: 'var(--text-faint)' }}>All Pages</p>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                {pages?.map((url, i) => (
                  <button key={i} onClick={() => setPageIndex(i)}
                    className="flex-shrink-0 w-20 h-28 overflow-hidden transition-all cursor-pointer"
                    style={{
                      borderRadius: 'var(--radius-card)',
                      border: i === pageIndex ? '2px solid var(--text-primary)' : '2px solid var(--border)',
                      boxShadow: i === pageIndex ? 'var(--shadow-md)' : 'none',
                      transform: i === pageIndex ? 'scale(1.05)' : 'scale(1)',
                    }}>
                    <img src={url} alt={`p${i + 1}`} className="w-full h-full object-cover" style={{ background: '#fff' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extracted text toggle */}
          <details className="card [&_summary::-webkit-details-marker]:hidden">
            <summary className="p-5 cursor-pointer font-semibold flex items-center gap-2 outline-none text-sm" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              View AI-Extracted Transcript
            </summary>
            <div className="px-5 pb-5">
              <div className="p-4 text-caption font-mono max-h-48 overflow-y-auto whitespace-pre-wrap" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-compact)', color: 'var(--text-secondary)' }}>
                {current.extracted_text || 'No transcript available.'}
              </div>
            </div>
          </details>
        </div>

        {/* Right: Grading Panel */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className="card-featured flex flex-col overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>

            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
              <h3 className="text-label flex items-center gap-2" style={{ color: 'var(--text-faint)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success-dot)' }} />
                AI Evaluation
              </h3>
            </div>

            {/* Criteria list */}
            <div className="p-5 flex-1 overflow-y-auto scrollbar-thin space-y-3 max-h-80">
              {current.justification && Object.keys(current.justification).length > 0 ? (
                Object.entries(current.justification).map(([key, data]) => {
                  const met = data.met ?? (data.score_awarded > 0);
                  return (
                    <div key={key} className="p-3.5 card-compact" style={{ background: met ? 'var(--success-bg)' : 'var(--bg-muted)', borderColor: met ? 'var(--success-border)' : 'var(--border)' }}>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: met ? 'var(--success-bg)' : 'var(--bg-muted)', color: met ? 'var(--success-text)' : 'var(--text-faint)' }}>
                          {met
                            ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{data.condition || key}</p>
                          {data.explanation && <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{data.explanation}</p>}
                        </div>
                        <span className="text-sm font-semibold flex-shrink-0" style={{ color: met ? 'var(--success-text)' : 'var(--text-faint)' }}>+{data.score_awarded ?? 0}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center card-compact" style={{ borderStyle: 'dashed' }}>
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No structured justification.</p>
                </div>
              )}
            </div>

            {/* Score input */}
            <div className="p-5" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="text-label mb-3 block" style={{ color: 'var(--text-faint)' }}>Final Score</label>
              <div className="flex items-center gap-3 mb-3">
                <input id="score-input" type="number" step="0.5" min="0" max={current.max_score}
                  value={score} onChange={e => setScore(e.target.value)}
                  className="input flex-1 text-3xl font-semibold text-center py-3"
                  style={{ borderColor: scoreColor, borderWidth: '2px' }}
                />
                <span className="text-2xl font-semibold" style={{ color: 'var(--text-faint)' }}>/ {current.max_score}</span>
              </div>
              <div className="progress-track mb-5">
                <div className="progress-fill transition-all duration-300" style={{ width: `${pct}%`, background: scoreColor }} />
              </div>

              <div className="flex flex-col gap-2.5">
                <button onClick={handleApprove} disabled={submitting}
                  className="btn-primary btn-primary-lg w-full py-3.5">
                  {submitting ? <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                  Approve Score
                </button>
                <button onClick={() => setShowOverride(true)} disabled={submitting}
                  className="btn-ghost w-full py-2.5 font-semibold" style={{ borderColor: 'var(--error-border)', color: 'var(--error-text)' }}>
                  Reject & Override...
                </button>
              </div>

              {feedback && (
                <div className={`alert mt-3 animate-fade-in ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {feedback.text}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="card p-4" style={{ background: 'var(--bg-muted)' }}>
            <h4 className="text-label mb-3" style={{ color: 'var(--text-faint)' }}>Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2 text-caption">
              {[['Approve', 'Enter'], ['Override', 'R'], ['Prev Page', '←'], ['Next Page', '→'], ['Prev Sub', '['], ['Next Sub', ']']].map(([label, key]) => (
                <div key={key} className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <kbd className="px-2 py-0.5 font-mono font-semibold" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(28,28,28,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="card-featured p-8 max-w-lg w-full" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-md)' }}>
            <h3 className="text-card-title font-semibold mb-1" style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>Override AI Score</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Provide a brief justification for changing the AI's grade.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>New Score (out of {current.max_score})</label>
                <input type="number" step="0.5" value={score} onChange={e => setScore(e.target.value)} className="input font-semibold" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Reason <span style={{ color: 'var(--error-text)' }}>*</span></label>
                <textarea rows={3} value={overrideComment} onChange={e => setOverrideComment(e.target.value)}
                  placeholder="Why is the AI score incorrect?"
                  className="input resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowOverride(false)} className="btn-cream flex-1 py-3 font-semibold" style={{ background: 'var(--bg-muted)' }}>Cancel</button>
              <button onClick={handleOverride} disabled={submitting || !overrideComment.trim()}
                className="btn-primary btn-primary-lg flex-1 py-3" style={{ background: 'var(--error-text)', color: '#fff' }}>
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
