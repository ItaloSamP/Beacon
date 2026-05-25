import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Shell } from './components/layout/Shell';
import { Spinner } from './components/ui/Spinner';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { DataSourcesListPage } from './features/datasources/DataSourcesListPage';
import { DataSourceDetailPage } from './features/datasources/DataSourceDetailPage';
import { DataSourceForm } from './features/datasources/DataSourceForm';
import { AgentsListPage } from './features/agents/AgentsListPage';
import { AgentForm } from './features/agents/AgentForm';
import { PipelinesListPage } from './features/pipelines/PipelinesListPage';
import { PipelineForm } from './features/pipelines/PipelineForm';
import { PipelineRunsPage } from './features/pipelines/PipelineRunsPage';
import { AnomaliesListPage } from './features/anomalies/AnomaliesListPage';
import { AnomalyDetailPage } from './features/anomalies/AnomalyDetailPage';
import { AlertsListPage } from './features/alerts/AlertsListPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30000,
    },
  },
});

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<Shell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/agents" element={<AgentsListPage />} />
              <Route path="/agents/new" element={<AgentForm />} />
              <Route path="/agents/:id/edit" element={<AgentForm />} />
              <Route path="/datasources" element={<DataSourcesListPage />} />
              <Route path="/datasources/new" element={<DataSourceForm />} />
              <Route path="/datasources/:id/edit" element={<DataSourceForm />} />
              <Route path="/datasources/:id" element={<DataSourceDetailPage />} />
              <Route path="/pipelines" element={<PipelinesListPage />} />
              <Route path="/pipelines/new" element={<PipelineForm />} />
              <Route path="/pipelines/:id/edit" element={<PipelineForm />} />
              <Route path="/pipelines/:pipelineId/runs" element={<PipelineRunsPage />} />
              <Route path="/anomalies" element={<AnomaliesListPage />} />
              <Route path="/anomalies/:id" element={<AnomalyDetailPage />} />
              <Route path="/alerts" element={<AlertsListPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
