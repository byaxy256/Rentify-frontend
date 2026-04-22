import { Building2, Users, DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dataStore } from '../../lib/data';

interface OverviewProps {
  selectedProperty?: string;
}

export function Overview({ selectedProperty = 'all' }: OverviewProps) {
  const allBuildings = dataStore.getBuildings();
  const allPayments = dataStore.getPayments();
  const allRequests = dataStore.getRequests();

  // Filter by selected property
  const buildings = selectedProperty === 'all'
    ? allBuildings
    : allBuildings.filter((building) => building.id === selectedProperty);

  const selectedBuildingName = buildings[0]?.name;

  const payments = selectedProperty === 'all'
    ? allPayments
    : allPayments.filter((payment) => selectedBuildingName ? payment.building === selectedBuildingName : false);

  const requests = selectedProperty === 'all' ? allRequests : [];

  const totalUnits = buildings.reduce((sum, b) => sum + b.totalUnits, 0);
  const occupiedUnits = buildings.reduce((sum, b) => sum + b.occupiedUnits, 0);
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0;
  
  const thisMonthPayments = payments.filter(p => {
    const paymentDate = new Date(p.date);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && 
           paymentDate.getFullYear() === now.getFullYear();
  });
  
  const monthlyRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  // Generate monthly revenue data for last 6 months
  const generateMonthlyData = () => {
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    return months.map((month, index) => ({
      month,
      revenue: 8000000 + Math.random() * 4000000 + (index * 500000), // Mock trending upward
      payments: 18 + Math.floor(Math.random() * 10)
    }));
  };

  const monthlyData = generateMonthlyData();

  // Payment status data for pie chart
  const paymentStatusData = [
    { name: 'Paid', value: payments.filter(p => p.status === 'completed').length, color: '#10b981' },
    { name: 'Pending', value: payments.filter(p => p.status === 'pending').length, color: '#f59e0b' },
    { name: 'Failed', value: payments.filter(p => p.status === 'failed').length, color: '#ef4444' }
  ];

  // Occupancy by building for bar chart
  const buildingOccupancyData = buildings.map(b => ({
    name: b.name.split(' ')[0], // Shortened name
    occupancy: ((b.occupiedUnits / b.totalUnits) * 100).toFixed(0),
    occupied: b.occupiedUnits,
    vacant: b.totalUnits - b.occupiedUnits
  }));

  // Recent activity timeline
  const recentActivity = [
    { id: '1', type: 'payment', message: 'Billy Bob Thornton paid UGX 180,000', time: '2 hours ago', icon: CheckCircle, color: 'text-green-500' },
    { id: '2', type: 'request', message: 'New maintenance request from John Smith', time: '5 hours ago', icon: AlertTriangle, color: 'text-yellow-500' },
    { id: '3', type: 'lease', message: 'Lease renewal due for Unit A-105', time: '1 day ago', icon: Clock, color: 'text-[#1e3a3f]' },
    { id: '4', type: 'payment', message: 'Sarah Malone payment overdue', time: '2 days ago', icon: AlertTriangle, color: 'text-red-500' },
  ];

  const stats = [
    {
      icon: Building2,
      label: 'Total Buildings',
      value: buildings.length.toString(),
      color: 'bg-[#1e3a3f]'
    },
    {
      icon: Users,
      label: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      sublabel: `${occupiedUnits}/${totalUnits} units`,
      color: 'bg-green-500'
    },
    {
      icon: DollarSign,
      label: 'Monthly Revenue',
      value: `UGX ${(monthlyRevenue / 1000).toFixed(0)}K`,
      sublabel: `${thisMonthPayments.length} payments`,
      color: 'bg-purple-500'
    },
    {
      icon: TrendingUp,
      label: 'Pending Requests',
      value: pendingRequests.toString(),
      color: 'bg-orange-500'
    }
  ];

  const recentPayments = payments.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Welcome back! Here's what's happening with your properties.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-2xl mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
              {stat.sublabel && <p className="text-xs text-gray-500 mt-1">{stat.sublabel}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
              <Tooltip 
                formatter={(value: number) => `UGX ${value.toLocaleString()}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#1e3a3f" strokeWidth={3} dot={{ fill: '#1e3a3f', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">Payment Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {paymentStatusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    item.name === 'Paid' ? 'bg-green-500' :
                    item.name === 'Pending' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  role="presentation"
                  aria-label={`${item.name} color indicator`}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Occupancy Bar Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl mb-4">Occupancy Rate by Building</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={buildingOccupancyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Legend />
            <Bar dataKey="occupied" fill="#1e3a3f" name="Occupied" />
            <Bar dataKey="vacant" fill="#e5e7eb" name="Vacant" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`${activity.color} mt-1`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent payments</p>
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{payment.tenantName}</p>
                    <p className="text-sm text-gray-600">{payment.unitNumber} • {payment.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">UGX {(payment.amount / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">{payment.method}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}