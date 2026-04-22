import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Settings, Database, Mail, Shield, Bell, DollarSign, Save } from 'lucide-react';
import { toast } from 'sonner';

export function SystemSettings() {
  const [settings, setSettings] = useState({
    platformName: 'Rentify',
    platformEmail: 'support@rentify.com',
    commissionRate: '5',
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: true,
    autoBackup: true,
    backupFrequency: 'daily',
    maxFileSize: '10',
    sessionTimeout: '30',
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">System Settings</h2>
        <p className="text-gray-600">Configure platform settings and preferences</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center gap-3">
          <Settings className="w-5 h-5 text-[#1e3a3f]" />
          <h3 className="text-xl">General Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Platform Name</label>
            <Input
              value={settings.platformName}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Support Email</label>
            <Input
              type="email"
              value={settings.platformEmail}
              onChange={(e) => setSettings({ ...settings, platformEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Session Timeout (minutes)</label>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-green-500" />
          <h3 className="text-xl">Financial Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Platform Commission Rate (%)</label>
            <Input
              type="number"
              value={settings.commissionRate}
              onChange={(e) => setSettings({ ...settings, commissionRate: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Current rate: {settings.commissionRate}% of each transaction
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center gap-3">
          <Bell className="w-5 h-5 text-yellow-500" />
          <h3 className="text-xl">Notification Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-600">Send notifications via email</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-gray-600">Send notifications via SMS</p>
            </div>
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="text-xl">Security Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-gray-600">Temporarily disable platform access</p>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Database Settings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="text-xl">Database & Backup</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Automatic Backups</p>
              <p className="text-sm text-gray-600">Enable automated database backups</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoBackup}
              onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Max File Upload Size (MB)</label>
            <Input
              type="number"
              value={settings.maxFileSize}
              onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
          onClick={handleSave}
        >
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
