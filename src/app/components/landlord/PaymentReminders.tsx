import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Bell, Clock, Mail, MessageSquare, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ReminderSchedule {
  id: string;
  name: string;
  trigger: 'before-due' | 'on-due' | 'after-due';
  daysOffset: number;
  method: 'sms' | 'email' | 'both';
  template: string;
  enabled: boolean;
  lastSent?: string;
}

interface ReminderHistory {
  id: string;
  tenantName: string;
  unit: string;
  sentDate: string;
  method: string;
  status: 'sent' | 'delivered' | 'failed';
  message: string;
}

const defaultTemplates = {
  'before-due': 'Hi {tenant_name}, this is a friendly reminder that your rent payment of UGX {amount} for {unit} is due on {due_date}. Thank you!',
  'on-due': 'Hi {tenant_name}, your rent payment of UGX {amount} for {unit} is due today. Please make payment at your earliest convenience.',
  'after-due': 'Hi {tenant_name}, your rent payment of UGX {amount} for {unit} was due on {due_date} and is now overdue. Please contact us immediately.',
};

const mockSchedules: ReminderSchedule[] = [];

const mockHistory: ReminderHistory[] = [];

interface PaymentRemindersProps {
  selectedProperty?: string;
}

export function PaymentReminders({ selectedProperty = 'all' }: PaymentRemindersProps) {
  const [schedules, setSchedules] = useState<ReminderSchedule[]>(mockSchedules);
  const [history, setHistory] = useState<ReminderHistory[]>(mockHistory);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ReminderSchedule | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    name: '',
    trigger: 'before-due' as ReminderSchedule['trigger'],
    daysOffset: '',
    method: 'both' as ReminderSchedule['method'],
    template: defaultTemplates['before-due'],
  });

  const handleAddSchedule = () => {
    if (!newSchedule.name || !newSchedule.daysOffset) {
      toast.error('Please fill in all required fields');
      return;
    }

    const schedule: ReminderSchedule = {
      id: String(schedules.length + 1),
      name: newSchedule.name,
      trigger: newSchedule.trigger,
      daysOffset: parseInt(newSchedule.daysOffset),
      method: newSchedule.method,
      template: newSchedule.template,
      enabled: true,
    };

    setSchedules([...schedules, schedule]);
    toast.success('Reminder schedule created');
    setShowAddDialog(false);
    setNewSchedule({
      name: '',
      trigger: 'before-due',
      daysOffset: '',
      method: 'both',
      template: defaultTemplates['before-due'],
    });
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules(
      schedules.map((sched) =>
        sched.id === id ? { ...sched, enabled: !sched.enabled } : sched
      )
    );
    const schedule = schedules.find((s) => s.id === id);
    toast.success(`Reminder "${schedule?.name}" ${schedule?.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((sched) => sched.id !== id));
    toast.success('Reminder schedule deleted');
  };

  const handleEditSchedule = (schedule: ReminderSchedule) => {
    setSelectedSchedule(schedule);
    setShowEditDialog(true);
  };

  const handleSendManualReminder = () => {
    toast.success('Manual reminders sent to all tenants with pending payments');
  };

  const getStatusColor = (status: ReminderHistory['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalSent = history.length;
  const delivered = history.filter((h) => h.status === 'delivered').length;
  const failed = history.filter((h) => h.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Payment Reminders</h2>
        <p className="text-gray-600">Automate payment reminders and reduce late payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active Schedules</span>
            <Bell className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{schedules.filter((s) => s.enabled).length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Reminders Sent</span>
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">{totalSent}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Delivered</span>
            <Mail className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{delivered}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Failed</span>
            <Clock className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">{failed}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#e8f4f5] border border-[#1e3a3f]/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Send Manual Reminder</h3>
            <p className="text-sm text-gray-600">
              Send immediate reminders to all tenants with pending payments
            </p>
          </div>
          <Button
            className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
            onClick={handleSendManualReminder}
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Now
          </Button>
        </div>
      </div>

      {/* Reminder Schedules */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl mb-1">Reminder Schedules</h3>
            <p className="text-sm text-gray-600">Configure automatic payment reminders</p>
          </div>
          <Button
            className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </div>

        <div className="divide-y">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{schedule.name}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        schedule.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {schedule.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <strong>Trigger:</strong>{' '}
                      {schedule.trigger === 'before-due'
                        ? `${schedule.daysOffset} days before due date`
                        : schedule.trigger === 'on-due'
                        ? 'On due date'
                        : `${schedule.daysOffset} days after due date`}
                    </p>
                    <p>
                      <strong>Method:</strong> {schedule.method.toUpperCase()}
                    </p>
                    <p className="bg-gray-50 p-2 rounded mt-2 text-xs">
                      <strong>Template:</strong> {schedule.template}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleSchedule(schedule.id)}
                  >
                    {schedule.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditSchedule(schedule)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reminder History */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl mb-1">Reminder History</h3>
          <p className="text-sm text-gray-600">Track sent reminders and their status</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Date & Time</th>
                <th className="text-left p-4">Tenant</th>
                <th className="text-left p-4">Unit</th>
                <th className="text-left p-4">Method</th>
                <th className="text-left p-4">Message</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {item.sentDate}
                    </div>
                  </td>
                  <td className="p-4">{item.tenantName}</td>
                  <td className="p-4">{item.unit}</td>
                  <td className="p-4">{item.method}</td>
                  <td className="p-4">
                    <p className="text-sm text-gray-600 truncate max-w-xs">
                      {item.message}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Reminder Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Schedule Name *</label>
              <Input
                placeholder="e.g., 3 Days Before Due"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Trigger *</label>
              <select
                aria-label="Reminder trigger"
                value={newSchedule.trigger}
                onChange={(e) => {
                  const trigger = e.target.value as ReminderSchedule['trigger'];
                  setNewSchedule({
                    ...newSchedule,
                    trigger,
                    template: defaultTemplates[trigger],
                  });
                }}
                className="w-full p-2 border rounded-lg"
              >
                <option value="before-due">Before Due Date</option>
                <option value="on-due">On Due Date</option>
                <option value="after-due">After Due Date</option>
              </select>
            </div>

            {newSchedule.trigger !== 'on-due' && (
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Days Offset *</label>
                <Input
                  type="number"
                  placeholder="Number of days"
                  value={newSchedule.daysOffset}
                  onChange={(e) => setNewSchedule({ ...newSchedule, daysOffset: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Method *</label>
              <select
                aria-label="Reminder method"
                value={newSchedule.method}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, method: e.target.value as ReminderSchedule['method'] })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="both">Both (SMS & Email)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Message Template *</label>
              <textarea
                className="w-full p-2 border rounded-lg min-h-[100px]"
                placeholder="Enter message template"
                value={newSchedule.template}
                onChange={(e) => setNewSchedule({ ...newSchedule, template: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{tenant_name}'}, {'{amount}'}, {'{unit}'}, {'{due_date}'}
              </p>
            </div>

            <Button
              className="w-full bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={handleAddSchedule}
            >
              Create Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
