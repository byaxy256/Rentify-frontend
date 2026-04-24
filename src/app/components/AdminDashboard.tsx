import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  Settings, 
  Shield, 
  TrendingUp, 
  LogOut,
  AlertTriangle,
  FileText,
  BarChart3,
  Database,
  Menu,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { NotificationCenter } from './NotificationCenter';
import { AdminOverview } from './admin/AdminOverview';
import { UserManagement } from './admin/UserManagement';
import { PropertyManagement } from './admin/PropertyManagement';
import { PlatformAnalytics } from './admin/PlatformAnalytics';
import { SystemSettings } from './admin/SystemSettings';
import { AuditLogs } from './admin/AuditLogs';
import { SupportTickets } from './admin/SupportTickets';
import { RevenueTracking } from './admin/RevenueTracking';
import { requestFunction } from '../lib/functionClient';

type View = 'overview' | 'users' | 'properties' | 'analytics' | 'revenue' | 'support' | 'audit' | 'settings';

export function AdminDashboard() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Checking system health...');
  const navigate = useNavigate();
  const adminName = localStorage.getItem('adminName') || 'System Admin';

  useEffect(() => {
    const verifyAdminAccess = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        navigate('/');
        return;
      }

      const meResponse = await requestFunction('/auth/me', {
        headers: {
          'x-user-token': accessToken,
        },
      });

      const meResult = await meResponse.json().catch(() => ({}));
      const role = meResult?.data?.user?.role;
      const email = meResult?.data?.user?.email;

      if (!meResponse.ok || (role !== 'admin' && email !== 'admin@rentify.com')) {
        localStorage.removeItem('adminName');
        localStorage.removeItem('userRole');
        navigate('/');
      }
    };

    const loadSystemHealth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;

      const response = await requestFunction('/admin/overview', {
        headers: {
          'x-user-token': accessToken,
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const health = result?.data?.health;
      if (!health) return;

      setSystemStatus(`Uptime ${health.uptimePercent}% • Errors ${health.errorRatePercent}%`);
    };

    verifyAdminAccess();
    loadSystemHealth();
    const interval = window.setInterval(loadSystemHealth, 15000);
    return () => window.clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    [
      'accessToken',
      'adminName',
      'userEmail',
      'userRole',
      'userName',
      'userId',
      'requiresPasswordChange',
    ].forEach((key) => localStorage.removeItem(key));
    navigate('/');
  };

  const menuItems = [
    { id: 'overview' as View, icon: LayoutDashboard, label: 'Overview' },
    { id: 'users' as View, icon: Users, label: 'User Management' },
    { id: 'properties' as View, icon: Building2, label: 'Properties' },
    { id: 'analytics' as View, icon: BarChart3, label: 'Analytics' },
    { id: 'revenue' as View, icon: CreditCard, label: 'Revenue Tracking' },
    { id: 'support' as View, icon: AlertTriangle, label: 'Support Tickets' },
    { id: 'audit' as View, icon: FileText, label: 'Audit Logs' },
    { id: 'settings' as View, icon: Settings, label: 'System Settings' },
  ];

  return (
    <div className="relative flex h-screen bg-gray-50 overflow-hidden">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#1e3a3f] to-[#0f1f22] shadow-lg flex flex-col transform transition-transform duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-[#2d5358]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl text-white font-bold">Rentify</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-yellow-400">System Admin</p>
          <p className="text-sm text-gray-300 mt-1">{adminName}</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === item.id
                  ? 'bg-yellow-400 text-[#1e3a3f] font-semibold'
                  : 'text-gray-300 hover:bg-[#2d5358] hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2d5358]">
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400 font-semibold">System Status</span>
            </div>
            <p className="text-xs text-gray-300">{systemStatus}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-xl md:text-2xl font-semibold capitalize">{currentView.replace('-', ' ')}</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
              ADMIN ACCESS
            </span>
          </div>
          <NotificationCenter userType="admin" />
        </div>

        <div className="p-4 md:p-8">
          {currentView === 'overview' && <AdminOverview />}
          {currentView === 'users' && <UserManagement />}
          {currentView === 'properties' && <PropertyManagement />}
          {currentView === 'analytics' && <PlatformAnalytics />}
          {currentView === 'revenue' && <RevenueTracking />}
          {currentView === 'support' && <SupportTickets />}
          {currentView === 'audit' && <AuditLogs />}
          {currentView === 'settings' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}