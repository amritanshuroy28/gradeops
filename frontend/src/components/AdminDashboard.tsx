import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:8000/monitor/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-4 text-sm">Loading...</div>;

  const storage = stats?.storage || {};
  const statusCounts = stats?.status_counts || {};

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats?.submissions || 0}</div>
          <div className="text-xs text-gray-600">Submissions</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">{statusCounts?.graded || 0}</div>
          <div className="text-xs text-gray-600">Graded</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{statusCounts?.reviewed || 0}</div>
          <div className="text-xs text-gray-600">Reviewed</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{statusCounts?.pending || 0}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-bold mb-3">Storage</h3>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between mb-0.5">
                <span>Uploads</span>
                <span>{(storage?.upload_dir_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '30%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-0.5">
                <span>Artifacts</span>
                <span>{(storage?.artifacts_dir_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-600 h-1.5 rounded-full" style={{width: '40%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-0.5">
                <span>Disk</span>
                <span>{storage?.disk_percent?.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-red-600 h-1.5 rounded-full" style={{width: `${storage?.disk_percent}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-bold mb-3">Health</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Database</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">OK</span>
            </div>
            <div className="flex justify-between">
              <span>API Server</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Running</span>
            </div>
            <div className="flex justify-between">
              <span>NVIDIA NIM</span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
