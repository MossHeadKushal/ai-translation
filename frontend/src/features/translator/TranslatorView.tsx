import React, { useState } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { Dropzone } from '../../components/Dropzone';
import { JobProgressCard } from '../../components/JobProgressCard';
import type { TranslatorConfig } from '../../types';
import { api } from '../../services/api';
import { 
  Languages, 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Zap,
  FileText,
  Type
} from 'lucide-react';

const SAMPLE_PHRASES = [
  {
    label: '🇬🇧 English Greeting',
    src: 'en' as const,
    tgt: 'ne' as const,
    text: 'Hello and welcome to the self-hosted AI suite.',
  },
  {
    label: '🇬🇧 How are you?',
    src: 'en' as const,
    tgt: 'ne' as const,
    text: 'How are you? I hope you have a wonderful and productive day.',
  },
  {
    label: '🇳🇵 Nepali Greeting',
    src: 'ne' as const,
    tgt: 'en' as const,
    text: 'नमस्ते! तपाईंलाई कस्तो छ? हाम्रो स्व-होस्ट गरिएको एआई प्रणालीमा स्वागत छ।',
  },
  {
    label: '🚀 Privacy Assurance',
    src: 'en' as const,
    tgt: 'ne' as const,
    text: 'All artificial intelligence computations run strictly on our private server without external tracking.',
  },
];

export const TranslatorView: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('Welcome to the Anonymous Self-Hosted AI Toolbox. Everything runs locally on your machine.');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<TranslatorConfig>({
    sourceLanguage: 'en',
    targetLanguage: 'ne',
    formality: 'default',
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

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text') {
      if (!inputText.trim()) return;
      await startJob('translator', null, inputText, config);
    } else {
      if (!selectedFile) return;
      await startJob('translator', selectedFile, undefined, config);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setInputText('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSwapLanguages = () => {
    if (config.sourceLanguage === 'auto') return;
    const prevSrc = config.sourceLanguage;
    const prevTgt = config.targetLanguage;
    setConfig({
      ...config,
      sourceLanguage: prevTgt as any,
      targetLanguage: prevSrc as any,
    });
  };

  const translatedText = resultData?.translatedText || job?.result?.translatedText || '';

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadUrl = job?.jobId ? api.getDownloadUrl(job.jobId) : '';
  const outputFilename = job?.outputFilename || `translation_${config.targetLanguage}.txt`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-b border-blue-500/20 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 font-bold shadow-glow-cyan">
              <Languages className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Neural Offline Translator
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                English ⇄ Nepali Specialization • Subtitles &amp; Document File Translation API
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Translate confidential text, subtitles (.srt, .vtt), and documents (.txt, .md) between English, Nepali, Hindi, Spanish, and French locally with 100% privacy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-blue-200 border border-blue-500/30">
            Nepali ⇄ English NMT • SRT/VTT Aware
          </span>
        </div>
      </div>

      {/* Quick Sample Presets */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-slate-400">⚡ Quick Test Presets:</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PHRASES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setMode('text');
                setInputText(sample.text);
                setConfig((prev) => ({
                  ...prev,
                  sourceLanguage: sample.src,
                  targetLanguage: sample.tgt,
                }));
              }}
              className="px-3 py-1.5 rounded-xl bg-navy-900/80 hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-xs text-slate-200 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Switch & Language Switch Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Mode Selector */}
        <div className="flex items-center bg-navy-950/80 p-1 rounded-xl border border-blue-500/30">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === 'text'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Direct Text</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === 'file'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Document / Subtitles</span>
          </button>
        </div>

        {/* Source & Target Selector */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-mono">From:</label>
            <select
              value={config.sourceLanguage}
              onChange={(e) => setConfig({ ...config, sourceLanguage: e.target.value as any })}
              className="bg-navy-900/90 border border-blue-500/30 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="en">English (English)</option>
              <option value="ne">Nepali (नेपाली)</option>
              <option value="auto">Auto-Detect</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapLanguages}
            className="p-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-cyan-300 hover:text-white border border-cyan-500/40 transition-all shadow-glow-cyan shrink-0"
            title="Swap Languages"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-mono">To:</label>
            <select
              value={config.targetLanguage}
              onChange={(e) => setConfig({ ...config, targetLanguage: e.target.value as any })}
              className="bg-navy-900/90 border border-blue-500/30 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="ne">Nepali (नेपाली)</option>
              <option value="en">English (English)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="zh">Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Source Input Area */}
        <div className="space-y-6">
          <form onSubmit={handleTranslate} className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>
                  {mode === 'file' ? 'Upload Document File' : `Input Text (${config.sourceLanguage.toUpperCase()})`}
                </span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {mode === 'text' ? `${inputText.length} chars` : selectedFile ? `${selectedFile.name}` : 'No file selected'}
              </span>
            </div>

            {mode === 'file' ? (
              <div className="space-y-3">
                <Dropzone
                  acceptedFormats={['.txt', '.srt', '.vtt', '.md', '.json', '.csv']}
                  maxSizeMB={20}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  title="Drag subtitle or document file here"
                  subtitle="Supports SRT, VTT, TXT, MD, CSV (Max 20MB)"
                  disabled={isSubmitting || status === 'processing' || status === 'queued'}
                />
                {selectedFile && inputText && (
                  <div className="p-3 bg-navy-950/80 rounded-xl border border-blue-500/20 max-h-32 overflow-y-auto">
                    <p className="text-[11px] font-mono text-slate-400 mb-1">File Preview:</p>
                    <p className="text-xs font-mono text-slate-300 whitespace-pre-wrap line-clamp-4">
                      {inputText}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                rows={8}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  config.sourceLanguage === 'ne'
                    ? 'यहाँ नेपालीमा लेख्नुहोस् (उदा. नमस्ते, तपाईंलाई कस्तो छ?)...'
                    : 'Enter English text to translate (e.g., Welcome to the self-hosted AI toolbox)...'
                }
                disabled={isSubmitting || status === 'processing' || status === 'queued'}
                className="w-full bg-navy-950/90 border border-blue-500/30 rounded-2xl p-4 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
              />
            )}

            <button
              type="submit"
              disabled={
                (mode === 'text' && !inputText.trim()) ||
                (mode === 'file' && !selectedFile) ||
                isSubmitting ||
                status === 'processing' ||
                status === 'queued'
              }
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                (mode === 'text' && !inputText.trim()) ||
                (mode === 'file' && !selectedFile) ||
                isSubmitting ||
                status === 'processing' ||
                status === 'queued'
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 hover:opacity-95 text-slate-950 shadow-glow-cyan transform hover:-translate-y-0.5'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Translating File...'
                  : `Translate ${mode === 'file' ? 'File' : 'Text'} to ${config.targetLanguage.toUpperCase()}`}
              </span>
            </button>
          </form>

          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="translator"
            onCancel={cancelCurrentJob}
            onRetry={resetJob}
          />
        </div>

        {/* Translation Output Area */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Translation Result ({config.targetLanguage.toUpperCase()})</span>
              </h3>

              {status === 'completed' && translatedText && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={outputFilename}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-glow-cyan transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {outputFilename.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="min-h-[260px] max-h-[460px] overflow-y-auto bg-navy-950/80 border border-blue-500/20 rounded-2xl p-5 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {translatedText ? (
                translatedText
              ) : status === 'processing' || status === 'queued' ? (
                <div className="h-[230px] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-cyan-300 text-xs">Neural translation pipeline in progress...</p>
                </div>
              ) : (
                <div className="h-[230px] flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Languages className="w-10 h-10 opacity-30 text-cyan-400" />
                  <p className="text-xs text-slate-400">Enter text or upload a subtitle/document file to translate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
