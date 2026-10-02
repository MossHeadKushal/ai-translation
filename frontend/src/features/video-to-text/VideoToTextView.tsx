import React, { useState } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { Dropzone } from '../../components/Dropzone';
import { JobProgressCard } from '../../components/JobProgressCard';
import type { VideoToTextConfig } from '../../types';
import { api } from '../../services/api';
import { 
  Video, 
  Download, 
  Copy, 
  Check, 
  Settings2, 
  FileText, 
  Clapperboard, 
  Sparkles 
} from 'lucide-react';

export const VideoToTextView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<VideoToTextConfig>({
    language: 'auto',
    outputFormat: 'srt',
    timestamps: true,
  });

  const {
    job,
    status,
    progress,
    stage,
    error,
    isSubmitting,
    startJob,
    cancelCurrentJob,
    resetJob,
    resultData,
  } = useJobRunner();

  const handleTranscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await startJob('video-to-text', selectedFile, undefined, config);
  };

  const transcriptText = resultData?.transcript || job?.result?.transcript || '';

  const handleCopy = () => {
    if (!transcriptText) return;
    navigator.clipboard.writeText(transcriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadUrl = job?.jobId ? api.getDownloadUrl(job.jobId) : '';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-b border-blue-500/20 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 font-bold shadow-glow-cyan">
              <Video className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Video to Text &amp; Subtitles
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                FFmpeg Stream Extraction • Synchronized Subtitle Generation
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Extract audio streams from MP4, MOV, MKV, or WEBM containers and automatically synthesize SRT/VTT closed-captions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-blue-200 border border-blue-500/30">
            FFmpeg + Whisper
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleTranscribe} className="glass-panel p-6 rounded-3xl space-y-6">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>1. Upload Video Clip</span>
            </h2>

            <Dropzone
              acceptedFormats={['.mp4', '.mov', '.mkv', '.webm', '.avi']}
              maxSizeMB={100}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              title="Drag video file here"
              subtitle="Supports MP4, MOV, MKV, WEBM (Max 100MB)"
              disabled={isSubmitting || status === 'processing' || status === 'queued'}
            />

            <div className="pt-4 border-t border-blue-500/20 space-y-4">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>2. Extraction &amp; Subtitle Options</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Subtitle Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['srt', 'vtt', 'txt'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setConfig({ ...config, outputFormat: fmt })}
                      className={`py-2 px-3 rounded-xl text-xs font-mono uppercase font-bold border transition-all ${
                        config.outputFormat === fmt
                          ? 'bg-blue-600 text-white border-cyan-400 shadow-glow-blue'
                          : 'bg-navy-900/60 text-slate-400 border-white/5 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Language Spoken
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full bg-navy-900/80 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
                >
                  <option value="auto">Auto-Detect Language</option>
                  <option value="en">English</option>
                  <option value="ne">Nepali (नेपाली)</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || isSubmitting || status === 'processing' || status === 'queued'}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                !selectedFile || isSubmitting || status === 'processing' || status === 'queued'
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 hover:opacity-95 text-slate-950 shadow-glow-cyan transform hover:-translate-y-0.5'
              }`}
            >
              <Clapperboard className="w-4 h-4" />
              <span>{isSubmitting ? 'Extracting & Transcribing...' : 'Process Video Subtitles'}</span>
            </button>
          </form>

          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="video-to-text"
            onCancel={cancelCurrentJob}
            onRetry={resetJob}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Subtitles &amp; Timestamps
                </h3>
              </div>
              {status === 'completed' && transcriptText && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <a
                    href={downloadUrl}
                    download
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-glow-cyan transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {config.outputFormat.toUpperCase()}</span>
                  </a>
                </div>
              )}
            </div>

            <div className="min-h-[380px] max-h-[500px] overflow-y-auto bg-navy-950/80 border border-blue-500/20 rounded-2xl p-5 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
              {transcriptText ? (
                transcriptText
              ) : status === 'processing' || status === 'queued' ? (
                <div className="h-[340px] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-cyan-300">Extracting audio stream with FFmpeg &amp; running Whisper...</p>
                </div>
              ) : (
                <div className="h-[340px] flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Video className="w-10 h-10 opacity-30 text-cyan-400" />
                  <p>Upload a video to extract synchronized subtitles and dialogue transcripts.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
