// Mock data store - In production, this would be replaced with API calls to backend

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  occupation?: string;
  nextOfKin?: string;
  nextOfKinContact?: string;
  assignedDate: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  rent: number;
  isOccupied: boolean;
  tenant?: Tenant;
}

export interface Floor {
  id: string;
  floorNumber: number;
  unitsCount: number;
  rentPerUnit: number;
  units: Unit[];
}

export interface Building {
  id: string;
  name: string;
  location: string;
  floors: Floor[];
  totalUnits: number;
  occupiedUnits: number;
}

export interface Payment {
  id: string;
  tenantName: string;
  tenantEmail: string;
  amount: number;
  method: 'MTN' | 'Airtel' | 'Bank';
  status: 'completed' | 'pending' | 'failed';
  type: 'rent' | 'bill';
  date: string;
  unitNumber?: string;
  buildingName?: string;
  building?: string;
  phoneNumber?: string;
  receiptNumber?: string;
}

export interface Bill {
  id: string;
  type: 'water' | 'electricity' | 'rubbish' | 'ura';
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  buildingName?: string;
  unitNumber?: string;
  paidDate?: string;
}

export interface TenantRequest {
  id: string;
  title?: string;
  description?: string;
  tenantName: string;
  tenantEmail: string;
  unitNumber: string;
  buildingName: string;
  buildingId?: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'resolved';
  date: string;
  response?: string;
  responseDate?: string;
  responseDate?: string;
}

// Initialize data from localStorage or use defaults
const getInitialData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const saveData = <T>(key: string, data: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Buildings
let buildings: Building[] = getInitialData('buildings', []);

// Payments
let payments: Payment[] = getInitialData('payments', []);

// Bills
let bills: Bill[] = getInitialData('bills', []);

// Tenant requests
let tenantRequests: TenantRequest[] = getInitialData('tenantRequests', []);

// Data management functions
export const dataStore = {
  // Buildings
  getBuildings: () => buildings,
  addBuilding: (building: Building) => {
    buildings = [...buildings, building];
    saveData('buildings', buildings);
  },
  updateBuilding: (id: string, updates: Partial<Building>) => {
    buildings = buildings.map(b => b.id === id ? { ...b, ...updates } : b);
    saveData('buildings', buildings);
  },
  deleteBuilding: (id: string) => {
    buildings = buildings.filter(b => b.id !== id);
    saveData('buildings', buildings);
  },

  // Payments
  getPayments: () => payments,
  addPayment: (payment: Payment) => {
    payments = [payment, ...payments];
    saveData('payments', payments);
  },

  // Bills
  getBills: () => bills,
  addBill: (bill: Bill) => {
    bills = [...bills, bill];
    saveData('bills', bills);
  },
  updateBill: (id: string, updates: Partial<Bill>) => {
    bills = bills.map(b => b.id === id ? { ...b, ...updates } : b);
    saveData('bills', bills);
  },

  // Tenant requests
  getRequests: () => tenantRequests,
  addRequest: (request: TenantRequest) => {
    tenantRequests = [request, ...tenantRequests];
    saveData('tenantRequests', tenantRequests);
  },
  updateRequest: (id: string, updates: Partial<TenantRequest>) => {
    tenantRequests = tenantRequests.map(r => r.id === id ? { ...r, ...updates } : r);
    saveData('tenantRequests', tenantRequests);
  }
};
