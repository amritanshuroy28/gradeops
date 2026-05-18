import { useState, useEffect, useCallback, KeyboardEvent } from 'react';

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
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Override Modal state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideComment, setOverrideComment] = useState('');

  const loadAnswers = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/review/pending');
      const data = await res.json();
      setAnswers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching answers:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnswers();
    const interval = autoRefresh ? setInterval(loadAnswers, 5000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, loadAnswers]);

  const currentAnswer = answers[currentIndex];

  useEffect(() => {
    if (currentAnswer) {
      setScore(currentAnswer.ai_score?.toString() || '0');
      setFeedback(null);
      setShowOverride(false);
      setOverrideComment('');
    }
  }, [currentAnswer]);

  const nextAnswer = () => {
    const newAnswers = answers.filter((_, i) => i !== currentIndex);
    setAnswers(newAnswers);
    if (currentIndex >= newAnswers.length) setCurrentIndex(Math.max(0, newAnswers.length - 1));
  };

  const handleApprove = useCallback(async () => {
    if (!currentAnswer || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await fetch(`http://localhost:8000/review/${currentAnswer.id}/approve?final_score=${score}`, { method: 'POST' });
      setFeedback({ type: 'success', text: 'Score approved successfully!' });
      setTimeout(() => {
        nextAnswer();
        setSubmitting(false);
      }, 500);
    } catch (err) {
      console.error('Error approving:', err);
      setFeedback({ type: 'error', text: 'Failed to approve score.' });
      setSubmitting(false);
    }
  }, [currentAnswer, score, submitting]);

  const handleOverrideSubmit = useCallback(async () => {
    if (!currentAnswer || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams({ final_score: score, comments: overrideComment });
      await fetch(`http://localhost:8000/review/${currentAnswer.id}/override?${params}`, { method: 'POST' });
      setFeedback({ type: 'success', text: 'Score overridden successfully!' });
      setTimeout(() => {
        nextAnswer();
        setSubmitting(false);
        setShowOverride(false);
      }, 500);
    } catch (err) {
      console.error('Error overriding:', err);
      setFeedback({ type: 'error', text: 'Failed to override score.' });
      setSubmitting(false);
    }
  }, [currentAnswer, score, overrideComment, submitting]);


  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    // Don't trigger shortcuts if typing in input/textarea (except specific fields)
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && !e.shiftKey && document.activeElement.id === 'score-input' && !showOverride) {
            e.preventDefault(); handleApprove();
        }
        return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showOverride) { e.preventDefault(); handleApprove(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setShowOverride(true); }
    else if (e.key === 'Escape' && showOverride) { e.preventDefault(); setShowOverride(false); }
    else if (e.key === 'ArrowRight' && currentIndex < answers.length - 1 && !showOverride) setCurrentIndex(prev => prev + 1);
    else if (e.key === 'ArrowLeft' && currentIndex > 0 && !showOverride) setCurrentIndex(prev => prev - 1);
  }, [currentIndex, handleApprove, answers.length, showOverride]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
      </div>
      <p className="text-lg font-bold">Fetching submissions...</p>
    </div>
  );

  if (!currentAnswer || answers.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 animate-fade-in">
      <div className="w-24 h-24 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20">
        <span className="text-5xl">🎉</span>
      </div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Inbox Zero!</h2>
      <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 font-medium">All AI grading decisions have been reviewed.</p>
      <button onClick={loadAnswers} className="mt-8 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
        Check for New Submissions
      </button>
    </div>
  );

  const percent = Math.min(100, Math.max(0, (parseFloat(score || '0') / currentAnswer.max_score) * 100)) || 0;
  const scoreColor = percent >= 80 ? 'bg-emerald-500 dark:bg-emerald-400' : percent >= 60 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400';
  const scoreBg = percent >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/10' : percent >= 60 ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-rose-50 dark:bg-rose-900/10';
  const scoreRing = percent >= 80 ? 'border-emerald-400 dark:border-emerald-500/50 focus:ring-emerald-500/20' : percent >= 60 ? 'border-amber-400 dark:border-amber-500/50 focus:ring-amber-500/20' : 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20';

  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto pb-12 relative">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            TA Review
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-xl">
              {answers.length} pending
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button onClick={loadAnswers} disabled={loading} className="p-3 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" title="Refresh">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <label className="flex items-center gap-3 pr-4 cursor-pointer group">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${autoRefresh ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoRefresh ? 'left-6' : 'left-1'}`} />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Auto-Refresh</span>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="sr-only" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative">
        
        {/* Left Column: Image & Text */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Nav */}
          {answers.length > 1 && (
            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-3 shadow-sm">
              <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="p-3 font-bold text-sm flex items-center gap-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl disabled:opacity-30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Prev
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Submission {currentIndex + 1}</span>
                  <span>Total {answers.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / answers.length) * 100}%` }} />
                </div>
              </div>
              <button onClick={() => setCurrentIndex(i => Math.min(answers.length - 1, i + 1))} disabled={currentIndex === answers.length - 1} className="p-3 font-bold text-sm flex items-center gap-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl disabled:opacity-30">
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {/* Answer Image Display */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentAnswer.student_id}</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{currentAnswer.question}</p>
              </div>
              <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                ID: {currentAnswer.id}
              </div>
            </div>
            
            <div className="p-6 bg-slate-100 dark:bg-slate-900/50 min-h-[400px] flex items-center justify-center">
               <img src={currentAnswer.image_url} alt="Answer Crop" className="max-h-[600px] rounded-lg shadow-md border-2 border-slate-200 dark:border-slate-700 object-contain bg-white" />
            </div>

            {/* Gallery if multi-page */}
            {currentAnswer.all_pages && currentAnswer.all_pages.length > 1 && (
               <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Full Document Pages</p>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                     {currentAnswer.all_pages.map((url, i) => (
                        <div key={i} className="flex-shrink-0 w-32 h-40 border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-indigo-400 transition-colors">
                           <img src={url} alt={`Page ${i+1}`} className="w-full h-full object-cover bg-white" />
                        </div>
                     ))}
                  </div>
               </div>
            )}
          </div>
          
          {/* Extracted Text (Toggleable) */}
          <details className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary className="p-6 cursor-pointer font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between outline-none">
              <div className="flex items-center gap-3">
                 <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 View Extracted Transcript
              </div>
            </summary>
            <div className="px-6 pb-6 pt-0">
               <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700 text-sm font-mono text-slate-700 dark:text-slate-300 max-h-60 overflow-y-auto scrollbar-thin">
                 {currentAnswer.extracted_text || 'No text extracted.'}
               </div>
            </div>
          </details>

        </div>

        {/* Right Column: AI Grading Panel */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col h-full overflow-hidden">
            
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Evaluation
              </h3>
            </div>

            <div className="p-6 flex-1 overflow-y-auto scrollbar-thin space-y-4">
              {currentAnswer.justification && Object.keys(currentAnswer.justification).length > 0 ? (
                Object.entries(currentAnswer.justification).map(([key, data], idx) => {
                  // Allow flexible schema from AI
                  const met = data.met ?? (data.score_awarded > 0);
                  const points = data.score_awarded ?? 0;
                  
                  return (
                  <div key={key} className={`p-4 rounded-2xl border-2 transition-all ${met ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                        {met ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>}
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-bold text-slate-800 dark:text-white leading-tight">{data.condition || 'Criterion evaluation'}</p>
                        {data.explanation && <p className="text-slate-500 dark:text-slate-400 mt-1 leading-snug">{data.explanation}</p>}
                      </div>
                      <span className={`font-black text-sm flex-shrink-0 ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        +{points}
                      </span>
                    </div>
                  </div>
                )})
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-500">No structured justification provided.</p>
                </div>
              )}
            </div>

            {/* Score controls */}
            <div className={`p-6 border-t border-slate-100 dark:border-slate-700 transition-colors duration-500 ${scoreBg}`}>
              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                Final Score
              </label>
              
              <div className="flex items-center gap-4 mb-5">
                <input 
                  id="score-input" type="number" step="0.5" min="0" max={currentAnswer.max_score}
                  value={score} onChange={e => setScore(e.target.value)}
                  className={`flex-1 px-4 py-3 text-3xl font-black bg-white dark:bg-slate-900 border-2 rounded-2xl text-center focus:outline-none focus:ring-4 transition-all ${scoreRing}`}
                />
                <span className="text-3xl font-black text-slate-400">/ {currentAnswer.max_score}</span>
              </div>
              
              <div className="w-full bg-white dark:bg-slate-700 rounded-full h-3 mb-6 shadow-sm border border-slate-200 dark:border-slate-600">
                <div className={`${scoreColor} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleApprove} disabled={submitting}
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  {submitting ? <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                  Approve Score
                </button>
                <button
                  onClick={() => setShowOverride(true)} disabled={submitting}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold py-3 rounded-xl transition-all"
                >
                  Reject & Override...
                </button>
              </div>

              {feedback && (
                <div className={`mt-4 flex items-center gap-2 text-sm font-bold p-3 rounded-xl border-2 animate-fade-in ${feedback.type === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-rose-100 border-rose-200 text-rose-800'}`}>
                   {feedback.text}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Legend */}
          <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Keyboard Shortcuts</h4>
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Approve</span> <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono text-xs font-bold shadow-sm">Enter</kbd></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Override</span> <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono text-xs font-bold shadow-sm">R</kbd></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Next</span> <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono text-xs font-bold shadow-sm">→</kbd></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Prev</span> <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono text-xs font-bold shadow-sm">←</kbd></div>
             </div>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-8 max-w-lg w-full animate-scale-in">
             <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Override AI Score</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You are overriding the AI's grading decision. Please provide a brief justification.</p>
             
             <div className="space-y-4 mb-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Score (out of {currentAnswer.max_score})</label>
                   <input type="number" step="0.5" value={score} onChange={e => setScore(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 dark:text-white outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Override Reason <span className="text-rose-500">*</span></label>
                   <textarea rows={3} required value={overrideComment} onChange={e => setOverrideComment(e.target.value)} placeholder="Why is the AI score incorrect?" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 dark:text-white outline-none resize-none"></textarea>
                </div>
             </div>
             
             <div className="flex gap-3">
                <button onClick={() => setShowOverride(false)} className="flex-1 py-3 px-4 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleOverrideSubmit} disabled={submitting || !overrideComment.trim()} className="flex-1 py-3 px-4 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-lg shadow-rose-600/30 transition-all">Confirm Override</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
