import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

function getRecoveryToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get('access_token');
}

function getRecoveryTokenHash() {
  const queryParams = new URLSearchParams(window.location.search);
  return queryParams.get('token_hash');
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const hashRecoveryToken = useMemo(() => getRecoveryToken(), []);
  const queryTokenHash = useMemo(() => getRecoveryTokenHash(), []);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(hashRecoveryToken);
  const [isValidatingLink, setIsValidatingLink] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hashRecoveryToken || !queryTokenHash) return;

    const verifyTokenHash = async () => {
      try {
        setIsValidatingLink(true);
        const response = await fetch(`https://${projectId}.supabase.co/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            token_hash: queryTokenHash,
            type: 'recovery',
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(data?.msg || data?.message || 'Invalid or expired reset link.');
          return;
        }

        const accessToken = data?.access_token || data?.session?.access_token || null;
        if (!accessToken) {
          toast.error('Unable to validate reset link. Request a new one.');
          return;
        }

        setRecoveryToken(accessToken);
      } catch (error) {
        console.error('Reset link verification error:', error);
        toast.error('Failed to verify reset link. Please try again.');
      } finally {
        setIsValidatingLink(false);
      }
    };

    verifyTokenHash();
  }, [hashRecoveryToken, queryTokenHash]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!recoveryToken) {
      toast.error('Invalid or expired reset link. Please request a new one.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`https://${projectId}.supabase.co/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: publicAnonKey,
          Authorization: `Bearer ${recoveryToken}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.msg || data?.message || 'Failed to reset password.');
        return;
      }

      toast.success('Password updated successfully. Please sign in.');
      navigate('/');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e3a3f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-3xl mb-2">Reset Password</h2>
          <p className="text-gray-600">Set a new password for your account.</p>
        </div>

        {isValidatingLink ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Verifying reset link...</p>
          </div>
        ) : !recoveryToken ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">
              This reset link is invalid or expired. Request a new password reset email.
            </p>
            <Button className="w-full" onClick={() => navigate('/')}>
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Updating password...' : 'Update Password'}
            </Button>

            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
