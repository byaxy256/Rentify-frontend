// Shared types for Rentify Backend API

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'admin' | 'landlord' | 'tenant';
  created_at: string;
}

export interface Building {
  id: string;
  name: string;
  location: string;
  total_units: number;
  occupied_units: number;
  landlord_id: string;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  units_count: number;
  rent_per_unit: number;
  created_at: string;
}

export interface Unit {
  id: string;
  floor_id: string;
  building_id: string;
  unit_number: string;
  rent: number;
  is_occupied: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantDetails {
  id: string;
  tenant_id: string;
  occupation?: string;
  next_of_kin?: string;
  next_of_kin_contact?: string;
  assigned_date?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  security_deposit?: number;
  has_accepted_lease: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  unit_id?: string;
  building_id?: string;
  amount: number;
  method: 'MTN' | 'Airtel' | 'Bank';
  status: 'completed' | 'pending' | 'failed';
  type: 'rent' | 'bill' | 'wifi';
  phone_number?: string;
  receipt_number?: string;
  date: string;
  created_at: string;
}

export interface Bill {
  id: string;
  building_id: string;
  unit_id?: string;
  type: 'water' | 'electricity' | 'rubbish' | 'ura' | 'wifi';
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue';
  paid_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantRequest {
  id: string;
  tenant_id: string;
  unit_id: string;
  building_id: string;
  message: string;
  status: 'pending' | 'in-progress' | 'resolved';
  response?: string;
  response_date?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  read: boolean;
  timestamp: string;
  created_at: string;
}

export interface Expense {
  id: string;
  building_id: string;
  unit_id?: string;
  date: string;
  category: 'repairs' | 'maintenance' | 'utilities' | 'improvements' | 'other';
  description: string;
  amount: number;
  payee: string;
  receipt_url?: string;
  created_at: string;
}

export interface Document {
  id: string;
  building_id?: string;
  unit_id?: string;
  tenant_id?: string;
  name: string;
  type: 'receipt' | 'inspection' | 'agreement' | 'other';
  category?: string;
  file_url: string;
  file_size?: string;
  expiry_date?: string;
  upload_date: string;
  created_at: string;
}

export interface WiFiSubscription {
  id: string;
  tenant_id: string;
  unit_id: string;
  plan_type: 'daily' | 'weekly' | 'monthly';
  amount: number;
  username: string;
  password: string;
  voucher_code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// API Request/Response types

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
