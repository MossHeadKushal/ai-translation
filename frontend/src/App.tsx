import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSystemHealth } from './hooks/useSystemHealth';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { OfflineBanner } from './components/OfflineBanner';
import { DashboardPage } from './pages/DashboardPage';
import { ToolPage } from './pages/ToolPage';
import { SystemPage } from './pages/SystemPage';

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { health, isOnline, refetch } = useSystemHealth(10000);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#030917] bg-grid-pattern text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navbar
          health={health}
          isOnline={isOnline}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />

        <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 gap-6">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <main className="flex-1 min-w-0 py-6 flex flex-col">
            {!isOnline && <OfflineBanner onRetry={refetch} />}

            <div className="flex-1">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tools/:toolId" element={<ToolPage />} />
                <Route path="/system" element={<SystemPage health={health} isOnline={isOnline} onRefresh={refetch} />} />
                <Route path="*" element={<DashboardPage />} />
              </Routes>
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
