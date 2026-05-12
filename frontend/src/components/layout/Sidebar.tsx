import { NavLink } from 'react-router-dom';
import { Database, GitBranch, AlertTriangle, Bell, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/datasources', label: 'DataSources', icon: Database },
  { to: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: '/alerts', label: 'Alerts', icon: Bell },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-4 text-xl font-bold border-b border-gray-700">DHM</div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
