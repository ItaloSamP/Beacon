import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Mail, Lock, User, Building2 } from 'lucide-react';

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabels = ['Too weak', 'Weak', 'Medium', 'Strong'] as const;
const strengthColors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword === '' || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email || !password || !confirmPassword) {
      setError('All required fields must be filled');
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

    if (!acceptedTerms) {
      setError('You must accept the Terms of Service');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name.trim());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[420px] p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Beacon</h1>
          <p className="text-sm text-gray-500 mt-2">Start monitoring your data quality in under 5 minutes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Full name"
            type="text"
            name="name"
            placeholder="John Doe"
            autoComplete="name"
            icon={<User size={18} />}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <Input
            label="Company"
            type="text"
            name="company"
            placeholder="Acme Inc. (optional)"
            autoComplete="organization"
            icon={<Building2 size={18} />}
            value={company}
            onChange={e => setCompany(e.target.value)}
          />

          <Input
            label="Work email"
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            icon={<Mail size={18} />}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            icon={<Lock size={18} />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {password.length > 0 && (
            <div className="space-y-1">
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
              <p className={`text-xs font-medium ${
                passwordStrength <= 1 ? 'text-red-500' :
                passwordStrength === 2 ? 'text-orange-400' :
                passwordStrength === 3 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                ● Password strength: {strengthLabels[passwordStrength]}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                <Requirement met={password.length >= 8} label="8+ characters" />
                <Requirement met={/[A-Z]/.test(password)} label="1 uppercase letter" />
                <Requirement met={/[0-9]/.test(password)} label="1 number" />
                <Requirement met={/[^A-Za-z0-9]/.test(password)} label="1 special character" />
              </div>
            </div>
          )}

          <Input
            label="Confirm password"
            type="password"
            name="confirmPassword"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            icon={<Lock size={18} />}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            error={!passwordsMatch ? 'Passwords do not match' : undefined}
            required
          />

          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>
              I agree to the{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </span>
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={isLoading} size="lg">
            Create Account
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">or</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 cursor-not-allowed select-none">
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google SSO coming soon
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <p className={`text-xs flex items-center gap-1 ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[10px] font-bold ${
        met ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {met ? '\u2713' : '\u2013'}
      </span>
      {label}
    </p>
  );
}
