import React from 'react';
import { AlertOctagon, RefreshCw, Terminal } from 'lucide-react';

interface OfflineBannerProps {
  onRetry: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry }) => {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-100">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex-shrink-0">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-200 uppercase tracking-wide">
            Processing service unavailable
          </h3>
          <p className="text-xs text-rose-300/90 mt-0.5">
            The toolbox backend cannot currently be reached. Please try again later or ensure the Go server is started.
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 w-fit">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Start backend: <code className="text-cyan-300">cd backend &amp;&amp; go run ./cmd/server</code></span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center gap-2 flex-shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Reconnect</span>
      </button>
    </div>
  );
};
