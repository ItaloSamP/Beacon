import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { Shell } from './components/layout/Shell';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DataSourcesListPage } from './features/datasources/DataSourcesListPage';
import { DataSourceForm } from './features/datasources/DataSourceForm';
import { AgentsListPage } from './features/agents/AgentsListPage';
import { AgentForm } from './features/agents/AgentForm';
import { PipelinesPlaceholder } from './features/pipelines/PipelinesPlaceholder';
import { PipelineRunsPage } from './features/pipelines/PipelineRunsPage';
import { AnomaliesListPage } from './features/anomalies/AnomaliesListPage';
import { AnomalyDetailPage } from './features/anomalies/AnomalyDetailPage';
import { AlertsPlaceholder } from './features/alerts/AlertsPlaceholder';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<Shell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/agents" element={<AgentsListPage />} />
              <Route path="/agents/new" element={<AgentForm />} />
              <Route path="/agents/:id/edit" element={<AgentForm />} />
              <Route path="/datasources" element={<DataSourcesListPage />} />
              <Route path="/datasources/new" element={<DataSourceForm />} />
              <Route path="/datasources/:id/edit" element={<DataSourceForm />} />
              <Route path="/pipelines" element={<PipelinesPlaceholder />} />
              <Route path="/pipelines/:pipelineId/runs" element={<PipelineRunsPage />} />
              <Route path="/anomalies" element={<AnomaliesListPage />} />
              <Route path="/anomalies/:id" element={<AnomalyDetailPage />} />
              <Route path="/alerts" element={<AlertsPlaceholder />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
