import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Users, Search, Mail, Phone, Home, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit?: string | null;
  building?: string | null;
  buildingId?: string;
  rent: number;
  assigned: boolean;
  occupation?: string | null;
  nextOfKin?: string | null;
  nextOfKinContact?: string | null;
  assignedDate?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  nextDueDate?: string | null;
}

interface TenantsManagementProps {
  selectedProperty?: string;
}

export function TenantsManagement({ selectedProperty = 'all' }: TenantsManagementProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('assigned');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDueDateDialog, setShowDueDateDialog] = useState(false);
  const [dueDateTenant, setDueDateTenant] = useState<Tenant | null>(null);
  const [dueDateValue, setDueDateValue] = useState('');
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/tenants/landlord', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load tenants');
        setTenants([]);
        return;
      }

      const mapped: Tenant[] = Array.isArray(result.data)
        ? result.data.map((tenant: any) => ({
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone || '',
            unit: tenant.unit,
            building: tenant.building,
            buildingId: tenant.buildingId,
            rent: Number(tenant.rent || 0),
            assigned: Boolean(tenant.assigned),
            occupation: tenant.occupation,
            nextOfKin: tenant.nextOfKin,
            nextOfKinContact: tenant.nextOfKinContact,
            assignedDate: tenant.assignedDate,
            leaseStartDate: tenant.leaseStartDate,
            leaseEndDate: tenant.leaseEndDate,
            nextDueDate: tenant.nextDueDate,
          }))
        : [];

      setTenants(mapped);
    } catch (error) {
      console.error('Load tenants error:', error);
      toast.error('Failed to load tenants');
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowDetailsDialog(true);
  };

  const handleManageDueDate = (tenant: Tenant) => {
    setDueDateTenant(tenant);
    setDueDateValue((tenant.nextDueDate || tenant.assignedDate || '').slice(0, 10));
    setShowDueDateDialog(true);
  };

  const handleSaveDueDate = async () => {
    if (!dueDateTenant?.id || !dueDateValue) {
      toast.error('Please select a valid due date');
      return;
    }

    try {
      setIsSavingDueDate(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction(`/tenants/${dueDateTenant.id}/due-date`, {
        method: 'PUT',
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
        body: JSON.stringify({
          nextDueDate: dueDateValue,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to update due date');
        return;
      }

      toast.success(result?.message || 'Due date updated successfully');
      setShowDueDateDialog(false);
      setDueDateTenant(null);
      await loadTenants();
    } catch (error) {
      console.error('Update due date error:', error);
      toast.error('Failed to update due date');
    } finally {
      setIsSavingDueDate(false);
    }
  };

  const filteredTenants = useMemo(() => tenants.filter(tenant => {
    // Filter by property
    const propertyMatch =
      selectedProperty === 'all' ||
      tenant.buildingId === selectedProperty ||
      tenant.building === selectedProperty;

    const assignmentMatch =
      assignmentFilter === 'all' ||
      (assignmentFilter === 'assigned' ? tenant.assigned : !tenant.assigned);

    // Filter by search query
    const searchMatch =
      !searchQuery ||
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant.unit || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant.building || '').toLowerCase().includes(searchQuery.toLowerCase());

    return propertyMatch && assignmentMatch && searchMatch;
  }), [tenants, selectedProperty, assignmentFilter, searchQuery]);

  const totalTenants = filteredTenants.length;
  const assignedTenants = filteredTenants.filter((tenant) => tenant.assigned).length;
  const unassignedTenants = filteredTenants.filter((tenant) => !tenant.assigned).length;
  const totalAssignedRent = filteredTenants
    .filter((tenant) => tenant.assigned)
    .reduce((sum, tenant) => sum + tenant.rent, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Tenant Management</h2>
        <p className="text-gray-600">Manage your tenants and send payment reminders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Tenants</p>
              <p className="text-3xl">{totalTenants}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Assigned</p>
              <p className="text-3xl">{assignedTenants}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Unassigned</p>
              <p className="text-3xl">{unassignedTenants}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-xl">!</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Assigned Rent Total</p>
              <p className="text-2xl">UGX {totalAssignedRent.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* All Tenants Section */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl mb-1">Tenants</h3>
            <p className="text-sm text-gray-600">Real tenant assignment status and profiles</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={assignmentFilter === 'all' ? 'default' : 'outline'} onClick={() => setAssignmentFilter('all')}>All</Button>
            <Button variant={assignmentFilter === 'assigned' ? 'default' : 'outline'} onClick={() => setAssignmentFilter('assigned')}>Assigned</Button>
            <Button variant={assignmentFilter === 'unassigned' ? 'default' : 'outline'} onClick={() => setAssignmentFilter('unassigned')}>Unassigned</Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, unit, or building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tenants Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">Unit</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Tenant</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Rent</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Next Due</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-sm text-gray-500">Loading tenants...</td>
                </tr>
              )}
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                        <Home className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tenant.unit || 'Not Assigned'}</p>
                        <p className="text-xs text-gray-500">{tenant.building || 'No building'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm">UGX {tenant.rent.toLocaleString()}</td>
                  <td className="p-4 text-sm">{tenant.nextDueDate ? new Date(tenant.nextDueDate).toLocaleDateString() : 'Not set'}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${tenant.assigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                    >
                      {tenant.assigned ? 'Assigned' : 'Unassigned'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(tenant)}
                      >
                        View Details
                      </Button>
                      {tenant.assigned && (
                        <Button
                          size="sm"
                          onClick={() => handleManageDueDate(tenant)}
                        >
                          Manage Due Date
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredTenants.length} of {totalTenants} tenants
          </p>
          <Button className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]" onClick={loadTenants}>Refresh</Button>
        </div>
      </div>

      {/* Tenant Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">{selectedTenant.name}</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedTenant.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedTenant.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedTenant.unit || 'Not assigned'} - {selectedTenant.building || 'No building'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Assigned: {selectedTenant.assignedDate ? new Date(selectedTenant.assignedDate).toLocaleDateString() : 'Not assigned'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupation:</span>
                  <span className="font-medium">{selectedTenant.occupation || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next of Kin:</span>
                  <span className="font-medium">{selectedTenant.nextOfKin || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kin Contact:</span>
                  <span className="font-medium">{selectedTenant.nextOfKinContact || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lease Start:</span>
                  <span className="font-medium">{selectedTenant.leaseStartDate ? new Date(selectedTenant.leaseStartDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lease End:</span>
                  <span className="font-medium">{selectedTenant.leaseEndDate ? new Date(selectedTenant.leaseEndDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next Due Date:</span>
                  <span className="font-medium">{selectedTenant.nextDueDate ? new Date(selectedTenant.nextDueDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rent:</span>
                  <span className="font-medium">UGX {selectedTenant.rent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${selectedTenant.assigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedTenant.assigned ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDueDateDialog} onOpenChange={setShowDueDateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Next Due Date</DialogTitle>
          </DialogHeader>
          {dueDateTenant && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium">{dueDateTenant.name}</p>
                <p className="text-gray-600">{dueDateTenant.building || 'No building'} - {dueDateTenant.unit || 'No unit'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">Next Due Date</label>
                <Input
                  type="date"
                  value={dueDateValue}
                  onChange={(e) => setDueDateValue(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleSaveDueDate} disabled={isSavingDueDate || !dueDateValue}>
                {isSavingDueDate ? 'Saving...' : 'Save Due Date'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
