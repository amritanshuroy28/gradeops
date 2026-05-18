import { useState, useEffect, useCallback } from 'react';

interface Answer {
  id: string;
  student_id: string;
  question: string;
  image_url: string;
  extracted_text: string;
  ai_score: number;
  max_score: number;
  justification: Record<string, { condition: string; explanation: string; score_awarded: number }>;
}

export default function ReviewDashboard() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', text: string} | null>(null);

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
    }
  }, [currentAnswer]);

  const handleApprove = useCallback(async () => {
    if (!currentAnswer) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await fetch(`http://localhost:8000/review/${currentAnswer.id}/approve?final_score=${score}`, { method: 'POST' });
      const newAnswers = answers.filter((_, i) => i !== currentIndex);
      setAnswers(newAnswers);
      if (currentIndex >= newAnswers.length) setCurrentIndex(Math.max(0, newAnswers.length - 1));
      setFeedback({ type: 'success', text: 'Score approved successfully!' });
      
      if (!autoRefresh) setTimeout(() => setFeedback(null), 2000);

    } catch (err) {
      console.error('Error approving:', err);
      setFeedback({ type: 'error', text: 'Failed to approve score.' });
    } finally { setSubmitting(false); }
  }, [currentIndex, currentAnswer, score, answers, autoRefresh]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' && document.activeElement?.id !== 'score-input') return;
    
    if (e.key === 'Enter' && e.shiftKey === false) { e.preventDefault(); handleApprove(); }
    else if (e.key === 'ArrowRight' && currentIndex < answers.length - 1) setCurrentIndex(prev => prev + 1);
    else if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex, handleApprove, answers.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 animate-fade-in transition-colors">
      <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-6 shadow-sm transition-colors">
        <svg className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
      </div>
      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Fetching submissions...</p>
    </div>
  );

  if (!currentAnswer || answers.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 dark:text-slate-400 animate-fade-in transition-colors">
      <div className="w-24 h-24 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 transition-colors">
        <svg className="w-12 h-12 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">You're all caught up!</h2>
      <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 font-medium transition-colors">There are no pending submissions to review right now.</p>
      <button onClick={loadAnswers} className="mt-8 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
        Check Again
      </button>
    </div>
  );

  const percent = Math.min(1, (parseFloat(score || '0') / currentAnswer.max_score) * 100) || 0;
  const scoreColor = percent >= 80 ? 'bg-emerald-500 dark:bg-emerald-400' : percent >= 60 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400';
  const scoreBg = percent >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/10' : percent >= 60 ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-rose-50 dark:bg-rose-900/10';
  const scoreRing = percent >= 80 ? 'border-emerald-300 dark:border-emerald-500/50 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20' : percent >= 60 ? 'border-amber-300 dark:border-amber-500/50 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-amber-500/20 dark:focus:ring-amber-400/20' : 'border-rose-300 dark:border-rose-500/50 focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500/20 dark:focus:ring-rose-400/20';

  return (
    <div className="animate-fade-in space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3 transition-colors">
            TA Review
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 transition-colors">
              {answers.length} pending
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 transition-colors">Review AI grading decisions and approve final scores.</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <button onClick={loadAnswers} disabled={loading} className="p-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all disabled:opacity-50" title="Refresh">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 transition-colors"></div>
          <label className="flex items-center gap-3 pr-4 cursor-pointer group">
            <div className={`relative w-12 h-6 transition-colors rounded-full ${autoRefresh ? 'bg-indigo-500 dark:bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoRefresh ? 'left-7' : 'left-1'}`}></div>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Auto-Refresh</span>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Image & Text */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Navigation Bar */}
          {answers.length > 1 && (
            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-3 shadow-sm transition-colors duration-300">
              <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="p-3 text-slate-400 dark:text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all disabled:opacity-30 flex gap-2 font-bold text-sm items-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Prev
              </button>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-1 transition-colors">
                  <span>Submission {currentIndex + 1}</span>
                  <span>Total {answers.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden transition-colors">
                  <div className="bg-indigo-500 dark:bg-indigo-400 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${((currentIndex + 1) / answers.length) * 100}%` }}></div>
                </div>
              </div>
              <button onClick={() => setCurrentIndex(i => Math.min(answers.length - 1, i + 1))} disabled={currentIndex === answers.length - 1} className="p-3 text-slate-400 dark:text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all disabled:opacity-30 flex gap-2 font-bold text-sm items-center">
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {/* Image Display */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col transition-colors duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex flex-wrap items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shadow-sm transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">{currentAnswer.student_id}</h3>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 transition-colors">{currentAnswer.question}</p>
                </div>
              </div>
              <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider transition-colors">
                ID: {currentAnswer.id}
              </div>
            </div>
            <div className="bg-slate-100/50 dark:bg-slate-900/50 p-6 sm:p-10 flex items-center justify-center min-h-[400px] transition-colors">
              {/* Added a light background block behind the image so that the black ink is always visible in dark mode */}
              <div className="p-4 bg-white rounded-xl shadow-md border-2 border-slate-200 dark:border-slate-600 inline-block transition-colors">
                <img src={currentAnswer.image_url} alt="Student Answer" className="max-w-full max-h-[600px] object-contain rounded-md" />
              </div>
            </div>
          </div>

          {/* Extracted Text */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/40 dark:shadow-none p-6 sm:p-8 transition-colors duration-300">
            <h3 className="text-sm font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-3 transition-colors">
              <svg className="w-5 h-5 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              AI Extracted Transcript
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border-2 border-slate-100 dark:border-slate-700 transition-colors">
              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-mono max-h-60 overflow-y-auto pr-2 scrollbar-thin transition-colors">
                {currentAnswer.extracted_text || <span className="text-slate-400 dark:text-slate-500 italic">No text extracted by the Vision model.</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: AI Grading Panel */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-full overflow-hidden transition-colors duration-300">
            
            <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex-shrink-0 transition-colors">
              <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-3 transition-colors">
                <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707" /></svg>
                AI Evaluation
              </h3>
            </div>

            <div className="p-6 sm:p-8 flex-1 overflow-y-auto scrollbar-thin bg-white dark:bg-slate-800 transition-colors">
              <div className="space-y-4">
                {currentAnswer.justification && Object.keys(currentAnswer.justification).length > 0 ? (
                  Object.entries(currentAnswer.justification).map(([key, data]: [string, any], idx) => (
                    <div key={key} className={`p-5 rounded-2xl border-2 transition-all ${data.score_awarded > 0 ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700'} animate-slide-in-right`} style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${data.score_awarded > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          {data.score_awarded > 0 ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-base font-bold text-slate-800 dark:text-white leading-tight transition-colors">{data.condition}</p>
                          {data.explanation && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed transition-colors">{data.explanation}</p>}
                        </div>
                        <span className={`text-base font-extrabold flex-shrink-0 pt-1 transition-colors ${data.score_awarded > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          +{data.score_awarded}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 border-dashed transition-colors">
                    <p className="text-base font-medium text-slate-500 dark:text-slate-400">No structured justification provided by AI.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={`p-6 sm:p-8 border-t border-slate-100 dark:border-slate-700 ${scoreBg} transition-colors duration-500 flex-shrink-0`}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-3 transition-colors">Final Score Override</label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <input 
                        id="score-input"
                        type="number" 
                        value={score} 
                        onChange={(e) => setScore(e.target.value)} 
                        step="0.5" 
                        min="0" 
                        max={currentAnswer.max_score} 
                        className={`w-full px-5 py-4 text-3xl font-black bg-white dark:bg-slate-900 border-2 rounded-2xl text-center text-slate-900 dark:text-white focus:outline-none focus:ring-4 transition-all ${scoreRing}`} 
                      />
                    </div>
                    <span className="text-3xl font-black text-slate-400 dark:text-slate-500 transition-colors">/ {currentAnswer.max_score}</span>
                  </div>
                  <div className="w-full bg-white dark:bg-slate-700 rounded-full h-3 mt-5 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-600 transition-colors">
                    <div className={`${scoreColor} h-full rounded-full transition-all duration-500 ease-out`} style={{ width: `${Math.min(100, percent)}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleApprove} 
                    disabled={submitting} 
                    className="w-full inline-flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-5 px-6 rounded-2xl shadow-lg shadow-indigo-600/30 dark:shadow-indigo-900/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-lg"
                  >
                    {submitting ? (
                      <><svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg> Processing...</>
                    ) : (
                      <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Approve Score</>
                    )}
                  </button>
                  <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">
                    Keyboard Shortcut: <span className="bg-slate-200/50 dark:bg-slate-700 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 mx-1">Enter</span>
                  </p>
                </div>

                {feedback && (
                  <div className={`flex items-center gap-3 text-sm font-bold p-4 rounded-xl border-2 animate-fade-in transition-colors ${feedback.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'}`}>
                    {feedback.type === 'success' ? (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    {feedback.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
