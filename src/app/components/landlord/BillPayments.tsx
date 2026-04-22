import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Zap, Droplet, Trash2, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface Bill {
  id: string;
  type: 'electricity' | 'water' | 'rubbish' | 'ura';
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  building: string;
  buildingId?: string;
}

const billIcons = {
  electricity: Zap,
  water: Droplet,
  rubbish: Trash2,
  ura: DollarSign,
};

const billLabels = {
  electricity: 'Electricity',
  water: 'Water',
  rubbish: 'Rubbish Collection',
  ura: 'URA Taxes',
};

interface BillPaymentsProps {
  selectedProperty?: string;
}

export function BillPayments({ selectedProperty = 'all' }: BillPaymentsProps) {
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const loadBills = async () => {
    try {
      setIsLoadingBills(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/bills', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load bills');
        setAllBills([]);
        return;
      }

      const mappedBills: Bill[] = Array.isArray(result.data)
        ? result.data.map((bill: any) => ({
            id: bill.id,
            type: bill.type,
            amount: Number(bill.amount || 0),
            dueDate: bill.dueDate || bill.due_date,
            status: bill.status,
            paidDate: bill.paidDate || bill.paid_date || undefined,
            building: bill.building || 'Unknown Building',
            buildingId: bill.buildingId || bill.building_id,
          }))
        : [];

      setAllBills(mappedBills);
    } catch (error) {
      console.error('Load bills error:', error);
      toast.error('Failed to load bills');
      setAllBills([]);
    } finally {
      setIsLoadingBills(false);
    }
  };

  const filteredBills = selectedProperty === 'all'
    ? allBills
    : allBills.filter((bill) =>
        bill.buildingId === selectedProperty || bill.building === selectedProperty
      );

  useEffect(() => {
    loadBills();
  }, []);

  // Update bills when selectedProperty changes
  useEffect(() => {
    setBills(filteredBills);
  }, [selectedProperty, allBills]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePayBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowPaymentDialog(true);
    setPhoneNumber('');
  };

  const processPayment = () => {
    if (!selectedBill) return;

    setIsLoading(true);
    const markBillAsPaid = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await requestFunction(`/bills/${selectedBill.id}`, {
          method: 'PUT',
          headers: {
            ...(accessToken ? { 'x-user-token': accessToken } : {}),
          },
          body: JSON.stringify({ status: 'paid' }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(result?.message || 'Failed to update bill status');
          return;
        }

        toast.success(`${billLabels[selectedBill.type]} bill paid successfully!`);
        setShowPaymentDialog(false);
        await loadBills();
      } catch (error) {
        console.error('Bill payment error:', error);
        toast.error('Failed to process bill payment');
      } finally {
        setIsLoading(false);
      }
    };

    markBillAsPaid();
  };

  const totalPending = bills
    .filter(bill => bill.status === 'pending' || bill.status === 'overdue')
    .reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Bill Payments</h2>
        <p className="text-gray-600">Manage utility bills and taxes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Pending</span>
            <DollarSign className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl">UGX {totalPending.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Overdue Bills</span>
            <Calendar className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">{bills.filter(b => b.status === 'overdue').length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Paid This Month</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{bills.filter(b => b.status === 'paid').length}</p>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">All Bills</h3>
        </div>
        {isLoadingBills && (
          <div className="p-6 text-sm text-gray-600">Loading bills...</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Bill Type</th>
                <th className="text-left p-4">Building</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Due Date</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {!isLoadingBills && bills.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-sm text-gray-600">
                    No bills found for this property.
                  </td>
                </tr>
              )}
              {bills.map((bill) => {
                const Icon = billIcons[bill.type];
                return (
                  <tr key={bill.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <span>{billLabels[bill.type]}</span>
                      </div>
                    </td>
                    <td className="p-4">{bill.building}</td>
                    <td className="p-4">UGX {bill.amount.toLocaleString()}</td>
                    <td className="p-4">{new Date(bill.dueDate).toLocaleDateString()}</td>
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
                      {bill.status !== 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => handlePayBill(bill)}
                        >
                          Pay Now
                        </Button>
                      )}
                      {bill.status === 'paid' && (
                        <span className="text-green-600 text-sm">Paid on {bill.paidDate}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
                  <span className="text-gray-600">Building</span>
                  <span>{selectedBill.building}</span>
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
