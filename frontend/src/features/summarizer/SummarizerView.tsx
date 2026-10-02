import React, { useState } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { JobProgressCard } from '../../components/JobProgressCard';
import type { SummarizerConfig } from '../../types';
import { api } from '../../services/api';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Settings2, 
  FileText, 
  AlignLeft, 
  ListOrdered, 
  BookOpen,
  FileCheck
} from 'lucide-react';

const SAMPLE_ARTICLES = [
  {
    title: 'Self-Hosted AI Architecture',
    text: `The Anonymous Self-Hosted AI Toolbox represents a breakthrough in private artificial intelligence deployment. Unlike conventional cloud-based services that transmit confidential audio, imagery, and text documents across third-party remote datacenters, this suite operates entirely on local hardware infrastructure.

Key architectural highlights include a high-concurrency Go orchestration engine featuring Semaphore-governed worker pools, streaming Server-Sent Events (SSE), and a 24-hour ephemeral file purging system. The frontend leverages React 18, Vite, Three.js WebGL 2.0 visualization, and modern glassmorphic responsive interface components. Complete zero-telemetry guarantees ensure compliance with strict privacy requirements.`,
  },
  {
    title: 'Speech & Neural Translation Pipeline',
    text: `Natural language processing and speech recognition technologies have evolved towards edge computing paradigms. Using acoustic transformer architectures such as OpenAI Whisper and local sequence-to-sequence translation models, users can transcribe audio memos and translate between English and Nepali without external network latency or token pricing constraints.

This approach provides immediate productivity benefits for medical, legal, and confidential enterprise workflows where data confidentiality is legally mandated.`,
  },
];

export const SummarizerView: React.FC = () => {
  const [inputText, setInputText] = useState(SAMPLE_ARTICLES[0].text);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<SummarizerConfig>({
    length: 'medium',
    format: 'bullet_points',
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

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await startJob('summarizer', null, inputText, config);
  };

  const summaryText = resultData?.summary || job?.result?.summary || '';

  const handleCopy = () => {
    if (!summaryText) return;
    navigator.clipboard.writeText(summaryText);
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
              <Sparkles className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Smart Document Summarizer
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                Local LLM Worker • Executive Summaries &amp; Key Takeaways
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Condense articles, whitepapers, transcripts, and long text documents with configurable depth and format.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-blue-200 border border-blue-500/30">
            Local LLM / Ollama Worker
          </span>
        </div>
      </div>

      {/* Quick Sample Presets */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-slate-400">⚡ Quick Test Articles:</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_ARTICLES.map((article, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(article.text)}
              className="px-3 py-1.5 rounded-xl bg-navy-900/80 hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{article.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Text & Settings */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSummarize} className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>1. Source Text</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {inputText.length} characters ({inputText.split(/\s+/).filter(Boolean).length} words)
              </span>
            </div>

            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste article, technical document, report, or meeting notes here..."
              disabled={isSubmitting || status === 'processing' || status === 'queued'}
              className="w-full bg-navy-950/90 border border-blue-500/30 rounded-2xl p-4 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
            />

            <div className="pt-2 border-t border-blue-500/20 space-y-4">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>2. Summarization Profile</span>
              </h3>

              {/* Length */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Summary Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['short', 'medium', 'detailed'] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setConfig({ ...config, length: len })}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        config.length === len
                          ? 'bg-blue-600 text-white border-cyan-400 shadow-glow-blue'
                          : 'bg-navy-900/60 text-slate-400 border-white/5 hover:text-white'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Output Structure
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bullet_points', label: 'Key Bullets', icon: ListOrdered },
                    { id: 'paragraph', label: 'Paragraph', icon: AlignLeft },
                    { id: 'executive', label: 'Executive', icon: BookOpen },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setConfig({ ...config, format: item.id as any })}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          config.format === item.id
                            ? 'bg-blue-600 text-white border-cyan-400 shadow-glow-blue'
                            : 'bg-navy-900/60 text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting || status === 'processing' || status === 'queued'}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                !inputText.trim() || isSubmitting || status === 'processing' || status === 'queued'
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 hover:opacity-95 text-slate-950 shadow-glow-cyan transform hover:-translate-y-0.5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Generating Summary...' : 'Synthesize Summary'}</span>
            </button>
          </form>

          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="summarizer"
            onCancel={cancelCurrentJob}
            onRetry={resetJob}
          />
        </div>

        {/* Right Column: Summarized Output */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Summarized Results</span>
              </h3>

              {status === 'completed' && summaryText && (
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
                    <span>Download TXT</span>
                  </a>
                </div>
              )}
            </div>

            <div className="min-h-[290px] max-h-[460px] overflow-y-auto bg-navy-950/80 border border-blue-500/20 rounded-2xl p-5 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {summaryText ? (
                summaryText
              ) : status === 'processing' || status === 'queued' ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-cyan-300 text-xs">Distilling semantic essence...</p>
                </div>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Sparkles className="w-10 h-10 opacity-30 text-cyan-400" />
                  <p className="text-xs text-slate-400">Summary will appear here after generation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
