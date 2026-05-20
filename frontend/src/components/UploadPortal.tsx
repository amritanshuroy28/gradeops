import { useState, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import { API_BASE } from '../config';

interface FileEntry { file: File; status: 'idle' | 'uploading' | 'done' | 'error'; }

export default function UploadPortal() {
  const [courseTitle, setCourseTitle] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [examFiles, setExamFiles] = useState<FileEntry[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | ''; message: string }>({ type: '', message: '' });
  const [uploading, setUploading] = useState(false);
  const [rubricDrag, setRubricDrag] = useState(false);
  const [examDrag, setExamDrag] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const rubricRef = useRef<HTMLInputElement>(null);
  const examRef = useRef<HTMLInputElement>(null);

  const addExamFiles = useCallback((files: File[]) => {
    const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setExamFiles(prev => {
      const existing = new Set(prev.map(e => e.file.name));
      const fresh = pdfs.filter(f => !existing.has(f.name)).map(f => ({ file: f, status: 'idle' as const }));
      return [...prev, ...fresh];
    });
  }, []);

  const removeExamFile = (name: string) => setExamFiles(prev => prev.filter(e => e.file.name !== name));

  const handleRubricDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setRubricDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.json') || f.type === 'application/json')) setRubricFile(f);
  };

  const handleExamDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setExamDrag(false);
    addExamFiles(Array.from(e.dataTransfer.files));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricFile) { setStatus({ type: 'error', message: 'Please select a rubric JSON file.' }); return; }
    if (examFiles.length === 0) { setStatus({ type: 'error', message: 'Please select at least one exam PDF.' }); return; }

    setUploading(true);
    setUploadProgress(0);
    setStatus({ type: 'info', message: 'Creating course, exam, and uploading submissions…' });

    try {
      const BASE = API_BASE;
      const rubricText = await rubricFile.text();
      let rubricData: any;
      try { rubricData = JSON.parse(rubricText); }
      catch { setStatus({ type: 'error', message: 'Invalid JSON in rubric file.' }); setUploading(false); return; }

      const courseRes = await fetch(`${BASE}/config/course/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, instructor_id: 1 }),
      });
      if (!courseRes.ok) throw new Error(`Course creation failed: ${await courseRes.text()}`);
      const course = await courseRes.json();

      const examRes = await fetch(`${BASE}/config/exam/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: examTitle, course_id: course.id }),
      });
      if (!examRes.ok) throw new Error(`Exam creation failed: ${await examRes.text()}`);
      const exam = await examRes.json();

      const rubricRes = await fetch(`${BASE}/config/rubric/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: exam.id,
          question_number: rubricData.question_number ?? '1',
          max_score: rubricData.max_score ?? 5.0,
          criteria: rubricData.criteria ?? rubricData,
        }),
      });
      if (!rubricRes.ok) throw new Error(`Rubric upload failed: ${await rubricRes.text()}`);

      let done = 0;
      for (let i = 0; i < examFiles.length; i++) {
        const entry = examFiles[i];
        setExamFiles(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'uploading' } : e));
        const formData = new FormData();
        formData.append('exam_id', exam.id.toString());
        // student_id is derived server-side from filename; pass filename as placeholder
        formData.append('student_id', entry.file.name);
        formData.append('file', entry.file);
        const res = await fetch(`${BASE}/upload/submission/`, { method: 'POST', body: formData });
        if (!res.ok) {
          setExamFiles(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'error' } : e));
        } else {
          setExamFiles(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'done' } : e));
          done++;
        }
        setUploadProgress(Math.round(((i + 1) / examFiles.length) * 100));
      }

      setStatus({ type: 'success', message: `✓ ${done}/${examFiles.length} exam(s) uploaded. AI grading triggered in background.` });
      setCourseTitle(''); setExamTitle(''); setRubricFile(null);
      setTimeout(() => { setExamFiles([]); setUploadProgress(0); }, 2000);
      if (rubricRef.current) rubricRef.current.value = '';
      if (examRef.current) examRef.current.value = '';
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Upload Portal</h2>
        <p className="text-slate-500 dark:text-slate-400 text-base mt-1.5 font-medium">
          Configure exams and bulk-upload scanned student submissions for AI grading.
        </p>
      </div>

      <form onSubmit={handleUpload}>
        <div className="space-y-6">

          {/* Step 1 — Course & Exam */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0">1</span>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Course & Exam Info</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Course Title', placeholder: 'e.g. Intro to Computer Science', val: courseTitle, set: setCourseTitle, id: 'course-title' },
                { label: 'Exam Title',   placeholder: 'e.g. Midterm Exam 1',            val: examTitle,   set: setExamTitle,   id: 'exam-title'   },
              ].map(({ label, placeholder, val, set, id }) => (
                <div key={id} className="space-y-2">
                  <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
                  <input
                    id={id} type="text" placeholder={placeholder} value={val}
                    onChange={e => set(e.target.value)} required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 — Files */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0">2</span>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Upload Files</h3>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Rubric drop zone */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Grading Rubric <span className="text-slate-400 font-normal">(JSON)</span>
                </label>
                <div
                  className={`relative h-44 rounded-xl border-2 border-dashed transition-all duration-200 ${rubricDrag ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[1.01]' : rubricFile ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5'} cursor-pointer`}
                  onDragOver={e => { e.preventDefault(); setRubricDrag(true); }}
                  onDragLeave={() => setRubricDrag(false)}
                  onDrop={handleRubricDrop}
                  onClick={() => rubricRef.current?.click()}
                >
                  <input ref={rubricRef} type="file" accept=".json" className="sr-only"
                    onChange={e => setRubricFile(e.target.files?.[0] || null)} required={!rubricFile} />
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                    {rubricFile ? (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{rubricFile.name}</p>
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-0.5">{formatSize(rubricFile.size)}</p>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); setRubricFile(null); if (rubricRef.current) rubricRef.current.value = ''; }}
                          className="text-xs text-slate-400 hover:text-rose-500 transition-colors">Remove</button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Drop JSON or click to browse</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Strict grading rubric file</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Exam PDFs drop zone */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V9l-5-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 2v7h7" /></svg>
                  Exam Scans <span className="text-slate-400 font-normal">(PDF, bulk)</span>
                </label>
                <div
                  className={`relative h-44 rounded-xl border-2 border-dashed transition-all duration-200 ${examDrag ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[1.01]' : examFiles.length > 0 ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5'} cursor-pointer`}
                  onDragOver={e => { e.preventDefault(); setExamDrag(true); }}
                  onDragLeave={() => setExamDrag(false)}
                  onDrop={handleExamDrop}
                  onClick={() => examRef.current?.click()}
                >
                  <input ref={examRef} type="file" multiple accept=".pdf" className="sr-only"
                    onChange={e => addExamFiles(Array.from(e.target.files || []))} />
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                    {examFiles.length > 0 ? (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl font-black">
                          {examFiles.length}
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{examFiles.length} PDF{examFiles.length > 1 ? 's' : ''} selected</p>
                          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mt-0.5">Drop more to add</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Drop PDFs or click to browse</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Filename used as student ID</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* File list */}
            {examFiles.length > 0 && (
              <div className="px-6 pb-6">
                <div className="rounded-xl border border-slate-100 dark:border-slate-700/60 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Files ({examFiles.length})</span>
                    <button type="button" onClick={() => setExamFiles([])} className="text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium">Clear all</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-700/60">
                    {examFiles.map((entry, i) => (
                      <div key={entry.file.name} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 text-sm animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          {entry.status === 'uploading' && <svg className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>}
                          {entry.status === 'done'     && <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                          {entry.status === 'error'    && <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>}
                          {entry.status === 'idle'     && <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300">{entry.file.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-400">{formatSize(entry.file.size)}</span>
                          {entry.status === 'idle' && (
                            <button type="button" onClick={() => removeExamFile(entry.file.name)} className="text-slate-300 dark:text-slate-600 hover:text-rose-400 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Status message */}
          {status.message && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border-2 text-sm font-medium animate-fade-in ${
              status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' :
              status.type === 'error'   ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300' :
              'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-300'
            }`}>
              {status.type === 'success' && <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
              {status.type === 'error'   && <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>}
              {status.type === 'info'    && <svg className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>}
              <span>{status.message}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="upload-submit-btn"
            type="submit"
            disabled={uploading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-3"
          >
            {uploading ? (
              <><svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg> Uploading & Processing…</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Upload & Trigger AI Grading</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
