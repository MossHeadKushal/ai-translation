import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Activity, 
  Zap, 
  Menu, 
  X,
} from 'lucide-react';
import type { SystemHealth } from '../types';

interface NavbarProps {
  health: SystemHealth | null;
  isOnline: boolean;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  isOnline,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-500/20 bg-navy-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Mobile menu toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-blue-500/20"
            aria-label="Toggle navigation"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-primary to-cyan-400 p-[1.5px] shadow-glow-cyan group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#071841] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  AI TOOLBOX
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                  Self-Hosted
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Zero-Telemetry • 100% Anonymous
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Quick navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-navy-900/60 p-1 rounded-xl border border-blue-500/20">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location.pathname === '/'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Toolbox Hub
          </Link>
          <Link
            to="/tools/image-to-3d"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location.pathname.startsWith('/tools/image-to-3d')
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Image → 3D
          </Link>
          <Link
            to="/system"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              location.pathname === '/system'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            System Status
          </Link>
        </nav>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-3">
          {/* MOCK_AI indicator if active */}
          {health?.mockMode && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs text-amber-300 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>MOCK_AI Mode</span>
            </div>
          )}

          {/* Backend Live Indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border transition-all ${
              isOnline
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/50 text-rose-300 border-rose-500/30'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline">{isOnline ? 'Backend Online' : 'Backend Offline'}</span>
            <span className="sm:hidden">{isOnline ? 'Live' : 'Off'}</span>
          </div>

          <Link
            to="/system"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-blue-500/30 transition-all"
            title="System Diagnostics &amp; Workers"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
          </Link>
        </div>
      </div>
    </header>
  );
};
