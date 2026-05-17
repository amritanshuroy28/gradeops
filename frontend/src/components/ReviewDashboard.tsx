import { useState, useEffect, useCallback } from 'react';

export default function ReviewDashboard() {
  const [answers, setAnswers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
    return () => interval && clearInterval(interval);
  }, [autoRefresh, loadAnswers]);

  const currentAnswer = answers[currentIndex];

  useEffect(() => {
    if (currentAnswer) {
      setScore(currentAnswer.ai_score?.toString() || '0');
    }
  }, [currentAnswer]);

  const handleApprove = useCallback(async () => {
    if (!currentAnswer) return;

    try {
      await fetch(`http://localhost:8000/review/${currentAnswer.id}/approve?final_score=${score}`, {
        method: 'POST'
      });
      
      const newAnswers = answers.filter((_, i) => i !== currentIndex);
      setAnswers(newAnswers);
      if (currentIndex >= newAnswers.length) {
        setCurrentIndex(Math.max(0, newAnswers.length - 1));
      }
    } catch (err) {
      console.error('Error approving:', err);
    }
  }, [currentIndex, currentAnswer, score, answers]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApprove();
    } else if (e.key === 'ArrowRight' && currentIndex < answers.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, handleApprove, answers.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!currentAnswer || answers.length === 0) return <div className="p-8 text-center text-gray-500">No pending answers</div>;

  return (
    <div className="flex flex-col h-screen gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">TA Review Dashboard</h2>
        <div className="flex gap-3">
          <button onClick={loadAnswers} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto Refresh
          </label>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex-1 bg-white p-6 rounded-lg shadow-sm overflow-y-auto">
          <div className="mb-4 text-sm font-semibold text-gray-600">
            <span>Student: {currentAnswer.student_id}</span> | <span>{currentAnswer.question}</span>
          </div>
          <div className="bg-gray-100 rounded border p-4 h-96 overflow-y-auto flex items-center justify-center">
            <img src={currentAnswer.image_url} alt="Answer" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
            <strong>Extracted Text:</strong>
            <p className="mt-2 font-mono text-gray-700">{currentAnswer.extracted_text}</p>
          </div>
        </div>

        <div className="w-96 bg-white p-6 rounded-lg shadow-sm overflow-y-auto flex flex-col">
          <h3 className="font-semibold text-lg border-b pb-3 mb-4">AI Grading</h3>
          
          <div className="space-y-2 mb-6 flex-1">
            {Object.entries(currentAnswer.justification || {}).map(([key, data]: [string, any]) => (
              <div key={key} className="p-3 border rounded bg-gray-50">
                <div className="font-medium text-sm">{data.condition}</div>
                <div className="text-xs text-gray-600 mt-1">{data.explanation}</div>
                <div className="text-right text-blue-600 font-semibold mt-1">+{data.score_awarded} pts</div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="number" 
                value={score} 
                onChange={(e) => setScore(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-lg font-bold"
                step="0.5"
                min="0"
                max={currentAnswer.max_score}
              />
              <span className="text-gray-500">/ {currentAnswer.max_score}</span>
            </div>
            
            <button 
              onClick={handleApprove}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition"
            >
              Approve (Enter)
            </button>
            <div className="text-center text-sm text-gray-400 mt-2">
              {currentIndex + 1} / {answers.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
