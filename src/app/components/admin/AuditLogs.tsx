import { FileText, Filter, Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'failed';
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const response = await requestFunction('/audit/logs');
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data?.message || 'Failed to load audit logs');
        return;
      }

      const backendLogs: AuditLog[] = Array.isArray(data?.data?.logs)
        ? data.data.logs.map((log: any) => ({
            id: log.id,
            timestamp: new Date(log.timestamp).toLocaleString(),
            user: log.user || 'System',
            action: log.action || 'UNKNOWN_ACTION',
            details: log.details || '',
            ipAddress: log.ipAddress || 'N/A',
            status: log.status === 'failed' ? 'failed' : 'success',
          }))
        : [];

      setLogs(backendLogs);
    } catch (error) {
      console.error('Load audit logs error:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
    const interval = window.setInterval(loadAuditLogs, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredLogs = useMemo(() => logs.filter(log => 
    filterStatus === 'all' || log.status === filterStatus
  ), [logs, filterStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Audit Logs</h2>
        <p className="text-gray-600">System activity and security logs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Events</span>
            <FileText className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{logs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Successful</span>
            <FileText className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{logs.filter(l => l.status === 'success').length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Failed</span>
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">{logs.filter(l => l.status === 'failed').length}</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl mb-1">Activity Logs</h3>
            <p className="text-sm text-gray-600">Complete system audit trail</p>
          </div>
          <select
            aria-label="Filter audit log status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {isLoading && (
            <div className="px-6 py-4 text-sm text-gray-500">Loading audit logs...</div>
          )}
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Timestamp</th>
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Action</th>
                <th className="text-left p-4">Details</th>
                <th className="text-left p-4">IP Address</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{log.user}</td>
                  <td className="p-4">
                    <span className="font-medium">{log.action}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{log.details}</td>
                  <td className="p-4 text-sm font-mono">{log.ipAddress}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
