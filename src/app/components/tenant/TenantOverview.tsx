import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { CreditCard, Zap, AlertCircle, CheckCircle, Calendar, Home, FileText, Bell } from 'lucide-react';
import { requestFunction } from '../../lib/functionClient';

interface TenantOverviewProps {
  onNavigateToPayment?: () => void;
  onNavigateToRequests?: () => void;
  onViewLease?: () => void;
}

export function TenantOverview({ onNavigateToPayment, onNavigateToRequests, onViewLease }: TenantOverviewProps) {
  const [assignment, setAssignment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const announcements: Array<{ id: string; title: string; date: string; message: string }> = [];
  const recentActivity: Array<{ id: string; title: string; date: string; value?: string }> = [];

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const [assignmentResponse, paymentsResponse, billsResponse, requestsResponse] = await Promise.all([
          requestFunction('/tenants/me/assignment', {
            headers: {
              ...(accessToken ? { 'x-user-token': accessToken } : {}),
            },
          }),
          requestFunction('/payments/me', {
            headers: {
              ...(accessToken ? { 'x-user-token': accessToken } : {}),
            },
          }),
          requestFunction('/bills', {
            headers: {
              ...(accessToken ? { 'x-user-token': accessToken } : {}),
            },
          }),
          requestFunction('/payment-plans', {
            headers: {
              ...(accessToken ? { 'x-user-token': accessToken } : {}),
            },
          }),
        ]);

        const assignmentResult = await assignmentResponse.json().catch(() => ({}));
        const paymentsResult = await paymentsResponse.json().catch(() => ({}));
        const billsResult = await billsResponse.json().catch(() => ({}));
        const requestsResult = await requestsResponse.json().catch(() => ({}));

        if (assignmentResponse.ok) {
          setAssignment(assignmentResult.data || null);
        }

        if (paymentsResponse.ok) {
          setPayments(Array.isArray(paymentsResult?.data?.payments) ? paymentsResult.data.payments : []);
        }

        if (billsResponse.ok) {
          setBills(Array.isArray(billsResult?.data) ? billsResult.data : []);
        }

        if (requestsResponse.ok) {
          setRequests(Array.isArray(requestsResult?.data) ? requestsResult.data : []);
        }
      } catch {
        setAssignment(null);
        setPayments([]);
        setBills([]);
        setRequests([]);
      }
    };

    loadAssignment();
  }, []);

  const unitBuilding = assignment?.building || 'Unit assignment pending';
  const unitNumber = assignment?.unit || '—';
  const monthlyRent = Number(assignment?.rent || 0);

  const assignedDate = assignment?.assignedDate || assignment?.assigned_date || null;
  const leaseStartDate = assignment?.leaseStartDate || assignment?.lease_start_date || assignedDate || null;
  const leaseEndDate = assignment?.leaseEndDate || assignment?.lease_end_date || null;
  const nextDueDate = assignment?.nextDueDate || assignment?.next_due_date || assignedDate || leaseStartDate || null;

  const completedRentPayments = payments.filter((payment) => payment.type === 'rent' && payment.status === 'completed');
  const pendingUtilityBills = bills.filter((bill) => bill.status === 'pending' || bill.status === 'overdue').length;
  const openPaymentPlanRequests = requests.filter((plan) => plan.status === 'pending').length;

  const daysRemaining = leaseEndDate
    ? Math.max(0, Math.ceil((new Date(leaseEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Welcome back! Here's your rental summary</p>
      </div>

      {/* Unit Info Card */}
      <div className="bg-[#1e3a3f] rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300 mb-1">Your Unit</p>
            <h3 className="text-3xl mb-2">{unitBuilding} - {unitNumber}</h3>
            <p className="text-gray-300">
              Monthly Rent: {monthlyRent > 0 ? `UGX ${monthlyRent.toLocaleString()}` : 'Not assigned'}
            </p>
            <p className="text-gray-300 text-sm mt-1">Status: {assignment?.assigned ? 'Assigned' : 'Unassigned'}</p>
          </div>
          <Home className="w-16 h-16 text-white opacity-20" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Rent Status</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl">{completedRentPayments.length > 0 ? 'Paid' : 'Pending'}</p>
          <p className="text-xs text-gray-500 mt-1">{completedRentPayments.length} payment(s) recorded</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Next Due</span>
            <Calendar className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-2xl">{nextDueDate ? new Date(nextDueDate).toLocaleDateString() : 'Not set'}</p>
          <p className="text-xs text-gray-500 mt-1">From your active lease</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Utility Bills</span>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl">{pendingUtilityBills} Pending</p>
          <p className="text-xs text-gray-500 mt-1">Monthly cycle on assignment date</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Open Requests</span>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl">{openPaymentPlanRequests}</p>
          <p className="text-xs text-gray-500 mt-1">Payment plans pending approval</p>
        </div>
      </div>

      {/* Lease Information */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#e8f4f5] rounded-lg">
              <FileText className="w-6 h-6 text-[#1e3a3f]" />
            </div>
            <div>
              <h3 className="text-xl">Lease Agreement</h3>
              <p className="text-sm text-gray-600">Your current lease information</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onViewLease}>
            View Full Lease
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 mb-1">Lease Start</p>
            <p className="font-semibold">{leaseStartDate ? new Date(leaseStartDate).toLocaleDateString() : 'Not available'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Lease End</p>
            <p className="font-semibold">{leaseEndDate ? new Date(leaseEndDate).toLocaleDateString() : 'Not available'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Days Remaining</p>
            <p className="font-semibold text-[#1e3a3f]">{typeof daysRemaining === 'number' ? `${daysRemaining} days` : 'Not available'}</p>
          </div>
        </div>
      </div>

      {/* Community Announcements */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center gap-3">
          <Bell className="w-5 h-5 text-[#1e3a3f]" />
          <h3 className="text-xl">Community Announcements</h3>
        </div>
        <div className="divide-y">
          {announcements.length === 0 && (
            <div className="p-6 text-sm text-gray-600">No announcements available right now.</div>
          )}
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{announcement.title}</h4>
                <span className="text-xs text-gray-500">{new Date(announcement.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600">{announcement.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg">Make Payment</h3>
              <p className="text-sm text-gray-600">Pay rent or utility bills</p>
            </div>
          </div>
          <Button className="w-full bg-[#1e3a3f] hover:bg-[#2d5358]" onClick={onNavigateToPayment}>
            Pay Now
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg">Submit Request</h3>
              <p className="text-sm text-gray-600">Report issues or maintenance needs</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onNavigateToRequests}>
            New Request
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl">Recent Activity</h3>
        </div>
        <div className="p-6 space-y-4">
          {recentActivity.length === 0 && (
            <p className="text-sm text-gray-600">No recent tenant activity yet.</p>
          )}
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.date}</p>
              </div>
              {activity.value && <span className="text-sm">{activity.value}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
