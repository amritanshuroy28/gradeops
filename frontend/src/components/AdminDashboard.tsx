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

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const storage = stats?.storage || {};
  const statusCounts = stats?.status_counts || {};

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h2>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{stats?.submissions || 0}</div>
          <div className="text-sm text-gray-600">Total Submissions</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl font-bold text-green-600">{statusCounts?.graded || 0}</div>
          <div className="text-sm text-gray-600">Graded</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl font-bold text-purple-600">{statusCounts?.reviewed || 0}</div>
          <div className="text-sm text-gray-600">Reviewed</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-3xl font-bold text-orange-600">{statusCounts?.pending || 0}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-4">Storage Usage</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Upload Directory</span>
                <span className="text-sm font-semibold">{(storage?.upload_dir_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{width: '30%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Artifacts Directory</span>
                <span className="text-sm font-semibold">{(storage?.artifacts_dir_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{width: '40%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Disk Usage</span>
                <span className="text-sm font-semibold">{storage?.disk_percent?.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full" style={{width: `${storage?.disk_percent}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>API Server</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Running</span>
            </div>
            <div className="flex justify-between">
              <span>AI Engine</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">Mock Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
