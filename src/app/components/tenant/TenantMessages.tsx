import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { pushNotificationService } from '../../lib/pushNotifications';
import { requestFunction } from '../../lib/functionClient';

interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  senderType: 'tenant' | 'landlord';
  message: string;
  timestamp: string;
  read: boolean;
}

export function TenantMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; unit: string; building: string; landlordName: string; landlordPhone: string } | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(true);

  const unreadCount = messages.filter(m => m.senderType === 'landlord' && !m.read).length;

  const [newMessage, setNewMessage] = useState('');

  const buildHeaders = () => {
    const accessToken = localStorage.getItem('accessToken');
    return {
      ...(accessToken ? { 'x-user-token': accessToken } : {}),
    };
  };

  const loadThread = async () => {
    try {
      setIsLoadingThread(true);
      const response = await requestFunction('/messages/tenant/thread', {
        headers: buildHeaders(),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load messages');
        setMessages([]);
        setTenantInfo(null);
        return;
      }

      setTenantInfo(result.data?.tenant && result.data?.landlord ? {
        name: result.data.tenant.name || 'Tenant',
        unit: result.data.tenant.unit || 'N/A',
        building: result.data.tenant.building || 'Unknown Building',
        landlordName: result.data.landlord.name || 'Property Manager',
        landlordPhone: result.data.landlord.phone || '',
      } : null);

      const mappedMessages: Message[] = Array.isArray(result.data?.messages)
        ? result.data.messages.map((message: any) => ({
            id: message.id,
            senderId: message.senderId,
            recipientId: message.recipientId,
            senderType: message.senderType,
            message: message.message,
            timestamp: message.timestamp,
            read: Boolean(message.read),
          }))
        : [];

      setMessages(mappedMessages);
    } catch (error) {
      console.error('Load tenant thread error:', error);
      toast.error('Failed to load messages');
      setMessages([]);
      setTenantInfo(null);
    } finally {
      setIsLoadingThread(false);
    }
  };

  useEffect(() => {
    loadThread();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setIsLoading(true);
      const response = await requestFunction('/messages/tenant/thread', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ message: newMessage }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to send message');
        return;
      }

      const sentMessage: Message = {
        id: result.data.id,
        senderId: result.data.senderId,
        recipientId: result.data.recipientId,
        senderType: 'tenant',
        message: result.data.message,
        timestamp: result.data.timestamp,
        read: Boolean(result.data.read),
      };

      setMessages((current) => [...current, sentMessage]);
      setNewMessage('');

      try {
        await pushNotificationService.sendNotification({
          title: 'New message from Tenant',
          body: newMessage.length > 100 ? `${newMessage.substring(0, 100)}...` : newMessage,
          tag: 'tenant-message',
          data: { route: 'messages' },
        });

        if (tenantInfo?.landlordPhone) {
          await pushNotificationService.sendSMSNotification(
            tenantInfo.landlordPhone,
            `New message from tenant: ${newMessage.length > 60 ? `${newMessage.substring(0, 60)}...` : newMessage}`
          );
        }
      } catch (notificationError) {
        console.warn('Notification dispatch warning:', notificationError);
      }

      toast.success('Message sent to Property Manager');
      await loadThread();
    } catch (error) {
      console.error('Send tenant message error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateInput: string) => {
    const date = new Date(dateInput);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl mb-2">Messages</h2>
          <p className="text-gray-600">Direct communication with your landlord</p>
        </div>
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <p className="text-sm font-medium">{unreadCount} New Message{unreadCount > 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[calc(100vh-280px)]">
        {/* Chat Header */}
        <div className="p-6 border-b bg-[#1e3a3f] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{tenantInfo?.landlordName || 'Property Manager'}</h3>
              <p className="text-sm text-gray-300">
                {tenantInfo ? `${tenantInfo.building} • Unit ${tenantInfo.unit}` : 'Tenant Support'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoadingThread && (
            <div className="text-sm text-gray-600">Loading messages...</div>
          )}
          {!isLoadingThread && messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-600">No messages yet. Start a conversation with your landlord.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'tenant' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  msg.senderType === 'tenant'
                    ? 'bg-[#1e3a3f] text-white'
                    : !msg.read
                    ? 'bg-blue-100 text-gray-900 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">
                    {msg.senderType === 'tenant' ? 'You' : tenantInfo?.landlordName || 'Property Manager'}
                  </span>
                  <span className={`text-xs ${msg.senderType === 'tenant' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {formatTime(msg.timestamp)}
                  </span>
                  {!msg.read && msg.senderType === 'landlord' && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">New</span>
                  )}
                </div>
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="bg-[#1e3a3f] hover:bg-[#2d5358]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send or click the send button
          </p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Direct Communication with Notifications</p>
            <p className="text-sm text-blue-700 mt-1">
              Use this chat to communicate directly with your property manager about maintenance requests,
              lease questions, payment issues, or any other concerns. You'll receive a notification in your
              notification center whenever the property manager sends you a message.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
