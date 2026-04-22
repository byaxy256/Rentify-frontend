import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { requestFunction } from '../../lib/functionClient';

export function RevenueTracking() {
  const [monthlyRevenue, setMonthlyRevenue] = useState<Array<{ month: string; revenue: number; commission: number; transactions: number }>>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    thisMonthCommission: 0,
    thisMonthLabel: 'This month',
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadRevenue = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/admin/revenue', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setMonthlyRevenue(Array.isArray(result?.data?.monthlyRevenue) ? result.data.monthlyRevenue : []);
        setSummary(result?.data?.summary || {
          totalRevenue: 0,
          totalCommission: 0,
          thisMonthCommission: 0,
          thisMonthLabel: 'This month',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue();
    const interval = window.setInterval(loadRevenue, 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Revenue Tracking</h2>
        <p className="text-gray-600">Platform commission and revenue tracking</p>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Refreshing revenue metrics...</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Platform Revenue</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">UGX {(summary.totalRevenue / 1000000).toFixed(0)}M</p>
          <p className="text-xs text-gray-500 mt-1">Last 6 months</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Platform Commission (5%)</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl">UGX {(summary.totalCommission / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-gray-500 mt-1">Earned commission</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">This Month</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">UGX {(summary.thisMonthCommission / 1000000).toFixed(2)}M</p>
          <p className="text-xs text-gray-500 mt-1">{summary.thisMonthLabel}</p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">Monthly Revenue Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Month</th>
                <th className="text-left p-4">Transactions</th>
                <th className="text-left p-4">Total Revenue</th>
                <th className="text-left p-4">Commission (5%)</th>
                <th className="text-left p-4">Growth</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-sm text-gray-500">No revenue records found.</td>
                </tr>
              )}
              {monthlyRevenue.map((item, index) => {
                const prevRevenue = index > 0 ? monthlyRevenue[index - 1].revenue : item.revenue;
                const growth = ((item.revenue - prevRevenue) / prevRevenue * 100).toFixed(1);
                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{item.month}</td>
                    <td className="p-4">{item.transactions}</td>
                    <td className="p-4">UGX {item.revenue.toLocaleString()}</td>
                    <td className="p-4 text-green-600 font-medium">UGX {item.commission.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={index === 0 ? 'text-gray-400' : 'text-green-600'}>
                        {index === 0 ? '-' : `+${growth}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
