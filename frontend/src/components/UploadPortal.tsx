import { useState, useRef } from 'react';

export default function UploadPortal() {
  const [courseTitle, setCourseTitle] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | ''; message: string }>({ type: '', message: '' });
  const [uploading, setUploading] = useState(false);
  const rubricRef = useRef<HTMLInputElement>(null);
  const examRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rubricFile) {
      setStatus({ type: 'error', message: 'Please select a rubric JSON file' });
      return;
    }

    if (examFiles.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one exam PDF' });
      return;
    }

    setUploading(true);
    setStatus({ type: 'info', message: 'Uploading and processing exams...' });

    try {
      const BACKEND_URL = 'http://localhost:8000';

      const rubricText = await rubricFile.text();
      let rubricData;
      try {
        rubricData = JSON.parse(rubricText);
      } catch (e) {
        setStatus({ type: 'error', message: 'Invalid JSON in rubric file' });
        setUploading(false);
        return;
      }

      const courseRes = await fetch(`${BACKEND_URL}/config/course/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, instructor_id: 1 })
      });
      if (!courseRes.ok) throw new Error(`Course creation failed: ${await courseRes.text()}`);
      const course = await courseRes.json();

      const examRes = await fetch(`${BACKEND_URL}/config/exam/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: examTitle, course_id: course.id })
      });
      if (!examRes.ok) throw new Error(`Exam creation failed: ${await examRes.text()}`);
      const exam = await examRes.json();

      const rubricRes = await fetch(`${BACKEND_URL}/config/rubric/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: exam.id,
          question_number: rubricData.question_number || '1',
          max_score: rubricData.max_score || 5.0,
          criteria: rubricData.criteria || rubricData
        })
      });
      if (!rubricRes.ok) throw new Error(`Rubric upload failed: ${await rubricRes.text()}`);

      let uploadedCount = 0;
      for (const file of examFiles) {
        const formData = new FormData();
        formData.append('exam_id', exam.id.toString());
        formData.append('student_id', `S${Math.floor(Math.random() * 10000)}`);
        formData.append('file', file);

        const submitRes = await fetch(`${BACKEND_URL}/upload/submission/`, {
          method: 'POST',
          body: formData
        });
        if (!submitRes.ok) throw new Error(`Error uploading ${file.name}: ${await submitRes.text()}`);
        uploadedCount++;
      }

      setStatus({ type: 'success', message: `Successfully uploaded ${uploadedCount} exam(s) with rubric. Grading triggered.` });
      setCourseTitle('');
      setExamTitle('');
      setRubricFile(null);
      setExamFiles([]);
      if (rubricRef.current) rubricRef.current.value = '';
      if (examRef.current) examRef.current.value = '';
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">Upload Portal</h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg mt-3 font-medium transition-colors">Configure your exams and bulk upload scanned student submissions for AI grading.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 sm:p-10 md:p-12 transition-colors duration-300">
        <form onSubmit={handleUpload} className="space-y-10">
          
          {/* Section 1: Course Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
                Course Title
              </label>
              <input
                type="text"
                placeholder="e.g. Intro to Computer Science"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
                Exam Title
              </label>
              <input
                type="text"
                placeholder="e.g. Midterm 1"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 dark:bg-slate-700 transition-colors"></div>

          {/* Section 2: Files */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
                Grading Rubric (JSON)
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 transition-colors">Upload the strict grading conditions.</p>
              <div className="relative group h-48">
                <input
                  ref={rubricRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => setRubricFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  required
                />
                <div className={`w-full h-full px-4 py-8 border-2 border-dashed rounded-3xl text-center flex flex-col items-center justify-center transition-all duration-300 ${rubricFile ? 'border-emerald-500 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/10'}`}>
                  {rubricFile ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 transition-colors">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 px-4 truncate w-full transition-colors">{rubricFile.name}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm mb-3 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/50 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                      <span className="text-base font-semibold text-slate-700 dark:text-slate-300 transition-colors">Browse or drop JSON</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
                Exam Scans (PDF)
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 transition-colors">Select multiple scanned student PDFs.</p>
              <div className="relative group h-48">
                <input
                  ref={examRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => setExamFiles(Array.from(e.target.files || []))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  required
                />
                <div className={`w-full h-full px-4 py-8 border-2 border-dashed rounded-3xl text-center flex flex-col items-center justify-center transition-all duration-300 ${examFiles.length > 0 ? 'border-indigo-500 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/10'}`}>
                  {examFiles.length > 0 ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl mb-3 shadow-sm transition-colors">
                        {examFiles.length}
                      </div>
                      <span className="text-base font-bold text-indigo-700 dark:text-indigo-400 transition-colors">PDFs selected</span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm mb-3 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/50 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <span className="text-base font-semibold text-slate-700 dark:text-slate-300 transition-colors">Browse or drop PDFs</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {status.message && (
            <div className={`p-5 rounded-2xl text-base font-medium flex items-center gap-4 shadow-sm animate-fade-in transition-colors duration-300 ${
              status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-500/30' : 
              status.type === 'error' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border-2 border-rose-200 dark:border-rose-500/30' : 
              'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-500/30'
            }`}>
              {status.type === 'success' && <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-700 dark:text-emerald-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
              {status.type === 'error' && <div className="w-8 h-8 rounded-full bg-rose-200 dark:bg-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-700 dark:text-rose-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></div>}
              {status.type === 'info' && <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-700 dark:text-indigo-400"><svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
              <span>{status.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-indigo-600/30 dark:shadow-indigo-900/30 hover:shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-3"
            >
              {uploading ? (
                <>
                  <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11-11v5h-.581m0 0a8.003 8.003 0 01-7.412 7.412" /></svg>
                  Processing Upload...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Upload & Grade
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
