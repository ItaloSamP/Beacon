import { useAuth } from '../../hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div><h2 className="text-lg font-semibold text-gray-800">Data Health Monitor</h2></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User size={16} />
          <span>{user?.name || 'User'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut size={16} className="mr-2" /> Logout
        </Button>
      </div>
    </header>
  );
}
