import React, { useState, useEffect } from 'react';
import type { JobStatus, ToolId } from '../types';
import { Loader2, CheckCircle2, XCircle, StopCircle, Clock, Cpu } from 'lucide-react';

interface JobProgressCardProps {
  status: JobStatus | 'idle' | 'uploading';
  progress: number;
  stage?: string;
  errorMessage?: string | null;
  toolId: ToolId;
  onCancel?: () => void;
  onRetry?: () => void;
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({
  status,
  progress,
  stage,
  errorMessage,
  onCancel,
  onRetry,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: any = null;
    if (status === 'uploading' || status === 'queued' || status === 'processing') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  if (status === 'idle') return null;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins > 0 ? `${mins}m ` : ''}${remainingSecs}s`;
  };

  const isWorking = status === 'uploading' || status === 'queued' || status === 'processing';
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  return (
    <div className="w-full bg-navy-900/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 shadow-2xl transition-all">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {isWorking && (
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <div className="absolute w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
          )}
          {isComplete && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          {isFailed && <XCircle className="w-6 h-6 text-rose-500" />}
          {isCancelled && <StopCircle className="w-6 h-6 text-amber-400" />}

          <div>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>
                {status === 'uploading' && 'Uploading Payload'}
                {status === 'queued' && 'Queued for Inference'}
                {status === 'processing' && 'Processing with Local AI'}
                {status === 'completed' && 'Processing Complete'}
                {status === 'failed' && 'Job Execution Failed'}
                {status === 'cancelled' && 'Job Cancelled'}
              </span>
              {isWorking && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                  {progress}%
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {stage || (status === 'queued' ? 'Waiting for available compute worker...' : 'Processing...')}
            </p>
          </div>
        </div>

        {/* Timer & Meta */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1 bg-navy-950/70 px-2.5 py-1 rounded-lg border border-white/5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-navy-950/70 px-2.5 py-1 rounded-lg border border-white/5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300">Self-Hosted</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isWorking && (
        <div className="w-full bg-navy-950/80 rounded-full h-2.5 p-0.5 overflow-hidden border border-blue-500/20 mb-3">
          <div
            className="bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-200 h-full rounded-full transition-all duration-500 shadow-glow-cyan"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>
      )}

      {/* Error Banner */}
      {isFailed && (
        <div className="mt-3 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold mb-0.5">Error details:</p>
            <p className="font-mono text-slate-300">{errorMessage || 'An internal worker error occurred.'}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-xs transition-colors flex-shrink-0"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Cancel button during active work */}
      {isWorking && onCancel && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-500/30 transition-all flex items-center gap-1.5"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Cancel Job</span>
          </button>
        </div>
      )}
    </div>
  );
};
