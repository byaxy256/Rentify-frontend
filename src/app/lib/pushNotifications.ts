// Push notification service for sending notifications to user's device
import { toast } from 'sonner';

export type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
};

class PushNotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  // Request notification permission from the user
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        toast.success('Notifications enabled! You will receive alerts on your device.');
        return true;
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.');
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Send a browser notification
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    if (!('Notification' in window)) {
      // Fallback to SMS simulation
      this.simulateSMSNotification(payload);
      return false;
    }

    // Request permission if not already granted
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        // Fallback to SMS simulation
        this.simulateSMSNotification(payload);
        return false;
      }
    }

    try {
      // Create browser notification
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge,
        tag: payload.tag || 'rentify-notification',
        data: payload.data,
        requireInteraction: true, // Notification stays visible until user interacts
        vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      });

      // Also simulate SMS notification for visual feedback
      this.simulateSMSNotification(payload);

      notification.onclick = () => {
        window.focus();
        notification.close();

        // Handle navigation if data contains a route
        if (payload.data?.route) {
          // This would be handled by the app's routing system
          console.log('Navigate to:', payload.data.route);
        }
      };

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      this.simulateSMSNotification(payload);
      return false;
    }
  }

  // Simulate SMS notification (visual feedback)
  private simulateSMSNotification(payload: NotificationPayload) {
    // Show a toast that simulates an SMS being sent
    toast.success(
      `📱 SMS sent to your phone\n${payload.title}: ${payload.body}`,
      {
        duration: 5000,
        className: 'sms-notification-toast'
      }
    );
  }

  // Send SMS notification (in production, this would integrate with SMS gateway)
  async sendSMSNotification(phoneNumber: string, message: string): Promise<boolean> {
    // In production, integrate with SMS provider (Twilio, Africa's Talking, etc.)
    console.log(`📱 SMS to ${phoneNumber}: ${message}`);

    toast.success(
      `📱 SMS sent to ${phoneNumber}\n${message}`,
      {
        duration: 5000,
        className: 'sms-notification-toast'
      }
    );

    return true;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Check current permission status
  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
