import React from 'react';
import type { SystemHealth } from '../types';
import { 
  Server, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Layers, 
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { TOOLS } from '../utils/toolsData';

interface SystemPageProps {
  health: SystemHealth | null;
  isOnline: boolean;
  onRefresh: () => void;
}

export const SystemPage: React.FC<SystemPageProps> = ({ health, isOnline, onRefresh }) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-blue-500/20 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 font-bold shadow-glow-cyan">
              <Activity className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                System Health &amp; Model Orchestration
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                Go Backend Runtime • Subprocess Concurrency • Storage Diagnostics
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Real-time status of local worker threads, disk retention, rate limits, and model engines without cloud dependencies.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 border border-blue-500/30 text-xs font-semibold flex items-center gap-2 transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Backend Status */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Server Status</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-lg font-bold text-white">
              {isOnline ? 'Active & Healthy' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Go Engine v{health?.version || '1.0.0'}
          </p>
        </div>

        {/* Mock AI Mode Status */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Execution Mode</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${health?.mockMode ? 'text-amber-300' : 'text-emerald-400'}`}>
              {health?.mockMode ? 'MOCK_AI Active' : 'Native Model Engine'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {health?.mockMode ? 'Zero GPU simulated mode' : 'Local hardware execution'}
          </p>
        </div>

        {/* Worker Concurrency Slots */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Worker Pool</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">
            {health?.activeJobs ?? 0} / {health?.maxConcurrentJobs ?? 2} <span className="text-xs text-slate-400 font-normal">Active Slots</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Prevents hardware overload
          </p>
        </div>

        {/* Retention Policy */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Job Storage Auto-Purge</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">
            {health?.retentionHours ?? 24} Hours
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Automatic ephemeral disk cleanup
          </p>
        </div>
      </div>

      {/* Model & Worker Pipelines Status Table */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>AI Tool Worker Subsystems</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Architecture supports dynamic plug-and-play local AI backends
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-blue-500/20 text-slate-400 pb-2">
                <th className="py-3 px-3">TOOL</th>
                <th className="py-3 px-3">LOCAL ENGINE</th>
                <th className="py-3 px-3">FALLBACK / MOCK</th>
                <th className="py-3 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {TOOLS.map((tool) => {
                const toolHealth = health?.tools?.[tool.id];
                return (
                  <tr key={tool.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">
                      {tool.name}
                    </td>
                    <td className="py-3 px-3 text-cyan-300">
                      {toolHealth?.engine || (
                        tool.id === 'image-to-3d' ? 'Local 3D Mesh Generator / GLB' :
                        tool.id === 'audio-to-text' ? 'FFmpeg + Whisper Speech' :
                        tool.id === 'video-to-text' ? 'FFmpeg Demux + Whisper' :
                        tool.id === 'image-to-text' ? 'Tesseract / Vision OCR' :
                        tool.id === 'summarizer' ? 'Local LLM / Ollama Worker' :
                        tool.id === 'translator' ? 'Neural Machine Translation' :
                        'Acoustic Waveform Synthesizer'
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      Simulated Multi-Stage Progress
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Ready</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Environment Config Cheatsheet */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Local Environment Configuration Reference (.env)</span>
        </h2>
        <div className="bg-navy-950/90 border border-blue-500/30 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
          <p className="text-slate-500"># Go Backend Server Environment</p>
          <p><span className="text-cyan-400">PORT</span>=8080</p>
          <p><span className="text-cyan-400">MOCK_AI</span>=true <span className="text-slate-500"># Set to false to invoke installed local models</span></p>
          <p><span className="text-cyan-400">STORAGE_PATH</span>=./storage</p>
          <p><span className="text-cyan-400">DATABASE_PATH</span>=./data/app.db</p>
          <p><span className="text-cyan-400">MAX_FILE_SIZE_MB</span>=50</p>
          <p><span className="text-cyan-400">MAX_CONCURRENT_JOBS</span>=2</p>
          <p><span className="text-cyan-400">JOB_RETENTION_HOURS</span>=24</p>
        </div>
      </div>
    </div>
  );
};
