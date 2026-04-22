import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Search, UserPlus, Mail, Phone, UserCheck, UserX, Building2, Copy, Check, Shield, Plus, Eye, Trash2, Ban } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { requestFunction } from '../../lib/functionClient';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'landlord' | 'tenant' | 'admin';
  status: 'active' | 'suspended' | 'inactive';
  joinDate: string;
  lastActive: string;
  properties?: number;
  unit?: string;
  workplace?: string;
  occupants?: number;
  requiresPasswordChange?: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateLandlordDialog, setShowCreateLandlordDialog] = useState(false);
  const [newLandlord, setNewLandlord] = useState({
    name: '',
    email: '',
    phone: '',
    numberOfBuildings: 1,
    buildings: [''],
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);

  const loadUsers = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;

      const response = await requestFunction('/auth/users', {
        headers: {
          'x-user-token': accessToken,
        },
      });

      if (response.status === 404) {
        const profilesResponse = await fetch(
          `https://${projectId}.supabase.co/rest/v1/profiles?select=id,email,full_name,phone,role,created_at&order=created_at.desc`,
          {
            headers: {
              apikey: publicAnonKey,
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!profilesResponse.ok) {
          toast.error('Failed to load users');
          return;
        }

        const profilesData = await profilesResponse.json();
        const fallbackUsers: User[] = Array.isArray(profilesData)
          ? profilesData.map((profile: any) => ({
              id: profile.id,
              name: profile.full_name || profile.email,
              email: profile.email,
              phone: profile.phone || '',
              role: profile.role,
              status: 'active',
              joinDate: profile.created_at || new Date().toISOString(),
              lastActive: profile.created_at || new Date().toISOString(),
              properties: profile.role === 'landlord' ? 0 : undefined,
            }))
          : [];

        setUsers(fallbackUsers);
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Failed to load users');
        return;
      }

      const backendUsers: User[] = Array.isArray(data.data?.users)
        ? data.data.users.map((user: any) => ({
            id: user.id,
            name: user.name || user.full_name || user.email,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            status: user.status || 'active',
            joinDate: user.joinDate || user.created_at || new Date().toISOString(),
            lastActive: user.lastActive || user.created_at || new Date().toISOString(),
            properties: user.properties,
            unit: user.unit,
            requiresPasswordChange: user.requiresPasswordChange,
          }))
        : [];

      setUsers(backendUsers);
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleBuildingCountChange = (count: number) => {
    const newBuildings = Array(count).fill('').map((_, i) => newLandlord.buildings[i] || '');
    setNewLandlord({ ...newLandlord, numberOfBuildings: count, buildings: newBuildings });
  };

  const handleBuildingNameChange = (index: number, name: string) => {
    const newBuildings = [...newLandlord.buildings];
    newBuildings[index] = name;
    setNewLandlord({ ...newLandlord, buildings: newBuildings });
  };

  const handleOpenCreateDialog = () => {
    setGeneratedPassword('');
    setShowCreateLandlordDialog(true);
  };

  const handleCreateLandlord = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('You must be logged in to create landlord accounts');
        return;
      }

      // Validate all fields
      if (!newLandlord.name || !newLandlord.email || !newLandlord.phone) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (newLandlord.buildings.some(b => !b.trim())) {
        toast.error('Please provide names for all buildings');
        return;
      }

      const response = await requestFunction('/auth/create-landlord', {
        method: 'POST',
        headers: {
          'x-user-token': accessToken,
        },
        body: JSON.stringify({
          name: newLandlord.name,
          email: newLandlord.email,
          phone: newLandlord.phone,
          numberOfBuildings: newLandlord.numberOfBuildings,
          buildings: newLandlord.buildings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to create landlord account');
        return;
      }

      // Account created successfully
      const landlordData = data.data.user;
      const temporaryPassword = data.data.temporaryPassword;

      // Update local state
      const newLandlordUser: User = {
        id: landlordData.id,
        name: landlordData.name,
        email: landlordData.email,
        phone: landlordData.phone,
        role: 'landlord',
        status: 'active',
        joinDate: new Date(landlordData.joinDate).toISOString().split('T')[0],
        lastActive: 'Never',
        properties: landlordData.properties,
        requiresPasswordChange: true,
      };

      setUsers([...users, newLandlordUser]);
      await loadUsers();

      setGeneratedPassword(temporaryPassword || '');

      toast.success('Landlord account created successfully!', {
        description: `Password: ${temporaryPassword}`,
        duration: 10000,
      });
    } catch (error) {
      console.error('Create landlord error:', error);
      toast.error('An error occurred while creating landlord account');
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateLandlordDialog(false);
    setNewLandlord({ name: '', email: '', phone: '', numberOfBuildings: 1, buildings: [''] });
    setGeneratedPassword('');
    setPasswordCopied(false);
  };

  // Fallback copy function for when Clipboard API is blocked
  const copyToClipboard = (text: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success('Password copied to clipboard!');
          setPasswordCopied(true);
        })
        .catch(() => {
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  };

  // Fallback method using textarea
  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Password copied to clipboard!');
        setPasswordCopied(true);
      } else {
        toast.error('Failed to copy password. Please copy manually.');
      }
    } catch (err) {
      toast.error('Failed to copy password. Please copy manually.');
    }
    
    document.body.removeChild(textArea);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
  const landlords = users.filter((u) => u.role === 'landlord').length;
  const tenants = users.filter((u) => u.role === 'tenant').length;

  const handleSuspendUser = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId
          ? { ...user, status: user.status === 'suspended' ? 'active' : ('suspended' as const) }
          : user
      )
    );
    const user = users.find((u) => u.id === userId);
    toast.success(
      `${user?.name} has been ${user?.status === 'suspended' ? 'reactivated' : 'suspended'}`
    );
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
    toast.success('User deleted successfully');
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role: User['role']) => {
    return role === 'landlord' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">User Management</h2>
        <p className="text-gray-600">Manage all platform users and their access</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Users</span>
            <UserCheck className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{totalUsers}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active</span>
            <UserCheck className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{activeUsers}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Suspended</span>
            <UserX className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">{suspendedUsers}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Landlords</span>
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl">{landlords}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Tenants</span>
            <UserCheck className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">{tenants}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl mb-1">All Users</h3>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleOpenCreateDialog}
              className="bg-[#1e3a3f] text-white hover:bg-[#2d5459]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Landlord
            </Button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              aria-label="Filter users by role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              <option value="landlord">Landlords</option>
              <option value="tenant">Tenants</option>
            </select>
            <select
              aria-label="Filter users by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Contact</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Join Date</th>
                <th className="text-left p-4">Last Active</th>
                <th className="text-left p-4">Details</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium">{user.name}</p>
                  </td>
                  <td className="p-4">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{user.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="p-4">{new Date(user.joinDate).toLocaleDateString()}</td>
                  <td className="p-4">{new Date(user.lastActive).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="text-sm text-gray-600">
                      {user.properties && <p>{user.properties} properties</p>}
                      {user.unit && <p>{user.unit}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewUser(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspendUser(user.id)}
                        className={user.status === 'suspended' ? 'text-green-600 border-green-600' : 'text-yellow-600 border-yellow-600'}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View and manage user account information.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-medium">{selectedUser.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Join Date</span>
                  <span className="font-medium">{new Date(selectedUser.joinDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Active</span>
                  <span className="font-medium">{new Date(selectedUser.lastActive).toLocaleDateString()}</span>
                </div>
                {selectedUser.properties && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Properties</span>
                    <span className="font-medium">{selectedUser.properties} properties</span>
                  </div>
                )}
                {selectedUser.unit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit</span>
                    <span className="font-medium">{selectedUser.unit}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => handleSuspendUser(selectedUser.id)}
                >
                  {selectedUser.status === 'suspended' ? 'Reactivate' : 'Suspend'} User
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    handleDeleteUser(selectedUser.id);
                    setShowUserDialog(false);
                  }}
                >
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Landlord Dialog */}
      <Dialog open={showCreateLandlordDialog} onOpenChange={setShowCreateLandlordDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Landlord Account</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new landlord account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <Input
                  placeholder="John Doe"
                  value={newLandlord.name}
                  onChange={(e) => setNewLandlord({ ...newLandlord, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address *</label>
                <Input
                  type="email"
                  placeholder="landlord@example.com"
                  value={newLandlord.email}
                  onChange={(e) => setNewLandlord({ ...newLandlord, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                <Input
                  type="tel"
                  placeholder="+256 700 000 000"
                  value={newLandlord.phone}
                  onChange={(e) => setNewLandlord({ ...newLandlord, phone: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">How many buildings? *</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={newLandlord.numberOfBuildings}
                  onChange={(e) => handleBuildingCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              
              {/* Dynamic building name inputs */}
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-medium text-gray-700">Building Names</p>
                {newLandlord.buildings.map((building, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm text-gray-600">Building {index + 1} *</label>
                    <Input
                      placeholder={`e.g., Sunrise Apartments`}
                      value={building}
                      onChange={(e) => handleBuildingNameChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Temporary Password Display */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    One-Time Temporary Password
                  </p>
                  <p className="text-xs text-yellow-800 mb-3">
                    This password is generated by the backend when you create the landlord account.
                    Copy it and share it securely after creation.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={generatedPassword}
                    readOnly
                    className="font-mono bg-white text-sm"
                    placeholder="Password will appear after account creation"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedPassword)}
                    title="Copy password"
                    disabled={!generatedPassword}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-yellow-700">
                  ⚠️ Save this password now - it won't be shown again after you close this dialog.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#1e3a3f] text-white hover:bg-[#2d5459]"
                onClick={handleCreateLandlord}
                disabled={
                  !newLandlord.name || 
                  !newLandlord.email || 
                  !newLandlord.phone ||
                  newLandlord.buildings.some(b => !b.trim())
                }
              >
                Create Account
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={handleCloseCreateDialog}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}