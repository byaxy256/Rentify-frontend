import { useEffect, useMemo, useState } from 'react';
import { Users, Building2, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { requestFunction } from '../../lib/functionClient';

interface OverviewPayload {
  stats: {
    totalUsers: number;
    totalProperties: number;
    totalRevenue: number;
    totalCommission: number;
    activeTransactions: number;
  };
  charts: {
    userGrowthData: Array<{ month: string; landlords: number; tenants: number }>;
    transactionData: Array<{ month: string; transactions: number; amount: number }>;
    userDistribution: Array<{ name: string; value: number; color: string }>;
    propertyStatus: Array<{ name: string; value: number; color: string }>;
  };
  health: {
    apiResponseTimeMs: number;
    databaseLoadPercent: number;
    uptimePercent: number;
    errorRatePercent: number;
  };
  recentActivities: Array<{
    id: string;
    message: string;
    time: string;
    status: 'success' | 'failed';
  }>;
}

export function AdminOverview() {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      const headers = {
        ...(accessToken ? { 'x-user-token': accessToken } : {}),
      };
      const startedAt = performance.now();

      const [overviewResponse, usersResponse, propertiesResponse, revenueResponse] = await Promise.all([
        requestFunction('/admin/overview', { headers }),
        requestFunction('/auth/users', { headers }),
        requestFunction('/admin/properties', { headers }),
        requestFunction('/admin/revenue', { headers }),
      ]);

      const [overviewResult, usersResult, propertiesResult, revenueResult] = await Promise.all([
        overviewResponse.json().catch(() => ({})),
        usersResponse.json().catch(() => ({})),
        propertiesResponse.json().catch(() => ({})),
        revenueResponse.json().catch(() => ({})),
      ]);

      const baseOverview = overviewResponse.ok ? overviewResult?.data || {} : {};
      const users = Array.isArray(usersResult?.data?.users) ? usersResult.data.users : [];
      const propertySummary = propertiesResult?.data?.summary || {};
      const properties = Array.isArray(propertiesResult?.data?.properties) ? propertiesResult.data.properties : [];
      const revenueSummary = revenueResult?.data?.summary || {};
      const monthlyRevenue = Array.isArray(revenueResult?.data?.monthlyRevenue) ? revenueResult.data.monthlyRevenue : [];

      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const currentYear = new Date().getFullYear();
      const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(currentYear, new Date().getMonth() - (5 - index), 1);
        return {
          key: date.toISOString().slice(0, 7),
          label: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        };
      });

      const usersByMonth = new Map(lastSixMonths.map(({ key }) => [key, { landlords: 0, tenants: 0 }]));
      for (const user of users) {
        const createdAt = user.created_at || user.joinDate || user.createdAt;
        const createdKey = createdAt ? new Date(createdAt).toISOString().slice(0, 7) : '';
        if (!usersByMonth.has(createdKey)) continue;
        const role = user.role || user.user_metadata?.role;
        const bucket = usersByMonth.get(createdKey)!;
        if (role === 'landlord') bucket.landlords += 1;
        if (role === 'tenant') bucket.tenants += 1;
      }

      const txMap = new Map(lastSixMonths.map(({ key }) => [key, { transactions: 0, amount: 0 }]));
      for (const row of monthlyRevenue) {
        const label = String(row.month || '');
        const matchingMonth = lastSixMonths.find(({ label: monthLabel }) => monthLabel === label);
        if (!matchingMonth) continue;
        txMap.set(matchingMonth.key, {
          transactions: Number(row.transactions || 0),
          amount: Number(row.revenue || 0),
        });
      }

      const occupancyFromProperties = properties.reduce((sum: number, property: any) => sum + Number(property.occupied || 0), 0);
      const unitsFromProperties = properties.reduce((sum: number, property: any) => sum + Number(property.units || 0), 0);

      const computedOverview: OverviewPayload = {
        stats: {
          totalUsers: Number(baseOverview.stats?.totalUsers || users.length || 0),
          totalProperties: Number(baseOverview.stats?.totalProperties || propertySummary.totalProperties || properties.length || 0),
          totalRevenue: Number(baseOverview.stats?.totalRevenue || revenueSummary.totalRevenue || 0),
          totalCommission: Number(baseOverview.stats?.totalCommission || revenueSummary.totalCommission || 0),
          activeTransactions: Number(baseOverview.stats?.activeTransactions || revenueSummary.totalTransactions || monthlyRevenue.reduce((sum: number, row: any) => sum + Number(row.transactions || 0), 0)),
          totalUnits: Number(baseOverview.stats?.totalUnits || propertySummary.totalUnits || unitsFromProperties || 0),
          occupiedUnits: Number(baseOverview.stats?.occupiedUnits || propertySummary.totalOccupied || occupancyFromProperties || 0),
          occupancyRate: Number(baseOverview.stats?.occupancyRate || propertySummary.occupancyRate || 0),
        },
        charts: {
          userGrowthData: baseOverview.charts?.userGrowthData?.length
            ? baseOverview.charts.userGrowthData
            : lastSixMonths.map(({ key, label }) => ({
                month: label,
                landlords: usersByMonth.get(key)?.landlords || 0,
                tenants: usersByMonth.get(key)?.tenants || 0,
              })),
          transactionData: baseOverview.charts?.transactionData?.length
            ? baseOverview.charts.transactionData
            : lastSixMonths.map(({ key, label }) => ({
                month: label,
                transactions: txMap.get(key)?.transactions || 0,
                amount: txMap.get(key)?.amount || 0,
              })),
          userDistribution: baseOverview.charts?.userDistribution?.length
            ? baseOverview.charts.userDistribution
            : (() => {
                const tenantCount = users.filter((user: any) => (user.role || user.user_metadata?.role) === 'tenant').length;
                const landlordCount = users.filter((user: any) => (user.role || user.user_metadata?.role) === 'landlord').length;
                const adminCount = users.filter((user: any) => (user.role || user.user_metadata?.role) === 'admin').length;
                return [
                  { name: 'Tenants', value: tenantCount, color: '#3b82f6' },
                  { name: 'Landlords', value: landlordCount, color: '#8b5cf6' },
                  { name: 'Admins', value: adminCount, color: '#f59e0b' },
                ];
              })(),
          propertyStatus: baseOverview.charts?.propertyStatus?.length
            ? baseOverview.charts.propertyStatus
            : [
                { name: 'Occupied', value: Number(baseOverview.stats?.occupiedUnits || propertySummary.totalOccupied || occupancyFromProperties || 0), color: '#10b981' },
                { name: 'Vacant', value: Math.max(0, Number(baseOverview.stats?.totalUnits || propertySummary.totalUnits || unitsFromProperties || 0) - Number(baseOverview.stats?.occupiedUnits || propertySummary.totalOccupied || occupancyFromProperties || 0)), color: '#ef4444' },
              ],
        },
        health: {
          apiResponseTimeMs: Number(baseOverview.health?.apiResponseTimeMs || Math.max(1, Math.round(performance.now() - startedAt))),
          databaseLoadPercent: Number(baseOverview.health?.databaseLoadPercent || 0),
          uptimePercent: Number(baseOverview.health?.uptimePercent || 100),
          errorRatePercent: Number(baseOverview.health?.errorRatePercent || 0),
        },
        recentActivities: Array.isArray(baseOverview.recentActivities) ? baseOverview.recentActivities : [],
      };

      setOverview(computedOverview);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    const interval = window.setInterval(loadOverview, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const stats = useMemo(() => [
    {
      icon: Users,
      label: 'Total Users',
      value: String(overview?.stats.totalUsers || 0),
      change: 'Live',
      sublabel: 'Across all roles',
      color: 'bg-blue-500',
    },
    {
      icon: Building2,
      label: 'Total Properties',
      value: String(overview?.stats.totalProperties || 0),
      change: 'Live',
      sublabel: 'Registered on platform',
      color: 'bg-purple-500',
    },
    {
      icon: DollarSign,
      label: 'Platform Revenue',
      value: `UGX ${(Number(overview?.stats.totalRevenue || 0)).toLocaleString()}`,
      change: 'Live',
      sublabel: `Commission: UGX ${Number(overview?.stats.totalCommission || 0).toLocaleString()}`,
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      label: 'Active Transactions',
      value: String(overview?.stats.activeTransactions || 0),
      change: 'Live',
      sublabel: 'Last 6 months',
      color: 'bg-yellow-500',
    },
    {
      icon: Building2,
      label: 'Property Occupancy',
      value: `${overview?.stats.occupiedUnits || 0}/${overview?.stats.totalUnits || 0}`,
      change: `${overview?.stats.occupancyRate || 0}%`,
      sublabel: 'Occupied vs total units',
      color: 'bg-emerald-500',
    },
  ], [overview]);

  const healthMetrics = [
    { label: 'API Response Time', value: `${overview?.health.apiResponseTimeMs ?? 0}ms`, color: 'text-[#1e3a3f]' },
    { label: 'Database Load', value: `${overview?.health.databaseLoadPercent ?? 0}%`, color: 'text-[#1e3a3f]' },
    { label: 'Server Uptime', value: `${overview?.health.uptimePercent ?? 0}%`, color: 'text-green-600' },
    { label: 'Error Rate', value: `${overview?.health.errorRatePercent ?? 0}%`, color: 'text-red-500' },
  ];

  const userGrowthData = overview?.charts.userGrowthData || [];
  const transactionData = overview?.charts.transactionData || [];
  const userDistribution = overview?.charts.userDistribution || [];
  const propertyStatus = overview?.charts.propertyStatus || [];
  const recentActivities = overview?.recentActivities || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl mb-2">Platform Overview</h2>
        <p className="text-gray-600">Complete system analytics and health monitoring</p>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">Refreshing live overview...</div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-green-600 font-semibold">{stat.change}</span>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
              {stat.sublabel && <p className="text-xs text-gray-500 mt-1">{stat.sublabel}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-green-500" />
          <h3 className="text-xl font-semibold">System Health</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {healthMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">{metric.label}</p>
              <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">User Growth (6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Line type="monotone" dataKey="landlords" stroke="#8b5cf6" strokeWidth={3} name="Landlords" />
              <Line type="monotone" dataKey="tenants" stroke="#3b82f6" strokeWidth={3} name="Tenants" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Volume */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">Transaction Volume</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={transactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'amount') return `UGX ${value.toLocaleString()}`;
                  return value;
                }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="transactions" fill="#10b981" name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">User Activity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={userDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Property Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">Property Occupancy Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={propertyStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {propertyStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">Recent Platform Activity</h3>
        </div>
        <div className="p-6 space-y-4">
          {recentActivities.length === 0 && (
            <p className="text-sm text-gray-500">No recent activity yet.</p>
          )}
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`mt-1 ${activity.status === 'failed' ? 'text-red-500' : 'text-green-600'}`}>
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(activity.time).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
