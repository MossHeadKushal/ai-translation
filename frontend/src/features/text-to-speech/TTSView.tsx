import React, { useState, useEffect, useRef } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { JobProgressCard } from '../../components/JobProgressCard';
import type { TTSConfig } from '../../types';
import { api } from '../../services/api';
import { 
  Volume2, 
  Square,
  Download, 
  Settings2, 
  Sparkles, 
  Check, 
  Headphones,
  Music,
  Radio
} from 'lucide-react';

const SAMPLE_PROMPTS = [
  {
    label: '🇬🇧 English Welcome',
    lang: 'en' as const,
    text: 'Welcome to the Anonymous Self-Hosted AI Toolbox. All your audio processing runs directly on this local server with complete privacy.',
  },
  {
    label: '🇳🇵 Nepali Greeting',
    lang: 'ne' as const,
    text: 'नमस्ते! हाम्रो स्व-होस्ट गरिएको एआई टुलबक्समा तपाईंलाई स्वागत छ। सबै अडियो प्रशोधन पूर्ण रूपमा सुरक्षित र स्थानीय रूपमा सम्पन्न हुन्छ।',
  },
  {
    label: '🚀 Tech Summary',
    lang: 'en' as const,
    text: 'Zero telemetry, zero cloud fees, and full data isolation. Your machine is your private AI datacenter.',
  },
  {
    label: '🇳🇵 Nepali Info',
    lang: 'ne' as const,
    text: 'यस प्रणालीमा कुनै पनि बाह्य क्लाउड शुल्क वा ट्र्याकिङ बिना आवाज संश्लेषण गर्न सकिन्छ।',
  },
];

export const TTSView: React.FC = () => {
  const [inputText, setInputText] = useState(
    'Welcome to the Anonymous Self-Hosted AI Toolbox. All voice audio is generated on-premise.'
  );
  const [isSpeakingBrowser, setIsSpeakingBrowser] = useState(false);
  const [config, setConfig] = useState<TTSConfig>({
    language: 'en',
    voice: 'natural_female',
    speed: 1.0,
    pitch: 1.0,
    outputFormat: 'wav',
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  } = useJobRunner();

  // Stop browser speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakBrowser = () => {
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support speech synthesis.');
      return;
    }

    if (isSpeakingBrowser) {
      window.speechSynthesis.cancel();
      setIsSpeakingBrowser(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(inputText);
    utterance.rate = config.speed;
    utterance.pitch = config.pitch;

    // Set voice or language code
    if (config.language === 'ne') {
      utterance.lang = 'ne-NP';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setIsSpeakingBrowser(false);
    utterance.onerror = () => setIsSpeakingBrowser(false);

    setIsSpeakingBrowser(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSynthesize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await startJob('text-to-speech', null, inputText, config);
  };

  const audioFileUrl = job?.jobId ? api.getResultFileUrl(job.jobId) : '';
  const downloadUrl = job?.jobId ? api.getDownloadUrl(job.jobId) : '';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-b border-blue-500/20 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 font-bold shadow-glow-cyan">
              <Volume2 className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Text to Speech Synthesis
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                English &amp; Nepali Neural Acoustic Model • Local Speech Engine
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Convert written text into natural speech in English and Nepali with custom pitch and tempo adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-cyan-300 border border-cyan-500/30">
            WAV &amp; MP3 High-Fidelity
          </span>
        </div>
      </div>

      {/* Quick Sample Presets */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-slate-400">⚡ Quick Test Presets:</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(sample.text);
                setConfig((prev) => ({ ...prev, language: sample.lang }));
              }}
              className="px-3 py-1.5 rounded-xl bg-navy-900/80 hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-xs text-slate-200 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Text & Voice Controls */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSynthesize} className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>1. Text to Speak</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {inputText.length} characters
              </span>
            </div>

            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to convert to voice audio (supports English and Nepali)..."
              disabled={isSubmitting || status === 'processing' || status === 'queued'}
              className="w-full bg-navy-950/90 border border-blue-500/30 rounded-2xl p-4 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
            />

            <div className="pt-2 border-t border-blue-500/20 space-y-4">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>2. Acoustic Engine Controls</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Language
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value as any })}
                    className="w-full bg-navy-900/80 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
                  >
                    <option value="en">English (US/UK)</option>
                    <option value="ne">Nepali (नेपाली)</option>
                  </select>
                </div>

                {/* Voice Profile */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Voice Persona
                  </label>
                  <select
                    value={config.voice}
                    onChange={(e) => setConfig({ ...config, voice: e.target.value as any })}
                    className="w-full bg-navy-900/80 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
                  >
                    <option value="natural_female">Natural Female</option>
                    <option value="natural_male">Natural Male</option>
                    <option value="deep_male">Deep Resonance Male</option>
                    <option value="clarity_female">Crisp Clarity Female</option>
                  </select>
                </div>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Speed / Tempo</span>
                  <span className="font-mono text-cyan-400">{config.speed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.speed}
                  onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Output format */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Audio Container
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['wav', 'mp3'] as const).map((fmt) => (
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Direct Instant Web Audio Speak */}
              <button
                type="button"
                onClick={handleSpeakBrowser}
                disabled={!inputText.trim()}
                className={`py-3.5 px-4 rounded-2xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 border ${
                  isSpeakingBrowser
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-glow-rose'
                    : 'bg-navy-800 hover:bg-navy-700 text-cyan-300 border-cyan-500/40 hover:border-cyan-300 shadow-sm'
                }`}
              >
                {isSpeakingBrowser ? <Square className="w-4 h-4 fill-current" /> : <Radio className="w-4 h-4 text-cyan-400" />}
                <span>{isSpeakingBrowser ? 'Stop Audio' : '🔊 Listen Live (Browser)'}</span>
              </button>

              {/* Backend Synthesize */}
              <button
                type="submit"
                disabled={!inputText.trim() || isSubmitting || status === 'processing' || status === 'queued'}
                className={`py-3.5 px-4 rounded-2xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 ${
                  !inputText.trim() || isSubmitting || status === 'processing' || status === 'queued'
                    ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 hover:opacity-95 text-slate-950 shadow-glow-cyan transform hover:-translate-y-0.5'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Synthesizing...' : 'Generate Voice File'}</span>
              </button>
            </div>
          </form>

          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="text-to-speech"
            onCancel={cancelCurrentJob}
            onRetry={resetJob}
          />
        </div>

        {/* Right: Audio Player & Result */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Audio Output Player
                </h3>
              </div>
              {status === 'completed' && (
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Synthesized</span>
                </span>
              )}
            </div>

            {/* Audio Waveform / Player Area */}
            <div className="min-h-[260px] flex flex-col items-center justify-center bg-navy-950/80 border border-blue-500/20 rounded-2xl p-6 text-center space-y-4">
              {status === 'completed' && job?.jobId ? (
                <div className="w-full space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-300 shadow-glow-cyan">
                    <Music className="w-8 h-8 animate-pulse text-cyan-300" />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 font-mono">
                      {job?.outputFilename || `speech_${config.language}.wav`}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Language: {config.language.toUpperCase()} • Voice: {config.voice} • Local Audio
                    </p>
                  </div>

                  <audio
                    ref={audioRef}
                    controls
                    autoPlay
                    src={audioFileUrl}
                    className="w-full rounded-xl mt-2"
                  >
                    Your browser does not support the audio player.
                  </audio>
                </div>
              ) : status === 'processing' || status === 'queued' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-cyan-300">Synthesizing vocal waveforms...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Volume2 className="w-12 h-12 opacity-30 text-cyan-400" />
                  <p className="text-xs text-slate-400">Click &quot;Generate Voice File&quot; or &quot;🔊 Listen Live&quot; to play audio.</p>
                </div>
              )}
            </div>

            {status === 'completed' && downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Audio File ({config.outputFormat.toUpperCase()})</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
