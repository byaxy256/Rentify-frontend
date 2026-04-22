import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileText, Upload, Download, Trash2, Eye, Calendar, Search, Plus, AlertCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  type: 'receipt' | 'inspection' | 'agreement' | 'other';
  category: string;
  uploadDate: string;
  size: string;
  tenant?: string;
  building?: string;
  buildingId?: string;
  unit?: string;
  expiryDate?: string;
}

interface Lease {
  id: string;
  tenantName: string;
  unit: string;
  building: string;
  buildingId?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'expiring-soon' | 'expired';
  documentUrl?: string;
  autoRenew: boolean;
}

const documentTypes = {
  receipt: { label: 'Receipt', color: 'text-green-500 bg-green-50' },
  inspection: { label: 'Inspection Report', color: 'text-yellow-500 bg-yellow-50' },
  agreement: { label: 'Agreement', color: 'text-purple-500 bg-purple-50' },
  other: { label: 'Other', color: 'text-gray-500 bg-gray-50' },
};

const mockDocuments: Document[] = [];

const mockLeases: Lease[] = [];

interface DocumentsAndLeasesProps {
  selectedProperty?: string;
}

export function DocumentsAndLeases({ selectedProperty = 'all' }: DocumentsAndLeasesProps) {
  const allDocuments = mockDocuments;
  const allLeases = mockLeases;

  // Filter by selected property
  const filteredDocsByProperty = selectedProperty === 'all'
    ? allDocuments
    : allDocuments.filter((document) =>
        document.buildingId === selectedProperty ||
        document.building === selectedProperty
      );

  const filteredLeasesByProperty = selectedProperty === 'all'
    ? allLeases
    : allLeases.filter((lease) =>
        lease.buildingId === selectedProperty ||
        lease.building === selectedProperty
      );

  const [documents, setDocuments] = useState<Document[]>(filteredDocsByProperty);
  const [leases, setLeases] = useState<Lease[]>(filteredLeasesByProperty);

  // Update when selectedProperty changes
  useEffect(() => {
    setDocuments(filteredDocsByProperty);
    setLeases(filteredLeasesByProperty);
  }, [selectedProperty]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAddLeaseDialog, setShowAddLeaseDialog] = useState(false);
  const [showViewLeaseDialog, setShowViewLeaseDialog] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // New lease form state
  const [newLease, setNewLease] = useState({
    tenantName: '',
    unit: '',
    building: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    autoRenew: false,
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tenant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.building?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredLeases = leases.filter(
    (lease) =>
      lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeLeasesCount = leases.filter(l => l.status === 'active').length;
  const expiringSoonCount = leases.filter(l => l.status === 'expiring-soon').length;
  const expiredCount = leases.filter(l => l.status === 'expired').length;

  const handleUpload = () => {
    toast.success('Document uploaded successfully');
    setShowUploadDialog(false);
  };

  const handleDownload = (doc: Document) => {
    toast.success(`Downloading ${doc.name}`);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
    toast.success('Document deleted');
  };

  const handleAddLease = () => {
    if (!newLease.tenantName || !newLease.unit || !newLease.startDate || !newLease.endDate || !newLease.monthlyRent) {
      toast.error('Please fill in all required fields');
      return;
    }

    const lease: Lease = {
      id: String(leases.length + 1),
      tenantName: newLease.tenantName,
      unit: newLease.unit,
      building: newLease.building,
      startDate: newLease.startDate,
      endDate: newLease.endDate,
      monthlyRent: parseFloat(newLease.monthlyRent),
      securityDeposit: parseFloat(newLease.securityDeposit),
      status: 'active',
      autoRenew: newLease.autoRenew,
    };

    setLeases([...leases, lease]);
    toast.success('Lease agreement created successfully');
    setShowAddLeaseDialog(false);
    setNewLease({
      tenantName: '',
      unit: '',
      building: '',
      startDate: '',
      endDate: '',
      monthlyRent: '',
      securityDeposit: '',
      autoRenew: false,
    });
  };

  const handleViewLease = (lease: Lease) => {
    setSelectedLease(lease);
    setShowViewLeaseDialog(true);
  };

  const handleDownloadLease = (lease: Lease) => {
    toast.success(`Downloading lease agreement for ${lease.tenantName}`);
  };

  const getStatusColor = (status: Lease['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'expiring-soon':
        return 'bg-yellow-100 text-yellow-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Documents & Lease Agreements</h2>
        <p className="text-gray-600">Manage all your documents and lease agreements in one place</p>
      </div>

      <Tabs defaultValue="leases" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="leases">Lease Agreements</TabsTrigger>
          <TabsTrigger value="documents">Other Documents</TabsTrigger>
        </TabsList>

        {/* Lease Agreements Tab */}
        <TabsContent value="leases" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Active Leases</span>
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl">{activeLeasesCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Expiring Soon</span>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl">{expiringSoonCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Expired</span>
                <Calendar className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl">{expiredCount}</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search leases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button
                className="bg-[#1e3a3f] text-white hover:bg-[#152c30]"
                onClick={() => setShowAddLeaseDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Lease Agreement
              </Button>
            </div>

            {/* Leases Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Tenant</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Unit</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Building</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Start Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">End Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Rent</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.map((lease) => (
                    <tr key={lease.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-sm">{lease.tenantName}</td>
                      <td className="p-4 text-sm">{lease.unit}</td>
                      <td className="p-4 text-sm">{lease.building}</td>
                      <td className="p-4 text-sm">{new Date(lease.startDate).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">{new Date(lease.endDate).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">UGX {lease.monthlyRent.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(lease.status)}`}>
                          {lease.status === 'expiring-soon' ? 'Expiring Soon' : lease.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewLease(lease)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadLease(lease)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Other Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="document-type-filter" className="text-sm text-gray-700">Filter:</label>
                <select
                  id="document-type-filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="receipt">Receipts</option>
                  <option value="inspection">Inspection Reports</option>
                  <option value="agreement">Agreements</option>
                  <option value="other">Other</option>
                </select>
                <Button
                  className="bg-[#1e3a3f] text-white hover:bg-[#152c30]"
                  onClick={() => setShowUploadDialog(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const typeInfo = documentTypes[doc.type];
                return (
                  <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-medium mb-2 truncate">{doc.name}</h4>

                    <div className="space-y-1 text-xs text-gray-600 mb-3">
                      {doc.tenant && <p>Tenant: {doc.tenant}</p>}
                      {doc.building && <p>Building: {doc.building}</p>}
                      {doc.unit && <p>Unit: {doc.unit}</p>}
                      <p>Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</p>
                      <p>Size: {doc.size}</p>
                      {doc.expiryDate && (
                        <p className="text-yellow-600">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="document-type-select" className="text-sm text-gray-700 mb-2 block">Document Type</label>
              <select id="document-type-select" className="w-full p-2 border rounded-lg">
                <option value="receipt">Receipt</option>
                <option value="inspection">Inspection Report</option>
                <option value="agreement">Agreement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">File</label>
              <Input type="file" />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Building (Optional)</label>
              <Input placeholder="e.g., Sunrise Apartments" />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Unit (Optional)</label>
              <Input placeholder="e.g., A-101" />
            </div>

            <Button className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]" onClick={handleUpload}>
              Upload Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lease Dialog */}
      <Dialog open={showAddLeaseDialog} onOpenChange={setShowAddLeaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Lease Agreement</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Tenant Name *</label>
              <Input
                placeholder="John Smith"
                value={newLease.tenantName}
                onChange={(e) => setNewLease({ ...newLease, tenantName: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Unit *</label>
              <Input
                placeholder="A-101"
                value={newLease.unit}
                onChange={(e) => setNewLease({ ...newLease, unit: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Building</label>
              <Input
                placeholder="Sunrise Apartments"
                value={newLease.building}
                onChange={(e) => setNewLease({ ...newLease, building: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Monthly Rent (UGX) *</label>
              <Input
                type="number"
                placeholder="200000"
                value={newLease.monthlyRent}
                onChange={(e) => setNewLease({ ...newLease, monthlyRent: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Security Deposit (UGX)</label>
              <Input
                type="number"
                placeholder="400000"
                value={newLease.securityDeposit}
                onChange={(e) => setNewLease({ ...newLease, securityDeposit: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Start Date *</label>
              <Input
                type="date"
                value={newLease.startDate}
                onChange={(e) => setNewLease({ ...newLease, startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">End Date *</label>
              <Input
                type="date"
                value={newLease.endDate}
                onChange={(e) => setNewLease({ ...newLease, endDate: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRenew"
                checked={newLease.autoRenew}
                onChange={(e) => setNewLease({ ...newLease, autoRenew: e.target.checked })}
              />
              <label htmlFor="autoRenew" className="text-sm text-gray-700">Auto-renew lease</label>
            </div>
          </div>

          <Button className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]" onClick={handleAddLease}>
            Create Lease Agreement
          </Button>
        </DialogContent>
      </Dialog>

      {/* View Lease Dialog */}
      <Dialog open={showViewLeaseDialog} onOpenChange={setShowViewLeaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lease Agreement Details</DialogTitle>
          </DialogHeader>
          {selectedLease && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-3">Tenant Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Tenant Name</p>
                    <p className="font-medium">{selectedLease.tenantName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unit</p>
                    <p className="font-medium">{selectedLease.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Building</p>
                    <p className="font-medium">{selectedLease.building}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(selectedLease.status)}`}>
                      {selectedLease.status === 'expiring-soon' ? 'Expiring Soon' : selectedLease.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-3">Lease Terms</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Start Date</p>
                    <p className="font-medium">{new Date(selectedLease.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Date</p>
                    <p className="font-medium">{new Date(selectedLease.endDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monthly Rent</p>
                    <p className="font-medium">UGX {selectedLease.monthlyRent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Security Deposit</p>
                    <p className="font-medium">UGX {selectedLease.securityDeposit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Auto-Renew</p>
                    <p className="font-medium">{selectedLease.autoRenew ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]"
                onClick={() => handleDownloadLease(selectedLease)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Lease Agreement
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
