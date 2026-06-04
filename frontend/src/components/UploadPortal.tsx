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
        <h2 className="text-sub-heading" style={{ color: 'var(--text-primary)' }}>Upload Portal</h2>
        <p className="text-body mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Configure exams and bulk-upload scanned student submissions for AI grading.
        </p>
      </div>

      <form onSubmit={handleUpload}>
        <div className="space-y-6">

          {/* Step 1 — Course & Exam */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
              <span
                className="w-7 h-7 text-sm font-semibold flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', borderRadius: 'var(--radius-compact)' }}
              >1</span>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Course & Exam Info</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Course Title', placeholder: 'e.g. Intro to Computer Science', val: courseTitle, set: setCourseTitle, id: 'course-title' },
                { label: 'Exam Title',   placeholder: 'e.g. Midterm Exam 1',            val: examTitle,   set: setExamTitle,   id: 'exam-title'   },
              ].map(({ label, placeholder, val, set, id }) => (
                <div key={id} className="space-y-2">
                  <label htmlFor={id} className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                  <input
                    id={id} type="text" placeholder={placeholder} value={val}
                    onChange={e => set(e.target.value)} required
                    className="input"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 — Files */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
              <span
                className="w-7 h-7 text-sm font-semibold flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', borderRadius: 'var(--radius-compact)' }}
              >2</span>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Files</h3>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Rubric drop zone */}
              <div className="space-y-2">
                <label className="text-caption font-semibold flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Grading Rubric <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(JSON)</span>
                </label>
                <div
                  className={`dropzone h-44 ${rubricDrag ? 'active' : rubricFile ? 'has-files' : ''}`}
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
                        <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-card)' }}>
                          <svg className="w-6 h-6" style={{ color: 'var(--success-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-caption font-semibold truncate max-w-[200px]" style={{ color: 'var(--success-text)' }}>{rubricFile.name}</p>
                          <p className="text-caption mt-0.5" style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>{formatSize(rubricFile.size)}</p>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); setRubricFile(null); if (rubricRef.current) rubricRef.current.value = ''; }}
                          className="text-caption transition-colors cursor-pointer" style={{ color: 'var(--text-faint)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--error-text)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                        >Remove</button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }}>
                          <svg className="w-6 h-6" style={{ color: 'var(--text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Drop JSON or click to browse</p>
                          <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }} className="mt-0.5">Strict grading rubric file</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Exam PDFs drop zone */}
              <div className="space-y-2">
                <label className="text-caption font-semibold flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V9l-5-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 2v7h7" /></svg>
                  Exam Scans <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(PDF, bulk)</span>
                </label>
                <div
                  className={`dropzone h-44 ${examDrag ? 'active' : examFiles.length > 0 ? 'has-files' : ''}`}
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
                        <div
                          className="w-12 h-12 flex items-center justify-center text-xl font-semibold"
                          style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-card)', color: 'var(--text-primary)' }}
                        >
                          {examFiles.length}
                        </div>
                        <div className="text-center">
                          <p className="text-caption font-semibold" style={{ color: 'var(--text-primary)' }}>{examFiles.length} PDF{examFiles.length > 1 ? 's' : ''} selected</p>
                          <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }} className="mt-0.5">Drop more to add</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }}>
                          <svg className="w-6 h-6" style={{ color: 'var(--text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Drop PDFs or click to browse</p>
                          <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }} className="mt-0.5">Filename used as student ID</p>
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
                <div className="card-compact overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-label" style={{ color: 'var(--text-faint)' }}>Files ({examFiles.length})</span>
                    <button type="button" onClick={() => setExamFiles([])}
                      className="text-caption transition-colors cursor-pointer" style={{ color: 'var(--text-faint)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--error-text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                    >Clear all</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin">
                    {examFiles.map((entry, i) => (
                      <div key={entry.file.name} className="flex items-center justify-between px-4 py-2.5 text-sm animate-fade-in" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', animationDelay: `${i * 30}ms` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          {entry.status === 'uploading' && <svg className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 0v5h-.581m0 0a8 8 0 01-7.413 7.413" /></svg>}
                          {entry.status === 'done'      && <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success-dot)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                          {entry.status === 'error'     && <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--error-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>}
                          {entry.status === 'idle'      && <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                          <span className="truncate font-medium" style={{ color: 'var(--text-secondary)' }}>{entry.file.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-caption" style={{ color: 'var(--text-faint)' }}>{formatSize(entry.file.size)}</span>
                          {entry.status === 'idle' && (
                            <button type="button" onClick={() => removeExamFile(entry.file.name)}
                              className="transition-colors cursor-pointer" style={{ color: 'var(--text-faint)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--error-text)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                            >
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
              <div className="flex justify-between text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Status message */}
          {status.message && (
            <div className={`alert animate-fade-in ${
              status.type === 'success' ? 'alert-success' :
              status.type === 'error'   ? 'alert-error' :
              'alert-info'
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
            className="btn-primary btn-primary-lg w-full py-4"
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
