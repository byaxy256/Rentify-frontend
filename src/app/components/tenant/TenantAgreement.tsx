import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle, Building2, Calendar, DollarSign, ShieldCheck } from 'lucide-react';
import { requestFunction } from '../../lib/functionClient';

interface TenantAgreementProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export function TenantAgreement({ isOpen, onAccept, onClose, readOnly = false }: TenantAgreementProps) {
  const [assignment, setAssignment] = useState<any>(null);
  const rawUserId = (localStorage.getItem('userId') || '').trim();
  const rawUserEmail = (localStorage.getItem('userEmail') || '').trim().toLowerCase();
  const invalidIdentityValues = new Set(['', 'undefined', 'null', 'tenant']);
  const scopedIdentity = !invalidIdentityValues.has(rawUserId)
    ? `id:${rawUserId}`
    : !invalidIdentityValues.has(rawUserEmail)
      ? `email:${rawUserEmail}`
      : 'session';

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await requestFunction('/tenants/me/assignment', {
          headers: {
            ...(accessToken ? { 'x-user-token': accessToken } : {}),
          },
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          setAssignment(result.data || null);
        }
      } catch {
        setAssignment(null);
      }
    };

    if (isOpen) {
      loadAssignment();
    }
  }, [isOpen]);

  const monthlyRent = Number(assignment?.rent || 0);
  const threeMonthTotal = monthlyRent * 3;
  const securityDeposit = Number(assignment?.securityDeposit || monthlyRent || 0);

  const acceptedDate = localStorage.getItem(`tenantAgreementAcceptedDate:${scopedIdentity}`);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && readOnly) onClose?.(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-3xl">Tenant Agreement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[78vh] pr-2">
          <div className="bg-[#1e3a3f] text-white rounded-2xl p-6 shadow-lg grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Tenant</p>
              <p className="font-medium">{assignment?.name || localStorage.getItem('userName') || 'Tenant'}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Building</p>
              <p className="font-medium">{assignment?.building || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Unit</p>
              <p className="font-medium">{assignment?.unit || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Lease Period</p>
              <p className="font-medium">
                {assignment?.leaseStartDate ? new Date(assignment.leaseStartDate).toLocaleDateString() : 'N/A'} - {assignment?.leaseEndDate ? new Date(assignment.leaseEndDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Monthly Rent</p>
              <p className="font-medium">UGX {monthlyRent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">3-Month Total</p>
              <p className="font-medium">UGX {threeMonthTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Security Deposit</p>
              <p className="font-medium">UGX {securityDeposit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Next Due</p>
              <p className="font-medium">{assignment?.nextDueDate ? new Date(assignment.nextDueDate).toLocaleDateString() : 'Not set'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-5 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-5 h-5 text-[#1e3a3f]" />
                <h3 className="text-lg">Payment Terms</h3>
              </div>
              <ul className="list-disc ml-5 space-y-2 text-sm text-gray-700">
                <li>The first rent payment must be paid immediately and covers 3 months.</li>
                <li>After the first 3 months, rent continues on a monthly basis.</li>
                <li>Rent, utilities, and security deposit payments must be made through Rentify.</li>
                <li>Payment plan requests can be submitted and tracked from your dashboard.</li>
              </ul>
            </div>

            <div className="border rounded-xl p-5 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="w-5 h-5 text-[#1e3a3f]" />
                <h3 className="text-lg">Property Details</h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-medium">Building:</span> {assignment?.building || 'Not assigned'}</p>
                <p><span className="font-medium">Unit:</span> {assignment?.unit || 'Not assigned'}</p>
                <p><span className="font-medium">Lease Start:</span> {assignment?.leaseStartDate ? new Date(assignment.leaseStartDate).toLocaleDateString() : 'Not set'}</p>
                <p><span className="font-medium">Lease End:</span> {assignment?.leaseEndDate ? new Date(assignment.leaseEndDate).toLocaleDateString() : 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-5 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#1e3a3f]" />
              <h3 className="text-lg">Responsibilities</h3>
            </div>
            <ul className="list-disc ml-5 space-y-2 text-sm text-gray-700">
              <li>Keep the property in good condition and report damages quickly.</li>
              <li>Pay rent, utilities, and security deposit according to the agreement.</li>
              <li>Follow community and tenancy rules throughout the lease period.</li>
              <li>Understand that the security deposit may be withheld for damage or unpaid obligations.
              </li>
            </ul>
          </div>

          <div className="border-2 border-[#1e3a3f] rounded-xl p-5 bg-[#1e3a3f]/5">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#1e3a3f] mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-2">Before you continue</p>
                <p>
                  By accepting this agreement, you confirm that you understand your lease details, your upfront 3-month rent obligation, and the refundable security deposit terms.
                </p>
              </div>
            </div>
          </div>

          {readOnly ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Accepted on {acceptedDate ? new Date(acceptedDate).toLocaleString() : 'N/A'}
              </p>
              <Button className="w-full" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <Button className="w-full text-lg py-6" onClick={onAccept}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Tenant Agreement
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
