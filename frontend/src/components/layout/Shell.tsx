import { useState, useMemo } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageHeaderContext, type PageHeaderData } from './PageHeaderContext';

export function Shell() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [header, setHeader] = useState<PageHeaderData>({ title: 'Beacon' });

  const ctxValue = useMemo(() => ({ header, setHeader }), [header]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PageHeaderContext.Provider value={ctxValue}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={header.title} actions={header.actions} />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </PageHeaderContext.Provider>
  );
}
