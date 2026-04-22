import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DollarSign, Download, Plus, Trash2, TrendingDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseTrackingProps {
  selectedProperty?: string;
}

interface Expense {
  id: string;
  date: string;
  category: 'repairs' | 'maintenance' | 'utilities' | 'improvements' | 'other';
  description: string;
  amount: number;
  building: string;
  buildingId?: string;
  unit?: string;
  payee: string;
  receiptUrl?: string;
}

const categoryLabels = {
  repairs: 'Repairs',
  maintenance: 'Maintenance',
  utilities: 'Utilities',
  improvements: 'Improvements',
  other: 'Other',
};

const categoryColors = {
  repairs: 'text-red-500 bg-red-50',
  maintenance: 'text-yellow-500 bg-yellow-50',
  utilities: 'text-blue-500 bg-blue-50',
  improvements: 'text-green-500 bg-green-50',
  other: 'text-gray-500 bg-gray-50',
};

const mockExpenses: Expense[] = [];

export function ExpenseTracking({ selectedProperty = 'all' }: ExpenseTrackingProps) {
  const allExpenses = mockExpenses;

  // Filter by selected property
  const filteredExpenses = selectedProperty === 'all'
    ? allExpenses
    : allExpenses.filter((expense) =>
        expense.buildingId === selectedProperty ||
        expense.building === selectedProperty
      );

  const [expenses, setExpenses] = useState<Expense[]>(filteredExpenses);

  // Update expenses when selectedProperty changes
  useEffect(() => {
    setExpenses(filteredExpenses);
  }, [selectedProperty]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');

  const [newExpense, setNewExpense] = useState({
    date: '',
    category: 'repairs' as Expense['category'],
    description: '',
    amount: '',
    building: '',
    unit: '',
    payee: '',
  });

  const monthFilteredExpenses = expenses.filter((expense) => {
    if (selectedMonth === 'all') return true;
    const expenseMonth = new Date(expense.date).getMonth();
    return expenseMonth === parseInt(selectedMonth);
  });

  const totalExpenses = monthFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const expensesByCategory = Object.keys(categoryLabels).map((cat) => {
    const categoryExpenses = monthFilteredExpenses.filter((exp) => exp.category === cat);
    const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: categoryLabels[cat as keyof typeof categoryLabels],
      total,
      count: categoryExpenses.length,
    };
  }).filter(item => item.count > 0);

  const handleAddExpense = () => {
    if (!newExpense.date || !newExpense.description || !newExpense.amount || !newExpense.building || !newExpense.payee) {
      toast.error('Please fill in all required fields');
      return;
    }

    const expense: Expense = {
      id: String(expenses.length + 1),
      date: newExpense.date,
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      building: newExpense.building,
      unit: newExpense.unit || undefined,
      payee: newExpense.payee,
    };

    setExpenses([expense, ...expenses]);
    toast.success('Expense added successfully');
    setShowAddDialog(false);
    setNewExpense({
      date: '',
      category: 'repairs',
      description: '',
      amount: '',
      building: '',
      unit: '',
      payee: '',
    });
  };

  const handleDelete = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
    toast.success('Expense deleted');
  };

  const downloadExpenseReport = () => {
    const csvData = [
      ['Date', 'Category', 'Description', 'Amount (UGX)', 'Building', 'Unit', 'Payee'],
      ...monthFilteredExpenses.map((exp) => [
        exp.date,
        categoryLabels[exp.category],
        exp.description,
        exp.amount.toString(),
        exp.building,
        exp.unit || 'N/A',
        exp.payee,
      ]),
      [],
      ['Total Expenses', '', '', totalExpenses.toString(), '', '', ''],
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expense_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Expense report downloaded');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Expense Tracking</h2>
        <p className="text-gray-600">Track property expenses and generate tax reports</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Expenses</span>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl">UGX {(totalExpenses / 1000).toFixed(0)}K</p>
          <p className="text-xs text-gray-500 mt-1">{monthFilteredExpenses.length} transactions</p>
        </div>

        {expensesByCategory.slice(0, 3).map((item, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">{item.category}</span>
              <DollarSign className="w-5 h-5 text-[#1e3a3f]" />
            </div>
            <p className="text-3xl">UGX {(item.total / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-500 mt-1">{item.count} expense{item.count > 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl mb-4">Expenses by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {expensesByCategory.map((item, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.category}</span>
                <span className="text-sm text-gray-500">{item.count} items</span>
              </div>
              <p className="text-2xl text-[#1e3a3f]">UGX {item.total.toLocaleString()}</p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#1e3a3f]" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((item.total / totalExpenses) * 100).toFixed(1)}% of total
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl mb-1">All Expenses</h3>
            <p className="text-sm text-gray-600">Track and manage property expenses</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label="Filter expenses by month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Months</option>
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
            <Button
              variant="outline"
              onClick={downloadExpenseReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              className="bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Building/Unit</th>
                <th className="text-left p-4">Payee</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthFilteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(expense.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${categoryColors[expense.category]}`}>
                      {categoryLabels[expense.category]}
                    </span>
                  </td>
                  <td className="p-4">{expense.description}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{expense.building}</p>
                      {expense.unit && <p className="text-xs text-gray-500">{expense.unit}</p>}
                    </div>
                  </td>
                  <td className="p-4">{expense.payee}</td>
                  <td className="p-4">
                    <span className="font-medium text-red-600">
                      -UGX {expense.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total:</span>
            <span className="text-2xl font-bold text-red-600">
              UGX {totalExpenses.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-2 block">Date *</label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Category *</label>
              <select
                aria-label="Expense category"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as Expense['category'] })}
                className="w-full p-2 border rounded-lg"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Description *</label>
              <Input
                placeholder="Enter expense description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Amount (UGX) *</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Building *</label>
                <Input
                  placeholder="Building name"
                  value={newExpense.building}
                  onChange={(e) => setNewExpense({ ...newExpense, building: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Unit (Optional)</label>
                <Input
                  placeholder="e.g., A-101"
                  value={newExpense.unit}
                  onChange={(e) => setNewExpense({ ...newExpense, unit: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-700 mb-2 block">Payee *</label>
              <Input
                placeholder="Who was paid?"
                value={newExpense.payee}
                onChange={(e) => setNewExpense({ ...newExpense, payee: e.target.value })}
              />
            </div>

            <Button
              className="w-full bg-[#1e3a3f] text-white hover:bg-[#2d5358]"
              onClick={handleAddExpense}
            >
              Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
