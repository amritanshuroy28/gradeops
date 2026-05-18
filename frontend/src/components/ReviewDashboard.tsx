import { useState, useEffect, useCallback } from 'react';

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
      const res = await fetch('http://localhost:8000/review/pending');
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
      await fetch(`http://localhost:8000/review/${current.id}/approve?final_score=${score}`, { method: 'POST' });
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
      await fetch(`http://localhost:8000/review/${current.id}/override?${p}`, { method: 'POST' });
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
      <svg className="w-8 h-8 animate-spin text-indigo-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
      <p className="font-bold">Loading submissions...</p>
    </div>
  );

  if (!current) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400">
      <div className="w-24 h-24 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
        <span className="text-5xl">🎉</span>
      </div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white">Inbox Zero!</h2>
      <p className="mt-2 font-medium">All grading decisions reviewed.</p>
      <button onClick={loadAnswers} className="mt-6 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-sm">
        Check Again
      </button>
    </div>
  );

  const pct = Math.min(100, Math.max(0, (parseFloat(score || '0') / current.max_score) * 100)) || 0;
  const scoreColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  const scoreRing = pct >= 80 ? 'border-emerald-400 focus:ring-emerald-500/20' : pct >= 60 ? 'border-amber-400 focus:ring-amber-500/20' : 'border-rose-400 focus:ring-rose-500/20';

  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto pb-12 relative">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">TA Review</h2>
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-xl">{answers.length} pending</span>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button onClick={loadAnswers} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Refresh">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Auto-Refresh</span>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Submission Switcher */}
      {answers.length > 1 && (
        <div className="flex items-center gap-3 mb-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm">
          <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
            className="px-3 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg> [ Prev
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{current.student_id}</span>
            <span className="text-xs text-slate-400 font-medium ml-2">— {current.question}</span>
            <span className="text-xs text-slate-400 ml-3">({currentIndex + 1}/{answers.length})</span>
          </div>
          <button onClick={() => setCurrentIndex(i => Math.min(answers.length - 1, i + 1))} disabled={currentIndex === answers.length - 1}
            className="px-3 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1">
            Next ] <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Left: Single Page Viewer */}
        <div className="xl:col-span-8 flex flex-col gap-4">

          {/* Page image */}
          <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 relative min-h-[500px] flex flex-col">
            {/* Page header */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-sm font-bold text-slate-200">{current.student_id} · {current.question}</span>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                Page {pageIndex + 1} of {totalPages}
              </span>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
              {currentPageUrl ? (
                <img
                  key={currentPageUrl}
                  src={currentPageUrl}
                  alt={`Page ${pageIndex + 1}`}
                  className="max-h-[620px] max-w-full rounded-xl shadow-xl object-contain bg-white"
                />
              ) : (
                <p className="text-slate-500 font-medium">No image available</p>
              )}
            </div>

            {/* Page navigation */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-t border-slate-800 gap-4">
              <button onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl disabled:opacity-30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Prev Page
              </button>

              {/* Dot strip */}
              <div className="flex gap-1.5 overflow-x-auto max-w-xs flex-wrap justify-center">
                {pages?.map((url, i) => (
                  <button key={i} onClick={() => setPageIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${i === pageIndex ? 'bg-indigo-400 scale-125' : 'bg-slate-600 hover:bg-slate-400'}`} />
                ))}
              </div>

              <button onClick={() => setPageIndex(p => Math.min(p + 1, totalPages - 1))} disabled={pageIndex === totalPages - 1}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl disabled:opacity-30 transition-colors">
                Next Page
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Thumbnail strip */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">All Pages</p>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                {pages?.map((url, i) => (
                  <button key={i} onClick={() => setPageIndex(i)}
                    className={`flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 transition-all ${i === pageIndex ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                    <img src={url} alt={`p${i + 1}`} className="w-full h-full object-cover bg-white" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extracted text toggle */}
          <details className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary className="p-5 cursor-pointer font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 outline-none text-sm">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              View AI-Extracted Transcript
            </summary>
            <div className="px-5 pb-5">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {current.extracted_text || 'No transcript available.'}
              </div>
            </div>
          </details>
        </div>

        {/* Right: Grading Panel */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Evaluation
              </h3>
            </div>

            {/* Criteria list */}
            <div className="p-5 flex-1 overflow-y-auto scrollbar-thin space-y-3 max-h-80">
              {current.justification && Object.keys(current.justification).length > 0 ? (
                Object.entries(current.justification).map(([key, data]) => {
                  const met = data.met ?? (data.score_awarded > 0);
                  return (
                    <div key={key} className={`p-3.5 rounded-xl border-2 ${met ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                          {met
                            ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug">{data.condition || key}</p>
                          {data.explanation && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{data.explanation}</p>}
                        </div>
                        <span className={`text-sm font-black flex-shrink-0 ${met ? 'text-emerald-600' : 'text-slate-400'}`}>+{data.score_awarded ?? 0}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-400">No structured justification.</p>
                </div>
              )}
            </div>

            {/* Score input */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Final Score</label>
              <div className="flex items-center gap-3 mb-3">
                <input id="score-input" type="number" step="0.5" min="0" max={current.max_score}
                  value={score} onChange={e => setScore(e.target.value)}
                  className={`flex-1 px-3 py-3 text-3xl font-black bg-white dark:bg-slate-900 border-2 rounded-2xl text-center focus:outline-none focus:ring-4 transition-all ${scoreRing} dark:text-white`} />
                <span className="text-2xl font-black text-slate-400">/ {current.max_score}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-5">
                <div className={`${scoreColor} h-full rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
              </div>

              <div className="flex flex-col gap-2.5">
                <button onClick={handleApprove} disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-50">
                  {submitting ? <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                  Approve Score
                </button>
                <button onClick={() => setShowOverride(true)} disabled={submitting}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 font-bold py-2.5 rounded-xl hover:bg-rose-50 transition-all">
                  Reject & Override...
                </button>
              </div>

              {feedback && (
                <div className={`mt-3 text-sm font-bold p-3 rounded-xl border-2 animate-fade-in ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {feedback.text}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="bg-slate-100/60 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[['Approve', 'Enter'], ['Override', 'R'], ['Prev Page', '←'], ['Next Page', '→'], ['Prev Sub', '['], ['Next Sub', ']']].map(([label, key]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <kbd className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono font-bold shadow-sm">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-8 max-w-lg w-full">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Override AI Score</h3>
            <p className="text-sm text-slate-500 mb-6">Provide a brief justification for changing the AI's grade.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Score (out of {current.max_score})</label>
                <input type="number" step="0.5" value={score} onChange={e => setScore(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Reason <span className="text-rose-500">*</span></label>
                <textarea rows={3} value={overrideComment} onChange={e => setOverrideComment(e.target.value)}
                  placeholder="Why is the AI score incorrect?"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 dark:text-white outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowOverride(false)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleOverride} disabled={submitting || !overrideComment.trim()}
                className="flex-1 py-3 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-lg transition-all">
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
