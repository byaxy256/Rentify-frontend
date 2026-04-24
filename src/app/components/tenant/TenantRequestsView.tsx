import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MessageSquare, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';
import { dataStore, type TenantRequest as StoredTenantRequest } from '../../lib/data';

interface Request extends StoredTenantRequest {
  title?: string;
  description?: string;
}

const buildHeaders = () => {
  const accessToken = localStorage.getItem('accessToken');
  return {
    ...(accessToken ? { 'x-user-token': accessToken } : {}),
  };
};

export function TenantRequestsView() {
  const [requests, setRequests] = useState<Request[]>(() => dataStore.getRequests() as Request[]);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [newRequestTitle, setNewRequestTitle] = useState('');
  const [newRequestDescription, setNewRequestDescription] = useState('');
  const [newRequestPriority, setNewRequestPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [assignment, setAssignment] = useState<{ unit?: string; building?: string; buildingId?: string } | null>(null);

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const response = await requestFunction('/tenants/me/assignment', {
          headers: buildHeaders(),
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          setAssignment(result.data || null);
        }
      } catch {
        setAssignment(null);
      }
    };

    loadAssignment();
    setRequests(dataStore.getRequests() as Request[]);
  }, []);

  const syncRequests = (updatedRequests: Request[]) => {
    setRequests(updatedRequests);
    localStorage.setItem('tenantRequests', JSON.stringify(updatedRequests));
  };

  const submitRequest = () => {
    if (!newRequestTitle.trim() || !newRequestDescription.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const newRequest: Request = {
        id: String(Date.now()),
        title: newRequestTitle,
        description: newRequestDescription,
        tenantName: localStorage.getItem('userName') || 'Tenant',
        tenantEmail: localStorage.getItem('userEmail') || '',
        unitNumber: assignment?.unit || 'Not assigned',
        buildingName: assignment?.building || 'Not assigned',
        buildingId: assignment?.buildingId,
        message: `${newRequestTitle}: ${newRequestDescription}`,
        priority: newRequestPriority,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
      };
      const updated = [newRequest, ...requests];
      dataStore.addRequest(newRequest as any);
      syncRequests(updated);
      toast.success('Request submitted successfully');
      setShowNewRequestDialog(false);
      setNewRequestTitle('');
      setNewRequestDescription('');
      setNewRequestPriority('medium');
      setIsLoading(false);
    }, 1000);
  };

  const totalRequests = requests.length;
  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const inProgressCount = requests.filter((request) => request.status === 'in-progress').length;
  const resolvedCount = requests.filter((request) => request.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Requests</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Requests</p>
              <p className="text-3xl">{totalRequests}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Pending</p>
              <p className="text-3xl">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">In Progress</p>
              <p className="text-3xl">{inProgressCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Resolved</p>
              <p className="text-3xl">{resolvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl mb-1">Your Requests</h3>
            <p className="text-sm text-gray-600">Submit and track maintenance requests</p>
          </div>
          <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setShowNewRequestDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg">{request.title || 'Request'}</h4>
                  <span
                    className={`px-3 py-1 rounded-md text-xs text-white ${
                      request.priority === 'high'
                        ? 'bg-red-600'
                        : request.priority === 'medium'
                        ? 'bg-gray-900'
                        : 'bg-gray-600'
                    }`}
                  >
                    {request.priority || 'medium'} priority
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
                    request.status === 'resolved'
                      ? 'bg-green-50 text-green-700'
                      : request.status === 'in-progress'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {request.status === 'pending' && <AlertTriangle className="w-3 h-3" />}
                  {request.status === 'in-progress' && <Clock className="w-3 h-3" />}
                  {request.status === 'resolved' && <CheckCircle className="w-3 h-3" />}
                  {request.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">Submitted on {request.date}</p>

              <div className="mb-4">
                <p className="text-sm mb-2">Description:</p>
                <p className="text-sm text-gray-700">{request.description || request.message}</p>
              </div>

              {request.status === 'pending' && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-sm text-orange-800">
                    Your request has been submitted and is waiting for a response from the landlord.
                  </p>
                </div>
              )}

              {request.response && (
                <div className="bg-[#e8f4f5] border-l-4 border-[#1e3a3f] p-4 rounded">
                  <p className="text-sm mb-1">Landlord Response:</p>
                  <p className="text-sm text-[#0f2326]">{request.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit New Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Request Title</label>
              <Input
                value={newRequestTitle}
                onChange={(event) => setNewRequestTitle(event.target.value)}
                placeholder="e.g., WiFi not working, Water leak, etc."
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Priority</label>
              <select
                aria-label="Request priority"
                value={newRequestPriority}
                onChange={(event) => setNewRequestPriority(event.target.value as any)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Description</label>
              <Textarea
                value={newRequestDescription}
                onChange={(event) => setNewRequestDescription(event.target.value)}
                placeholder="Please provide details about your request..."
                rows={5}
              />
            </div>

            <Button className="w-full" onClick={submitRequest} disabled={isLoading || !newRequestTitle.trim() || !newRequestDescription.trim()}>
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
