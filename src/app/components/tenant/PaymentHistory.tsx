import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Download, CheckCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';
import { jsPDF } from 'jspdf';

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

  // Draws Rentify logo (left), shield (center), and watermark
  const drawPdfHeader = (doc: jsPDF, receiptId: string) => {
    // Logo left
    doc.setFillColor(30, 58, 63);
    doc.roundedRect(14, 10, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('R', 20.8, 21.7);
    doc.setTextColor(0, 0, 0);

    // Shield logo (center top)
    doc.setDrawColor(30, 58, 63);
    doc.setLineWidth(0.7);
    doc.ellipse(105, 22, 10, 10, 'S');
    doc.setFontSize(18);
    doc.textWithLink('🛡️', 101, 27, { url: '' }); // fallback shield emoji

    // Large red receipt number (top right)
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(receiptId, 180, 22, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Watermark (Rentify logo faded in background)
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(60);
    doc.text('R', 70, 120, { opacity: 0.08 });
    doc.setTextColor(0, 0, 0);
  };

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

  const downloadReceipt = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const doc = new jsPDF();
    const receiptId = payment.receiptNumber || `REC-${paymentId.padStart(6, '0')}`;

    drawPdfHeader(doc, receiptId);

    // School name equivalent: Rentify app name centered, bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('RENTIFY', 105, 40, { align: 'center' });

    // Title: Transaction Receipt
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Transaction Receipt', 105, 52, { align: 'center' });

    // Details table (left label, right value)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const details = [
      ['Payment Code:', receiptId],
      ['Tenant Name:', payment.tenantName || ''],
      ['Property:', payment.propertyName || ''],
      ['Amount:', `UGX ${payment.amount.toLocaleString()}`],
      ['Amount in words:', amountToWords(payment.amount)],
      ['Date:', new Date(payment.date).toLocaleString()],
      ['Payment Method:', payment.method],
      ['Description:', payment.displayType || payment.type],
      ['Status:', payment.status.toUpperCase()],
    ];
    let y = 68;
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 24, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), 70, y);
      y += 9;
    });

    // Footer: Contact info
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Contact Rentify on Tel: 0200-502-140, email: support@rentify.com', 14, 285);

    doc.save(`receipt_${paymentId}_${payment.date}.pdf`);
    toast.success('Receipt PDF downloaded successfully!');
  };

  // Helper: Convert amount to words (simple, English, UGX)
  function amountToWords(amount: number): string {
    // Simple implementation for demo; replace with robust one if needed
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const teens = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    if (amount === 0) return 'Zero';
    let words = '';
    if (amount >= 1000) {
      words += ones[Math.floor(amount/1000)] + ' Thousand ';
      amount = amount % 1000;
    }
    if (amount >= 100) {
      words += ones[Math.floor(amount/100)] + ' Hundred ';
      amount = amount % 100;
    }
    if (amount >= 20) {
      words += tens[Math.floor(amount/10)] + ' ';
      amount = amount % 10;
    } else if (amount >= 10) {
      words += teens[amount-10] + ' ';
      amount = 0;
    }
    if (amount > 0) {
      words += ones[amount] + ' ';
    }
    return words.trim() + ' Shillings Only';
  }

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
                      onClick={() => void downloadReceipt(payment.id)}
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