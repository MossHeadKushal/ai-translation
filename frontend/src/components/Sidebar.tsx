import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Box, 
  Mic, 
  Video, 
  FileText, 
  Sparkles, 
  Languages, 
  Volume2, 
  LayoutGrid, 
  Activity, 
  Shield, 
  ChevronRight
} from 'lucide-react';
import { TOOLS } from '../utils/toolsData';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Box': return Box;
      case 'Mic': return Mic;
      case 'Video': return Video;
      case 'FileText': return FileText;
      case 'Sparkles': return Sparkles;
      case 'Languages': return Languages;
      case 'Volume2': return Volume2;
      default: return Box;
    }
  };

  const categories = Array.from(new Set(TOOLS.map((t) => t.category)));

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {/* Main Dashboard Link */}
        <div>
          <NavLink
            to="/"
            onClick={isMobile ? onClose : undefined}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-glow-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4" />
            <span>All AI Tools</span>
          </NavLink>
        </div>

        {/* Categorized Tools */}
        {categories.map((category) => {
          const categoryTools = TOOLS.filter((t) => t.category === category);
          return (
            <div key={category} className="space-y-1">
              <p className="px-3 text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                {category}
              </p>
              {categoryTools.map((tool) => {
                const Icon = getToolIcon(tool.iconName);
                return (
                  <NavLink
                    key={tool.id}
                    to={`/tools/${tool.id}`}
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{tool.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                  </NavLink>
                );
              })}
            </div>
          );
        })}

        {/* System & Architecture */}
        <div className="space-y-1 pt-2 border-t border-white/5">
          <p className="px-3 text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
            Diagnostics
          </p>
          <NavLink
            to="/system"
            onClick={isMobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/30 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`
            }
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>System &amp; Model Status</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom Guarantee Banner */}
      <div className="p-4 border-t border-blue-500/20 bg-navy-900/40">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-[11px] text-emerald-300">100% Anonymous</p>
            <p className="text-[10px] text-slate-400">No logs, accounts or cloud fees</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#050f24] border-r border-blue-500/30 flex flex-col justify-between transition-transform duration-300 md:hidden shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Navigation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/5"
          >
            ✕
          </button>
        </div>
        {renderSidebarContent(true)}
      </aside>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 sticky top-20 h-[calc(100vh-6.5rem)] glass-panel rounded-2xl overflow-hidden justify-between border border-blue-500/20 shadow-xl my-6">
        {renderSidebarContent(false)}
      </aside>
    </>
  );
};
