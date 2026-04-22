import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Home, CreditCard, FileText, MessageSquare, Zap, LogOut, Calendar, Mail } from 'lucide-react';
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
import { TenantProfile } from './tenant/TenantProfile';
import { TenantAgreement } from './tenant/TenantAgreement';
import sidebarImage from 'figma:asset/3aa72baccaf75211fcb9945b355cc6f8037b7f16.png';
import { toast } from 'sonner';

type View = 'overview' | 'rent' | 'bills' | 'history' | 'requests' | 'payment-plans' | 'messages' | 'wifi-billing' | 'profile';

export function TenantDashboard() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Tenant';
  const [showLeaseAgreement, setShowLeaseAgreement] = useState(false);
  const [showLeaseViewer, setShowLeaseViewer] = useState(false);
  const [showTenantAgreement, setShowTenantAgreement] = useState(false);
  const [requireInitialRentPayment, setRequireInitialRentPayment] = useState(false);
  const [autoOpenInitialPayment, setAutoOpenInitialPayment] = useState(false);

  useEffect(() => {
    // Check if tenant has accepted the lease agreement
    const hasAcceptedLease = localStorage.getItem('hasAcceptedLease');
    const hasAcceptedTenantAgreement = localStorage.getItem('hasAcceptedTenantAgreement');
    const hasCompletedInitialRentPayment = localStorage.getItem('hasCompletedInitialRentPayment');
    if (!hasAcceptedLease) {
      setShowLeaseAgreement(true);
    } else if (!hasAcceptedTenantAgreement) {
      setShowTenantAgreement(true);
    } else if (!hasCompletedInitialRentPayment) {
      setRequireInitialRentPayment(true);
      setCurrentView('rent');
      setAutoOpenInitialPayment(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleAcceptLease = () => {
    localStorage.setItem('hasAcceptedLease', 'true');
    localStorage.setItem('leaseAcceptedDate', new Date().toISOString());
    setShowLeaseAgreement(false);
    setShowTenantAgreement(true);
    toast.success('Lease agreement accepted successfully!', {
      description: 'Welcome to your new home. You can now access all features.',
    });
  };

  const handleAcceptTenantAgreement = () => {
    localStorage.setItem('hasAcceptedTenantAgreement', 'true');
    setShowTenantAgreement(false);
    setRequireInitialRentPayment(true);
    setCurrentView('rent');
    setAutoOpenInitialPayment(true);
    toast.success('Tenant agreement accepted.');
  };

  const handleInitialPaymentCompleted = () => {
    localStorage.setItem('hasCompletedInitialRentPayment', 'true');
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
    { id: 'profile' as View, icon: Home, label: 'Profile' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e3a3f] shadow-lg flex flex-col">
        <div className="p-6 border-b border-[#2d5358]">
          <h1 className="text-2xl text-white">Rentify</h1>
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
                  return;
                }
                setCurrentView(item.id);
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
      <div className="flex-1 overflow-auto">
        {/* Header with Notifications */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-2xl font-semibold capitalize">{currentView === 'rent' ? 'Pay Rent' : currentView === 'history' ? 'Payment History' : currentView}</h2>
          <NotificationCenter
            userType="tenant"
            onNotificationClick={(navigateTo) => setCurrentView(navigateTo as View)}
          />
        </div>
        
        <div className="p-8">
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
                  localStorage.setItem('hasCompletedInitialRentPayment', 'true');
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
          {currentView === 'profile' && <TenantProfile />}
          {currentView === 'wifi-billing' && <WiFiBilling onBack={() => setCurrentView('bills')} />}
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
    </div>
  );
}