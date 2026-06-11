import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      {/* Step label */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-500 shadow-sm">
          Step {isSent ? '2' : '1'}
          {isSent ? ' — Email Sent' : ' — Request Reset'}
        </span>
      </div>

      <Card className="w-full max-w-[420px] p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Beacon</h1>
        </div>

        {!isSent ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Forgot your password?</h2>
            <p className="text-sm text-gray-500 mb-6">
              No worries. Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email address"
                type="email"
                name="email"
                placeholder="jane@acmecorp.com"
                autoComplete="email"
                icon={<Mail size={18} />}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isLoading} size="lg">
                Send reset link
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check size={24} className="text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your email</h2>
            <p className="text-sm text-gray-500 mb-4">
              If an account exists for{' '}
              <span className="font-medium text-gray-700">{email}</span>
              , you&apos;ll receive a password reset link shortly.
            </p>
            <p className="text-xs text-gray-400">
              Didn&apos;t receive it?{' '}
              <button
                type="button"
                onClick={() => { setError(''); setIsSent(false); }}
                className="text-primary hover:underline font-medium"
              >
                Resend email
              </button>
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
