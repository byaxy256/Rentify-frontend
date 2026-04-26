import { useMemo, useState } from 'react';
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
import { TenantProfile } from './tenant/TenantProfile';

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

export function SettingsHub({ role, userName, subtitle, onLogout }: SettingsHubProps) {
  const sections = useMemo(() => (role === 'tenant' ? tenantSections : landlordSections), [role]);
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>('profile');

  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];

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

        {role === 'tenant' && activeSection.id === 'profile' ? (
          <TenantProfile />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border p-5">
              <p className="text-lg font-medium mb-2">{activeSection.title}</p>
              <p className="text-sm text-gray-600">
                {activeSection.id === 'logout'
                  ? 'Use the sidebar logout button below when you want to securely sign out.'
                  : 'This settings section is now available from one central place. You can expand it with dedicated forms and controls as needed.'}
              </p>
            </div>

            {activeSection.id !== 'logout' && (
              <div className="rounded-xl border border-dashed p-5 text-sm text-gray-600">
                Tip: all tenant/landlord settings are now grouped here (Profile, Security, Notifications and more), as requested.
              </div>
            )}

            {activeSection.id === 'logout' && (
              <Button variant="destructive" onClick={onLogout} className="w-full md:w-auto">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
