import { useState, useRef, useCallback } from 'react';

interface RubricCriterion {
  id: string;
  condition: string;
  points: number;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadPortal() {
  const [courseTitle, setCourseTitle] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [rubrics, setRubrics] = useState<RubricCriterion[]>([]);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addRubric = () => {
    setRubrics(prev => [...prev, { id: crypto.randomUUID(), condition: '', points: 0 }]);
  };

  const updateRubric = (id: string, field: 'condition' | 'points', value: string) => {
    setRubrics(prev => prev.map(r => r.id === id ? { ...r, [field]: field === 'points' ? Math.max(0, parseFloat(value) || 0) : value } : r));
  };

  const removeRubric = (id: string) => {
    setRubrics(prev => prev.filter(r => r.id !== id));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (!droppedFiles.length) {
      setStatus('Please drop PDF files only.');
      return;
    }
    setFiles(prev => [...prev, ...droppedFiles.map(f => ({ file: f, id: crypto.randomUUID(), status: 'pending' as const }))]);
    setStatus('');
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).map(f => ({ file: f, id: crypto.randomUUID(), status: 'pending' as const }));
    setFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) { setStatus('Please add at least one PDF file.'); return; }
    setUploading(true);
    setStatus('');

    try {
      const courseRes = await fetch('http://localhost:8000/config/course/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, instructor_id: 1 })
      });
      if (!courseRes.ok) throw new Error('Failed to create course');
      const course = await courseRes.json();

      const examRes = await fetch('http://localhost:8000/config/exam/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: examTitle, course_id: course.id })
      });
      if (!examRes.ok) throw new Error('Failed to create exam');
      const exam = await examRes.json();

      for (let i = 0; i < Math.max(rubrics.length, 1); i++) {
        if (rubrics[i] && rubrics[i].condition.trim() === '') continue;
        await fetch('http://localhost:8000/config/rubric/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: exam.id,
            question_number: String(i + 1),
            max_score: 5.0,
            criteria: rubrics[i] || { condition: '', points: 0 }
          })
        });
      }

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'uploading' } : x));
        try {
          const formData = new FormData();
          formData.append('exam_id', exam.id.toString());
          formData.append('student_id', `S${Math.floor(Math.random() * 10000)}`);
          formData.append('file', f.file);
          await fetch('http://localhost:8000/upload/submission/', { method: 'POST', body: formData });
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'done' } : x));
        } catch { setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'error', error: 'Upload failed' } : x)); }
      }

      setStatus('Upload successful! Grading in progress.');
    } catch (error) {
      setStatus('Error: ' + String(error));
    } finally { setUploading(false); }
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const uploadedPercent = files.length > 0 ? Math.round((doneCount / files.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800">Instructor Portal</h2>
        <p className="text-slate-500 mt-1">Configure your exam and upload student submissions for AI grading.</p>
      </div>

      <form onSubmit={handleUpload} className="space-y-8">
        {/* Exam Info */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">1</span>
            Exam Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Course Title</label>
              <input
                type="text"
                placeholder="e.g., CS 101 - Introduction to AI"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
                disabled={uploading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Exam Title</label>
              <input
                type="text"
                placeholder="e.g., Midterm Exam 2024"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
                disabled={uploading}
              />
            </div>
          </div>
        </div>

        {/* Rubrics */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">2</span>
              Rubric Criteria
            </h3>
            <button
              type="button"
              onClick={addRubric}
              disabled={uploading}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add Criterion
            </button>
          </div>

          {rubrics.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              <p className="text-slate-500 text-sm font-medium">No rubric criteria yet.</p>
              <p className="text-slate-400 text-xs mt-1">Click "Add Criterion" to define grading rules.</p>
            </div>
          )}

          {rubrics.length > 0 && <div className="space-y-3">
            {rubrics.map((r, idx) => (
              <div key={r.id} className="flex gap-3 items-start p-4 bg-slate-50/70 rounded-xl border border-slate-200/50 animate-fade-in">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5">{idx + 1}</span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Criterion description (e.g., Correct derivation of formula)"
                      value={r.condition}
                      onChange={(e) => updateRubric(r.id, 'condition', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      disabled={uploading}
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="Points"
                    value={r.points || ''}
                    onChange={(e) => updateRubric(r.id, 'points', e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                    step="0.5"
                    min="0"
                    disabled={uploading}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRubric(r.id)}
                  disabled={uploading}
                  className="flex-shrink-0 mt-0.5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>}
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center text-xs">3</span>
            Student Submissions
          </h3>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              dragOver ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {dragOver ? 'Drop PDFs here' : 'Drag and drop PDF files here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">or click to browse</p>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,application/pdf" multiple className="hidden" disabled={uploading} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Choose Files
              </button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-5 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{files.length} file(s) selected</p>
                {doneCount > 0 && doneCount < files.length && (
                  <span className="text-xs font-medium text-blue-600">{doneCount}/{files.length} uploaded</span>
                )}
              </div>
              {uploading && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${uploadedPercent}%` }}></div>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-2">
                {files.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/50 text-sm group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      f.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                      f.status === 'error' ? 'bg-red-100 text-red-600' :
                      f.status === 'uploading' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {f.status === 'done' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      ) : f.status === 'error' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ) : f.status === 'uploading' ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{f.file.name}</p>
                      {f.error && <p className="text-xs text-red-500">{f.error}</p>}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      disabled={uploading}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
                Uploading... {uploadedPercent}%
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Upload & Grade
              </>
            )}
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded-xl font-medium text-sm animate-fade-in ${
            status.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
