import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, Menu } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title?: string;
  actions?: ReactNode;
  onMenuToggle?: () => void;
}

export function Header({ title = 'Beacon', actions, onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden text-gray-600 hover:text-gray-900 p-1 rounded"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          type="button"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

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
