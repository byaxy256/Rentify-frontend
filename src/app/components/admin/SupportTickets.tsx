import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';

interface Ticket {
  id: string;
  user: string;
  userType: 'landlord' | 'tenant';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  assignedTo?: string;
}

export function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/admin/support/tickets', {
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load support tickets');
        return;
      }

      setTickets(Array.isArray(result?.data?.tickets) ? result.data.tickets : []);
    } catch (error) {
      console.error('Load support tickets error:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = window.setInterval(loadTickets, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const updateTicket = async (ticketId: string, payload: { status?: Ticket['status']; assignedTo?: string }) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction(`/admin/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to update ticket');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update ticket error:', error);
      toast.error('Failed to update ticket');
      return false;
    }
  };

  const handleAssignTicket = async (ticketId: string) => {
    const ok = await updateTicket(ticketId, { status: 'in-progress', assignedTo: 'Support Agent 1' });
    if (!ok) return;
    setTickets(tickets.map(t =>
      t.id === ticketId ? { ...t, assignedTo: 'Support Agent 1', status: 'in-progress' as const } : t
    ));
    toast.success('Ticket assigned successfully');
  };

  const handleResolveTicket = async (ticketId: string) => {
    const ok = await updateTicket(ticketId, { status: 'resolved' });
    if (!ok) return;
    setTickets(tickets.map(t =>
      t.id === ticketId ? { ...t, status: 'resolved' as const } : t
    ));
    toast.success('Ticket marked as resolved');
  };

  const getPriorityColor = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-500';
    }
  };

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in-progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Support Tickets</h2>
        <p className="text-gray-600">Manage user support requests and issues</p>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Refreshing support tickets...</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Tickets</span>
            <MessageSquare className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{tickets.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Open</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">{openTickets}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">In Progress</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">{inProgressTickets}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Resolved</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{resolvedTickets}</p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 text-sm text-gray-500">No support tickets found.</div>
        )}
        {tickets.map((ticket) => (
          <div key={ticket.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${getPriorityColor(ticket.priority).split(' ').pop()}`}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-gray-500">Ticket #{ticket.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{ticket.subject}</h3>
                  <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>User: {ticket.user} ({ticket.userType})</span>
                    <span>•</span>
                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.assignedTo && (
                      <>
                        <span>•</span>
                        <span>Assigned to: {ticket.assignedTo}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {ticket.status === 'open' && (
                    <Button size="sm" onClick={() => handleAssignTicket(ticket.id)}>
                      Assign to Me
                    </Button>
                  )}
                  {ticket.status === 'in-progress' && (
                    <Button size="sm" className="bg-green-600" onClick={() => handleResolveTicket(ticket.id)}>
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
