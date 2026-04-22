import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface LandlordOnboardingProps {
  open: boolean;
  initialBuildings?: any[];
  onCompleted: () => void;
}

interface FloorSetup {
  floorNumber: number;
  unitsCount: number;
  rentPerUnit: string;
  rubbishPerUnit: string;
}

interface BuildingSetup {
  id?: string;
  name: string;
  location: string;
  floors: FloorSetup[];
}

function createDefaultFloor(floorNumber: number): FloorSetup {
  return {
    floorNumber,
    unitsCount: 4,
    rentPerUnit: '500000',
    rubbishPerUnit: '15000',
  };
}

function createDefaultBuilding(): BuildingSetup {
  return {
    name: '',
    location: '',
    floors: [createDefaultFloor(1)],
  };
}

export function LandlordOnboarding({ open, initialBuildings = [], onCompleted }: LandlordOnboardingProps) {
  const mapInitialBuildings = () => {
    if (!Array.isArray(initialBuildings) || initialBuildings.length === 0) {
      return [createDefaultBuilding()];
    }

    const mapped = initialBuildings.map((building: any) => {
      const floors = Array.isArray(building.floors) && building.floors.length > 0
        ? building.floors.map((floor: any, index: number) => ({
            floorNumber: Number(floor.floor_number || index + 1),
            unitsCount: Number(floor.units_count || floor.units?.length || 1),
            rentPerUnit: String(Number(floor.rent_per_unit || 0) || 500000),
            rubbishPerUnit: '15000',
          }))
        : [createDefaultFloor(1)];

      return {
        id: building.id,
        name: building.name || '',
        location: building.location || '',
        floors,
      } as BuildingSetup;
    });

    return mapped.length > 0 ? mapped : [createDefaultBuilding()];
  };

  const [buildings, setBuildings] = useState<BuildingSetup[]>(mapInitialBuildings());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setBuildings(mapInitialBuildings());
    }
  }, [open, initialBuildings]);

  const updateBuilding = (index: number, updates: Partial<BuildingSetup>) => {
    setBuildings((current) => current.map((building, idx) => idx === index ? { ...building, ...updates } : building));
  };

  const updateFloor = (buildingIndex: number, floorIndex: number, updates: Partial<FloorSetup>) => {
    setBuildings((current) =>
      current.map((building, idx) => {
        if (idx !== buildingIndex) return building;

        return {
          ...building,
          floors: building.floors.map((floor, floorIdx) =>
            floorIdx === floorIndex ? { ...floor, ...updates } : floor
          ),
        };
      })
    );
  };

  const addBuilding = () => {
    setBuildings((current) => [...current, createDefaultBuilding()]);
  };

  const removeBuilding = (index: number) => {
    setBuildings((current) => {
      if (current.length <= 1) {
        toast.error('At least one building is required.');
        return current;
      }
      return current.filter((_, idx) => idx !== index);
    });
  };

  const addFloor = (buildingIndex: number) => {
    setBuildings((current) =>
      current.map((building, idx) => {
        if (idx !== buildingIndex) return building;
        const nextFloorNumber = building.floors.length + 1;
        return {
          ...building,
          floors: [...building.floors, createDefaultFloor(nextFloorNumber)],
        };
      })
    );
  };

  const removeFloor = (buildingIndex: number, floorIndex: number) => {
    setBuildings((current) =>
      current.map((building, idx) => {
        if (idx !== buildingIndex) return building;
        if (building.floors.length <= 1) {
          toast.error('Each building needs at least one floor.');
          return building;
        }

        const nextFloors = building.floors
          .filter((_, idxFloor) => idxFloor !== floorIndex)
          .map((floor, idxFloor) => ({ ...floor, floorNumber: idxFloor + 1 }));

        return {
          ...building,
          floors: nextFloors,
        };
      })
    );
  };

  const validate = () => {
    for (let buildingIndex = 0; buildingIndex < buildings.length; buildingIndex += 1) {
      const building = buildings[buildingIndex];
      if (!building.name.trim() || !building.location.trim()) {
        toast.error(`Fill in building name and location for building ${buildingIndex + 1}.`);
        return false;
      }

      for (let floorIndex = 0; floorIndex < building.floors.length; floorIndex += 1) {
        const floor = building.floors[floorIndex];
        const rent = Number(floor.rentPerUnit);
        const rubbish = Number(floor.rubbishPerUnit);

        if (!Number.isInteger(floor.unitsCount) || floor.unitsCount <= 0) {
          toast.error(`Floor ${floor.floorNumber} in ${building.name} must have at least one unit.`);
          return false;
        }

        if (!Number.isFinite(rent) || rent <= 0) {
          toast.error(`Floor ${floor.floorNumber} in ${building.name} must have a valid rent per unit.`);
          return false;
        }

        if (!Number.isFinite(rubbish) || rubbish < 0) {
          toast.error(`Floor ${floor.floorNumber} in ${building.name} must have a valid rubbish bill amount.`);
          return false;
        }
      }
    }

    return true;
  };

  const submitOnboarding = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      for (const building of buildings) {
        const floors = building.floors.map((floor) => ({
          floor_number: floor.floorNumber,
          units_count: floor.unitsCount,
          rent_per_unit: Number(floor.rentPerUnit),
          rubbish_per_unit: Number(floor.rubbishPerUnit),
          unit_numbers: Array.from({ length: floor.unitsCount }, (_, unitIndex) => {
            const floorPrefix = String.fromCharCode(64 + floor.floorNumber);
            return `${floorPrefix}${String(unitIndex + 1).padStart(2, '0')}`;
          }),
        }));

        const isExistingBuilding = Boolean(building.id);
        const endpoint = isExistingBuilding
          ? `/buildings/${building.id}`
          : '/buildings';

        const response = await requestFunction(endpoint, {
          method: isExistingBuilding ? 'PUT' : 'POST',
          headers: {
            'x-user-token': accessToken,
          },
          body: JSON.stringify({
            name: building.name.trim(),
            location: building.location.trim(),
            floors,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || `Failed to create building: ${building.name}`);
        }
      }

      localStorage.removeItem('justChangedTempPassword');
      localStorage.setItem('landlordOnboardingComplete', 'true');
      toast.success('Buildings, floors, units, rent and rubbish bills saved successfully.');
      onCompleted();
    } catch (error) {
      console.error('Landlord onboarding error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Set Up Your Buildings</DialogTitle>
          <DialogDescription>
            Verify your building names and register floors, units, rent per unit, and default rubbish bills before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {buildings.map((building, buildingIndex) => (
            <Card key={`building-${buildingIndex}`}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Building {buildingIndex + 1}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBuilding(buildingIndex)}
                    disabled={buildings.length <= 1 || isSubmitting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Building
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Building name"
                    value={building.name}
                    onChange={(event) => updateBuilding(buildingIndex, { name: event.target.value })}
                    disabled={isSubmitting}
                  />
                  <Input
                    placeholder="Building location"
                    value={building.location}
                    onChange={(event) => updateBuilding(buildingIndex, { location: event.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-3">
                  {building.floors.map((floor, floorIndex) => (
                    <div key={`floor-${floor.floorNumber}`} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Floor {floor.floorNumber}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFloor(buildingIndex, floorIndex)}
                          disabled={building.floors.length <= 1 || isSubmitting}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove Floor
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          type="number"
                          min={1}
                          value={floor.unitsCount}
                          onChange={(event) =>
                            updateFloor(buildingIndex, floorIndex, {
                              unitsCount: Math.max(1, Number(event.target.value || 1)),
                            })
                          }
                          placeholder="Units on this floor"
                          disabled={isSubmitting}
                        />
                        <Input
                          type="number"
                          min={1}
                          value={floor.rentPerUnit}
                          onChange={(event) =>
                            updateFloor(buildingIndex, floorIndex, {
                              rentPerUnit: event.target.value,
                            })
                          }
                          placeholder="Rent per unit"
                          disabled={isSubmitting}
                        />
                        <Input
                          type="number"
                          min={0}
                          value={floor.rubbishPerUnit}
                          onChange={(event) =>
                            updateFloor(buildingIndex, floorIndex, {
                              rubbishPerUnit: event.target.value,
                            })
                          }
                          placeholder="Rubbish bill per unit"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => addFloor(buildingIndex)}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Floor
                </Button>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={addBuilding} disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-2" />
              Add Building
            </Button>

            <Button onClick={submitOnboarding} disabled={isSubmitting}>
              {isSubmitting ? 'Saving setup...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
