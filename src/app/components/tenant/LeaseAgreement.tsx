import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, CheckCircle, Calendar, Home, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface LeaseAgreementProps {
  isOpen: boolean;
  onAccept?: () => void;
  onClose?: () => void;
  tenantName: string;
  readOnly?: boolean;
}

export function LeaseAgreement({ isOpen, onAccept, onClose, tenantName, readOnly = false }: LeaseAgreementProps) {
  const [hasRead, setHasRead] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'tenant';
  const acceptedDate = localStorage.getItem(`leaseAcceptedDate:${userId}`) || localStorage.getItem('leaseAcceptedDate');

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

  const handleAccept = () => {
    if (!hasAccepted) {
      toast.error('Please check the acceptance box to continue');
      return;
    }
    onAccept?.();
  };

  const handleClose = () => {
    if (readOnly) {
      onClose?.();
    }
  };

  const leaseDetails = {
    tenantName: tenantName,
    unitNumber: assignment?.unit || 'Not assigned',
    buildingName: assignment?.building || 'Not assigned',
    rentAmount: Number(assignment?.rent || 0),
    threeMonthTotal: Number(assignment?.rent || 0) * 3,
    dueDate: assignment?.nextDueDate ? new Date(assignment.nextDueDate).toLocaleDateString() : 'Not set',
    securityDeposit: Number(assignment?.securityDeposit || assignment?.rent || 0),
    leaseStartDate: assignment?.leaseStartDate || new Date().toISOString().split('T')[0],
    leaseEndDate: assignment?.leaseEndDate || new Date().toISOString().split('T')[0],
    landlordName: localStorage.getItem('landlordName') || 'Property Manager',
    landlordContact: localStorage.getItem('landlordPhone') || 'Not set',
  };

  return (
    <Dialog open={isOpen} onOpenChange={readOnly ? handleClose : () => {}}>
      <DialogContent className="max-w-6xl max-h-[92vh]" onInteractOutside={(e) => readOnly ? undefined : e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-3xl">
            <FileText className="w-7 h-7 text-[#1e3a3f]" />
            Digital Lease Agreement
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[68vh] pr-4">
          <div className="space-y-6">
            {/* Agreement Header */}
            <div className="bg-[#1e3a3f] text-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl mb-4">Rental Lease Agreement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-white/70 mb-1">Tenant Name</p>
                  <p className="font-medium">{leaseDetails.tenantName}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Property</p>
                  <p className="font-medium">{leaseDetails.unitNumber}, {leaseDetails.buildingName}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Lease Period</p>
                  <p className="font-medium">
                    {new Date(leaseDetails.leaseStartDate).toLocaleDateString()} - {new Date(leaseDetails.leaseEndDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Monthly Rent</p>
                  <p className="font-medium">UGX {leaseDetails.rentAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Initial 3-Month Total</p>
                  <p className="font-medium">UGX {leaseDetails.threeMonthTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Security Deposit</p>
                  <p className="font-medium">UGX {leaseDetails.securityDeposit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Lease Start</p>
                  <p className="font-medium">{new Date(leaseDetails.leaseStartDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Lease End</p>
                  <p className="font-medium">{new Date(leaseDetails.leaseEndDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* 1. Parties to Agreement */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">1</span>
                Parties to Agreement
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                This Rental Lease Agreement ("Agreement") is entered into on {new Date(leaseDetails.leaseStartDate).toLocaleDateString()} between:
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p><strong>Landlord:</strong> {leaseDetails.landlordName}</p>
                <p><strong>Contact:</strong> {leaseDetails.landlordContact}</p>
                <p><strong>Tenant:</strong> {leaseDetails.tenantName}</p>
                <p><strong>Property:</strong> {leaseDetails.unitNumber}, {leaseDetails.buildingName}</p>
              </div>
            </div>

            {/* 2. Rent Amount & Due Date */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">2</span>
                Rent Amount & Payment Terms
              </h4>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-[#1e3a3f] mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Monthly Rent</p>
                    <p>The Tenant agrees to pay a monthly rent of <strong>UGX {leaseDetails.rentAmount.toLocaleString()}</strong></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-[#1e3a3f] mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Initial 3-Month Payment</p>
                    <p>The Tenant must pay <strong>UGX {leaseDetails.threeMonthTotal.toLocaleString()}</strong> immediately after accepting the tenant agreement before monthly billing begins.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#1e3a3f] mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Due Date</p>
                    <p>Rent is due on the <strong>{leaseDetails.dueDate}</strong>. Payment must be made through the Rentify platform using Mobile Money (MTN/Airtel) or Bank Transfer.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Security Deposit */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">3</span>
                Security Deposit
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                The Tenant shall pay a security deposit of <strong>UGX {leaseDetails.securityDeposit.toLocaleString()}</strong>. It is refundable after move-out inspection if there is no damage beyond normal wear and tear and all obligations are settled.
              </p>
            </div>

            {/* 4. Lease Duration */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">4</span>
                Lease Duration
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 mb-1">Start Date</p>
                    <p className="font-medium">{new Date(leaseDetails.leaseStartDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">End Date</p>
                    <p className="font-medium">{new Date(leaseDetails.leaseEndDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-gray-700 mt-3">
                  This initial lease is valid for a period of 3 months and can be renewed to monthly cycles unless either party provides 30 days written notice of termination.
                </p>
              </div>
            </div>

            {/* 5. Utility Responsibility */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">5</span>
                Utility Responsibility
              </h4>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-medium mb-2">The Tenant is responsible for:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Electricity bills (UMEME) - to be paid directly to provider</li>
                  <li>Water bills (NWSC) - to be paid directly to provider</li>
                  <li>WiFi internet subscription - managed through Rentify platform</li>
                  <li>Rubbish collection fees - as applicable</li>
                </ul>
                <p className="mt-3">
                  The Landlord is responsible for maintaining the water supply system, electrical installations, and common area utilities.
                </p>
              </div>
            </div>

            {/* 6. Late Payment Terms */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">6</span>
                Late Payment Terms
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>Grace Period:</strong> A 3-day grace period is provided after the due date.</p>
                    <p><strong>Late Fee:</strong> After the grace period, a late fee of <strong>5% of the monthly rent</strong> will be charged.</p>
                    <p><strong>Non-Payment:</strong> Failure to pay rent for more than 14 days may result in eviction proceedings as per Ugandan Tenancy Laws.</p>
                    <p><strong>Notices:</strong> Payment reminders will be sent through the Rentify platform 3 days before the due date and on overdue dates.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Rules of Stay */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">7</span>
                Rules of Stay
              </h4>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-medium mb-2">The Tenant agrees to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Maintain the property in clean and habitable condition</li>
                  <li>Not sublet or assign the property without written consent from the Landlord</li>
                  <li>Respect quiet hours (10 PM - 7 AM) and avoid excessive noise</li>
                  <li>Not make structural modifications without prior written approval</li>
                  <li>Properly dispose of garbage and maintain cleanliness of common areas</li>
                  <li>Allow the Landlord reasonable access for inspections and repairs (with 24-hour notice)</li>
                  <li>Not engage in illegal activities on the premises</li>
                  <li>Not keep pets without prior written approval from the Landlord</li>
                  <li>Report any maintenance issues or damages promptly through the Rentify platform</li>
                </ul>
              </div>
            </div>

            {/* 8. Landlord Obligations */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">8</span>
                Landlord Obligations
              </h4>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-medium mb-2">The Landlord agrees to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure the property is habitable and meets health and safety standards</li>
                  <li>Maintain the structural integrity of the building</li>
                  <li>Provide functioning plumbing, electrical, and sanitation systems</li>
                  <li>Respond to maintenance requests within 48 hours for urgent issues</li>
                  <li>Respect the Tenant's right to quiet enjoyment of the property</li>
                  <li>Provide 24-hour notice before entering the property (except in emergencies)</li>
                  <li>Return the security deposit within 30 days of lease termination (less any lawful deductions)</li>
                  <li>Ensure common areas are clean and well-maintained</li>
                  <li>Provide receipts for all payments through the Rentify platform</li>
                </ul>
              </div>
            </div>

            {/* 9. Termination Conditions */}
            <div className="border rounded-lg p-6 bg-white">
              <h4 className="text-lg mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#1e3a3f] text-white flex items-center justify-center text-sm">9</span>
                Termination Conditions
              </h4>
              <div className="text-sm text-gray-700 space-y-3">
                <div>
                  <p className="font-medium mb-2">Early Termination by Tenant:</p>
                  <p>The Tenant may terminate this lease early by providing <strong>30 days written notice</strong> to the Landlord. The Tenant will forfeit one month's rent as early termination fee.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Early Termination by Landlord:</p>
                  <p>The Landlord may terminate this lease by providing <strong>60 days written notice</strong> to the Tenant, unless the Tenant has violated the lease terms.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Termination for Breach:</p>
                  <p>Either party may terminate immediately if the other party materially breaches this Agreement and fails to cure the breach within 14 days of written notice.</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Move-Out Procedure:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                    <li>Tenant must schedule a move-out inspection</li>
                    <li>Property must be returned in the same condition as move-in (normal wear and tear excepted)</li>
                    <li>All keys and access cards must be returned</li>
                    <li>All utility bills must be cleared</li>
                    <li>Final cleaning must be completed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Acceptance Section - Only show if not read-only */}
            {!readOnly && <div className="border-2 border-[#1e3a3f] rounded-lg p-6 bg-[#1e3a3f]/5">
              <h4 className="text-lg mb-4 flex items-center gap-2 text-[#1e3a3f]">
                <CheckCircle className="w-6 h-6" />
                Lease Agreement Acceptance
              </h4>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  By checking the box below, I, <strong>{leaseDetails.tenantName}</strong>, confirm that I understand the lease, the unit and building details, and that my first rent payment covers 3 months before regular monthly payments begin.
                </p>
                <ul className="list-disc list-inside space-y-1 mt-3 text-sm text-gray-700 ml-2">
                  <li>I have read and understood all terms and conditions of this Lease Agreement</li>
                  <li>I agree to comply with all the terms, rules, and obligations stated above</li>
                  <li>I understand my rights and responsibilities as a tenant</li>
                  <li>I acknowledge that this is a legally binding agreement</li>
                  <li>All information provided by me is accurate and complete</li>
                  <li>I understand that my initial rent payment is due immediately for 3 months</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                <Checkbox
                  id="accept"
                  checked={hasAccepted}
                  onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
                  className="border-[#1e3a3f] data-[state=checked]:bg-[#1e3a3f]"
                />
                <label
                  htmlFor="accept"
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  I confirm that I have read, understood, and accepted this Lease Agreement.
                </label>
              </div>
            </div>}

            {/* Signature Information */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
              <p>
                <strong>Digital Signature:</strong> By accepting this agreement electronically, you acknowledge that your electronic acceptance has the same legal effect as a handwritten signature.
              </p>
              <p className="mt-2">
                <strong>Date of Acceptance:</strong> {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
              <p className="mt-2">
                <strong>Platform:</strong> Rentify Digital Lease Management System
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          {readOnly ? (
            <>
              <p className="text-xs text-gray-500">
                You accepted this agreement on {acceptedDate ? new Date(acceptedDate).toLocaleDateString() : 'N/A'}
              </p>
              <Button
                onClick={handleClose}
                className="bg-[#1e3a3f] text-white hover:bg-[#152c30]"
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Please read the entire agreement carefully before accepting
              </p>
              <Button
                onClick={handleAccept}
                disabled={!hasAccepted}
                className="bg-[#1e3a3f] text-white hover:bg-[#152c30] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept & Continue
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
