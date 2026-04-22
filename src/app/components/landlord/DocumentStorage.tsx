import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { FileText, Upload, Download, Trash2, Eye, Calendar, Search, Plus, Folder } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  type: 'lease' | 'receipt' | 'inspection' | 'agreement' | 'other';
  category: string;
  uploadDate: string;
  size: string;
  tenant?: string;
  building?: string;
  unit?: string;
  expiryDate?: string;
}

const documentTypes = {
  lease: { label: 'Lease Agreement', color: 'text-blue-500 bg-blue-50' },
  receipt: { label: 'Receipt', color: 'text-green-500 bg-green-50' },
  inspection: { label: 'Inspection Report', color: 'text-yellow-500 bg-yellow-50' },
  agreement: { label: 'Agreement', color: 'text-purple-500 bg-purple-50' },
  other: { label: 'Other', color: 'text-gray-500 bg-gray-50' },
};

const mockDocuments: Document[] = [];

export function DocumentStorage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tenant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.building?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleUpload = () => {
    toast.success('Document uploaded successfully');
    setShowUploadDialog(false);
  };

  const handleDownload = (doc: Document) => {
    toast.success(`Downloading ${doc.name}`);
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
    toast.success('Document deleted');
  };

  const getExpiringDocuments = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      const expiryDate = new Date(doc.expiryDate);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });
  };

  const expiringDocs = getExpiringDocuments();
  const totalSize = documents.reduce((sum, doc) => {
    const size = parseFloat(doc.size);
    const unit = doc.size.split(' ')[1];
    return sum + (unit === 'MB' ? size : size / 1024);
  }, 0);

  const documentsByCategory = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Document Storage</h2>
        <p className="text-gray-600">Manage property documents and files</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Documents</span>
            <FileText className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">{documents.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Storage</span>
            <Folder className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl">{totalSize.toFixed(1)} MB</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Categories</span>
            <Folder className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">{Object.keys(documentsByCategory).length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Expiring Soon</span>
            <Calendar className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl">{expiringDocs.length}</p>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800">Documents Expiring Soon</h4>
              <div className="text-sm text-yellow-700 mt-2 space-y-1">
                {expiringDocs.map((doc) => (
                  <p key={doc.id}>
                    • {doc.name} - Expires {new Date(doc.expiryDate!).toLocaleDateString()}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl mb-1">All Documents</h3>
            <p className="text-sm text-gray-600">Manage and organize property documents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              aria-label="Filter document type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              {Object.entries(documentTypes).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            <Button
              className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Document Name</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Tenant/Building</th>
                <th className="text-left p-4">Upload Date</th>
                <th className="text-left p-4">Size</th>
                <th className="text-left p-4">Expiry</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${documentTypes[doc.type].color}`}>
                      {documentTypes[doc.type].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      {doc.tenant && <p className="font-medium">{doc.tenant}</p>}
                      <p className="text-sm text-gray-600">
                        {doc.building} {doc.unit ? `- ${doc.unit}` : ''}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">{new Date(doc.uploadDate).toLocaleDateString()}</td>
                  <td className="p-4">{doc.size}</td>
                  <td className="p-4">
                    {doc.expiryDate ? (
                      <span className="text-sm text-gray-600">
                        {new Date(doc.expiryDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doc.id)}
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Document Type *</label>
              <select aria-label="Document type" className="w-full p-2 border rounded-lg">
                {Object.entries(documentTypes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Category *</label>
              <Input placeholder="e.g., Leases, Receipts, Insurance" />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Associated Tenant (Optional)</label>
              <Input placeholder="Select or enter tenant name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Building</label>
                <Input placeholder="Building name" />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Unit</label>
                <Input placeholder="Unit number" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Expiry Date (Optional)</label>
              <Input type="date" />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#1e3a3f] transition-colors cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
            </div>

            <Button
              className="w-full bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={handleUpload}
            >
              Upload Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
