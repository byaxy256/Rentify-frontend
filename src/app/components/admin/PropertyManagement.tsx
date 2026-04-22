import { useEffect, useState } from 'react';
import { Building2, MapPin, Users, DollarSign } from 'lucide-react';
import { requestFunction } from '../../lib/functionClient';

export function PropertyManagement() {
  const [properties, setProperties] = useState<Array<{ id: string; name: string; location: string; units: number; occupied: number; landlord: string; revenue: number }>>([]);
  const [summary, setSummary] = useState({
    totalProperties: 0,
    totalUnits: 0,
    totalOccupied: 0,
    occupancyRate: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/admin/properties', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setProperties(Array.isArray(result?.data?.properties) ? result.data.properties : []);
        setSummary(result?.data?.summary || {
          totalProperties: 0,
          totalUnits: 0,
          totalOccupied: 0,
          occupancyRate: 0,
          totalRevenue: 0,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
    const interval = window.setInterval(loadProperties, 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Property Management</h2>
        <p className="text-gray-600">Overview of all properties on the platform</p>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Refreshing properties...</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Properties</span>
            <Building2 className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{summary.totalProperties}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Units</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">{summary.totalUnits}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Occupancy Rate</span>
            <Building2 className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{summary.occupancyRate}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl">UGX {(summary.totalRevenue / 1000000).toFixed(0)}M</p>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">All Properties</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Property Name</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Landlord</th>
                <th className="text-left p-4">Units</th>
                <th className="text-left p-4">Occupancy</th>
                <th className="text-left p-4">Monthly Revenue</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-sm text-gray-500">No properties found.</td>
                </tr>
              )}
              {properties.map((property) => (
                <tr key={property.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium">{property.name}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {property.location}
                    </div>
                  </td>
                  <td className="p-4">{property.landlord}</td>
                  <td className="p-4">{property.units}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{property.occupied}/{property.units}</p>
                      <p className="text-xs text-gray-500">
                        {((property.occupied / property.units) * 100).toFixed(0)}% occupied
                      </p>
                    </div>
                  </td>
                  <td className="p-4 font-medium">UGX {(property.revenue / 1000000).toFixed(1)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
