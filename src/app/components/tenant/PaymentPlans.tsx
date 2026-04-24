import { useEffect, useState, type ChangeEvent } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Calendar, DollarSign, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface PaymentPlan {
  id: string;
  amount: number;
  reason: string;
  installments: number;
  installmentAmount: number;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  startDate?: string;
  payments: {
    id: string;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid';
    paidDate?: string;
  }[];
}

const buildHeaders = () => {
  const accessToken = localStorage.getItem('accessToken');
  return {
    ...(accessToken ? { 'x-user-token': accessToken } : {}),
  };
};

export function PaymentPlans() {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    amount: '',
    reason: '',
    installments: '2',
  });

  const loadPlans = async () => {
    try {
      const response = await requestFunction('/payment-plans', {
        headers: buildHeaders(),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load payment plans');
        return;
      }

      const backendPlans: PaymentPlan[] = Array.isArray(result.data)
        ? result.data.map((plan: any) => ({
            id: plan.id,
            amount: Number(plan.amount || 0),
            reason: plan.reason || '',
            installments: Number(plan.installments || 0),
            installmentAmount: Number(plan.installmentAmount || 0),
            requestDate: plan.requestDate,
            status: plan.status,
            startDate: plan.startDate,
            payments: Array.isArray(plan.payments)
              ? plan.payments.map((payment: any) => ({
                  id: payment.id,
                  dueDate: payment.dueDate,
                  amount: Number(payment.amount || 0),
                  status: payment.status,
                  paidDate: payment.paidDate,
                }))
              : [],
          }))
        : [];

      setPlans(backendPlans);
    } catch (error) {
      console.error('Load payment plans error:', error);
      toast.error('Failed to load payment plans');
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleRequestPlan = () => {
    if (!newRequest.amount || !newRequest.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(newRequest.amount);
    const installments = parseInt(newRequest.installments, 10);

    requestFunction('/payment-plans', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        amount,
        installments,
        reason: newRequest.reason,
      }),
    })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) {
          toast.error(result?.message || 'Failed to submit payment plan request');
          return;
        }

        toast.success('Payment plan request submitted. Awaiting landlord approval.');
        setShowRequestDialog(false);
        setNewRequest({ amount: '', reason: '', installments: '2' });
        loadPlans();
      })
      .catch((error) => {
        console.error('Submit payment plan request error:', error);
        toast.error('Failed to submit payment plan request');
      });
  };

  const handlePayInstallment = (planId: string, paymentId: string) => {
    setPlans(
      plans.map((plan) => {
        if (plan.id === planId) {
          return {
            ...plan,
            payments: plan.payments.map((payment) =>
              payment.id === paymentId
                ? { ...payment, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] }
                : payment
            ),
          };
        }
        return plan;
      })
    );
    toast.success('Installment payment successful!');
  };

  const getStatusColor = (status: PaymentPlan['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
    }
  };

  const getPaymentStatusColor = (status: 'pending' | 'paid') => {
    return status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  };

  const approvedPlans = plans.filter((plan) => plan.status === 'approved');
  const requestedPlans = plans.filter((plan) => plan.status === 'pending');
  const rejectedPlans = plans.filter((plan) => plan.status === 'rejected');

  const totalOwed = approvedPlans.reduce((sum, plan) => {
    const unpaidAmount = plan.payments
      .filter((payment) => payment.status === 'pending')
      .reduce((running, payment) => running + payment.amount, 0);
    return sum + unpaidAmount;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Payment Plans</h2>
        <p className="text-gray-600">Request and manage payment installment plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active Plans</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{approvedPlans.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Pending Approval</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl">{requestedPlans.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Remaining</span>
            <DollarSign className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">UGX {(totalOwed / 1000).toFixed(0)}K</p>
        </div>
      </div>

      <div className="bg-[#e8f4f5] border border-[#1e3a3f]/20 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Need a Payment Plan?</h3>
            <p className="text-sm text-gray-600">Request to split your rent payment into smaller installments</p>
          </div>
          <Button className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]" onClick={() => setShowRequestDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Request Plan
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Requested Plans</h3>
        {requestedPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 text-gray-600">No pending payment plan requests.</div>
        ) : (
          requestedPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl">Request #{plan.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(plan.status)}`}>{plan.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">Requested on {new Date(plan.requestDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">UGX {plan.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{plan.installments} installments</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Reason:</p>
                  <p className="bg-gray-50 p-3 rounded-lg">{plan.reason}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">Awaiting Approval</p>
                    <p className="text-sm text-yellow-700 mt-1">Your landlord will review your request and respond soon.</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Approved Plans</h3>
        {approvedPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 text-gray-600">No approved payment plans yet.</div>
        ) : (
          approvedPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl">Approved Plan #{plan.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(plan.status)}`}>{plan.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">Approved on {new Date(plan.requestDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">UGX {plan.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{plan.installments} installments</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Reason:</p>
                  <p className="bg-gray-50 p-3 rounded-lg">{plan.reason}</p>
                </div>

                {plan.payments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Installment Schedule</h4>
                    <div className="space-y-2">
                      {plan.payments.map((payment, index) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center font-semibold">{index + 1}</div>
                            <div>
                              <p className="font-medium">Installment {index + 1}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                Due: {new Date(payment.dueDate).toLocaleDateString()}
                                {payment.paidDate && <span className="text-green-600">• Paid: {new Date(payment.paidDate).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">UGX {payment.amount.toLocaleString()}</p>
                              <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(payment.status)}`}>{payment.status}</span>
                            </div>
                            {payment.status === 'pending' && (
                              <Button size="sm" className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]" onClick={() => handlePayInstallment(plan.id, payment.id)}>
                                Pay Now
                              </Button>
                            )}
                            {payment.status === 'paid' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {rejectedPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Rejected Plans</h3>
          {rejectedPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl">Rejected Plan #{plan.id}</h3>
                <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(plan.status)}`}>{plan.status}</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Requested on {new Date(plan.requestDate).toLocaleDateString()}</p>
              <p className="bg-gray-50 p-3 rounded-lg mb-4">{plan.reason}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Request Denied</p>
                  <p className="text-sm text-red-700 mt-1">Your payment plan request was not approved. Please contact your landlord for more information.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payment Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Total Amount (UGX) *</label>
              <Input
                type="number"
                placeholder="Enter total amount"
                value={newRequest.amount}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewRequest({ ...newRequest, amount: event.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Number of Installments *</label>
              <select
                aria-label="Number of installments"
                value={newRequest.installments}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setNewRequest({ ...newRequest, installments: event.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="2">2 installments</option>
                <option value="3">3 installments</option>
                <option value="4">4 installments</option>
                <option value="6">6 installments</option>
              </select>
              {newRequest.amount && (
                <p className="text-sm text-gray-600 mt-2">
                  Each installment: UGX {(parseFloat(newRequest.amount) / parseInt(newRequest.installments, 10)).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Reason for Request *</label>
              <textarea
                className="w-full p-2 border rounded-lg min-h-[100px]"
                placeholder="Explain why you need a payment plan..."
                value={newRequest.reason}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNewRequest({ ...newRequest, reason: event.target.value })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your request will be sent to your landlord for approval. You will be notified once they respond.
              </p>
            </div>

            <Button className="w-full bg-[#1e3a3f] text-white hover:bg-[#2d5358]" onClick={handleRequestPlan}>
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
