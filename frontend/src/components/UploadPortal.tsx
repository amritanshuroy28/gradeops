import { useState, useRef } from 'react';

interface RubricCriterion {
  id: string;
  condition: string;
  points: number;
}

export default function UploadPortal() {
  const [courseTitle, setCourseTitle] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [rubrics, setRubrics] = useState<RubricCriterion[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

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

      setStatus('Upload successful! Grading in progress.');
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
            <label className="block text-xs font-medium text-gray-700 mb-2">Rubric Criteria</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {rubrics.map(rubric => (
                <div key={rubric.id} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Condition"
                    value={rubric.condition}
                    onChange={(e) => updateRubric(rubric.id, 'condition', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Points"
                    value={rubric.points}
                    onChange={(e) => updateRubric(rubric.id, 'points', e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeRubric(rubric.id)}
                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRubric}
              className="mt-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium"
            >
              + Add Criterion
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Files</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="block w-full text-xs text-gray-600 file:px-2 file:py-1 file:rounded file:text-xs file:bg-blue-50 file:text-blue-700 file:cursor-pointer file:border-0 file:mr-2"
            />
            {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} file(s)</p>}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-1.5 rounded font-medium hover:bg-blue-700 disabled:opacity-50 text-sm transition"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>

          {status && <div className="p-2 bg-blue-50 rounded text-xs text-blue-800 border border-blue-200">{status}</div>}
        </form>
      </div>
    </div>
  );
}
