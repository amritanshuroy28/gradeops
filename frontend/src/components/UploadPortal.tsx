import { useState, useRef } from 'react';

export default function UploadPortal() {
  const [courseTitle, setCourseTitle] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const rubricRef = useRef<HTMLInputElement>(null);
  const examRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rubricFile) {
      setStatus('Error: Please select a rubric JSON file');
      return;
    }

    if (examFiles.length === 0) {
      setStatus('Error: Please select at least one exam PDF');
      return;
    }

    setUploading(true);

    try {
      // Parse rubric JSON
      const rubricText = await rubricFile.text();
      const rubricData = JSON.parse(rubricText);

      // Create course
      const courseRes = await fetch('http://localhost:8000/config/course/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, instructor_id: 1 })
      });
      const course = await courseRes.json();

      // Create exam
      const examRes = await fetch('http://localhost:8000/config/exam/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: examTitle, course_id: course.id })
      });
      const exam = await examRes.json();

      // Upload rubric criteria
      await fetch('http://localhost:8000/config/rubric/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: exam.id,
          question_number: rubricData.question_number || '1',
          max_score: rubricData.max_score || 5.0,
          criteria: rubricData.criteria || rubricData
        })
      });

      // Upload exam PDFs
      for (const file of examFiles) {
        const formData = new FormData();
        formData.append('exam_id', exam.id.toString());
        formData.append('student_id', `S${Math.floor(Math.random() * 10000)}`);
        formData.append('file', file);

        await fetch('http://localhost:8000/upload/submission/', {
          method: 'POST',
          body: formData
        });
      }

      setStatus(`Success! Uploaded ${examFiles.length} exam(s) with rubric. Grading in progress.`);
      setCourseTitle('');
      setExamTitle('');
      setRubricFile(null);
      setExamFiles([]);
      if (rubricRef.current) rubricRef.current.value = '';
      if (examRef.current) examRef.current.value = '';
    } catch (error) {
      setStatus('Error: ' + String(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Exams</h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
              <input
                type="text"
                placeholder="Course Title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Exam</label>
              <input
                type="text"
                placeholder="Exam Title"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rubric (JSON)</label>
            <input
              ref={rubricRef}
              type="file"
              accept=".json"
              onChange={(e) => setRubricFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-600 file:px-2 file:py-1 file:rounded file:text-xs file:bg-blue-50 file:text-blue-700 file:cursor-pointer file:border-0 file:mr-2"
              required
            />
            {rubricFile && <p className="text-xs text-gray-500 mt-1">Selected: {rubricFile.name}</p>}
            <p className="text-xs text-gray-500 mt-1">Example: {"{ \"max_score\": 5, \"criteria\": { \"q1\": { \"condition\": \"...\", \"points\": 5 } } }"}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exam PDFs</label>
            <input
              ref={examRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => setExamFiles(Array.from(e.target.files || []))}
              className="block w-full text-xs text-gray-600 file:px-2 file:py-1 file:rounded file:text-xs file:bg-green-50 file:text-green-700 file:cursor-pointer file:border-0 file:mr-2"
              required
            />
            {examFiles.length > 0 && <p className="text-xs text-gray-500 mt-1">{examFiles.length} PDF(s) selected</p>}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-1.5 rounded font-medium hover:bg-blue-700 disabled:opacity-50 text-sm transition"
          >
            {uploading ? 'Uploading...' : 'Upload & Grade'}
          </button>

          {status && (
            <div className={`p-2 rounded text-xs border ${
              status.includes('Success') 
                ? 'bg-green-50 text-green-800 border-green-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {status}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
