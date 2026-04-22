import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export function PlatformAnalytics() {
  const revenueData = [
    { month: 'Oct', revenue: 38000000, transactions: 650, users: 1050 },
    { month: 'Nov', revenue: 42000000, transactions: 720, users: 1100 },
    { month: 'Dec', revenue: 45000000, transactions: 780, users: 1150 },
    { month: 'Jan', revenue: 48000000, transactions: 810, users: 1195 },
    { month: 'Feb', revenue: 51000000, transactions: 835, users: 1225 },
    { month: 'Mar', revenue: 55000000, transactions: 892, users: 1247 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Platform Analytics</h2>
        <p className="text-gray-600">Detailed analytics and performance metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Monthly Growth</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">+7.8%</p>
          <p className="text-xs text-gray-500 mt-1">Revenue growth</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">User Retention</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">87.3%</p>
          <p className="text-xs text-gray-500 mt-1">30-day retention</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Avg Transaction</span>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl">UGX 61.7K</p>
          <p className="text-xs text-gray-500 mt-1">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active Rate</span>
            <Activity className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl">92.1%</p>
          <p className="text-xs text-gray-500 mt-1">Daily active users</p>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl mb-4">Revenue & Transaction Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis yAxisId="left" stroke="#6b7280" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'revenue') return [`UGX ${value.toLocaleString()}`, 'Revenue'];
                return [value, name];
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" />
            <Line yAxisId="right" type="monotone" dataKey="transactions" stroke="#3b82f6" strokeWidth={3} name="Transactions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* User Growth */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl mb-4">User Growth</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Legend />
            <Bar dataKey="users" fill="#8b5cf6" name="Total Users" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
