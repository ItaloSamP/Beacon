import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title?: string;
  actions?: ReactNode;
  onMenuToggle?: () => void;
}

export function Header({ title = 'Beacon', actions, onMenuToggle }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden text-gray-600 hover:text-gray-900 p-1 rounded"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          type="button"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}
