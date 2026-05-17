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
  const [feedback, setFeedback] = useState('');

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
      setFeedback('');
    }
  }, [currentAnswer]);

  const handleApprove = useCallback(async () => {
    if (!currentAnswer) return;
    setSubmitting(true);
    setFeedback('');
    try {
      await fetch(`http://localhost:8000/review/${currentAnswer.id}/approve?final_score=${score}`, { method: 'POST' });
      const newAnswers = answers.filter((_, i) => i !== currentIndex);
      setAnswers(newAnswers);
      if (currentIndex >= newAnswers.length) setCurrentIndex(Math.max(0, newAnswers.length - 1));
      setFeedback('approved');
    } catch (err) {
      console.error('Error approving:', err);
      setFeedback('error');
    } finally { setSubmitting(false); }
  }, [currentIndex, currentAnswer, score, answers]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey === false) { e.preventDefault(); handleApprove(); }
    else if (e.key === 'ArrowRight' && currentIndex < answers.length - 1) setCurrentIndex(prev => prev + 1);
    else if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex, handleApprove, answers.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400 animate-fade-in">
      <svg className="w-10 h-10 animate-spin mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
      <p className="text-sm font-medium">Loading submissions...</p>
    </div>
  );

  if (!currentAnswer || answers.length === 0) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="text-lg font-semibold text-slate-700">All caught up!</p>
      <p className="text-sm mt-1">No pending answers to review.</p>
    </div>
  );

  const percent = Math.min(1, (parseFloat(score || '0') / currentAnswer.max_score) * 100) || 0;
  const scoreColor = percent >= 80 ? 'bg-emerald-500' : percent >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const scoreRing = percent >= 80 ? 'text-emerald-600' : percent >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="animate-fade-in space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">TA Review Dashboard</h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {answers.length} pending
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAnswers} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
            Refresh
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-blue-600 w-4 h-4" />
            Auto Refresh
          </label>
        </div>
      </div>

      {/* Navigation */}
      {answers.length > 1 && (
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-2">
          <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / answers.length) * 100}%` }}></div>
            </div>
            <p className="text-center text-xs text-slate-500 mt-1 font-medium">
              Submission {currentIndex + 1} of {answers.length}
            </p>
          </div>
          <button onClick={() => setCurrentIndex(i => Math.min(answers.length - 1, i + 1))} disabled={currentIndex === answers.length - 1} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Image & Extracted Text */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{currentAnswer.student_id}</p>
                  <p className="text-xs text-slate-500">{currentAnswer.question}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 flex items-center justify-center min-h-[320px]">
              <img src={currentAnswer.image_url} alt="Answer" className="max-w-full max-h-[400px] object-contain rounded-xl shadow-sm border border-slate-200/50" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Extracted Text
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed font-mono bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-60 overflow-y-auto scrollbar-thin">{currentAnswer.extracted_text || <span className="text-slate-400 italic">No text extracted.</span>}</p>
          </div>
        </div>

        {/* AI Grading Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707" /></svg>
              AI Grading
            </h3>

            <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
              {Object.entries(currentAnswer.justification || {}).map(([key, data]: [string, any]) => (
                <div key={key} className="p-4 bg-slate-50 rounded-xl border border-slate-100 animate-slide-in-right">
                  <div className="flex items-start gap-3"><span className="text-emerald-500 mt-0.5 flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-700">{data.condition}</p></div>
                    <span className="text-sm font-bold text-emerald-600 flex-shrink-0">+{data.score_awarded} pts</span>
                  </div>
                  {data.explanation && <p className="text-xs text-slate-500 mt-1.5 ml-8">{data.explanation}</p>}
                </div>
              ))}
              {!currentAnswer.justification || Object.keys(currentAnswer.justification).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8 italic">No grading justification available.</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Final Score</label>
                <div className="flex items-end gap-3">
                  <div className="relative flex-1">
                    <input type="number" value={score} onChange={(e) => setScore(e.target.value)} step="0.5" min="0" max={currentAnswer.max_score} className={`w-full px-4 py-3 text-2xl font-bold bg-white border-2 rounded-xl text-center focus:outline-none transition-all ${scoreRing} ${percent >= 80 ? 'border-emerald-200 focus:border-emerald-500' : percent >= 60 ? 'border-amber-200 focus:border-amber-500' : 'border-red-200 focus:border-red-500'}`} />
                  </div>
                  <span className="text-lg font-bold text-slate-400 pb-3">/ {currentAnswer.max_score}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`${scoreColor} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, percent)}%` }}></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleApprove} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all duration-200">
                  {submitting ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Approve</>
                  )}
                </button>
                <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-lg">Enter</span>
              </div>

              {feedback === 'approved' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 p-3 rounded-xl animate-fade-in">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Score approved
                </div>
              )}
              {feedback === 'error' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-xl animate-fade-in">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Failed to approve
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
