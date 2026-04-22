import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { requestFunction } from '../../lib/functionClient';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Upload, Mail, Phone, Briefcase, Users, Building2, CalendarDays, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export function TenantProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    occupation: '',
    nextOfKin: '',
    nextOfKinContact: '',
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setPhotoUrl(result);
      localStorage.setItem(`tenantProfilePhoto:${profile.id}`, result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await requestFunction('/tenants/me/assignment', {
          headers: {
            ...(accessToken ? { 'x-user-token': accessToken } : {}),
          },
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          setProfile(result.data || null);
          setForm({
            fullName: result.data?.name || '',
            phone: result.data?.phone || '',
            occupation: result.data?.occupation || '',
            nextOfKin: result.data?.nextOfKin || '',
            nextOfKinContact: result.data?.nextOfKinContact || '',
          });
          if (result.data?.id) {
            const storedPhoto = localStorage.getItem(`tenantProfilePhoto:${result.data.id}`) || '';
            setPhotoUrl(storedPhoto);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await requestFunction('/tenants/me/profile', {
        method: 'PUT',
        headers: {
          ...(accessToken ? { 'x-user-token': accessToken } : {}),
        },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          occupation: form.occupation,
          nextOfKin: form.nextOfKin,
          nextOfKinContact: form.nextOfKinContact,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result?.message || 'Failed to update profile');
        return;
      }

      setProfile((prev: any) => ({
        ...prev,
        name: form.fullName,
        phone: form.phone,
        occupation: form.occupation,
        nextOfKin: form.nextOfKin,
        nextOfKinContact: form.nextOfKinContact,
      }));
      setIsEditing(false);
      toast.success(result?.message || 'Profile updated successfully');
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading profile...</div>;
  }

  const initials = (profile?.name || 'Tenant')
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">My Profile</h2>
        <p className="text-gray-600">Personal details and current tenancy information</p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e3a3f] to-[#2d5358] h-24" />
        <CardHeader>
          <div className="-mt-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-white overflow-hidden border-4 border-white shadow flex items-center justify-center text-[#1e3a3f] text-2xl font-semibold">
                {photoUrl ? (
                  <img src={photoUrl} alt="Tenant profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">{profile?.name || 'Tenant'}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{profile?.assigned ? 'Assigned Tenant' : 'Unassigned Tenant'}</p>
              </div>
            </div>
            <div>
              <input id="tenant-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} aria-label="Upload tenant profile picture" />
              <Button type="button" variant="outline" onClick={() => document.getElementById('tenant-photo-upload')?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Update Photo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{profile?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{profile?.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Occupation</p>
                <p className="font-medium">{profile?.occupation || 'N/A'}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Next of Kin</p>
                <p className="font-medium">{profile?.nextOfKin || 'N/A'}</p>
                <p className="text-xs text-gray-500">{profile?.nextOfKinContact || 'No contact set'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Editable Details</p>
              {!isEditing ? (
                <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                  <Button type="button" onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  disabled={!isEditing || isSaving}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing || isSaving}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Occupation</p>
                <Input
                  value={form.occupation}
                  onChange={(e) => setForm((prev) => ({ ...prev, occupation: e.target.value }))}
                  disabled={!isEditing || isSaving}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Next of Kin</p>
                <Input
                  value={form.nextOfKin}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextOfKin: e.target.value }))}
                  disabled={!isEditing || isSaving}
                />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 mb-1">Next of Kin Contact</p>
                <Input
                  value={form.nextOfKinContact}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextOfKinContact: e.target.value }))}
                  disabled={!isEditing || isSaving}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#1e3a3f]" />
                <p className="text-xs text-gray-600">Building</p>
              </div>
              <p className="font-medium">{profile?.building || 'Not assigned'}</p>
            </div>
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#1e3a3f]" />
                <p className="text-xs text-gray-600">Unit</p>
              </div>
              <p className="font-medium">{profile?.unit || 'Not assigned'}</p>
            </div>
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-[#1e3a3f]" />
                <p className="text-xs text-gray-600">Rent</p>
              </div>
              <p className="font-medium">{profile?.rent ? `UGX ${Number(profile.rent).toLocaleString()}` : 'Not set'}</p>
            </div>
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-[#1e3a3f]" />
                <p className="text-xs text-gray-600">Assigned Date</p>
              </div>
              <p className="font-medium">{profile?.assignedDate ? new Date(profile.assignedDate).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-blue-50">
            <p className="text-sm text-blue-900 font-medium mb-1">Lease Timeline</p>
            <p className="text-sm text-blue-800">
              Start Date: {profile?.leaseStartDate ? new Date(profile.leaseStartDate).toLocaleDateString() : 'Not set'}
            </p>
            <p className="text-sm text-blue-800">
              End Date: {profile?.leaseEndDate ? new Date(profile.leaseEndDate).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
