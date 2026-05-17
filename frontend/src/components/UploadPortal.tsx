import { useState, useRef } from 'react';

interface RubricCriterion {
  condition: string;
  points: number;
}

export default function UploadPortal() {
  const [courseTitle, setCourseTitle] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [rubrics, setRubrics] = useState<RubricCriterion[]>([{ condition: '', points: 0 }]);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setProgress(0);

    try {
      const courseRes = await fetch('http://localhost:8000/config/course/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, instructor_id: 1 })
      });
      const course = await courseRes.json();

      const examRes = await fetch('http://localhost:8000/config/exam/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: examTitle, course_id: course.id })
      });
      const exam = await examRes.json();

      for (let i = 0; i < rubrics.length; i++) {
        await fetch('http://localhost:8000/config/rubric/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            exam_id: exam.id, 
            question_number: String(i + 1), 
            max_score: 5.0, 
            criteria: rubrics[i]
          })
        });
      }

      let uploaded = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append('exam_id', exam.id.toString());
        formData.append('student_id', `S${Math.floor(Math.random() * 10000)}`);
        formData.append('file', file);

        await fetch('http://localhost:8000/upload/submission/', {
          method: 'POST',
          body: formData
        });
        
        uploaded++;
        setProgress(Math.round((uploaded / files.length) * 100));
      }

      setStatus('Upload successful! Grading in progress.');
    } catch (error) {
      setStatus('Error: ' + String(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Instructor Portal</h2>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Course Title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <input
              type="text"
              placeholder="Exam Title"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <button type="submit" disabled={uploading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {uploading ? `Uploading... ${progress}%` : 'Upload Exams'}
          </button>

          {status && <div className="p-4 bg-gray-100 rounded-lg">{status}</div>}
        </form>
      </div>
    </div>
  );
}
