import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, MessageSquare, User, Search } from 'lucide-react';
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

interface TenantConversation {
  tenantId: string;
  name: string;
  unit: string;
  building: string;
  phone: string;
  buildingId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface LandlordMessagesProps {
  selectedProperty?: string;
}

export function LandlordMessages({ selectedProperty = 'all' }: LandlordMessagesProps) {
  const [conversations, setConversations] = useState<TenantConversation[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const selectedTenant = useMemo(
    () => conversations.find((conversation) => conversation.tenantId === selectedTenantId) || null,
    [conversations, selectedTenantId]
  );

  const buildHeaders = () => {
    const accessToken = localStorage.getItem('accessToken');
    return {
      ...(accessToken ? { 'x-user-token': accessToken } : {}),
    };
  };

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await requestFunction('/messages/landlord/conversations', { headers: buildHeaders() });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load conversations');
        setConversations([]);
        return;
      }

      const mappedConversations: TenantConversation[] = Array.isArray(result.data)
        ? result.data.map((conversation: any) => ({
            tenantId: conversation.tenantId,
            name: conversation.name,
            phone: conversation.phone || '',
            unit: conversation.unit || 'N/A',
            building: conversation.building || 'Unknown Building',
            buildingId: conversation.buildingId,
            lastMessage: conversation.lastMessage,
            lastMessageTime: conversation.lastMessageTime,
            unreadCount: Number(conversation.unreadCount || 0),
          }))
        : [];

      setConversations(mappedConversations);
    } catch (error) {
      console.error('Load conversations error:', error);
      toast.error('Failed to load conversations');
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadThread = async (tenantId: string) => {
    try {
      setIsLoadingThread(true);
      const response = await requestFunction(`/messages/landlord/${tenantId}`, { headers: buildHeaders() });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to load messages');
        setCurrentMessages([]);
        return;
      }

      const messages: Message[] = Array.isArray(result.data?.messages)
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

      setCurrentMessages(messages);

      const tenant = result.data?.tenant;
      if (tenant) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.tenantId === tenantId
              ? {
                  ...conversation,
                  name: tenant.name || conversation.name,
                  phone: tenant.phone || conversation.phone,
                  building: tenant.building || conversation.building,
                  buildingId: tenant.buildingId || conversation.buildingId,
                  unit: tenant.unit || conversation.unit,
                  unreadCount: 0,
                }
              : conversation
          )
        );
      }
    } catch (error) {
      console.error('Load thread error:', error);
      toast.error('Failed to load messages');
      setCurrentMessages([]);
    } finally {
      setIsLoadingThread(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const filteredTenants = useMemo(() => {
    return conversations.filter((tenant) => {
      const propertyMatch =
        selectedProperty === 'all' ||
        tenant.buildingId === selectedProperty ||
        tenant.building === selectedProperty;

      const searchMatch =
        !searchQuery ||
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.building.toLowerCase().includes(searchQuery.toLowerCase());

      return propertyMatch && searchMatch;
    });
  }, [conversations, selectedProperty, searchQuery]);

  useEffect(() => {
    if (filteredTenants.length === 0) {
      setSelectedTenantId(null);
      setCurrentMessages([]);
      return;
    }

    if (!selectedTenantId || !filteredTenants.some((tenant) => tenant.tenantId === selectedTenantId)) {
      setSelectedTenantId(filteredTenants[0].tenantId);
    }
  }, [filteredTenants, selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) return;
    loadThread(selectedTenantId);
  }, [selectedTenantId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTenant) return;

    try {
      const response = await requestFunction(`/messages/landlord/${selectedTenant.tenantId}`, {
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
        senderType: 'landlord',
        message: result.data.message,
        timestamp: result.data.timestamp,
        read: Boolean(result.data.read),
      };

      setCurrentMessages((current) => [...current, sentMessage]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.tenantId === selectedTenant.tenantId
            ? {
                ...conversation,
                lastMessage: sentMessage.message,
                lastMessageTime: sentMessage.timestamp,
              }
            : conversation
        )
      );

      try {
        await pushNotificationService.sendNotification({
          title: 'Message from Property Manager',
          body: newMessage.length > 100 ? `${newMessage.substring(0, 100)}...` : newMessage,
          tag: `landlord-message-${selectedTenant.tenantId}`,
          data: { route: 'messages' },
        });

        if (selectedTenant.phone) {
          await pushNotificationService.sendSMSNotification(
            selectedTenant.phone,
            `New message from Property Manager: ${newMessage.length > 60 ? `${newMessage.substring(0, 60)}...` : newMessage}`
          );
        }
      } catch (notificationError) {
        console.warn('Notification dispatch warning:', notificationError);
      }

      setNewMessage('');
      toast.success(`Message sent to ${selectedTenant.name}`);
      await loadConversations();
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTime = (dateInput?: string) => {
    if (!dateInput) return '';
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

  const propertyLabel = selectedProperty === 'all'
    ? 'All Properties'
    : selectedProperty;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl mb-2">Messages</h2>
          <p className="text-gray-600">Communicate directly with your tenants</p>
        </div>
        {selectedProperty !== 'all' && (
          <div className="bg-[#1e3a3f] text-white px-4 py-2 rounded-lg">
            <p className="text-sm">Showing: {propertyLabel}</p>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="bg-white rounded-xl shadow-sm border flex h-[calc(100vh-280px)]">
        {/* Tenant List Sidebar */}
        <div className="w-80 border-r flex flex-col">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tenant List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="p-6 text-sm text-gray-600">Loading conversations...</div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No tenants found</p>
                <p className="text-xs mt-1">Try changing the property filter or search term</p>
              </div>
            ) : (
              filteredTenants.map((tenant) => (
                <button
                  key={tenant.tenantId}
                  onClick={() => setSelectedTenantId(tenant.tenantId)}
                  className={`w-full p-4 border-b text-left hover:bg-gray-50 transition-colors ${
                    selectedTenant?.tenantId === tenant.tenantId ? 'bg-[#e8f4f5]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#1e3a3f] rounded-full flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold truncate">{tenant.name}</p>
                        {tenant.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {tenant.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {tenant.building} - {tenant.unit}
                      </p>
                      {tenant.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">{tenant.lastMessage}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          {selectedTenant && (
            <div className="p-6 border-b bg-[#1e3a3f]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedTenant.name}</h3>
                  <p className="text-sm text-gray-300">
                    {selectedTenant.building} - Unit {selectedTenant.unit}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingThread && (
              <div className="text-sm text-gray-600">Loading messages...</div>
            )}
            {!isLoadingThread && currentMessages.length === 0 && selectedTenant && (
              <div className="text-sm text-gray-600">No messages yet. Start the conversation.</div>
            )}
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'landlord' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    msg.senderType === 'landlord'
                      ? 'bg-[#1e3a3f] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {msg.senderType === 'landlord' ? 'You' : selectedTenant?.name || 'Tenant'}
                    </span>
                    <span
                      className={`text-xs ${
                        msg.senderType === 'landlord' ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          {selectedTenant && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  placeholder={`Message ${selectedTenant.name}...`}
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
                  disabled={!newMessage.trim()}
                  className="bg-[#1e3a3f] hover:bg-[#2d5358]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send or click the send button
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Tenant Communication with Notifications</p>
            <p className="text-sm text-blue-700 mt-1">
              Use this messaging system to communicate with your tenants about maintenance updates,
              payment confirmations, lease renewals, or any other property-related matters. Tenants
              receive notifications when you send them messages. Filter by property using the selector
              at the top to see tenants from specific buildings. All conversations are saved for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
