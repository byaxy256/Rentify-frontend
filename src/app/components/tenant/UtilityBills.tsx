import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Zap, Droplet, Trash2, CheckCircle, AlertTriangle, Calendar, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface UtilityBillsProps {
  onNavigateToWiFi?: () => void;
}

interface Bill {
  id: string;
  type: 'electricity' | 'water' | 'rubbish' | 'wifi';
  provider: string;
  account: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
}

interface YakaPurchase {
  id: string;
  amount: number;
  date: string;
  receiptNumber: string;
}

const initialBills: Bill[] = [];

const billIcons = {
  electricity: Zap,
  water: Droplet,
  rubbish: Trash2,
  wifi: Wifi,
};

const billLabels = {
  electricity: 'Electricity (UMEME)',
  water: 'Water (NWSC)',
  rubbish: 'Rubbish Collection',
  wifi: 'WiFi Internet',
};

const billColors = {
  electricity: 'text-yellow-500',
  water: 'text-[#1e3a3f]',
  rubbish: 'text-green-500',
  wifi: 'text-[#1e3a3f]',
};

export function UtilityBills({ onNavigateToWiFi }: UtilityBillsProps) {
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showElectricityDialog, setShowElectricityDialog] = useState(false);
  const [electricityAmount, setElectricityAmount] = useState('');
  const [electricityMeterNumber, setElectricityMeterNumber] = useState('');
  const [electricityPhoneNumber, setElectricityPhoneNumber] = useState('');
  const [latestElectricityToken, setLatestElectricityToken] = useState<{ tokenNumber: string; meterNumber: string; phoneNumber: string; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const buildHeaders = () => {
    const accessToken = localStorage.getItem('accessToken');
    return {
      ...(accessToken ? { 'x-user-token': accessToken } : {}),
    };
  };

  const loadData = async () => {
    try {
      const [billsResponse, assignmentResponse, paymentsResponse] = await Promise.all([
        requestFunction('/bills', { headers: buildHeaders() }),
        requestFunction('/tenants/me/assignment', { headers: buildHeaders() }),
        requestFunction('/payments/me', { headers: buildHeaders() }),
      ]);

      const billsResult = await billsResponse.json().catch(() => ({}));
      const assignmentResult = await assignmentResponse.json().catch(() => ({}));
      const paymentsResult = await paymentsResponse.json().catch(() => ({}));

      if (billsResponse.ok) {
        const mapped: Bill[] = Array.isArray(billsResult.data)
          ? billsResult.data.map((bill: any) => ({
              id: bill.id,
              type: bill.type,
              provider: bill.type === 'electricity' ? 'UMEME' : bill.type === 'water' ? 'NWSC' : bill.type === 'rubbish' ? 'Rubbish Collection' : 'Provider',
              account: bill.unitId || 'Tenant Unit',
              amount: Number(bill.amount || 0),
              dueDate: bill.dueDate,
              status: bill.status,
              paidDate: bill.paidDate || undefined,
            }))
          : [];
        setBills(mapped);
      }

      if (assignmentResponse.ok) {
        setAssignment(assignmentResult.data || null);
      }

      if (paymentsResponse.ok) {
        const paymentsData = Array.isArray(paymentsResult?.data?.payments) ? paymentsResult.data.payments : [];
        setPaymentRecords(paymentsData);

        const latestToken = paymentsData.find((payment: any) =>
          payment.displayType === 'electricity_token' || String(payment.receiptNumber || '').startsWith('YAKA-'),
        );

        if (latestToken) {
          const rawToken = String(latestToken.receiptNumber || '').replace(/^YAKA-/, '');
          setLatestElectricityToken({
            tokenNumber: rawToken,
            meterNumber: '',
            phoneNumber: '',
            amount: Number(latestToken.amount || 0),
          });
        }
      }
    } catch (error) {
      console.error('Load utility data error:', error);
      toast.error('Failed to load utility bills');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayBill = (bill: Bill) => {
    if (bill.type === 'wifi') {
      onNavigateToWiFi?.();
      return;
    }
    setSelectedBill(bill);
    setShowPaymentDialog(true);
    setPhoneNumber('');
  };

  const buyElectricityToken = async () => {
    try {
      setIsLoading(true);

      const amount = Number(electricityAmount);
      const response = await requestFunction('/payments/electricity', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          amount,
          meterNumber: electricityMeterNumber,
          phoneNumber: electricityPhoneNumber,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Electricity token purchase failed');
        return;
      }

      const tokenNumber = String(result?.data?.tokenNumber || result?.data?.receiptNumber || '').replace(/^YAKA-/, '');
      setLatestElectricityToken({
        tokenNumber,
        meterNumber: electricityMeterNumber,
        phoneNumber: electricityPhoneNumber,
        amount,
      });
      toast.success(`Token generated: ${tokenNumber}`);
      setShowElectricityDialog(false);
      setElectricityAmount('');
      setElectricityMeterNumber('');
      setElectricityPhoneNumber('');
      await loadData();
    } catch (error) {
      console.error('Electricity token purchase error:', error);
      toast.error('Electricity token purchase failed');
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async () => {
    if (!selectedBill) return;

    try {
      setIsLoading(true);
      const response = await requestFunction(`/payments/bills/${selectedBill.id}/pay`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          method: paymentMethod,
          phoneNumber: paymentMethod === 'bank' ? null : phoneNumber,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Bill payment failed');
        return;
      }

      toast.success(`${billLabels[selectedBill.type]} paid successfully!`);
      setShowPaymentDialog(false);
      await loadData();
    } catch (error) {
      console.error('Bill payment error:', error);
      toast.error('Bill payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPaid = bills
    .filter(bill => bill.status === 'paid')
    .reduce((sum, bill) => sum + bill.amount, 0);

  const yakaPurchases: YakaPurchase[] = paymentRecords
    .filter((payment: any) => payment.displayType === 'electricity_token' || String(payment.receiptNumber || '').startsWith('YAKA-'))
    .map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      date: payment.date || payment.createdAt || new Date().toISOString(),
      receiptNumber: String(payment.receiptNumber || ''),
    }));

  const totalYakaPaid = yakaPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  const totalOutstanding = bills
    .filter(bill => bill.status === 'pending')
    .reduce((sum, bill) => sum + bill.amount, 0);

  const overdueCount = bills.filter(b => b.status === 'overdue').length;

  const nextUtilityCycleDate = useMemo(() => {
    const baseDate = assignment?.assignedDate || assignment?.leaseStartDate;
    if (!baseDate) return null;
    const start = new Date(baseDate);
    if (Number.isNaN(start.getTime())) return null;
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), start.getDate());
    if (next < now) next.setMonth(next.getMonth() + 1);
    return next;
  }, [assignment]);

  // Quick payment bills
  const electricityBill = bills.find(b => b.type === 'electricity' && b.status !== 'paid');
  const waterBill = bills.find(b => b.type === 'water' && b.status !== 'paid');
  const rubbishBill = bills.find(b => b.type === 'rubbish' && b.status !== 'paid');
  const wifiBill = bills.find(b => b.type === 'wifi' && b.status !== 'paid');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Utility Bills</h2>
        <p className="text-sm text-gray-600">
          Utility billing cycle due date: {nextUtilityCycleDate ? nextUtilityCycleDate.toLocaleDateString() : 'Not set'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Bills Paid</p>
              <p className="text-3xl">UGX {(totalPaid + totalYakaPaid).toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Outstanding</p>
              <p className="text-3xl">UGX {totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-2xl">💵</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Overdue Bills</p>
              <p className="text-3xl">{overdueCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Bill Payment */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="mb-6">
          <h3 className="text-xl mb-2">Quick Bill Payment</h3>
          <p className="text-sm text-gray-600">Pay your utility bills quickly and securely</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Electricity Card */}
          <div className="border rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
            <h4 className="mb-2">Electricity (UMEME)</h4>
            <p className="text-sm text-gray-600 mb-4">Buy Yaka token using your meter number and phone number</p>
            <Button
              className="w-full bg-black text-white hover:bg-gray-800"
              onClick={() => setShowElectricityDialog(true)}
            >
              Buy Yaka Token
            </Button>
            {electricityBill && (
              <p className="text-xs text-gray-500 mt-3">
                Outstanding bill: UGX {electricityBill.amount.toLocaleString()}
              </p>
            )}
          </div>

          {/* Water Card */}
          <div className="border rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#d1e7dd] flex items-center justify-center mx-auto mb-4">
              <Droplet className="w-6 h-6 text-[#1e3a3f]" />
            </div>
            <h4 className="mb-2">Water (NWSC)</h4>
            {waterBill ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Outstanding: UGX {waterBill.amount.toLocaleString()}
                </p>
                <Button
                  className="w-full bg-black text-white hover:bg-gray-800"
                  onClick={() => handlePayBill(waterBill)}
                >
                  Pay Now
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-600">No Outstanding Bills</p>
            )}
          </div>

          {/* Rubbish Collection Card */}
          <div className="border rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="mb-2">Rubbish Collection</h4>
            {rubbishBill ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Outstanding: UGX {rubbishBill.amount.toLocaleString()}
                </p>
                <Button
                  className="w-full bg-red-600 text-white hover:bg-red-700"
                  onClick={() => handlePayBill(rubbishBill)}
                >
                  Pay Overdue
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-600">No Outstanding Bills</p>
            )}
          </div>

          {/* WiFi Card */}
          <div className="border rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#d1e7dd] flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-6 h-6 text-[#1e3a3f]" />
            </div>
            <h4 className="mb-2">WiFi Internet</h4>
            <p className="text-sm text-gray-600 mb-4">
              Manage your WiFi subscription
            </p>
            <Button
              className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]"
              onClick={onNavigateToWiFi}
            >
              View Plans
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showElectricityDialog} onOpenChange={setShowElectricityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Yaka Electricity Token</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Amount to Buy</label>
              <Input
                type="number"
                min="1"
                value={electricityAmount}
                onChange={(event) => setElectricityAmount(event.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Meter Number</label>
              <Input
                type="text"
                value={electricityMeterNumber}
                onChange={(event) => setElectricityMeterNumber(event.target.value)}
                placeholder="Meter number"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Phone Number</label>
              <Input
                type="tel"
                value={electricityPhoneNumber}
                onChange={(event) => setElectricityPhoneNumber(event.target.value)}
                placeholder="0700000000"
              />
            </div>
            <Button
              className="w-full"
              onClick={buyElectricityToken}
              disabled={isLoading || !electricityAmount || !electricityMeterNumber || !electricityPhoneNumber}
            >
              {isLoading ? 'Buying token...' : 'Buy Token'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {latestElectricityToken && (
        <div className="bg-[#e8f4f5] border border-[#1e3a3f] rounded-xl p-5">
          <h3 className="text-lg mb-2">Latest Electricity Token</h3>
          <p className="text-sm text-gray-700">Token: <span className="font-semibold">{latestElectricityToken.tokenNumber}</span></p>
          <p className="text-sm text-gray-700">Amount: UGX {latestElectricityToken.amount.toLocaleString()}</p>
          <p className="text-sm text-gray-700">Meter: {latestElectricityToken.meterNumber || 'Saved on purchase'}</p>
          <p className="text-sm text-gray-700">Phone: {latestElectricityToken.phoneNumber || 'Saved on purchase'}</p>
        </div>
      )}

      {/* My Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div>
            <h3 className="text-xl mb-1">My Bills</h3>
            <p className="text-sm text-gray-600">Track your utility bills and payment history</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">Bill Type</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Provider</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Account</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Due Date</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 && yakaPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-sm text-gray-600">No bills or token purchases yet.</td>
                </tr>
              )}
              {bills.map((bill) => {
                const Icon = billIcons[bill.type];
                const iconColor = billColors[bill.type];
                return (
                  <tr key={bill.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                        <span className="text-sm">{billLabels[bill.type]}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{bill.provider}</td>
                    <td className="p-4 text-sm">{bill.account}</td>
                    <td className="p-4 text-sm">UGX {bill.amount.toLocaleString()}</td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(bill.dueDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        }).replace(/\//g, '-')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          bill.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : bill.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {bill.status !== 'paid' ? (
                        <Button
                          size="sm"
                          className="bg-black text-white hover:bg-gray-800"
                          onClick={() => handlePayBill(bill)}
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <span className="text-green-600 text-sm">
                          Paid {bill.paidDate}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {yakaPurchases.map((purchase) => (
                <tr key={`yaka-${purchase.id}`} className="border-b hover:bg-gray-50 bg-yellow-50/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm">Electricity (Yaka Token)</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">UMEME</td>
                  <td className="p-4 text-sm">Prepaid Meter</td>
                  <td className="p-4 text-sm">UGX {purchase.amount.toLocaleString()}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(purchase.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }).replace(/\//g, '-')}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">paid</span>
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    Token Ref: {purchase.receiptNumber || 'YAKA'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Bill</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Bill Type</span>
                  <span>{billLabels[selectedBill.type]}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Provider</span>
                  <span>{selectedBill.provider}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Due Date</span>
                  <span>{new Date(selectedBill.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-xl">UGX {selectedBill.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('mtn')}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        paymentMethod === 'mtn' ? 'border-[#4F46E5] bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm">MTN</p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('airtel')}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        paymentMethod === 'airtel' ? 'border-[#4F46E5] bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm">Airtel</p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('bank')}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        paymentMethod === 'bank' ? 'border-[#4F46E5] bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm">Bank</p>
                    </button>
                  </div>
                </div>

                {(paymentMethod === 'mtn' || paymentMethod === 'airtel') && (
                  <div>
                    <label className="text-sm text-gray-700 mb-2 block">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="0700000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={processPayment}
                  disabled={isLoading || (paymentMethod !== 'bank' && !phoneNumber)}
                >
                  {isLoading ? 'Processing...' : `Pay UGX ${selectedBill.amount.toLocaleString()}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}