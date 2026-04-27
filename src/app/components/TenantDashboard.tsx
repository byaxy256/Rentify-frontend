import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Home, CreditCard, FileText, MessageSquare, Zap, LogOut, Calendar, Mail, Menu, X, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationCenter } from './NotificationCenter';
import { TenantOverview } from './tenant/TenantOverview';
import { RentPayment } from './tenant/RentPayment';
import { UtilityBills } from './tenant/UtilityBills';
import { PaymentHistory } from './tenant/PaymentHistory';
import { TenantRequestsView } from './tenant/TenantRequestsView';
import { PaymentPlans } from './tenant/PaymentPlans';
import { TenantMessages } from './tenant/TenantMessages';
import { WiFiBilling } from './tenant/WiFiBilling';
import { LeaseAgreement } from './tenant/LeaseAgreement';
import { TenantAgreement } from './tenant/TenantAgreement';
import { SettingsHub } from './SettingsHub';
import sidebarImage from 'figma:asset/3aa72baccaf75211fcb9945b355cc6f8037b7f16.png';
import { toast } from 'sonner';

type View = 'overview' | 'rent' | 'bills' | 'history' | 'requests' | 'payment-plans' | 'messages' | 'wifi-billing' | 'settings';

export function TenantDashboard() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Tenant';
  const rawUserId = (localStorage.getItem('userId') || '').trim();
  const rawUserEmail = (localStorage.getItem('userEmail') || '').trim().toLowerCase();
  const invalidIdentityValues = new Set(['', 'undefined', 'null', 'tenant']);
  const scopedIdentity = !invalidIdentityValues.has(rawUserId)
    ? `id:${rawUserId}`
    : !invalidIdentityValues.has(rawUserEmail)
      ? `email:${rawUserEmail}`
      : 'session';
  const [showLeaseAgreement, setShowLeaseAgreement] = useState(false);
  const [showLeaseViewer, setShowLeaseViewer] = useState(false);
  const [showTenantAgreement, setShowTenantAgreement] = useState(false);
  const [showTenantAgreementViewer, setShowTenantAgreementViewer] = useState(false);
  const [requireInitialRentPayment, setRequireInitialRentPayment] = useState(false);
  const [autoOpenInitialPayment, setAutoOpenInitialPayment] = useState(false);

  const leaseAcceptedKey = `hasAcceptedLease:${scopedIdentity}`;
  const leaseAcceptedDateKey = `leaseAcceptedDate:${scopedIdentity}`;
  const tenantAgreementAcceptedKey = `hasAcceptedTenantAgreement:${scopedIdentity}`;
  const tenantAgreementAcceptedDateKey = `tenantAgreementAcceptedDate:${scopedIdentity}`;
  const initialRentPaymentKey = `hasCompletedInitialRentPayment:${scopedIdentity}`;

  const getScopedFlag = (scopedKey: string) => localStorage.getItem(scopedKey);

  useEffect(() => {
    const hasAcceptedLease = getScopedFlag(leaseAcceptedKey);
    const hasAcceptedTenantAgreement = getScopedFlag(tenantAgreementAcceptedKey);
    const hasCompletedInitialRentPayment = getScopedFlag(initialRentPaymentKey);

    if (!hasAcceptedLease) {
      setShowLeaseAgreement(true);
      setShowTenantAgreement(false);
      setRequireInitialRentPayment(false);
      setAutoOpenInitialPayment(false);
      return;
    }

    if (!hasAcceptedTenantAgreement) {
      setShowLeaseAgreement(false);
      setShowTenantAgreement(true);
      setRequireInitialRentPayment(false);
      setAutoOpenInitialPayment(false);
      return;
    }

    if (!hasCompletedInitialRentPayment) {
      setShowLeaseAgreement(false);
      setShowTenantAgreement(false);
      setRequireInitialRentPayment(true);
      setCurrentView('rent');
      setAutoOpenInitialPayment(true);
      return;
    }

    setShowLeaseAgreement(false);
    setShowTenantAgreement(false);
    setRequireInitialRentPayment(false);
    setAutoOpenInitialPayment(false);
  }, [leaseAcceptedKey, tenantAgreementAcceptedKey, initialRentPaymentKey]);

  const handleLogout = () => {
    [
      'accessToken',
      'userEmail',
      'userRole',
      'userName',
      'userId',
      'requiresPasswordChange',
      'justChangedTempPassword',
      'adminName',
    ].forEach((key) => localStorage.removeItem(key));
    navigate('/');
  };

  const handleAcceptLease = () => {
    localStorage.setItem(leaseAcceptedKey, 'true');
    localStorage.setItem(leaseAcceptedDateKey, new Date().toISOString());
    setShowLeaseAgreement(false);
    setShowTenantAgreement(true);
    toast.success('Lease agreement accepted successfully!', {
      description: 'Welcome to your new home. You can now access all features.',
    });
  };

  const handleAcceptTenantAgreement = () => {
    localStorage.setItem(tenantAgreementAcceptedKey, 'true');
    localStorage.setItem(tenantAgreementAcceptedDateKey, new Date().toISOString());
    setShowTenantAgreement(false);
    setRequireInitialRentPayment(true);
    setCurrentView('rent');
    setAutoOpenInitialPayment(true);
    toast.success('Tenant agreement accepted.');
  };

  const handleInitialPaymentCompleted = () => {
    localStorage.setItem(initialRentPaymentKey, 'true');
    setRequireInitialRentPayment(false);
    setAutoOpenInitialPayment(false);
    toast.success('Initial 3-month rent payment completed.');
  };

  const menuItems = [
    { id: 'overview' as View, icon: Home, label: 'Overview' },
    { id: 'rent' as View, icon: CreditCard, label: 'Pay Rent' },
    { id: 'bills' as View, icon: Zap, label: 'Utility Bills' },
    { id: 'payment-plans' as View, icon: Calendar, label: 'Payment Plans' },
    { id: 'history' as View, icon: FileText, label: 'Payment History' },
    { id: 'requests' as View, icon: MessageSquare, label: 'Requests' },
    { id: 'messages' as View, icon: Mail, label: 'Messages' },
    { id: 'settings' as View, icon: Settings, label: 'Settings' },
  ];

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
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1e3a3f] shadow-lg flex flex-col transform transition-transform duration-300 md:static md:translate-x-0 ${
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

        <nav className="flex-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (requireInitialRentPayment && item.id !== 'rent') {
                  toast.info('Complete your initial 3-month rent payment first.');
                  setCurrentView('rent');
                  setIsSidebarOpen(false);
                  return;
                }
                setCurrentView(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                currentView === item.id
                  ? 'bg-[#2d5358] text-white'
                  : 'text-gray-300 hover:bg-[#2d5358] hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2d5358]">
          <Button variant="outline" onClick={handleLogout} className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header with Notifications */}
        <div className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-xl md:text-2xl font-semibold capitalize">{currentView === 'rent' ? 'Pay Rent' : currentView === 'history' ? 'Payment History' : currentView}</h2>
          </div>
          <NotificationCenter
            userType="tenant"
            onNotificationClick={(navigateTo) => setCurrentView(navigateTo as View)}
          />
        </div>
        
        <div className="p-4 md:p-8">
          {currentView === 'overview' && (
            <TenantOverview
              onNavigateToPayment={() => setCurrentView('rent')}
              onNavigateToRequests={() => setCurrentView('requests')}
              onViewLease={() => setShowLeaseViewer(true)}
            />
          )}
          {currentView === 'rent' && (
            <RentPayment
              autoOpenInitialPayment={autoOpenInitialPayment}
              onInitialPaymentCompleted={handleInitialPaymentCompleted}
              onPaymentDataLoaded={({ hasRentAssignment, isFirstRentPayment }) => {
                if (hasRentAssignment && !isFirstRentPayment) {
                  localStorage.setItem(initialRentPaymentKey, 'true');
                  setRequireInitialRentPayment(false);
                  setAutoOpenInitialPayment(false);
                }
              }}
            />
          )}
          {currentView === 'bills' && <UtilityBills onNavigateToWiFi={() => setCurrentView('wifi-billing')} />}
          {currentView === 'payment-plans' && <PaymentPlans />}
          {currentView === 'history' && <PaymentHistory />}
          {currentView === 'requests' && <TenantRequestsView />}
          {currentView === 'messages' && <TenantMessages />}
          {currentView === 'wifi-billing' && <WiFiBilling onBack={() => setCurrentView('bills')} />}
          {currentView === 'settings' && (
            <SettingsHub
              role="tenant"
              userName={userName}
              subtitle={`${localStorage.getItem('buildingName') || 'Tenant'} ${localStorage.getItem('unitNumber') ? `· ${localStorage.getItem('unitNumber')}` : ''}`.trim()}
              onLogout={handleLogout}
              onNavigateToView={(view) => setCurrentView(view as View)}
              onOpenLeaseViewer={() => setShowLeaseViewer(true)}
              onOpenTenantAgreementViewer={() => setShowTenantAgreementViewer(true)}
            />
          )}
        </div>
      </div>

      {/* Lease Agreement Dialog - For new tenants (first time) */}
      <LeaseAgreement
        isOpen={showLeaseAgreement}
        onAccept={handleAcceptLease}
        tenantName={userName}
        readOnly={false}
      />

      {/* Lease Viewer Dialog - For viewing existing lease */}
      <LeaseAgreement
        isOpen={showLeaseViewer}
        onClose={() => setShowLeaseViewer(false)}
        tenantName={userName}
        readOnly={true}
      />

      <TenantAgreement
        isOpen={showTenantAgreement}
        onAccept={handleAcceptTenantAgreement}
      />

      <TenantAgreement
        isOpen={showTenantAgreementViewer}
        onClose={() => setShowTenantAgreementViewer(false)}
        readOnly={true}
        onAccept={handleAcceptTenantAgreement}
      />
    </div>
  );
}