import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { FileText, Calendar, AlertCircle, Upload, Download, Plus, Eye, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Lease {
  id: string;
  tenantName: string;
  unit: string;
  building: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'expiring-soon' | 'expired';
  documentUrl?: string;
  autoRenew: boolean;
}

const mockLeases: Lease[] = [];

export function LeaseManagement() {
  const [leases, setLeases] = useState<Lease[]>(mockLeases);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New lease form state
  const [newLease, setNewLease] = useState({
    tenantName: '',
    unit: '',
    building: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    autoRenew: false,
  });

  const filteredLeases = leases.filter(
    (lease) =>
      lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeLeasesCount = leases.filter(l => l.status === 'active').length;
  const expiringSoonCount = leases.filter(l => l.status === 'expiring-soon').length;
  const expiredCount = leases.filter(l => l.status === 'expired').length;

  const handleAddLease = () => {
    if (!newLease.tenantName || !newLease.unit || !newLease.startDate || !newLease.endDate || !newLease.monthlyRent) {
      toast.error('Please fill in all required fields');
      return;
    }

    const lease: Lease = {
      id: String(leases.length + 1),
      tenantName: newLease.tenantName,
      unit: newLease.unit,
      building: newLease.building,
      startDate: newLease.startDate,
      endDate: newLease.endDate,
      monthlyRent: parseFloat(newLease.monthlyRent),
      securityDeposit: parseFloat(newLease.securityDeposit),
      status: 'active',
      autoRenew: newLease.autoRenew,
    };

    setLeases([...leases, lease]);
    toast.success('Lease added successfully');
    setShowAddDialog(false);
    setNewLease({
      tenantName: '',
      unit: '',
      building: '',
      startDate: '',
      endDate: '',
      monthlyRent: '',
      securityDeposit: '',
      autoRenew: false,
    });
  };

  const handleViewLease = (lease: Lease) => {
    setSelectedLease(lease);
    setShowViewDialog(true);
  };

  const handleSendReminder = (lease: Lease) => {
    toast.success(`Renewal reminder sent to ${lease.tenantName}`);
  };

  const downloadLeaseDocument = (lease: Lease) => {
    const leaseContent = `
LEASE AGREEMENT
===============

Property: ${lease.unit}, ${lease.building}
Tenant: ${lease.tenantName}

Lease Period:
Start Date: ${new Date(lease.startDate).toLocaleDateString()}
End Date: ${new Date(lease.endDate).toLocaleDateString()}

Financial Terms:
Monthly Rent: UGX ${lease.monthlyRent.toLocaleString()}
Security Deposit: UGX ${lease.securityDeposit.toLocaleString()}

Auto-Renewal: ${lease.autoRenew ? 'Yes' : 'No'}
Status: ${lease.status.toUpperCase()}

This is a computer-generated lease document.
    `;

    const blob = new Blob([leaseContent], { type: 'text/plain' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lease_${lease.unit}_${lease.tenantName.replace(/\s+/g, '_')}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Lease document downloaded');
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: Lease['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'expiring-soon':
        return 'bg-yellow-100 text-yellow-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Lease Management</h2>
        <p className="text-gray-600">Track and manage tenant lease agreements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active Leases</span>
            <FileText className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{activeLeasesCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Expiring Soon (30 days)</span>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl">{expiringSoonCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Expired</span>
            <Calendar className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">{expiredCount}</p>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoonCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800">Leases Expiring Soon</h4>
            <p className="text-sm text-yellow-700 mt-1">
              {expiringSoonCount} lease{expiringSoonCount > 1 ? 's' : ''} will expire in the next 30 days. 
              Consider sending renewal reminders to tenants.
            </p>
          </div>
        </div>
      )}

      {/* Leases Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl mb-1">All Leases</h3>
            <p className="text-sm text-gray-600">Manage tenant lease agreements and renewals</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search leases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button
              className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lease
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Tenant</th>
                <th className="text-left p-4">Unit</th>
                <th className="text-left p-4">Building</th>
                <th className="text-left p-4">Start Date</th>
                <th className="text-left p-4">End Date</th>
                <th className="text-left p-4">Rent</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeases.map((lease) => {
                const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
                return (
                  <tr key={lease.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{lease.tenantName}</p>
                        {lease.autoRenew && (
                          <span className="text-xs text-[#1e3a3f]">🔄 Auto-renew</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{lease.unit}</td>
                    <td className="p-4">{lease.building}</td>
                    <td className="p-4">{new Date(lease.startDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div>
                        <p>{new Date(lease.endDate).toLocaleDateString()}</p>
                        {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                          <p className="text-xs text-yellow-600">{daysUntilExpiry} days left</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">UGX {lease.monthlyRent.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(lease.status)}`}>
                        {lease.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewLease(lease)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadLeaseDocument(lease)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {lease.status === 'expiring-soon' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(lease)}
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lease Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lease</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Tenant Name *</label>
              <Input
                placeholder="Enter tenant name"
                value={newLease.tenantName}
                onChange={(e) => setNewLease({ ...newLease, tenantName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Unit *</label>
                <Input
                  placeholder="e.g., A-101"
                  value={newLease.unit}
                  onChange={(e) => setNewLease({ ...newLease, unit: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Building *</label>
                <Input
                  placeholder="Building name"
                  value={newLease.building}
                  onChange={(e) => setNewLease({ ...newLease, building: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Start Date *</label>
                <Input
                  type="date"
                  value={newLease.startDate}
                  onChange={(e) => setNewLease({ ...newLease, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">End Date *</label>
                <Input
                  type="date"
                  value={newLease.endDate}
                  onChange={(e) => setNewLease({ ...newLease, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Monthly Rent (UGX) *</label>
              <Input
                type="number"
                placeholder="Enter monthly rent"
                value={newLease.monthlyRent}
                onChange={(e) => setNewLease({ ...newLease, monthlyRent: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Security Deposit (UGX)</label>
              <Input
                type="number"
                placeholder="Enter security deposit"
                value={newLease.securityDeposit}
                onChange={(e) => setNewLease({ ...newLease, securityDeposit: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRenew"
                checked={newLease.autoRenew}
                onChange={(e) => setNewLease({ ...newLease, autoRenew: e.target.checked })}
                className="w-4 h-4 text-[#1e3a3f] rounded"
              />
              <label htmlFor="autoRenew" className="text-sm text-gray-700">
                Enable auto-renewal
              </label>
            </div>

            <Button
              className="w-full bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={handleAddLease}
            >
              Add Lease
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Lease Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lease Details</DialogTitle>
          </DialogHeader>
          {selectedLease && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tenant</span>
                  <span className="font-medium">{selectedLease.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit</span>
                  <span className="font-medium">{selectedLease.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Building</span>
                  <span className="font-medium">{selectedLease.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-medium">{new Date(selectedLease.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">End Date</span>
                  <span className="font-medium">{new Date(selectedLease.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rent</span>
                  <span className="font-medium">UGX {selectedLease.monthlyRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-medium">UGX {selectedLease.securityDeposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auto-Renewal</span>
                  <span className="font-medium">{selectedLease.autoRenew ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(selectedLease.status)}`}>
                    {selectedLease.status.replace('-', ' ')}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => downloadLeaseDocument(selectedLease)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Lease Document
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
