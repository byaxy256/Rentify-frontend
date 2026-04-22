// Backend API abstraction layer
// This works with localStorage now, but will switch to Supabase when connected

import { dataStore, Building, Payment, Bill, TenantRequest } from './data';
import { get, post, put, del, isBackendConfigured } from './apiClient';

// Configuration - will be updated when Supabase is connected
const USE_BACKEND = isBackendConfigured(); // Automatically detects if Supabase is connected

// ============================================================================
// Buildings API
// ============================================================================

export const buildingsAPI = {
  async getAll(): Promise<Building[]> {
    if (USE_BACKEND) {
      return get<Building[]>('/buildings');
    }
    return Promise.resolve(dataStore.getBuildings());
  },

  async getById(id: string): Promise<Building | null> {
    if (USE_BACKEND) {
      return get<Building>(`/buildings/${id}`);
    }
    const buildings = dataStore.getBuildings();
    return Promise.resolve(buildings.find(b => b.id === id) || null);
  },

  async create(building: Building): Promise<Building> {
    if (USE_BACKEND) {
      return post<Building>('/buildings', building);
    }
    dataStore.addBuilding(building);
    return Promise.resolve(building);
  },

  async update(id: string, updates: Partial<Building>): Promise<Building> {
    if (USE_BACKEND) {
      return put<Building>(`/buildings/${id}`, updates);
    }
    dataStore.updateBuilding(id, updates);
    const buildings = dataStore.getBuildings();
    return Promise.resolve(buildings.find(b => b.id === id)!);
  },

  async delete(id: string): Promise<void> {
    if (USE_BACKEND) {
      await del<void>(`/buildings/${id}`);
      return;
    }
    dataStore.deleteBuilding(id);
    return Promise.resolve();
  },
};

// ============================================================================
// Payments API
// ============================================================================

export const paymentsAPI = {
  async getAll(): Promise<Payment[]> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('payments').select('*').order('date', { ascending: false });
      // return data || [];
      throw new Error('Backend not connected');
    }
    return Promise.resolve(dataStore.getPayments());
  },

  async getByTenant(tenantEmail: string): Promise<Payment[]> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('payments').select('*').eq('tenantEmail', tenantEmail);
      // return data || [];
      throw new Error('Backend not connected');
    }
    const payments = dataStore.getPayments();
    return Promise.resolve(payments.filter(p => p.tenantEmail === tenantEmail));
  },

  async create(payment: Payment): Promise<Payment> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('payments').insert(payment).select().single();
      // return data;
      throw new Error('Backend not connected');
    }
    dataStore.addPayment(payment);
    return Promise.resolve(payment);
  },
};

// ============================================================================
// Bills API
// ============================================================================

export const billsAPI = {
  async getAll(): Promise<Bill[]> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('bills').select('*');
      // return data || [];
      throw new Error('Backend not connected');
    }
    return Promise.resolve(dataStore.getBills());
  },

  async create(bill: Bill): Promise<Bill> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('bills').insert(bill).select().single();
      // return data;
      throw new Error('Backend not connected');
    }
    dataStore.addBill(bill);
    return Promise.resolve(bill);
  },

  async update(id: string, updates: Partial<Bill>): Promise<Bill> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('bills').update(updates).eq('id', id).select().single();
      // return data;
      throw new Error('Backend not connected');
    }
    dataStore.updateBill(id, updates);
    const bills = dataStore.getBills();
    return Promise.resolve(bills.find(b => b.id === id)!);
  },
};

// ============================================================================
// Requests API
// ============================================================================

export const requestsAPI = {
  async getAll(): Promise<TenantRequest[]> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('requests').select('*').order('date', { ascending: false });
      // return data || [];
      throw new Error('Backend not connected');
    }
    return Promise.resolve(dataStore.getRequests());
  },

  async create(request: TenantRequest): Promise<TenantRequest> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('requests').insert(request).select().single();
      // return data;
      throw new Error('Backend not connected');
    }
    dataStore.addRequest(request);
    return Promise.resolve(request);
  },

  async update(id: string, updates: Partial<TenantRequest>): Promise<TenantRequest> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase.from('requests').update(updates).eq('id', id).select().single();
      // return data;
      throw new Error('Backend not connected');
    }
    dataStore.updateRequest(id, updates);
    const requests = dataStore.getRequests();
    return Promise.resolve(requests.find(r => r.id === id)!);
  },
};

// ============================================================================
// Authentication API (for when Supabase is connected)
// ============================================================================

export const authAPI = {
  async login(email: string, password: string): Promise<{ user: any; role: string } | null> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase auth
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) throw error;
      // const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      // return { user: data.user, role: profile.role };
      throw new Error('Backend not connected');
    }

    // Mock authentication - replace with Supabase
    const mockUsers = {
      'admin@rentify.com': { role: 'admin', password: 'admin123' },
      'landlord@test.com': { role: 'landlord', password: 'password123' },
      'tenant@test.com': { role: 'tenant', password: 'password123' },
    };

    const user = mockUsers[email as keyof typeof mockUsers];
    if (user && user.password === password) {
      return Promise.resolve({
        user: { email, id: Math.random().toString() },
        role: user.role
      });
    }
    return Promise.resolve(null);
  },

  async logout(): Promise<void> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase auth
      // await supabase.auth.signOut();
      throw new Error('Backend not connected');
    }
    return Promise.resolve();
  },

  async getCurrentUser(): Promise<any> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase auth
      // const { data: { user } } = await supabase.auth.getUser();
      // return user;
      throw new Error('Backend not connected');
    }
    return Promise.resolve(null);
  },
};

// ============================================================================
// Messages API (for real-time messaging)
// ============================================================================

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'landlord' | 'tenant';
  recipientId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const messagesAPI = {
  async getByTenant(tenantId: string): Promise<Message[]> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const { data } = await supabase
      //   .from('messages')
      //   .select('*')
      //   .or(`senderId.eq.${tenantId},recipientId.eq.${tenantId}`)
      //   .order('timestamp', { ascending: true });
      // return data || [];
      throw new Error('Backend not connected');
    }
    // Return empty for now - messages are in component state
    return Promise.resolve([]);
  },

  async send(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // const newMessage = { ...message, timestamp: new Date() };
      // const { data } = await supabase.from('messages').insert(newMessage).select().single();
      // return data;
      throw new Error('Backend not connected');
    }
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    return Promise.resolve(newMessage);
  },

  async markAsRead(messageId: string): Promise<void> {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase call
      // await supabase.from('messages').update({ read: true }).eq('id', messageId);
      throw new Error('Backend not connected');
    }
    return Promise.resolve();
  },

  // Subscribe to real-time messages (Supabase feature)
  subscribeToMessages(tenantId: string, callback: (message: Message) => void) {
    if (USE_BACKEND) {
      // TODO: Replace with Supabase realtime subscription
      // const subscription = supabase
      //   .channel('messages')
      //   .on('postgres_changes', {
      //     event: 'INSERT',
      //     schema: 'public',
      //     table: 'messages',
      //     filter: `recipientId=eq.${tenantId}`
      //   }, (payload) => {
      //     callback(payload.new as Message);
      //   })
      //   .subscribe();
      // return () => subscription.unsubscribe();
      throw new Error('Backend not connected');
    }
    // No-op for localStorage
    return () => {};
  },
};

// ============================================================================
// Export helper to check if backend is connected
// ============================================================================

export const isBackendConnected = () => USE_BACKEND;
