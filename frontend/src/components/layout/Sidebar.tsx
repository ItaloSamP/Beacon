import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Database,
  GitBranch,
  AlertTriangle,
  Bell,
  LayoutDashboard,
  Server,
  User,
  Menu,
  X,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  user?: { name: string } | null;
  anomalyCount?: number;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Server },
  { to: '/datasources', label: 'DataSources', icon: Database },
  { to: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: '/alerts', label: 'Alerts', icon: Bell },
];

export function Sidebar({ user, anomalyCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-gray-900 text-white flex flex-col h-screen transition-all ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand + Mobile Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-blue-400 shrink-0" />
          {!collapsed && <span className="text-xl font-bold">Beacon</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="lg:hidden text-gray-400 hover:text-white p-1 rounded"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {item.label === 'Anomalies' && anomalyCount > 0 && (
              collapsed ? (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {anomalyCount > 99 ? '99+' : anomalyCount}
                </span>
              ) : (
                <span className="ml-auto bg-red-500 text-white text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {anomalyCount}
                </span>
              )
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <User size={20} className="text-gray-400 shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || 'User'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
