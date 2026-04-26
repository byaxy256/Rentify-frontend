import { useEffect, useMemo, useState } from 'react';
import {
  AppWindow,
  Bell,
  CreditCard,
  FileText,
  Headphones,
  Home,
  LogOut,
  Shield,
  User,
  Wifi,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TenantProfile } from './tenant/TenantProfile';
import { requestFunction } from '../lib/functionClient';
import { pushNotificationService } from '../lib/pushNotifications';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import rentifyLogo from '../../assets/3aa72baccaf75211fcb9945b355cc6f8037b7f16.png';

type SettingsSectionId =
  | 'profile'
  | 'security'
  | 'notifications'
  | 'payment-methods'
  | 'wifi'
  | 'documents'
  | 'tenancy'
  | 'app-preferences'
  | 'support'
  | 'logout';

interface SettingsSection {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: any;
  colorClass: string;
}

interface SettingsHubProps {
  role: 'tenant' | 'landlord';
  userName: string;
  subtitle?: string;
  onLogout?: () => void;
  onNavigateToView?: (view: string) => void;
  onOpenLeaseViewer?: () => void;
}

const tenantSections: SettingsSection[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'View and update your personal information.',
    icon: User,
    colorClass: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Change password, PIN and two-factor settings.',
    icon: Shield,
    colorClass: 'bg-green-50 text-green-600',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Choose what alerts you want to receive and how.',
    icon: Bell,
    colorClass: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    description: 'Manage your mobile money or other payment options.',
    icon: CreditCard,
    colorClass: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'wifi',
    title: 'Wi-Fi Settings',
    description: 'View your active plan, connected device and Wi-Fi settings.',
    icon: Wifi,
    colorClass: 'bg-cyan-50 text-cyan-600',
  },
  {
    id: 'documents',
    title: 'Documents & Agreements',
    description: 'View and download your lease agreement and other documents.',
    icon: FileText,
    colorClass: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'tenancy',
    title: 'Tenancy Information',
    description: 'View details about your unit, lease period and move-in date.',
    icon: Home,
    colorClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'app-preferences',
    title: 'App Preferences',
    description: 'Customize your app experience (theme, language, etc).',
    icon: AppWindow,
    colorClass: 'bg-slate-50 text-slate-600',
  },
  {
    id: 'support',
    title: 'Help & Support',
    description: 'Get help, view FAQs or contact our support team.',
    icon: Headphones,
    colorClass: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'logout',
    title: 'Logout',
    description: 'Sign out of your account securely.',
    icon: LogOut,
    colorClass: 'bg-rose-50 text-rose-600',
  },
];

const landlordSections: SettingsSection[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'View and update your account profile information.',
    icon: User,
    colorClass: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Update your password and account protection settings.',
    icon: Shield,
    colorClass: 'bg-green-50 text-green-600',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage notification preferences for payments and requests.',
    icon: Bell,
    colorClass: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    description: 'Configure payout and collection payment methods.',
    icon: CreditCard,
    colorClass: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'documents',
    title: 'Documents & Agreements',
    description: 'Manage tenant agreements and uploaded documents.',
    icon: FileText,
    colorClass: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'tenancy',
    title: 'Property Information',
    description: 'View default tenancy and property policy details.',
    icon: Home,
    colorClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'app-preferences',
    title: 'App Preferences',
    description: 'Customize dashboard behavior and display preferences.',
    icon: AppWindow,
    colorClass: 'bg-slate-50 text-slate-600',
  },
  {
    id: 'support',
    title: 'Help & Support',
    description: 'Get help, documentation and contact support.',
    icon: Headphones,
    colorClass: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'logout',
    title: 'Logout',
    description: 'Sign out of your account securely.',
    icon: LogOut,
    colorClass: 'bg-rose-50 text-rose-600',
  },
];

export function SettingsHub({ role, userName, subtitle, onLogout, onNavigateToView, onOpenLeaseViewer }: SettingsHubProps) {
  const sections = useMemo(() => (role === 'tenant' ? tenantSections : landlordSections), [role]);
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>('profile');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyRequests, setNotifyRequests] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [defaultPhoneNumber, setDefaultPhoneNumber] = useState('');
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('System');
  const [assignmentInfo, setAssignmentInfo] = useState<any>(null);

  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];

  const settingsStorageKey = `settings:${role}:${(localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'session').toLowerCase()}`;

  useEffect(() => {
    const stored = localStorage.getItem(settingsStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.notificationsEnabled === 'boolean') setNotificationsEnabled(parsed.notificationsEnabled);
        if (typeof parsed.notifyPayments === 'boolean') setNotifyPayments(parsed.notifyPayments);
        if (typeof parsed.notifyRequests === 'boolean') setNotifyRequests(parsed.notifyRequests);
        if (typeof parsed.notifyMessages === 'boolean') setNotifyMessages(parsed.notifyMessages);
        if (parsed.preferredPaymentMethod) setPreferredPaymentMethod(parsed.preferredPaymentMethod);
        if (parsed.defaultPhoneNumber) setDefaultPhoneNumber(parsed.defaultPhoneNumber);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.theme) setTheme(parsed.theme);
      } catch {
        // ignore invalid local storage payload
      }
    }

    if (pushNotificationService.isSupported()) {
      setNotificationsEnabled(pushNotificationService.getPermission() === 'granted');
    }
  }, [settingsStorageKey]);

  useEffect(() => {
    localStorage.setItem(
      settingsStorageKey,
      JSON.stringify({
        notificationsEnabled,
        notifyPayments,
        notifyRequests,
        notifyMessages,
        preferredPaymentMethod,
        defaultPhoneNumber,
        language,
        theme,
      }),
    );
  }, [
    defaultPhoneNumber,
    language,
    notifyMessages,
    notifyPayments,
    notifyRequests,
    notificationsEnabled,
    preferredPaymentMethod,
    settingsStorageKey,
    theme,
  ]);

  useEffect(() => {
    if (role !== 'tenant' || !['tenancy', 'documents'].includes(activeSectionId)) {
      return;
    }

    const loadAssignment = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await requestFunction('/tenants/me/assignment', {
          headers: {
            ...(accessToken ? { 'x-user-token': accessToken } : {}),
          },
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          setAssignmentInfo(result?.data || null);
        }
      } catch {
        setAssignmentInfo(null);
      }
    };

    loadAssignment();
  }, [activeSectionId, role]);

  const submitPasswordChange = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      const response = await requestFunction('/auth/change-password', {
        method: 'POST',
        headers: {
          'x-user-token': accessToken,
        },
        body: JSON.stringify({ newPassword, currentPassword }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to change password');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const enableNotifications = async () => {
    const granted = await pushNotificationService.requestPermission();
    setNotificationsEnabled(granted);
  };

  const testNotification = async () => {
    await pushNotificationService.sendNotification({
      title: 'Rentify Notifications',
      body: 'Your notification settings are working correctly.',
      tag: 'settings-test',
    });
  };

  const loadLogoDataUrl = async () => {
    try {
      const response = await fetch(rentifyLogo);
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read logo file'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const downloadBrandedPdf = async (filename: string, title: string, lines: string[]) => {
    const doc = new jsPDF();
    const logoData = await loadLogoDataUrl();

    if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 10, 18, 18);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Rentify', 36, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('renting but smarter', 36, 24);

    doc.setDrawColor(30, 58, 63);
    doc.line(14, 32, 196, 32);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, 14, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    let y = 52;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 6;
    }

    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 285);
    doc.save(filename);
  };

  const renderSectionBody = () => {
    if (role === 'tenant' && activeSection.id === 'profile') {
      return <TenantProfile />;
    }

    switch (activeSection.id) {
      case 'security':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">Change Password</p>
              <Input
                type="password"
                placeholder="Current password (optional)"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <Button className="w-full md:w-auto" onClick={submitPasswordChange} disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">Notification Preferences</p>
              <label className="flex items-center justify-between border rounded-lg p-3">
                <span>Enable device notifications</span>
                <Button size="sm" variant={notificationsEnabled ? 'secondary' : 'default'} onClick={enableNotifications}>
                  {notificationsEnabled ? 'Enabled' : 'Enable'}
                </Button>
              </label>
              <label className="flex items-center justify-between border rounded-lg p-3">
                <span>Payment notifications</span>
                <input type="checkbox" checked={notifyPayments} onChange={(event) => setNotifyPayments(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between border rounded-lg p-3">
                <span>Request status notifications</span>
                <input type="checkbox" checked={notifyRequests} onChange={(event) => setNotifyRequests(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between border rounded-lg p-3">
                <span>Message notifications</span>
                <input type="checkbox" checked={notifyMessages} onChange={(event) => setNotifyMessages(event.target.checked)} />
              </label>
              <Button variant="outline" onClick={testNotification}>Send Test Notification</Button>
            </div>
          </div>
        );

      case 'payment-methods':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">Default Payment Settings</p>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Preferred method</label>
                <select
                  aria-label="Preferred payment method"
                  className="w-full p-2 border rounded-lg"
                  value={preferredPaymentMethod}
                  onChange={(event) => setPreferredPaymentMethod(event.target.value as 'mtn' | 'airtel' | 'bank')}
                >
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="airtel">Airtel Money</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <Input
                type="tel"
                placeholder="Default phone number"
                value={defaultPhoneNumber}
                onChange={(event) => setDefaultPhoneNumber(event.target.value)}
              />
              <p className="text-xs text-gray-600">Saved locally and reused to prefill payment screens.</p>
            </div>
          </div>
        );

      case 'wifi':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">Wi-Fi Settings</p>
              {role === 'tenant' ? (
                <>
                  <p className="text-sm text-gray-600">Open Wi-Fi plans and manage active subscriptions.</p>
                  <Button onClick={() => onNavigateToView?.('wifi-billing')}>Open Wi‑Fi Billing</Button>
                </>
              ) : (
                <p className="text-sm text-gray-600">Wi‑Fi settings are managed on tenant accounts.</p>
              )}
            </div>
          </div>
        );

      case 'documents':
        const downloadLeaseSummary = async () => {
          await downloadBrandedPdf(
            `lease_summary_${new Date().toISOString().slice(0, 10)}.pdf`,
            'Lease Summary',
            [
              `Tenant: ${userName}`,
              `Building: ${assignmentInfo?.building || 'Not assigned'}`,
              `Unit: ${assignmentInfo?.unit || 'Not assigned'}`,
              `Lease Start: ${assignmentInfo?.leaseStartDate || 'Not set'}`,
              `Lease End: ${assignmentInfo?.leaseEndDate || 'Not set'}`,
              `Monthly Rent: UGX ${Number(assignmentInfo?.rent || 0).toLocaleString()}`,
            ],
          );
          toast.success('Lease summary PDF downloaded');
        };

        const downloadPaymentStatement = async () => {
          await downloadBrandedPdf(
            `payment_statement_${new Date().toISOString().slice(0, 10)}.pdf`,
            'Payment Statement',
            [
              `Tenant: ${userName}`,
              `Building: ${assignmentInfo?.building || 'Not assigned'}`,
              `Unit: ${assignmentInfo?.unit || 'Not assigned'}`,
              'Open Payment History in the app for full transaction details.',
            ],
          );
          toast.success('Payment statement PDF downloaded');
        };

        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">Documents & Agreements</p>
              {role === 'tenant' ? (
                <div className="space-y-2">
                  <Button onClick={() => onOpenLeaseViewer?.()}>View Lease Agreement</Button>
                  <Button variant="outline" onClick={() => void downloadLeaseSummary()}>Download Lease Summary</Button>
                  <Button variant="outline" onClick={() => void downloadPaymentStatement()}>Download Payment Statement</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button onClick={() => onNavigateToView?.('documents')}>View Documents & Leases</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void (async () => {
                        await downloadBrandedPdf(
                          `landlord_documents_export_${new Date().toISOString().slice(0, 10)}.pdf`,
                          'Documents Export',
                          [
                            'Role: Landlord',
                            `User: ${userName}`,
                            'Open Documents & Leases in the app for full records.',
                          ],
                        );
                        toast.success('Documents export PDF downloaded');
                      })();
                    }}
                  >
                    Download Documents Export
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'tenancy':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-2">
              <p className="text-lg font-medium">Tenancy Information</p>
              {role === 'tenant' ? (
                <>
                  <p className="text-sm text-gray-600">Building: {assignmentInfo?.building || 'Not assigned'}</p>
                  <p className="text-sm text-gray-600">Unit: {assignmentInfo?.unit || 'Not assigned'}</p>
                  <p className="text-sm text-gray-600">Lease: {assignmentInfo?.leaseStartDate || '—'} to {assignmentInfo?.leaseEndDate || '—'}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">Use Buildings and Documents sections to manage tenancy details.</p>
              )}
            </div>
          </div>
        );

      case 'app-preferences':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">App Preferences</p>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Theme</label>
                <select
                  aria-label="App theme"
                  className="w-full p-2 border rounded-lg"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                >
                  <option value="System">System</option>
                  <option value="Light">Light</option>
                  <option value="Dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Language</label>
                <select
                  aria-label="App language"
                  className="w-full p-2 border rounded-lg"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Luganda">Luganda</option>
                  <option value="Swahili">Swahili</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-3">
              <p className="text-lg font-medium">Help & Support</p>
              <p className="text-sm text-gray-600">Need help? Reach out to the Rentify support team.</p>
              <Button variant="outline" onClick={() => window.open('mailto:support@rentify.com', '_blank')}>Contact Support</Button>
            </div>
          </div>
        );

      case 'logout':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border p-5">
              <p className="text-sm text-gray-600 mb-3">Sign out of your account securely.</p>
              <Button variant="destructive" onClick={onLogout} className="w-full md:w-auto">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="rounded-xl border p-5 text-sm text-gray-600">This section is available and ready for use.</div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-3xl font-semibold">Settings</h3>
          <p className="text-sm text-gray-600 mt-1">Manage your account, preferences and app experience.</p>
        </div>

        <div className="p-5 border-b">
          <div className="rounded-xl border p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xl">{userName}</p>
              <p className="text-sm text-gray-600">{subtitle || (role === 'tenant' ? 'Tenant account' : 'Landlord account')}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSectionId === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveSectionId(section.id);
                  if (section.id === 'logout') {
                    onLogout?.();
                  }
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  isActive ? 'border-[#1e3a3f] bg-[#e8f4f5]' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="mb-5">
          <h3 className="text-3xl font-semibold">What’s in Settings?</h3>
          <p className="text-sm text-gray-600 mt-1">{activeSection.description}</p>
        </div>

        {renderSectionBody()}
      </div>
    </div>
  );
}
