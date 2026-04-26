import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, DollarSign, Wrench, FileText, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { pushNotificationService } from '../lib/pushNotifications';
import { requestFunction } from '../lib/functionClient';

export interface Notification {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'general' | 'message';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  navigateTo?: string;
}

interface NotificationCenterProps {
  userType: 'landlord' | 'tenant' | 'admin';
  onNotificationClick?: (navigateTo: string) => void;
}

const generateMockNotifications = (_userType: 'landlord' | 'tenant' | 'admin'): Notification[] => [];

export function NotificationCenter({ userType, onNotificationClick }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);

  const getSettingsKey = () => {
    const rawUserId = (localStorage.getItem('userId') || '').trim();
    const rawUserEmail = (localStorage.getItem('userEmail') || '').trim().toLowerCase();
    const identity = rawUserId || rawUserEmail || 'session';
    const role = userType === 'admin' ? 'landlord' : userType;
    return `settings:${role}:${identity.toLowerCase()}`;
  };

  const applyNotificationPreferences = (items: Notification[]) => {
    try {
      const settingsRaw = localStorage.getItem(getSettingsKey());
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};

      return items.filter((item) => {
        if (item.type === 'payment') {
          return settings.notifyPayments !== false;
        }
        if (item.type === 'maintenance') {
          return settings.notifyRequests !== false;
        }
        if (item.type === 'message') {
          return settings.notifyMessages !== false;
        }
        return true;
      });
    } catch {
      return items;
    }
  };

  useEffect(() => {
    // Check if push notifications are already enabled
    if (pushNotificationService.isSupported()) {
      setPushEnabled(pushNotificationService.getPermission() === 'granted');
    }
  }, [userType]);

  useEffect(() => {
    const buildHeaders = () => {
      const accessToken = localStorage.getItem('accessToken');
      return {
        ...(accessToken ? { 'x-user-token': accessToken } : {}),
      };
    };

    const loadNotifications = async () => {
      try {
        const allNotifications: Notification[] = [];

        if (userType === 'landlord' || userType === 'admin') {
          // Load unread messages
          const response = await requestFunction('/messages/landlord/conversations', {
            headers: buildHeaders(),
          });
          const result = await response.json().catch(() => ({}));

          if (response.ok && Array.isArray(result?.data)) {
            const messageNotifs: Notification[] = result.data
              .filter((conversation: any) => Number(conversation.unreadCount || 0) > 0)
              .map((conversation: any) => {
                const priority = Number(conversation.unreadCount || 0) > 2 ? 'high' : 'medium';
                return {
                  id: `msg-${conversation.tenantId}`,
                  type: 'message' as const,
                  title: `New message from ${conversation.name}`,
                  message: conversation.lastMessage || `${conversation.unreadCount} unread message(s)`,
                  timestamp: conversation.lastMessageTime ? new Date(conversation.lastMessageTime) : new Date(),
                  read: false,
                  priority: priority as 'high' | 'medium' | 'low',
                  navigateTo: 'messages',
                };
              });
            allNotifications.push(...messageNotifs);
          }

          const filteredNotifications = applyNotificationPreferences(allNotifications);
          setNotifications(filteredNotifications);
          setUnreadCount(filteredNotifications.length);
          return;
        }

        if (userType === 'tenant') {
          // Load unread messages
          const response = await requestFunction('/messages/tenant/thread?markRead=false', {
            headers: buildHeaders(),
          });
          const result = await response.json().catch(() => ({}));

          if (response.ok && Array.isArray(result?.data?.messages)) {
            const unreadMessages = result.data.messages.filter(
              (message: any) => message.senderType === 'landlord' && !message.read,
            );

            const messageNotifs: Notification[] = unreadMessages.map((message: any) => ({
              id: `msg-${message.id}`,
              type: 'message' as const,
              title: 'New message from Property Manager',
              message: message.message || 'You have a new message',
              timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
              read: false,
              priority: 'medium' as const,
              navigateTo: 'messages',
            }));
            allNotifications.push(...messageNotifs);
          }

          // Load pending bills
          try {
            const billsResponse = await requestFunction('/bills/tenant', {
              headers: buildHeaders(),
            });
            const billsResult = await billsResponse.json().catch(() => ({}));

            if (billsResponse.ok && Array.isArray(billsResult?.data)) {
              const pendingBills = billsResult.data.filter((bill: any) => bill.status === 'pending');
              const billNotifs: Notification[] = pendingBills.map((bill: any) => ({
                id: `bill-${bill.id}`,
                type: 'payment' as const,
                title: `${bill.type.charAt(0).toUpperCase() + bill.type.slice(1)} Bill Due`,
                message: `Amount: UGX ${Number(bill.amount).toLocaleString()}`,
                timestamp: bill.dueDate ? new Date(bill.dueDate) : new Date(),
                read: false,
                priority: 'medium' as const,
                navigateTo: 'bills',
              }));
              allNotifications.push(...billNotifs);
            }
          } catch {
            // Bills endpoint may not exist, continue
          }

          // Load pending payment reminders (if tenant has outstanding rent)
          try {
            const assignmentResponse = await requestFunction('/tenants/me/assignment', {
              headers: buildHeaders(),
            });
            const assignmentResult = await assignmentResponse.json().catch(() => ({}));

            if (assignmentResponse.ok && assignmentResult?.data) {
              const assignment = assignmentResult.data;
              if (assignment.nextRentDueDate) {
                const dueDate = new Date(assignment.nextRentDueDate);
                const now = new Date();
                const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilDue <= 7 && daysUntilDue > 0) {
                  allNotifications.push({
                    id: 'rent-reminder',
                    type: 'payment',
                    title: 'Rent Payment Reminder',
                    message: `Rent due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
                    timestamp: now,
                    read: false,
                    priority: daysUntilDue <= 3 ? 'high' : 'medium',
                    navigateTo: 'rent',
                  });
                }
              }
            }
          } catch {
            // Assignment endpoint may not exist, continue
          }

          // Load request status updates from tenant local data
          try {
            const storedRequests = localStorage.getItem('tenantRequests');
            const parsedRequests = storedRequests ? JSON.parse(storedRequests) : [];

            if (Array.isArray(parsedRequests)) {
              const statusUpdates = parsedRequests
                .filter((request: any) => request?.status === 'in-progress' || request?.status === 'resolved')
                .slice(0, 5)
                .map((request: any) => ({
                  id: `request-${request.id}`,
                  type: 'maintenance' as const,
                  title:
                    request.status === 'resolved'
                      ? 'Request Resolved'
                      : 'Request Being Worked On',
                  message: request.title || request.message || 'Your request status was updated.',
                  timestamp: request.date ? new Date(request.date) : new Date(),
                  read: false,
                  priority: request.status === 'resolved' ? ('low' as const) : ('medium' as const),
                  navigateTo: 'requests',
                }));

              allNotifications.push(...statusUpdates);
            }
          } catch {
            // Stored request data may be unavailable, continue
          }

          const filteredNotifications = applyNotificationPreferences(allNotifications);
          setNotifications(filteredNotifications);
          setUnreadCount(filteredNotifications.filter(n => !n.read).length);
          return;
        }

        const mockNotifs = generateMockNotifications(userType);
        setNotifications(mockNotifs);
        setUnreadCount(mockNotifs.filter(n => !n.read).length);
      } catch {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [userType]);

  // Send push notifications for new unread notifications
  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.read);

    unreadNotifications.forEach(async (notif) => {
      // Only send push notification if it's a recent notification (within last 5 minutes)
      const timeDiff = Date.now() - notif.timestamp.getTime();
      const isRecent = timeDiff < 5 * 60 * 1000; // 5 minutes

      if (isRecent && pushEnabled) {
        await pushNotificationService.sendNotification({
          title: notif.title,
          body: notif.message,
          tag: notif.id,
          data: { route: notif.navigateTo }
        });
      }
    });
  }, [notifications, pushEnabled]);

  const enablePushNotifications = async () => {
    const granted = await pushNotificationService.requestPermission();
    setPushEnabled(granted);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && !notif.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'payment':
        return DollarSign;
      case 'maintenance':
        return Wrench;
      case 'lease':
        return FileText;
      case 'message':
        return MessageSquare;
      default:
        return AlertCircle;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.navigateTo && onNotificationClick) {
      onNotificationClick(notif.navigateTo);
      setIsOpen(false);
    }
  };

  const getIconColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-[#1e3a3f]';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border z-50 max-h-[600px] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b bg-[#1e3a3f] text-white rounded-t-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">Notifications</h3>
                    <p className="text-xs text-gray-300">{unreadCount} unread</p>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={markAllAsRead}
                      className="text-white hover:bg-[#2d5358]"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>

                {/* Push Notification Toggle */}
                {!pushEnabled && pushNotificationService.isSupported() && (
                  <button
                    onClick={enablePushNotifications}
                    className="w-full mt-2 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Smartphone className="w-4 h-4" />
                    Enable Phone Notifications
                  </button>
                )}
                {pushEnabled && (
                  <div className="w-full mt-2 py-2 px-3 bg-green-500/20 rounded-lg text-xs flex items-center justify-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Phone notifications enabled
                  </div>
                )}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notif) => {
                      const Icon = getIcon(notif.type);
                      const iconColor = getIconColor(notif.priority);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => notif.navigateTo && handleNotificationClick(notif)}
                          className={`p-4 transition-colors ${
                            !notif.read ? 'bg-blue-50' : ''
                          } ${notif.navigateTo ? 'hover:bg-gray-100 cursor-pointer' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`flex-shrink-0 ${iconColor}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className={`text-sm ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                                    {notif.title}
                                  </h4>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {formatTimestamp(notif.timestamp)}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notif.id);
                                  }}
                                  aria-label="Delete notification"
                                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {!notif.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                  }}
                                  aria-label="Mark notification as read"
                                  className="text-xs text-[#1e3a3f] hover:underline mt-2"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
