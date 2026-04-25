import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Building2, CreditCard, FileText, MessageSquare, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { requestFunction } from '../lib/functionClient';

const configuredAppUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL;

function getAppBaseUrl() {
  const currentOrigin = window.location.origin;
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

  if (!isLocalHost) {
    return currentOrigin;
  }

  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/$/, '');
  }

  return currentOrigin;
}

const features = [
  {
    icon: Building2,
    title: "Building Management",
    description: "Manage multiple buildings, floors, and units with ease"
  },
  {
    icon: CreditCard,
    title: "Mobile Money Payments",
    description: "Accept payments via MTN, Airtel Money, and bank transfers"
  },
  {
    icon: FileText,
    title: "Automated Receipts",
    description: "Generate and send receipts automatically after payment"
  },
  {
    icon: MessageSquare,
    title: "Tenant Communication",
    description: "Stay connected with tenants through in-app messaging"
  }
];

export function AuthPage() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [occupants, setOccupants] = useState('1');
  const [nextOfKin, setNextOfKin] = useState('');
  const [nextOfKinContact, setNextOfKinContact] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant'>('tenant');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const navigate = useNavigate();

  // Splash screen timer
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(splashTimer);
  }, []);

  // Auto-scroll features
  useEffect(() => {
    if (!showSplash) {
      const interval = setInterval(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [showSplash]);

  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const query = new URLSearchParams(window.location.search || '');
    const isRecoveryByHash = hash.includes('type=recovery');
    const isRecoveryByQuery = query.get('type') === 'recovery' && Boolean(query.get('token_hash') || query.get('code'));

    if ((isRecoveryByHash || isRecoveryByQuery) && !window.location.pathname.includes('/auth/reset-password')) {
      navigate(`/auth/reset-password${search}${hash}`);
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await requestFunction('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      const user = data.data.user;
      const session = data.data.session;
      const requiresPasswordChange = Boolean(
        user?.requiresPasswordChange ?? session?.user?.user_metadata?.requiresPasswordChange
      );

      toast.success(`Welcome back, ${user.full_name || user.name}!`);
      
      const effectiveRole =
        user.role === 'admin' || user.email === 'admin@rentify.com'
          ? 'admin'
          : user.role;
      const resolvedUserId =
        typeof user?.id === 'string' && user.id.trim() && user.id !== 'undefined' && user.id !== 'null'
          ? user.id
          : user.email;

      if (requiresPasswordChange) {
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userRole', effectiveRole);
        localStorage.setItem('userName', user.full_name || user.name);
        localStorage.setItem('accessToken', session.access_token);
        localStorage.setItem('userId', resolvedUserId);
        localStorage.setItem('requiresPasswordChange', 'true');

        setPendingUser({
          email: user.email,
          role: effectiveRole,
          name: user.full_name || user.name,
        });
        setRequiresPasswordChange(true);
        setIsLoading(false);
        console.log('[AuthPage] Password change required for user:', user.email, 'Role:', effectiveRole);
        toast.info('Please change your temporary password before continuing.');
        return;
      }

      console.log('[AuthPage] Login successful. Role:', effectiveRole, 'requiresPasswordChange:', requiresPasswordChange);

      // Store auth data
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userRole', effectiveRole);
      localStorage.setItem('userName', user.full_name || user.name);
      localStorage.setItem('accessToken', session.access_token);
      localStorage.setItem('userId', resolvedUserId);
      localStorage.setItem('requiresPasswordChange', 'false');

      // Redirect based on role
      if (effectiveRole === 'landlord') {
        navigate('/landlord');
      } else if (effectiveRole === 'tenant') {
        navigate('/tenant');
      } else if (effectiveRole === 'admin') {
        localStorage.setItem('adminName', user.full_name || user.name);
        navigate('/admin');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!newPassword || newPassword.length < 8) {
        toast.error('New password must be at least 8 characters long');
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        setIsLoading(false);
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('Session expired. Please log in again.');
        setRequiresPasswordChange(false);
        setPendingUser(null);
        setIsLoading(false);
        return;
      }

      const response = await requestFunction('/auth/change-password', {
        method: 'POST',
        headers: {
          'x-user-token': accessToken,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to change password');
        setIsLoading(false);
        return;
      }

      const effectiveRole = pendingUser?.role || 'tenant';

      localStorage.setItem('requiresPasswordChange', 'false');
      setRequiresPasswordChange(false);
      setPendingUser(null);
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Password updated successfully.');

      if (effectiveRole === 'landlord') {
        localStorage.setItem('justChangedTempPassword', 'true');
        localStorage.removeItem('landlordOnboardingComplete');
        navigate('/landlord');
      } else if (effectiveRole === 'tenant') {
        navigate('/tenant');
      } else {
        localStorage.setItem('adminName', localStorage.getItem('userName') || 'System Admin');
        navigate('/admin');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An error occurred while changing your password');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check for duplicates first
      const checkResponse = await requestFunction('/auth/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({ email, phone }),
      });

      const checkData = await checkResponse.json();

      if (checkData.data.emailExists) {
        toast.error('An account with this email already exists!');
        setIsLoading(false);
        return;
      }

      if (checkData.data.phoneExists) {
        toast.error('This phone number is already registered!');
        setIsLoading(false);
        return;
      }

      // Create tenant account
      const response = await requestFunction('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone,
          role: 'tenant',
          occupation: workplace,
          workplace,
          occupants: parseInt(occupants),
          nextOfKin,
          nextOfKinContact,
          buildingName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      toast.success('Account created successfully! Please sign in.');

      // Clear form and switch to login
      setIsSignup(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setWorkplace('');
      setOccupants('1');
      setNextOfKin('');
      setNextOfKinContact('');
      setBuildingName('');
      setIsLoading(false);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred during signup');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Enter your email first to reset your password.');
      return;
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publicAnonKey,
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email,
          redirect_to: `${getAppBaseUrl()}/auth/reset-password`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.msg || data?.message || 'Failed to send reset email.');
        return;
      }

      toast.success('Password reset email sent. Check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Failed to send reset email.');
    }
  };

  // Splash Screen
  if (showSplash) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-[#1e3a3f] flex flex-col items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Building2 className="w-24 h-24 text-white mx-auto mb-6" />
          <h1 className="text-6xl text-white mb-4">Rentify</h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-gray-300"
          >
            Modern Rent Management System
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8"
          >
            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ 
                    duration: 0.8, 
                    repeat: Infinity,
                    delay: i * 0.2 
                  }}
                  className="w-3 h-3 bg-white rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  const Feature = features[currentFeature];

  if (requiresPasswordChange && pendingUser) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-[#1e3a3f] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-3xl mb-2">Change Temporary Password</h2>
            <p className="text-gray-600">
              Welcome {pendingUser.name}. Please set a new password before continuing.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? 'Updating password...' : 'Update Password'}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-gray-600 hover:text-gray-900"
              onClick={() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userName');
                localStorage.removeItem('userId');
                localStorage.removeItem('requiresPasswordChange');
                setRequiresPasswordChange(false);
                setPendingUser(null);
                setPassword('');
              }}
            >
              Cancel and log out
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#1e3a3f] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Features showcase */}
        <div className="text-white space-y-8">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl mb-2">Rentify</h1>
            <p className="text-xl text-gray-300">Modern Rent Management System</p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentFeature}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 min-h-[280px]"
            >
              <Feature.icon className="w-16 h-16 mb-4 text-white" />
              <h3 className="text-2xl mb-3">{Feature.title}</h3>
              <p className="text-lg text-gray-300">{Feature.description}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2 justify-center">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentFeature(index)}
                aria-label={`Show feature ${index + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentFeature ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right side - Auth form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <div className="mb-8">
            <h2 className="text-3xl mb-2">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600">
              {isSignup ? 'Sign up as a tenant to get started' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-6">
            {isSignup && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Full Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+256 700 000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Occupation</label>
                  <Input
                    type="text"
                    placeholder="Software Engineer"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Number of Occupants</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={occupants}
                    onChange={(e) => setOccupants(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">How many people will be staying in the room?</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Next of Kin Name</label>
                  <Input
                    type="text"
                    placeholder="Jane Doe"
                    value={nextOfKin}
                    onChange={(e) => setNextOfKin(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Next of Kin Contact</label>
                  <Input
                    type="tel"
                    placeholder="+256 700 000001"
                    value={nextOfKinContact}
                    onChange={(e) => setNextOfKinContact(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Building Name</label>
                  <Input
                    type="text"
                    placeholder="e.g., Sunset Heights, Kampala Central"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">The name of the building you will be renting in</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? (isSignup ? 'Creating account...' : 'Signing in...') : (
                <>
                  {isSignup ? 'Sign Up' : 'Sign In'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>

            {!isSignup && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-sm text-[#1e3a3f] hover:underline"
              >
                Forgot password?
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setEmail('');
                setPassword('');
                setFullName('');
                setPhone('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <span className="text-[#1e3a3f] font-semibold">
                {isSignup ? 'Sign In' : 'Sign Up'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}