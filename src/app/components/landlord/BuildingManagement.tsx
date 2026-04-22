import { useState, useEffect } from 'react';
import { Building2, Plus, Users, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Building, Floor, Unit, Tenant } from '../../lib/data';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface BuildingManagementProps {
  selectedProperty?: string;
  onBuildingsUpdated?: () => void;
}

interface AvailableTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation?: string | null;
  nextOfKin?: string | null;
  nextOfKinContact?: string | null;
}

export function BuildingManagement({ selectedProperty = 'all', onBuildingsUpdated }: BuildingManagementProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [showAddBuilding, setShowAddBuilding] = useState(false);

  const mapApiBuilding = (apiBuilding: any): Building => {
    const floors: Floor[] = (apiBuilding.floors || []).map((floor: any) => ({
      id: floor.id,
      floorNumber: floor.floor_number,
      unitsCount: floor.units_count,
      rentPerUnit: Number(floor.rent_per_unit || 0),
      units: (floor.units || []).map((unit: any) => ({
        id: unit.id,
        unitNumber: unit.unit_number,
        rent: Number(unit.rent || 0),
        isOccupied: Boolean(unit.is_occupied),
        tenant: unit.tenant_id
          ? {
              id: unit.tenant_id,
              name: unit.tenant_name || 'Tenant',
              phone: unit.tenant_phone || '',
              email: unit.tenant_email || '',
              occupation: unit.tenant_occupation || undefined,
              nextOfKin: unit.tenant_next_of_kin || undefined,
              nextOfKinContact: unit.tenant_next_of_kin_contact || undefined,
              assignedDate: unit.tenant_assigned_date || new Date().toISOString().split('T')[0],
            }
          : undefined,
      })),
    }));

    return {
      id: apiBuilding.id,
      name: apiBuilding.name,
      location: apiBuilding.location,
      floors,
      totalUnits: Number(apiBuilding.total_units || 0),
      occupiedUnits: Number(apiBuilding.occupied_units || 0),
    };
  };

  const loadBuildings = async () => {
    try {
      setIsLoadingBuildings(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/buildings', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.message || 'Failed to load buildings');
        setBuildings([]);
        return;
      }

      const buildingsData = Array.isArray(result.data) ? result.data : [];
      const mappedBuildings = buildingsData.map(mapApiBuilding);
      setBuildings(mappedBuildings);
    } catch (error) {
      console.error('Load buildings error:', error);
      toast.error('Failed to load buildings');
      setBuildings([]);
    } finally {
      setIsLoadingBuildings(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const filteredBuildings = selectedProperty === 'all'
    ? buildings
    : buildings.filter((building) => building.id === selectedProperty);
  const [showAssignTenant, setShowAssignTenant] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<{ buildingId: string; floorId: string; unit: Unit } | null>(null);

  // New building form
  const [newBuilding, setNewBuilding] = useState({
    name: '',
    location: '',
    numberOfFloors: 1
  });
  const [floorConfigs, setFloorConfigs] = useState<{ unitsCount: number; rentPerUnit: number }[]>([
    { unitsCount: 6, rentPerUnit: 500000 }
  ]);

  const selectedTenant = availableTenants.find((tenant) => tenant.id === selectedTenantId) || null;

  const loadUnassignedTenants = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/tenants/unassigned', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load available tenants');
        setAvailableTenants([]);
        return;
      }

      const tenants: AvailableTenant[] = Array.isArray(result.data)
        ? result.data.map((tenant: any) => ({
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            occupation: tenant.occupation,
            nextOfKin: tenant.nextOfKin,
            nextOfKinContact: tenant.nextOfKinContact,
          }))
        : [];

      setAvailableTenants(tenants);
    } catch (error) {
      console.error('Load unassigned tenants error:', error);
      toast.error('Failed to load available tenants');
      setAvailableTenants([]);
    }
  };

  const handleFloorsChange = (count: number) => {
    const num = Math.max(1, Math.min(20, count));
    setNewBuilding({ ...newBuilding, numberOfFloors: num });
    
    const newConfigs = Array.from({ length: num }, (_, i) => 
      floorConfigs[i] || { unitsCount: 6, rentPerUnit: 500000 }
    );
    setFloorConfigs(newConfigs);
  };

  const handleAddBuilding = async () => {
    if (!newBuilding.name || !newBuilding.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    const floorsPayload = floorConfigs.map((config, index) => {
      const floorLetter = String.fromCharCode(65 + index); // A, B, C, etc.
      return {
        floor_number: index + 1,
        units_count: config.unitsCount,
        rent_per_unit: config.rentPerUnit,
        unit_numbers: Array.from({ length: config.unitsCount }, (_, unitIndex) =>
          `${floorLetter}${String(unitIndex + 1).padStart(2, '0')}`
        ),
      };
    });

    try {
      const accessToken = localStorage.getItem('accessToken');
        const response = await requestFunction('/buildings', {
        method: 'POST',
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
        body: JSON.stringify({
          name: newBuilding.name,
          location: newBuilding.location,
          floors: floorsPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.message || 'Failed to create building');
        return;
      }

      await loadBuildings();
      onBuildingsUpdated?.();
      setShowAddBuilding(false);
      setNewBuilding({ name: '', location: '', numberOfFloors: 1 });
      setFloorConfigs([{ unitsCount: 6, rentPerUnit: 500000 }]);
      toast.success('Building added successfully!');
    } catch (error) {
      console.error('Create building error:', error);
      toast.error('Failed to create building');
    }
  };

  const handleAssignTenant = async () => {
    if (!selectedUnit || !selectedTenantId) {
      toast.error('Please select a tenant to assign');
      return;
    }

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction(`/units/${selectedUnit.unit.id}/assign-tenant`, {
        method: 'POST',
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
        body: JSON.stringify({
          tenantId: selectedTenantId,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to assign tenant');
        return;
      }

      await loadBuildings();
      onBuildingsUpdated?.();

      const temporaryPassword = result?.data?.temporaryPassword;
      if (temporaryPassword) {
        toast.success(`Tenant assigned and account created. Temporary password: ${temporaryPassword}`, {
          duration: 12000,
        });
      } else {
        toast.success(`Tenant assigned to unit ${selectedUnit.unit.unitNumber}!`);
      }

      setShowAssignTenant(false);
      setSelectedUnit(null);
      setSelectedTenantId('');
      await loadUnassignedTenants();
    } catch (error) {
      console.error('Assign tenant error:', error);
      toast.error('Failed to assign tenant');
    }
  };

  const totalUnits = floorConfigs.reduce((sum, config) => sum + config.unitsCount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl mb-2">Building Management</h2>
          <p className="text-gray-600">Manage your properties, floors, and units</p>
        </div>
        <Button onClick={() => setShowAddBuilding(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Building
        </Button>
      </div>

      {/* Buildings List */}
      <div className="space-y-4">
        {isLoadingBuildings ? (
          <div className="bg-white rounded-xl border p-6 text-sm text-gray-500">Loading buildings...</div>
        ) : filteredBuildings.length === 0 ? (
          <div className="bg-white rounded-xl border p-6 text-sm text-gray-500">No buildings found for this property filter.</div>
        ) : filteredBuildings.map((building) => (
          <div key={building.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedBuilding(expandedBuilding === building.id ? null : building.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-[#4F46E5] p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl">{building.name}</h3>
                    <p className="text-sm text-gray-600">{building.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Occupancy</p>
                    <p className="text-lg">{building.occupiedUnits}/{building.totalUnits}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Floors</p>
                    <p className="text-lg">{building.floors.length}</p>
                  </div>
                  {expandedBuilding === building.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {expandedBuilding === building.id && (
              <div className="border-t p-6 bg-gray-50">
                {building.floors.map((floor) => (
                  <div key={floor.id} className="mb-6 last:mb-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Floor {floor.floorNumber}</h4>
                      <span className="text-sm text-gray-600">
                        {floor.units.filter(u => u.isOccupied).length}/{floor.unitsCount} occupied
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {floor.units.map((unit) => (
                        <div
                          key={unit.id}
                          className={`p-4 rounded-lg border-2 ${
                            unit.isOccupied
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{unit.unitNumber}</span>
                            {unit.isOccupied ? (
                              <Users className="w-4 h-4 text-green-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            UGX {(unit.rent / 1000).toFixed(0)}K/mo
                          </p>
                          {unit.isOccupied && unit.tenant ? (
                            <div className="text-xs">
                              <p className="font-medium text-gray-900">{unit.tenant.name}</p>
                              <p className="text-gray-600">{unit.tenant.phone}</p>
                              {unit.tenant.email && (
                                <p className="text-gray-600">{unit.tenant.email}</p>
                              )}
                              {unit.tenant.occupation && (
                                <p className="text-gray-500 mt-1">{unit.tenant.occupation}</p>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-1 text-xs"
                              onClick={async () => {
                                setSelectedUnit({ buildingId: building.id, floorId: floor.id, unit });
                                setSelectedTenantId('');
                                await loadUnassignedTenants();
                                setShowAssignTenant(true);
                              }}
                            >
                              Assign Tenant
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Building Dialog */}
      <Dialog open={showAddBuilding} onOpenChange={setShowAddBuilding}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Building</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Building Name *</label>
                <Input
                  placeholder="e.g., Sunset Apartments"
                  value={newBuilding.name}
                  onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Location *</label>
                <Input
                  placeholder="e.g., Kampala, Uganda"
                  value={newBuilding.location}
                  onChange={(e) => setNewBuilding({ ...newBuilding, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Number of Floors *</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={newBuilding.numberOfFloors}
                onChange={(e) => handleFloorsChange(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Floor Configuration</h4>
                <div className="text-sm text-gray-600">
                  Total: <span className="font-medium text-[#4F46E5]">{totalUnits} units</span>
                </div>
              </div>
              
              {floorConfigs.map((config, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-3">Floor {index + 1}</h5>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm">Number of Units</label>
                      <Input
                        type="number"
                        min="1"
                        value={config.unitsCount}
                        onChange={(e) => {
                          const newConfigs = [...floorConfigs];
                          newConfigs[index].unitsCount = parseInt(e.target.value) || 1;
                          setFloorConfigs(newConfigs);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">Rent per Unit (UGX)</label>
                      <Input
                        type="number"
                        value={config.rentPerUnit}
                        onChange={(e) => {
                          const newConfigs = [...floorConfigs];
                          newConfigs[index].rentPerUnit = parseInt(e.target.value) || 0;
                          setFloorConfigs(newConfigs);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddBuilding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBuilding}>
                Create Building with {totalUnits} Units
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Tenant Dialog */}
      <Dialog open={showAssignTenant} onOpenChange={setShowAssignTenant}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Tenant to Unit {selectedUnit?.unit.unitNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedUnit && (
              <div className="p-4 bg-[#e8f4f5] rounded-lg">
                <p className="text-sm text-gray-600">Unit Details</p>
                <p className="font-medium">{selectedUnit.unit.unitNumber} • UGX {(selectedUnit.unit.rent / 1000).toFixed(0)}K/month</p>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">Select Unassigned Tenant</h4>
              <div className="space-y-2">
                <label className="text-sm">Tenant *</label>
                <select
                  aria-label="Select unassigned tenant"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a tenant</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} • {tenant.email}
                    </option>
                  ))}
                </select>
                {availableTenants.length === 0 && (
                  <p className="text-xs text-gray-500">No unassigned tenant accounts found.</p>
                )}
              </div>

              {selectedTenant && (
                <div className="rounded-lg border bg-gray-50 p-4 text-sm space-y-1">
                  <p><span className="font-medium">Name:</span> {selectedTenant.name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedTenant.phone || 'N/A'}</p>
                  <p><span className="font-medium">Email:</span> {selectedTenant.email}</p>
                  <p><span className="font-medium">Occupation:</span> {selectedTenant.occupation || 'N/A'}</p>
                  <p><span className="font-medium">Next of Kin:</span> {selectedTenant.nextOfKin || 'N/A'}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAssignTenant(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignTenant}>
                Assign Tenant
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}