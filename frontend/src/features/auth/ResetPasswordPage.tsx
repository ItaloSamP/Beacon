import { useState, useMemo } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Lock, Check, ArrowLeft, Shield } from 'lucide-react';
import { api } from '../../lib/api';
import type { ApiResponse } from '../../types/api';

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthColors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword === '' || password === confirmPassword;

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Both fields are required');
      return;
    }

    if (passwordStrength < 3) {
      setError('Password must meet all requirements (min 8 chars, 1 uppercase, 1 number, 1 special character)');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', {
        token,
        password,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[420px] p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Beacon</h1>
        </div>

        {!isSuccess ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset your password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Create a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Input
                  label="New password"
                  type="password"
                  name="password"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Confirm new password"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                icon={<Lock size={18} />}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={!passwordsMatch ? 'Passwords do not match' : undefined}
                required
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  Your password must be at least 8 characters long and include at least one uppercase letter,
                  one number, and one special character.
                </p>
              </div>

              <Button type="submit" className="w-full" loading={isLoading} size="lg">
                Reset password
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check size={28} className="text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Password reset successful</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link to="/login">
                <Button className="w-full" size="lg">
                  Sign in to your account
                </Button>
              </Link>
            </div>
          </>
        )}

        {!isSuccess && (
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
