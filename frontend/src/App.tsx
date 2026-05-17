import { useState, useEffect } from 'react';
import UploadPortal from './components/UploadPortal';
import ReviewDashboard from './components/ReviewDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const [role, setRole] = useState<'instructor' | 'ta' | 'admin' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const health = async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        if (!res.ok) throw new Error('Backend unavailable');
      } catch (err) {
        console.error('Backend connection failed:', err);
      }
    };
    health();
  }, []);

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold mb-2 text-center text-gray-800">GRADEOPS</h1>
          <p className="text-center text-gray-600 mb-8 text-sm">AI-Powered Exam Grading System</p>
          
          <div className="space-y-3">
            <button
              onClick={() => { setRole('instructor'); setLoading(true); }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition shadow-md"
            >
              📚 Instructor Portal
            </button>
            <button
              onClick={() => { setRole('ta'); setLoading(true); }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition shadow-md"
            >
              ✅ TA Review Dashboard
            </button>
            <button
              onClick={() => { setRole('admin'); setLoading(true); }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition shadow-md"
            >
              ⚙️ Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            GRADEOPS
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded ml-3">
              {role === 'instructor' ? '📚 Instructor' : role === 'ta' ? '✅ TA' : '⚙️ Admin'}
            </span>
          </h1>
          <button 
            onClick={() => setRole(null)} 
            className="text-sm px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {role === 'instructor' && <UploadPortal />}
        {role === 'ta' && <ReviewDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
