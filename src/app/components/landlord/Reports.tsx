import { useState } from 'react';
import { Button } from '../ui/button';
import { Download, FileSpreadsheet, Users, DollarSign, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportsProps {
  selectedProperty?: string;
}

export function Reports({ selectedProperty = 'all' }: ReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = (type: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      let data: string[][] = [];
      let filename = '';

      switch (type.toLowerCase()) {
        case 'tenant-list':
          filename = 'tenant_list_report.csv';
          data = [
            ['Tenant Name', 'Unit', 'Building', 'Email', 'Phone', 'Rent (UGX)', 'Status', 'Move-in Date'],
          ];
          break;
        case 'payment-history':
          filename = 'payment_history_report.csv';
          data = [
            ['Date', 'Tenant', 'Amount (UGX)', 'Type', 'Payment Method', 'Status', 'Reference'],
          ];
          break;
        case 'occupancy':
          filename = 'occupancy_report.csv';
          data = [
            ['Building', 'Total Units', 'Occupied Units', 'Vacant Units', 'Occupancy Rate'],
          ];
          break;
        case 'outstanding':
          filename = 'outstanding_payments_report.csv';
          data = [
            ['Tenant', 'Unit', 'Building', 'Amount Due (UGX)', 'Days Overdue', 'Last Payment'],
          ];
          break;
        default:
          filename = 'all_reports.csv';
          data = [
            ['Report Type', 'Generated Date'],
            ['All Reports', new Date().toLocaleDateString()],
          ];
      }

      downloadCSV(data, filename);
      toast.success(`${type} report downloaded successfully!`);
      setIsGenerating(false);
    }, 1500);
  };

  const reports = [
    {
      title: 'Tenant List',
      description: 'Complete list of all tenants with contact information',
      icon: Users,
      type: 'tenant-list',
      format: 'Excel',
    },
    {
      title: 'Payment History',
      description: 'All payment transactions and receipts',
      icon: DollarSign,
      type: 'payment-history',
      format: 'Excel',
    },
    {
      title: 'Building Occupancy',
      description: 'Vacancy and occupancy rates per building',
      icon: Building2,
      type: 'occupancy',
      format: 'Excel',
    },
    {
      title: 'Outstanding Payments',
      description: 'List of pending and overdue payments',
      icon: FileSpreadsheet,
      type: 'outstanding',
      format: 'Excel',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Reports & Analytics</h2>
        <p className="text-gray-600">Download detailed reports and spreadsheets</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Tenants</span>
            <Users className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">0</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Units</span>
            <Building2 className="w-5 h-5 text-[#1e3a3f]" />
          </div>
          <p className="text-3xl">0</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Occupancy Rate</span>
            <FileSpreadsheet className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">0%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Monthly Revenue</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl">UGX 0</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div
            key={report.type}
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#e8f4f5] rounded-lg">
                  <report.icon className="w-6 h-6 text-[#1e3a3f]" />
                </div>
                <div>
                  <h3 className="text-lg mb-1">{report.title}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">Format: {report.format}</span>
              <Button
                size="sm"
                onClick={() => generateReport(report.title)}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => generateReport('All Reports')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download All Reports
          </Button>
          <Button onClick={() => toast.info('Email feature coming soon')} variant="outline">
            Email Monthly Report
          </Button>
          <Button onClick={() => toast.info('Schedule feature coming soon')} variant="outline">
            Schedule Auto Reports
          </Button>
        </div>
      </div>
    </div>
  );
}