import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { CreditCard, Home, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface RentPaymentProps {
  autoOpenInitialPayment?: boolean;
  onInitialPaymentCompleted?: () => void;
  onPaymentDataLoaded?: (data: { hasRentAssignment: boolean; isFirstRentPayment: boolean }) => void;
}

export function RentPayment({ autoOpenInitialPayment = false, onInitialPaymentCompleted, onPaymentDataLoaded }: RentPaymentProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentPurpose, setPaymentPurpose] = useState<'rent' | 'security'>('rent');
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [rentMonths, setRentMonths] = useState<number>(3);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const [assignment, setAssignment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const minRentMonths = 1;
  const maxRentMonths = 12;

  const updateRentMonths = (nextValue: number) => {
    const safeValue = Number.isFinite(nextValue) ? Math.round(nextValue) : minRentMonths;
    setRentMonths(Math.min(maxRentMonths, Math.max(minRentMonths, safeValue)));
  };

  const loadPaymentData = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/payments/me', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load rent data');
        return;
      }

      const assignmentData = result?.data?.assignment || null;
      const paymentsData = Array.isArray(result?.data?.payments) ? result.data.payments : [];

      setAssignment(assignmentData);
      setPayments(paymentsData);

      const completedRentPayments = paymentsData.filter((payment: any) => payment.type === 'rent' && payment.status === 'completed');
      const hasRentAssignment = Number(assignmentData?.rent || 0) > 0;
      const isFirstRentPayment = completedRentPayments.length === 0;

      setRentMonths(isFirstRentPayment ? 3 : 1);

      onPaymentDataLoaded?.({ hasRentAssignment, isFirstRentPayment });

      if (autoOpenInitialPayment && hasRentAssignment && isFirstRentPayment && !hasAutoOpened) {
        setShowPaymentDialog(true);
        setHasAutoOpened(true);
      }
    } catch (error) {
      console.error('Load rent payment data error:', error);
      toast.error('Failed to load rent data');
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  useEffect(() => {
    if (!autoOpenInitialPayment) {
      setHasAutoOpened(false);
    }
  }, [autoOpenInitialPayment]);

  const rentAmount = Number(assignment?.rent || 0);
  const securityDepositAmount = Number(assignment?.securityDeposit || rentAmount || 0);
  const nextDueDate = assignment?.nextDueDate || null;
  const completedRentPayments = payments.filter((payment) => payment.type === 'rent' && payment.status === 'completed');
  const completedPayments = payments.filter((payment) => payment.status === 'completed');
  const hasPaidSecurityDeposit = completedPayments.some((payment) =>
    payment.displayType === 'security_deposit' ||
    payment.type === 'security_deposit' ||
    String(payment.receiptNumber || '').startsWith('SEC-'),
  );
  const isFirstRentPayment = completedRentPayments.length === 0;
  const rentPaymentAmount = rentAmount * rentMonths;
  const amountToPay = paymentPurpose === 'security' ? securityDepositAmount : rentPaymentAmount;
  const hasRentAssignment = rentAmount > 0;
  const unitInfo = {
    building: assignment?.building || 'Not assigned',
    unit: assignment?.unit || assignment?.unitId || '—',
  };

  const processPayment = async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const endpoint = paymentPurpose === 'security' ? '/payments/security-deposit' : '/payments/rent';
      const response = await requestFunction(endpoint, {
        method: 'POST',
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
        body: JSON.stringify({
          method: paymentMethod,
          phoneNumber: paymentMethod === 'bank' ? null : phoneNumber,
          monthsCovered: paymentPurpose === 'rent' ? (isFirstRentPayment ? 3 : rentMonths) : undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || `${paymentPurpose === 'security' ? 'Security deposit' : 'Rent'} payment failed`);
        return;
      }

      toast.success(result?.message || `${paymentPurpose === 'security' ? 'Security deposit' : 'Rent'} payment successful`);
      setShowPaymentDialog(false);
      setPhoneNumber('');
      if (paymentPurpose === 'rent' && isFirstRentPayment) {
        onInitialPaymentCompleted?.();
      }
      await loadPaymentData();
    } catch (error) {
      console.error('Rent payment error:', error);
      toast.error('Rent payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Rent Payment</h2>
        <p className="text-gray-600">Pay your monthly rent</p>
      </div>

      {/* Payment Summary Card */}
      <div className="bg-[#1e3a3f] rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-300 mb-2">Monthly Rent</p>
            <h3 className="text-5xl mb-2">UGX {rentAmount.toLocaleString()}</h3>
            <p className="text-gray-300">{unitInfo.building} - Unit {unitInfo.unit}</p>
            {hasRentAssignment && (
              <p className="text-sm text-gray-300 mt-1">
                {isFirstRentPayment ? 'Initial rent payment covers first 3 months' : 'Standard monthly rent payment'}
              </p>
            )}
          </div>
          <Home className="w-20 h-20 text-white opacity-20" />
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>Due Date: {nextDueDate ? new Date(nextDueDate).toLocaleDateString() : 'Not set'}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-200">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-300 mb-1">Initial 3-Month Rent Total</p>
            <p className="text-2xl font-semibold">UGX {(rentAmount * 3).toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-300 mb-1">Security Deposit</p>
            <p className="text-2xl font-semibold">UGX {securityDepositAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-300 mt-1">Refundable after move-out inspection if no damage is found.</p>
          </div>
        </div>
      </div>

      {/* Payment Options */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl mb-4">Make Payment</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setPaymentPurpose('rent');
              setShowPaymentDialog(true);
            }}
            disabled={!hasRentAssignment}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Pay Rent Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => {
              setPaymentPurpose('security');
              setShowPaymentDialog(true);
            }}
            disabled={!securityDepositAmount || hasPaidSecurityDeposit}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {hasPaidSecurityDeposit ? 'Security Deposit Paid' : 'Pay Security Deposit'}
          </Button>
        </div>
        {!hasRentAssignment && (
          <p className="text-sm text-gray-600 mt-3">No rent assignment found for this account yet.</p>
        )}
        {hasPaidSecurityDeposit && (
          <p className="text-sm text-green-700 mt-3">Security deposit has already been paid for this tenancy.</p>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{paymentPurpose === 'security' ? 'Pay Security Deposit' : 'Pay Rent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Unit</span>
                <span>{unitInfo.building} - {unitInfo.unit}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Purpose</span>
                <span>{paymentPurpose === 'security' ? 'Security Deposit' : 'Rent Payment'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="text-xl">UGX {amountToPay.toLocaleString()}</span>
              </div>
              {paymentPurpose === 'rent' && (
                <>
                  {isFirstRentPayment ? (
                    <div>
                      <label className="text-sm text-gray-700 mb-2 block">First payment requirement</label>
                      <div className="p-3 border rounded-lg bg-[#e8f4f5] border-[#1e3a3f] text-sm">
                        First-time tenants must pay exactly 3 months before accessing all features.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm text-gray-700 mb-2 block">Pay for how many months?</label>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Months to pay</p>
                          <p className="text-xl">{rentMonths} {rentMonths === 1 ? 'month' : 'months'}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            aria-label="Increase months"
                            onClick={() => updateRentMonths(rentMonths + 1)}
                            disabled={rentMonths >= maxRentMonths}
                            className="p-1 border rounded disabled:opacity-50"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Decrease months"
                            onClick={() => updateRentMonths(rentMonths - 1)}
                            disabled={rentMonths <= minRentMonths}
                            className="p-1 border rounded disabled:opacity-50"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Use arrows to choose from 1 to 12 months.</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600">Due Date</span>
                    <span>{nextDueDate ? new Date(nextDueDate).toLocaleDateString() : 'Not set'}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('mtn')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      paymentMethod === 'mtn' ? 'border-[#1e3a3f] bg-[#e8f4f5]' : 'border-gray-200'
                    }`}
                  >
                    <p className="text-sm">MTN</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('airtel')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      paymentMethod === 'airtel' ? 'border-[#1e3a3f] bg-[#e8f4f5]' : 'border-gray-200'
                    }`}
                  >
                    <p className="text-sm">Airtel</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      paymentMethod === 'bank' ? 'border-[#1e3a3f] bg-[#e8f4f5]' : 'border-gray-200'
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
                disabled={
                  isLoading ||
                  (paymentMethod !== 'bank' && !phoneNumber) ||
                  (paymentPurpose === 'rent' && !hasRentAssignment) ||
                  (paymentPurpose === 'security' && (!securityDepositAmount || hasPaidSecurityDeposit))
                }
              >
                {isLoading ? 'Processing...' : `Pay UGX ${amountToPay.toLocaleString()}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Method</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {completedPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-sm text-gray-600">
                    No payment history available.
                  </td>
                </tr>
              )}
              {completedPayments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm">
                    <div>UGX {Number(payment.amount || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 capitalize">{payment.displayType || payment.type}</div>
                  </td>
                  <td className="p-4 text-sm">{payment.method}</td>
                  <td className="p-4 text-sm text-green-600">Paid</td>
                  <td className="p-4 text-sm">{payment.receiptNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}