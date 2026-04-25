import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Download, CheckCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface Payment {
  id: string;
  type: 'rent' | 'electricity' | 'electricity_token' | 'water' | 'rubbish' | 'bill' | 'wifi' | 'security_deposit';
  amount: number;
  date: string;
  method: string;
  status: 'paid';
  displayType?: string;
  receiptNumber?: string;
}

const paymentLabels = {
  rent: 'Rent Payment',
  electricity: 'Electricity Bill',
  electricity_token: 'Yaka Token',
  water: 'Water Bill',
  rubbish: 'Rubbish Collection',
  bill: 'Utility Bill',
  wifi: 'WiFi Payment',
  security_deposit: 'Security Deposit',
};

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const loadPayments = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/payments/me', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load payment history');
        return;
      }

      const mapped: Payment[] = Array.isArray(result?.data?.payments)
        ? result.data.payments.map((payment: any) => ({
            id: payment.id,
            type: payment.displayType || payment.type,
            amount: Number(payment.amount || 0),
            date: payment.date,
            method: payment.method,
            status: 'paid',
            displayType: payment.displayType,
            receiptNumber: payment.receiptNumber,
          }))
        : [];

      setPayments(mapped);
    } catch (error) {
      console.error('Load payment history error:', error);
      toast.error('Failed to load payment history');
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const downloadReceipt = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    // Create receipt content
    const receiptContent = `
RENTIFY - PAYMENT RECEIPT
========================

Receipt ID: ${payment.receiptNumber || `REC-${paymentId.padStart(6, '0')}`}
Date: ${new Date(payment.date).toLocaleDateString()}

Payment Details:
----------------
Type: ${paymentLabels[payment.type] || 'Utility Payment'}
Amount: UGX ${payment.amount.toLocaleString()}
Payment Method: ${payment.method}
Status: ${payment.status.toUpperCase()}

Thank you for your payment!
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `receipt_${paymentId}_${payment.date}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Receipt downloaded successfully!');
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const thisMonthPayments = payments.filter((payment) => {
    const now = new Date();
    const paymentDate = new Date(payment.date);
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  });
  const lastMonthPayments = payments.filter((payment) => {
    const now = new Date();
    const paymentDate = new Date(payment.date);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return paymentDate.getMonth() === lastMonth.getMonth() && paymentDate.getFullYear() === lastMonth.getFullYear();
  });
  const averageMonthly = payments.length > 0 ? Math.round(totalPaid / Math.max(1, new Set(payments.map((p) => p.date.slice(0, 7))).size)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Payment History</h2>
        <p className="text-gray-600">View all your payment transactions</p>
      </div>

      {/* Summary Card */}
      <div className="bg-[#1e3a3f] rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300 mb-2">Total Paid (All Time)</p>
            <h3 className="text-4xl mb-2">UGX {totalPaid.toLocaleString()}</h3>
            <p className="text-gray-300">{payments.length} transactions</p>
          </div>
          <CreditCard className="w-16 h-16 text-white opacity-20" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">This Month</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">UGX {thisMonthPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{thisMonthPayments.length} payments</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Last Month</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">UGX {lastMonthPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{lastMonthPayments.length} payments</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Average Monthly</span>
            <CreditCard className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">UGX {averageMonthly.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Per month</p>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">All Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Method</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-sm text-gray-600">No transactions yet.</td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="p-4">{paymentLabels[payment.type]}</td>
                  <td className="p-4">UGX {payment.amount.toLocaleString()}</td>
                  <td className="p-4">{payment.method}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />
                      Paid
                    </span>
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadReceipt(payment.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}