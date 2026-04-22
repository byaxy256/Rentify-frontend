import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { dataStore } from '../../lib/data';
import { toast } from 'sonner';

interface PaymentTrackingProps {
  selectedProperty?: string;
}

export function PaymentTracking({ selectedProperty = 'all' }: PaymentTrackingProps) {
  const allPayments = dataStore.getPayments();
  const allBuildings = dataStore.getBuildings();

  // Filter by selected property
  const buildings = selectedProperty === 'all'
    ? allBuildings
    : allBuildings.filter((building) => building.id === selectedProperty);

  const selectedBuildingNames = new Set(buildings.map((building) => building.name));
  const payments = selectedProperty === 'all'
    ? allPayments
    : allPayments.filter((payment) => payment.building ? selectedBuildingNames.has(payment.building) : false);
  const [showReminders, setShowReminders] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  const completedPayments = payments.filter(p => p.status === 'completed');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Get all tenants
  const allTenants = buildings.flatMap(b =>
    b.floors.flatMap(f =>
      f.units.filter(u => u.isOccupied && u.tenant).map(u => ({
        email: u.tenant!.email,
        name: u.tenant!.name,
        phone: u.tenant!.phone,
        unit: u.unitNumber,
        building: b.name
      }))
    )
  );

  const handleToggleTenant = (email: string) => {
    setSelectedTenants(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSendReminders = () => {
    if (selectedTenants.length === 0) {
      toast.error('Please select at least one tenant');
      return;
    }

    // In production, this would send actual notifications
    toast.success(`Payment reminders sent to ${selectedTenants.length} tenant(s)`);
    setSelectedTenants([]);
    setShowReminders(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl mb-2">Payment Tracking</h2>
          <p className="text-gray-600">Monitor rent payments and send reminders</p>
        </div>
        <Button onClick={() => setShowReminders(true)}>
          <Send className="w-4 h-4 mr-2" />
          Send Reminders
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#d1e7dd] p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-[#1e3a3f]" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl">UGX {(totalRevenue / 1000000).toFixed(2)}M</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl">{completedPayments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl">{pendingPayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-sm text-gray-600">Date</th>
                <th className="text-left p-4 text-sm text-gray-600">Tenant</th>
                <th className="text-left p-4 text-sm text-gray-600">Unit</th>
                <th className="text-left p-4 text-sm text-gray-600">Amount</th>
                <th className="text-left p-4 text-sm text-gray-600">Method</th>
                <th className="text-left p-4 text-sm text-gray-600">Status</th>
                <th className="text-left p-4 text-sm text-gray-600">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">{payment.date}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{payment.tenantName}</p>
                      <p className="text-sm text-gray-600">{payment.tenantEmail}</p>
                    </div>
                  </td>
                  <td className="p-4">{payment.unitNumber}</td>
                  <td className="p-4 font-medium">UGX {(payment.amount / 1000).toFixed(0)}K</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">{payment.method}</span>
                  </td>
                  <td className="p-4">
                    {payment.status === 'completed' && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                    {payment.status === 'pending' && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                    {payment.status === 'failed' && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {payment.receiptNumber && (
                      <span className="text-sm text-gray-600">{payment.receiptNumber}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Reminders Dialog */}
      <Dialog open={showReminders} onOpenChange={setShowReminders}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Payment Reminders</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select tenants to send payment reminders via SMS and email
            </p>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {allTenants.map((tenant, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedTenants.includes(tenant.email)}
                    onChange={() => handleToggleTenant(tenant.email)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-gray-600">
                      {tenant.building} - Unit {tenant.unit} • {tenant.phone}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowReminders(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendReminders}>
                Send to {selectedTenants.length} Tenant(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}