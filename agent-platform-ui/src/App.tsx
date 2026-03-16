import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppShell from './components/layout/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardPage from './pages/DashboardPage';
import BuilderPage from './pages/BuilderPage';
import AgentsPage from './pages/AgentsPage';
import AgentDetailPage from './pages/AgentDetailPage';
import ExecutionsPage from './pages/ExecutionsPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import ToolsPage from './pages/ToolsPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="builder" element={<BuilderPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agents/:id" element={<AgentDetailPage />} />
              <Route path="executions" element={<ExecutionsPage />} />
              <Route path="executions/:id" element={<ExecutionDetailPage />} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#111318',
              color: '#e5e7eb',
              border: '1px solid #1E2130',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#F59E0B',
                secondary: '#111318',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#111318',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
