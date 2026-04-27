import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { requestFunction } from '../../lib/functionClient';

export function PlatformAnalytics() {
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number; commission: number; transactions: number; users?: number }>>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    thisMonthCommission: 0,
    thisMonthLabel: 'This month',
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/admin/revenue', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRevenueData([]);
        return;
      }

      setRevenueData(Array.isArray(result?.data?.monthlyRevenue) ? result.data.monthlyRevenue : []);
      setSummary(result?.data?.summary || {
        totalRevenue: 0,
        totalCommission: 0,
        thisMonthCommission: 0,
        thisMonthLabel: 'This month',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = window.setInterval(loadAnalytics, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const firstRevenue = revenueData[0]?.revenue || 0;
    const lastRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
    const growth = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0;
    const totalTransactions = revenueData.reduce((sum, row) => sum + Number(row.transactions || 0), 0);
    const avgTransaction = totalTransactions > 0
      ? revenueData.reduce((sum, row) => sum + Number(row.revenue || 0), 0) / totalTransactions
      : 0;
    const activeRate = revenueData.length > 0 ? Math.min(100, Math.round((revenueData.filter((row) => row.transactions > 0).length / revenueData.length) * 100)) : 0;

    return { growth, avgTransaction, totalTransactions, activeRate };
  }, [revenueData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Platform Analytics</h2>
        <p className="text-gray-600">Detailed analytics and performance metrics</p>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Refreshing analytics...</div>}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Monthly Growth</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{metrics.growth >= 0 ? '+' : ''}{metrics.growth.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Revenue growth</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">User Retention</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">{metrics.activeRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Active months with revenue</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Avg Transaction</span>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl">UGX {Math.round(metrics.avgTransaction / 1000).toLocaleString()}K</p>
          <p className="text-xs text-gray-500 mt-1">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active Rate</span>
            <Activity className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl">{metrics.totalTransactions}</p>
          <p className="text-xs text-gray-500 mt-1">Total monthly transactions</p>
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
            <Bar dataKey="transactions" fill="#8b5cf6" name="Transactions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
