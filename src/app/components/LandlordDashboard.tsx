import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CreditCard, MessageSquare, Users, LayoutDashboard, LogOut, Zap, Download, FileText, TrendingDown, Bell, Mail, Menu, X, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationCenter } from './NotificationCenter';
import { toast } from 'sonner';
import { requestFunction } from '../lib/functionClient';
import { Overview } from './landlord/Overview';
import { BuildingManagement } from './landlord/BuildingManagement';
import { PaymentTracking } from './landlord/PaymentTracking';
import { BillPayments } from './landlord/BillPayments';
import { TenantRequests } from './landlord/TenantRequests';
import { Reports } from './landlord/Reports';
import { TenantsManagement } from './landlord/TenantsManagement';
import { ExpenseTracking } from './landlord/ExpenseTracking';
import { PaymentReminders } from './landlord/PaymentReminders';
import { DocumentsAndLeases } from './landlord/DocumentsAndLeases';
import { LandlordMessages } from './landlord/LandlordMessages';
import { LandlordOnboarding } from './landlord/LandlordOnboarding';
import { SettingsHub } from './SettingsHub';

type View = 'overview' | 'buildings' | 'tenants' | 'payments' | 'bills' | 'requests' | 'reports' | 'documents' | 'expenses' | 'reminders' | 'messages' | 'settings';

export function LandlordDashboard() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([
    { id: 'all', name: 'All Properties' },
  ]);
  const [backendBuildings, setBackendBuildings] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Landlord';

  const checkPasswordRequirement = async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      navigate('/');
      return true;
    }

    try {
      const response = await requestFunction('/auth/me', {
        headers: {
          'x-user-token': accessToken,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      const requiresPasswordChange = Boolean(data?.data?.user?.requiresPasswordChange);

      if (requiresPasswordChange) {
        localStorage.setItem('requiresPasswordChange', 'true');
        setShowPasswordChange(true);
        return true;
      }

      localStorage.setItem('requiresPasswordChange', 'false');
      return false;
    } catch {
      const localFlag = localStorage.getItem('requiresPasswordChange') === 'true';
      if (localFlag) {
        setShowPasswordChange(true);
        return true;
      }
      return false;
    }
  };

  const loadProperties = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const role = localStorage.getItem('userRole');
      const justChangedTempPassword = localStorage.getItem('justChangedTempPassword') === 'true';
      const onboardingCompleted = localStorage.getItem('landlordOnboardingComplete') === 'true';
      const response = await requestFunction('/buildings', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) return;

      const backendProperties = Array.isArray(data.data)
        ? data.data.map((building: any) => ({ id: building.id, name: building.name }))
        : [];
      const backendBuildingsList = Array.isArray(data.data) ? data.data : [];

      setBackendBuildings(backendBuildingsList);

      setProperties([{ id: 'all', name: 'All Properties' }, ...backendProperties]);

      const hasIncompleteBuildings = backendBuildingsList.some((building: any) => {
        const floors = Array.isArray(building.floors) ? building.floors : [];
        if (floors.length === 0) return true;
        return floors.some((floor: any) => {
          const units = Array.isArray(floor.units) ? floor.units : [];
          return units.length === 0;
        });
      });
      const shouldPromptOnboarding =
        role === 'landlord' &&
        ((backendProperties.length === 0 && (justChangedTempPassword || !onboardingCompleted)) || hasIncompleteBuildings);

      setShowOnboarding(shouldPromptOnboarding);
    } catch {
      setProperties([{ id: 'all', name: 'All Properties' }]);
      const role = localStorage.getItem('userRole');
      const justChangedTempPassword = localStorage.getItem('justChangedTempPassword') === 'true';
      const onboardingCompleted = localStorage.getItem('landlordOnboardingComplete') === 'true';

      if (role === 'landlord' && (justChangedTempPassword || !onboardingCompleted)) {
        setShowOnboarding(true);
      }
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const shouldBlockDashboard = await checkPasswordRequirement();
      if (!shouldBlockDashboard) {
        await loadProperties();
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedProperty === 'all') return;
    if (!properties.some((property) => property.id === selectedProperty)) {
      setSelectedProperty('all');
    }
  }, [properties, selectedProperty]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      if (!newPassword || newPassword.length < 8) {
        toast.error('New password must be at least 8 characters long');
        setIsChangingPassword(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        setIsChangingPassword(false);
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('Session expired. Please log in again.');
        navigate('/');
        setIsChangingPassword(false);
        return;
      }

      const response = await requestFunction('/auth/change-password', {
        method: 'POST',
        headers: {
          'x-user-token': accessToken,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to change password');
        setIsChangingPassword(false);
        return;
      }

      localStorage.setItem('requiresPasswordChange', 'false');
      localStorage.setItem('justChangedTempPassword', 'true');
      localStorage.removeItem('landlordOnboardingComplete');
      setShowPasswordChange(false);
      setShowOnboarding(true);
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Password updated successfully');
      setTimeout(() => {
        loadProperties();
      }, 500);
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An error occurred while changing your password');
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    [
      'accessToken',
      'userEmail',
      'userRole',
      'userName',
      'userId',
      'requiresPasswordChange',
      'justChangedTempPassword',
      'landlordOnboardingComplete',
    ].forEach((key) => localStorage.removeItem(key));
    navigate('/');
  };

  const menuItems = [
    { id: 'overview' as View, icon: LayoutDashboard, label: 'Overview' },
    { id: 'buildings' as View, icon: Building2, label: 'Buildings' },
    { id: 'tenants' as View, icon: Users, label: 'Tenants' },
    { id: 'payments' as View, icon: CreditCard, label: 'Payments' },
    { id: 'bills' as View, icon: Zap, label: 'Bill Payments' },
    { id: 'documents' as View, icon: FileText, label: 'Documents & Leases' },
    { id: 'expenses' as View, icon: TrendingDown, label: 'Expenses' },
    { id: 'reminders' as View, icon: Bell, label: 'Payment Reminders' },
    { id: 'requests' as View, icon: MessageSquare, label: 'Tenant Requests' },
    { id: 'reports' as View, icon: Download, label: 'Reports' },
    { id: 'messages' as View, icon: Mail, label: 'Messages' },
    { id: 'settings' as View, icon: Settings, label: 'Settings' },
  ];

  if (showPasswordChange) {
    return (
      <div className="dashboard-theme min-h-screen bg-[#1e3a3f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Change Temporary Password</h2>
            <p className="text-gray-600">
              Welcome {userName}. Please set a new password before continuing.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a3f] focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a3f] focus:border-transparent"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isChangingPassword}
              className="w-full bg-[#1e3a3f] hover:bg-[#2d5358] text-white font-medium py-2"
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-theme relative flex h-screen bg-gray-50 overflow-hidden">
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
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1e3a3f] shadow-lg flex flex-col h-screen transform transition-transform duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-[#2d5358]">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-white">Rentify</h1>
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
          <p className="text-sm text-gray-300 mt-1">{userName}</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              disabled={showOnboarding}
              onClick={() => {
                setCurrentView(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === item.id
                  ? 'bg-[#2d5358] text-white'
                  : 'text-gray-300 hover:bg-[#2d5358] hover:text-white'
              } ${showOnboarding ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2d5358] mt-auto">
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
        {/* Header with Notifications */}
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
            <h2 className="text-xl md:text-2xl font-semibold capitalize">{currentView}</h2>
            <div className="h-6 w-px bg-gray-300" />
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              disabled={showOnboarding}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white hover:bg-gray-50 cursor-pointer"
              aria-label="Select property"
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          <NotificationCenter
            userType="landlord"
            onNotificationClick={(navigateTo) => setCurrentView(navigateTo as View)}
          />
        </div>
        
        <div className="p-4 md:p-8">
          {currentView === 'overview' && <Overview selectedProperty={selectedProperty} />}
          {currentView === 'buildings' && (
            <BuildingManagement
              selectedProperty={selectedProperty}
              onBuildingsUpdated={loadProperties}
            />
          )}
          {currentView === 'tenants' && <TenantsManagement selectedProperty={selectedProperty} />}
          {currentView === 'payments' && <PaymentTracking selectedProperty={selectedProperty} />}
          {currentView === 'bills' && <BillPayments selectedProperty={selectedProperty} />}
          {currentView === 'documents' && <DocumentsAndLeases selectedProperty={selectedProperty} />}
          {currentView === 'expenses' && <ExpenseTracking selectedProperty={selectedProperty} />}
          {currentView === 'reminders' && <PaymentReminders selectedProperty={selectedProperty} />}
          {currentView === 'requests' && <TenantRequests selectedProperty={selectedProperty} />}
          {currentView === 'reports' && <Reports selectedProperty={selectedProperty} />}
          {currentView === 'messages' && <LandlordMessages selectedProperty={selectedProperty} />}
          {currentView === 'settings' && (
            <SettingsHub
              role="landlord"
              userName={userName}
              subtitle={selectedProperty === 'all' ? 'All properties' : properties.find((property) => property.id === selectedProperty)?.name}
              onLogout={handleLogout}
              onNavigateToView={(view) => setCurrentView(view as View)}
            />
          )}
        </div>
      </div>

      <LandlordOnboarding
        open={showOnboarding}
        initialBuildings={backendBuildings}
        onCompleted={async () => {
          setShowOnboarding(false);
          await loadProperties();
          setCurrentView('buildings');
        }}
      />
    </div>
  );
}