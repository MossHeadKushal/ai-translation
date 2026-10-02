import React, { useState } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { Dropzone } from '../../components/Dropzone';
import { JobProgressCard } from '../../components/JobProgressCard';
import type { OCRConfig } from '../../types';
import { api } from '../../services/api';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Settings2, 
  Sparkles, 
  Scan, 
  Layout, 
  Contrast,
  FileCheck
} from 'lucide-react';

export const OCRView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<OCRConfig>({
    language: 'auto',
    preserveLayout: true,
    enhanceContrast: true,
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

  // Load sample scanned document
  const handleLoadSampleDocument = (lang: 'en' | 'ne') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 400);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(lang === 'ne' ? 'अनुसन्धान तथा विकास प्रतिवेदन २०२६' : 'AI TOOLBOX ARCHITECTURE REPORT', 40, 50);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#334155';
    if (lang === 'ne') {
      ctx.fillText('१. परिचय: स्थानीय हार्डवेयरमा आधारित एआई टुलबक्स।', 40, 90);
      ctx.fillText('२. गोपनीयता: १००% सुरक्षित र शून्य क्लाउड शुल्क।', 40, 120);
      ctx.fillText('३. निष्कर्ष: सबै परीक्षणहरू सम्पन्न भए।', 40, 150);
    } else {
      ctx.fillText('1. Overview: Autonomous offline AI processing suite.', 40, 90);
      ctx.fillText('2. Security: 100% anonymous execution with zero telemetry.', 40, 120);
      ctx.fillText('3. Retention: 24h automatic data purging cycle.', 40, 150);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample_${lang}_document.png`, { type: 'image/png' });
        setSelectedFile(file);
        setConfig((prev) => ({ ...prev, language: lang }));
      }
    }, 'image/png');
  };

  const handleRunOCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await startJob('image-to-text', selectedFile, undefined, config);
  };

  const extractedText = resultData?.text || job?.result?.text || '';

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
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
              <Scan className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Optical Character Recognition (OCR)
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                Local Vision OCR Engine • Document &amp; Image Parsing
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Extract clear text, scanned document contents, receipts, handwritten notes, and signage without sending data to external servers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-blue-200 border border-blue-500/30">
            Tesseract / Local OCR
          </span>
        </div>
      </div>

      {/* Quick Sample Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-400">⚡ Quick Test Documents:</span>
        <button
          type="button"
          onClick={() => handleLoadSampleDocument('en')}
          className="px-3 py-1.5 rounded-xl bg-navy-900/80 hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
        >
          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>🇬🇧 English Scanned Report</span>
        </button>
        <button
          type="button"
          onClick={() => handleLoadSampleDocument('ne')}
          className="px-3 py-1.5 rounded-xl bg-navy-900/80 hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
        >
          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>🇳🇵 Nepali Scanned Document</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleRunOCR} className="glass-panel p-6 rounded-3xl space-y-6">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>1. Upload Document / Image</span>
            </h2>

            <Dropzone
              acceptedFormats={['.png', '.jpg', '.jpeg', '.webp', '.bmp']}
              maxSizeMB={15}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              title="Drag image or scan here"
              subtitle="Supports PNG, JPG, WEBP, BMP (Max 15MB)"
              disabled={isSubmitting || status === 'processing' || status === 'queued'}
            />

            <div className="pt-4 border-t border-blue-500/20 space-y-4">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>2. Recognition Parameters</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Primary Language in Document
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full bg-navy-900/80 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
                >
                  <option value="auto">Multi-Language Auto Detect</option>
                  <option value="en">English</option>
                  <option value="ne">Nepali (नेपाली)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-navy-900/40 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-navy-900/60">
                  <span className="flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Preserve Column Layout</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.preserveLayout}
                    onChange={(e) => setConfig({ ...config, preserveLayout: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-navy-900/40 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-navy-900/60">
                  <span className="flex items-center gap-2">
                    <Contrast className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Adaptive Contrast Filter</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.enhanceContrast}
                    onChange={(e) => setConfig({ ...config, enhanceContrast: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                  />
                </label>
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
              <Scan className="w-4 h-4" />
              <span>{isSubmitting ? 'Scanning Image...' : 'Extract OCR Text'}</span>
            </button>
          </form>

          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="image-to-text"
            onCancel={cancelCurrentJob}
            onRetry={resetJob}
          />
        </div>

        {/* Right: Extracted text panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Extracted Text Content
                </h3>
              </div>

              {status === 'completed' && extractedText && (
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

            <div className="min-h-[300px] max-h-[480px] overflow-y-auto bg-navy-950/80 border border-blue-500/20 rounded-2xl p-5 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {extractedText ? (
                extractedText
              ) : status === 'processing' || status === 'queued' ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-cyan-300 text-xs">Recognizing optical glyphs and characters...</p>
                </div>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Scan className="w-12 h-12 opacity-30 text-cyan-400" />
                  <p className="text-xs text-slate-400">Select an image or use sample document to extract text.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
