import React from 'react';
import { ShieldCheck, Cpu, HardDrive, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-blue-500/20 bg-navy-950/80 backdrop-blur-xl mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-white/5 text-xs text-slate-400">
          <div>
            <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Zero-Retention Architecture</span>
            </div>
            <p className="leading-relaxed">
              Jobs are automatically purged after 24 hours. Temporary files are isolated in ephemeral directories. No tracking cookies or accounts.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Local Open-Source Inference</span>
            </div>
            <p className="leading-relaxed">
              Orchestrated by high-performance Go backend with open-source worker pipelines. Zero dependencies on paid third-party cloud AI APIs.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>Edge &amp; Self-Hosted Ready</span>
            </div>
            <p className="leading-relaxed">
              Deployable on bare-metal servers, local workstations, or homelab GPU rigs with configurable worker slots and rate limits.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Safety &amp; Sandboxing</span>
            </div>
            <p className="leading-relaxed">
              Safe subprocess argument parsing, strict MIME validation, path traversal defense, and automatic process timeout guarantees.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Anonymous Self-Hosted AI Toolbox Suite. Open Source.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Powered by <span className="text-cyan-400 font-semibold">Go</span> + <span className="text-blue-400 font-semibold">React &amp; Three.js</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
