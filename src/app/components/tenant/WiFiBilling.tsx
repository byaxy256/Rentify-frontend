import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Wifi, Check, ArrowLeft, Calendar, Clock, TrendingUp, Smartphone, Copy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WiFiBillingProps {
  onBack: () => void;
}

interface WiFiPlan {
  id: string;
  name: string;
  period: 'daily' | 'weekly' | 'monthly';
  speed: string;
  price: number;
  features: string[];
}

interface WiFiPayment {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  date: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'disabled';
  voucherCode?: string;
  username?: string;
  password?: string;
}

const wifiPlans: WiFiPlan[] = [
  {
    id: 'daily-1',
    name: 'Daily Basic',
    period: 'daily',
    speed: '10 Mbps',
    price: 3000,
    features: ['24 hours access', 'Suitable for browsing', 'Email & social media'],
  },
  {
    id: 'daily-2',
    name: 'Daily Premium',
    period: 'daily',
    speed: '50 Mbps',
    price: 5000,
    features: ['24 hours access', 'HD streaming', 'Fast downloads'],
  },
  {
    id: 'weekly-1',
    name: 'Weekly Basic',
    period: 'weekly',
    speed: '10 Mbps',
    price: 18000,
    features: ['7 days access', 'Suitable for browsing', 'Email & social media', 'Save UGX 3,000'],
  },
  {
    id: 'weekly-2',
    name: 'Weekly Premium',
    period: 'weekly',
    speed: '50 Mbps',
    price: 30000,
    features: ['7 days access', 'HD streaming', 'Fast downloads', 'Save UGX 5,000'],
  },
  {
    id: 'monthly-1',
    name: 'Monthly Basic',
    period: 'monthly',
    speed: '10 Mbps',
    price: 65000,
    features: ['30 days access', 'Suitable for browsing', 'Email & social media', 'Save UGX 25,000'],
  },
  {
    id: 'monthly-2',
    name: 'Monthly Standard',
    period: 'monthly',
    speed: '50 Mbps',
    price: 120000,
    features: ['30 days access', 'HD streaming', 'Fast downloads', 'Save UGX 30,000'],
  },
  {
    id: 'monthly-3',
    name: 'Monthly Ultra',
    period: 'monthly',
    speed: '100 Mbps',
    price: 200000,
    features: ['30 days access', '4K streaming', 'Ultra-fast downloads', 'Priority support', 'Save UGX 50,000'],
  },
];

export function WiFiBilling({ onBack }: WiFiBillingProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WiFiPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [newCredentials, setNewCredentials] = useState<WiFiPayment | null>(null);

  const [wifiPayments, setWifiPayments] = useState<WiFiPayment[]>([]);

  const generateCredentials = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      username: `tenant_${randomNum}`,
      password: `wifi${randomNum}`,
      voucherCode: `WIFI-${randomCode}`,
    };
  };

  const handleSelectPlan = (plan: WiFiPlan) => {
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
    setPhoneNumber('');
  };

  const processPayment = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);

    // Step 1: Recording payment in Rentify
    setProcessingStep('Recording payment in Rentify...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 2: Sending request to WiFi backend
    setProcessingStep('Connecting to WiFi backend...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 3: Creating voucher/account in MikroTik
    setProcessingStep('Creating WiFi voucher in MikroTik...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const today = new Date();
    let expiryDate = new Date(today);

    if (selectedPlan.period === 'daily') {
      expiryDate.setDate(expiryDate.getDate() + 1);
    } else if (selectedPlan.period === 'weekly') {
      expiryDate.setDate(expiryDate.getDate() + 7);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const credentials = generateCredentials();

    const newPayment: WiFiPayment = {
      id: String(wifiPayments.length + 1),
      planId: selectedPlan.id,
      planName: `${selectedPlan.name} (${selectedPlan.speed})`,
      amount: selectedPlan.price,
      date: today.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      status: 'active',
      ...credentials,
    };

    // Step 4: Sending SMS with code
    setProcessingStep('Sending WiFi credentials via SMS...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mark all previous payments as expired
    const updatedPayments = wifiPayments.map(p => ({ ...p, status: 'expired' as const }));
    setWifiPayments([...updatedPayments, newPayment]);

    setNewCredentials(newPayment);
    toast.success('WiFi credentials sent via SMS!');
    setShowPaymentDialog(false);
    setIsLoading(false);
    setProcessingStep('');
    setShowCredentialsDialog(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const filteredPlans = wifiPlans.filter(plan => plan.period === selectedPeriod);
  const activeSubscription = wifiPayments.find(p => p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bills
        </Button>
        <div>
          <h2 className="text-3xl mb-2">WiFi Billing</h2>
          <p className="text-gray-600">Choose your internet plan</p>
        </div>
      </div>

      {/* No Active Subscription Warning */}
      {!activeSubscription && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-lg text-yellow-900 mb-2">No Active WiFi Subscription</h3>
              <p className="text-sm text-yellow-800 mb-3">
                You currently don't have an active WiFi subscription. Subscribe to a plan below to get internet access.
              </p>
              <p className="text-xs text-yellow-700">
                Note: If your subscription expires or payment is not made, your WiFi access will be automatically disabled until you renew.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Subscription */}
      {activeSubscription && (
        <div className="bg-gradient-to-r from-[#1e3a3f] to-[#2d5a62] rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Wifi className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl">Active WiFi Subscription</h3>
              <p className="text-white/80 text-sm">Your current plan</p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm">Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-white/80 text-sm mb-1">Plan</p>
              <p className="text-lg">{activeSubscription.planName}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-1">Activated</p>
              <p className="text-lg">{new Date(activeSubscription.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-1">Expires</p>
              <p className="text-lg">{new Date(activeSubscription.expiryDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* WiFi Credentials */}
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h4 className="text-sm text-white/80 mb-3">WiFi Login Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-white/60 text-xs mb-1">Username</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono">{activeSubscription.username}</p>
                  <button
                    onClick={() => copyToClipboard(activeSubscription.username || '', 'Username')}
                    className="text-white/60 hover:text-white transition-colors"
                    title="Copy Username"
                    aria-label="Copy Username"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono">{activeSubscription.password}</p>
                  <button
                    onClick={() => copyToClipboard(activeSubscription.password || '', 'Password')}
                    className="text-white/60 hover:text-white transition-colors"
                    title="Copy Password"
                    aria-label="Copy Password"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Voucher Code</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono">{activeSubscription.voucherCode}</p>
                  <button
                    onClick={() => copyToClipboard(activeSubscription.voucherCode || '', 'Voucher Code')}
                    className="text-white/60 hover:text-white transition-colors"
                    title="Copy Voucher Code"
                    aria-label="Copy Voucher Code"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/60 text-xs mb-2">How to connect:</p>
              <ol className="text-white/80 text-xs space-y-1">
                <li>1. Connect to the building WiFi network</li>
                <li>2. Open your browser - you'll see the captive portal</li>
                <li>3. Enter your username and password above</li>
                <li>4. Click login to start browsing</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl mb-4">Select Billing Period</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setSelectedPeriod('daily')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedPeriod === 'daily'
                ? 'border-[#1e3a3f] bg-[#1e3a3f]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Clock className="w-6 h-6 text-[#1e3a3f] mx-auto mb-2" />
            <p className={selectedPeriod === 'daily' ? 'text-[#1e3a3f]' : 'text-gray-700'}>Daily</p>
            <p className="text-xs text-gray-500 mt-1">Pay per day</p>
          </button>
          <button
            onClick={() => setSelectedPeriod('weekly')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedPeriod === 'weekly'
                ? 'border-[#1e3a3f] bg-[#1e3a3f]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-6 h-6 text-[#1e3a3f] mx-auto mb-2" />
            <p className={selectedPeriod === 'weekly' ? 'text-[#1e3a3f]' : 'text-gray-700'}>Weekly</p>
            <p className="text-xs text-gray-500 mt-1">Save more</p>
          </button>
          <button
            onClick={() => setSelectedPeriod('monthly')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedPeriod === 'monthly'
                ? 'border-[#1e3a3f] bg-[#1e3a3f]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-6 h-6 text-[#1e3a3f] mx-auto mb-2" />
            <p className={selectedPeriod === 'monthly' ? 'text-[#1e3a3f]' : 'text-gray-700'}>Monthly</p>
            <p className="text-xs text-gray-500 mt-1">Best value</p>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl">{plan.name}</h4>
                <div className="w-10 h-10 rounded-full bg-[#1e3a3f]/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-[#1e3a3f]" />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-3xl mb-1">UGX {plan.price.toLocaleString()}</p>
                <p className="text-gray-600 text-sm">per {plan.period === 'daily' ? 'day' : plan.period === 'weekly' ? 'week' : 'month'}</p>
              </div>

              <div className="mb-4">
                <p className="text-[#1e3a3f] mb-2">Speed: {plan.speed}</p>
              </div>

              <div className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{feature}</p>
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]"
                onClick={() => handleSelectPlan(plan)}
              >
                Subscribe Now
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment History */}
      {wifiPayments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-xl mb-1">Payment History</h3>
            <p className="text-sm text-gray-600">Your WiFi subscription payments and credentials</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Plan</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Voucher Code</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Date Paid</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Expiry Date</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {wifiPayments.map((payment) => {
                  const statusConfig = {
                    active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Active' },
                    expired: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Expired' },
                    disabled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Disabled' },
                  };
                  const config = statusConfig[payment.status];
                  const StatusIcon = config.icon;

                  return (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-sm">{payment.planName}</td>
                      <td className="p-4 text-sm">UGX {payment.amount.toLocaleString()}</td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{payment.voucherCode}</span>
                          <button
                            onClick={() => copyToClipboard(payment.voucherCode || '', 'Voucher Code')}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy Voucher Code"
                            aria-label="Copy Voucher Code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">{new Date(payment.expiryDate).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${config.color}`} />
                          <span className={`px-3 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WiFi Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              WiFi Activated Successfully!
            </DialogTitle>
          </DialogHeader>
          {newCredentials && (
            <div className="space-y-6">
              {/* SMS Notification */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm text-green-900 mb-1">SMS Sent!</p>
                  <p className="text-xs text-green-700">
                    Your WiFi credentials have been sent to your registered phone number.
                  </p>
                </div>
              </div>

              {/* Credentials */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg mb-4">Your WiFi Login Credentials</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Username</label>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                      <span className="font-mono flex-1">{newCredentials.username}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(newCredentials.username || '', 'Username')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Password</label>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                      <span className="font-mono flex-1">{newCredentials.password}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(newCredentials.password || '', 'Password')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Voucher Code</label>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                      <span className="font-mono flex-1">{newCredentials.voucherCode}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(newCredentials.voucherCode || '', 'Voucher Code')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connection Instructions */}
              <div className="bg-[#1e3a3f] text-white rounded-lg p-6">
                <h4 className="text-lg mb-4 flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  How to Connect
                </h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
                    <span>Connect your device to the building WiFi network</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
                    <span>Open any browser - the captive portal will appear automatically</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">3</span>
                    <span>Enter your username and password from above</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">4</span>
                    <span>Click "Login" and start browsing!</span>
                  </li>
                </ol>
              </div>

              {/* Subscription Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-900 mb-1">
                      Your subscription is valid until {new Date(newCredentials.expiryDate).toLocaleDateString()}
                    </p>
                    <p className="text-blue-700 text-xs">
                      After this date, your WiFi access will be automatically disabled. Renew your subscription to continue using the service.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]"
                onClick={() => setShowCredentialsDialog(false)}
              >
                Got it, Thanks!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe to WiFi Plan</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Plan</span>
                  <span>{selectedPlan.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Speed</span>
                  <span>{selectedPlan.speed}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Period</span>
                  <span className="capitalize">{selectedPlan.period}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-xl">UGX {selectedPlan.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('mtn')}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        paymentMethod === 'mtn' ? 'border-[#1e3a3f] bg-[#1e3a3f]/5' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm">MTN</p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('airtel')}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        paymentMethod === 'airtel' ? 'border-[#1e3a3f] bg-[#1e3a3f]/5' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm">Airtel</p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('bank')}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        paymentMethod === 'bank' ? 'border-[#1e3a3f] bg-[#1e3a3f]/5' : 'border-gray-200'
                      }`}
                    >
                      <p className="text-sm">Bank</p>
                    </button>
                  </div>
                </div>

                {(paymentMethod === 'mtn' || paymentMethod === 'airtel') && (
                  <div>
                    <label className="text-sm text-gray-700 mb-2 block">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="0700000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  className="w-full bg-[#1e3a3f] text-white hover:bg-[#152c30]"
                  onClick={processPayment}
                  disabled={isLoading || (paymentMethod !== 'bank' && !phoneNumber)}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {processingStep || 'Processing...'}
                    </span>
                  ) : (
                    `Pay UGX ${selectedPlan.price.toLocaleString()}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
