import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { dataStore, type TenantRequest as StoredTenantRequest } from '../../lib/data';

interface TenantRequest extends StoredTenantRequest {
  unit: string;
  building: string;
}

interface TenantRequestsProps {
  selectedProperty?: string;
}

export function TenantRequests({ selectedProperty = 'all' }: TenantRequestsProps) {
  const allRequests = dataStore.getRequests() as TenantRequest[];

  // Filter by selected property
  const filteredRequests = selectedProperty === 'all'
    ? allRequests
    : allRequests.filter((request) =>
        request.buildingId === selectedProperty ||
        request.building === selectedProperty
      );

  const [requests, setRequests] = useState<TenantRequest[]>(filteredRequests);
  const [selectedRequest, setSelectedRequest] = useState<TenantRequest | null>(null);

  // Update requests when selectedProperty changes
  useEffect(() => {
    setRequests(filteredRequests);
  }, [selectedProperty]);
  useEffect(() => {
    setRequests(filteredRequests);
  }, [selectedProperty, allRequests.length]);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRespond = (request: TenantRequest) => {
    setSelectedRequest(request);
    setResponse(request.response || '');
    setShowResponseDialog(true);
  };

  const submitResponse = () => {
    if (!selectedRequest || !response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const updatedRequests = requests.map(req =>
        req.id === selectedRequest.id
          ? { ...req, response, responseDate: new Date().toISOString(), status: 'in-progress' as const }
          : req
      );
      updatedRequests.forEach((req) => {
        dataStore.updateRequest(req.id, req as any);
      });
      setRequests(updatedRequests);
      toast.success('Response sent to tenant');
      setShowResponseDialog(false);
      setResponse('');
      setIsLoading(false);
    }, 1000);
  };

  const markAsResolved = (requestId: string) => {
    const updatedRequests = requests.map(req =>
      req.id === requestId ? { ...req, status: 'resolved' as const, responseDate: new Date().toISOString() } : req
    );
    updatedRequests.forEach((req) => {
      dataStore.updateRequest(req.id, req as any);
    });
    setRequests(updatedRequests);
    toast.success('Request marked as resolved');
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inProgressCount = requests.filter(r => r.status === 'in-progress').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Tenant Requests</h2>
        <p className="text-gray-600">Manage maintenance and service requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Pending</span>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">In Progress</span>
            <Clock className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{inProgressCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Resolved</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{resolvedCount}</p>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <MessageSquare className="w-6 h-6 text-gray-400 mt-1" />
                <div>
                  <h3 className="text-lg mb-1">{request.title || request.tenantName}</h3>
                  <p className="text-sm text-gray-600">
                    {request.building} - Unit {request.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    request.status === 'resolved'
                      ? 'bg-green-100 text-green-700'
                      : request.status === 'in-progress'
                      ? 'bg-[#d1e7dd] text-[#1e3a3f]'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {request.status}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(request.date).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-gray-900 mb-1">{request.title || 'Request'}</p>
              <p className="text-gray-700">{request.description || request.message}</p>
            </div>

            {request.response && (
              <div className="bg-[#e8f4f5] rounded-lg p-4 mb-4 border-l-4 border-[#1e3a3f]">
                <p className="text-sm text-gray-600 mb-1">Your Response:</p>
                <p className="text-gray-700">{request.response}</p>
              </div>
            )}

            <div className="flex gap-2">
              {request.status !== 'resolved' && (
                <>
                  <Button
                    onClick={() => handleRespond(request)}
                    variant="outline"
                  >
                    {request.response ? 'Update Response' : 'Respond'}
                  </Button>
                  <Button
                    onClick={() => markAsResolved(request.id)}
                    variant="default"
                  >
                    Mark as Resolved
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Tenant: {selectedRequest.tenantName}</p>
                <p className="text-sm text-gray-600 mb-2">Unit: {selectedRequest.unit}</p>
                <p className="text-gray-700">{selectedRequest.message}</p>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">Your Response</label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response here..."
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={submitResponse}
                disabled={isLoading || !response.trim()}
              >
                {isLoading ? 'Sending...' : 'Send Response'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}