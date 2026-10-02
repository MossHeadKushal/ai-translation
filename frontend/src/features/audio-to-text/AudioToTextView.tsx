import React, { useState, useRef, useEffect } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { Dropzone } from '../../components/Dropzone';
import { JobProgressCard } from '../../components/JobProgressCard';
import type { AudioToTextConfig } from '../../types';
import { api } from '../../services/api';
import { 
  Mic, 
  MicOff,
  Download, 
  Copy, 
  Check, 
  Settings2, 
  FileText, 
  Sparkles,
  Volume2
} from 'lucide-react';

export const AudioToTextView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const [config, setConfig] = useState<AudioToTextConfig>({
    language: 'auto',
    outputFormat: 'txt',
    timestamps: true,
    diarization: false,
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Create a sample audio file for 1-click test
  const handleLoadSampleAudio = () => {
    const sampleRate = 44100;
    const numSamples = sampleRate * 1.5;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((i / sampleRate) * 440 * Math.PI * 2) * 16000;
      view.setInt16(44 + i * 2, sample, true);
    }

    const sampleBlob = new Blob([buffer], { type: 'audio/wav' });
    const sampleAudioFile = new File([sampleBlob], 'sample_speech_recording.wav', { type: 'audio/wav' });
    setSelectedFile(sampleAudioFile);
    setLiveTranscript('');
  };

  // Live microphone recorder + Speech Recognition
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordedFile = new File([audioBlob], `mic_recording_${Date.now()}.wav`, { type: 'audio/wav' });
        setSelectedFile(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      setLiveTranscript('Listening to your microphone...');

      // Start Web Speech Recognition if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = config.language === 'ne' ? 'ne-NP' : 'en-US';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          if (currentText.trim()) {
            setLiveTranscript(currentText.trim());
          }
        };

        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Could not access microphone. Please check your browser permissions or use the sample audio button.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleTranscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await startJob('audio-to-text', selectedFile, liveTranscript || undefined, config);
  };

  const transcriptText =
    liveTranscript && isRecording
      ? `🎙️ LIVE TRANSCRIPTION:\n${liveTranscript}`
      : resultData?.transcript || job?.result?.transcript || (liveTranscript ? `[Recognized from Microphone]:\n${liveTranscript}` : '');

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
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-glow-cyan">
              <Mic className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Audio to Text Transcription
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                Local Speech-to-Text • Whisper Compatible Engine
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Transcribe speeches, voice memos, interviews, and meetings locally with timestamp synchronization and zero cloud dependency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-blue-200 border border-blue-500/30">
            Formats: MP3, WAV, FLAC, M4A, OGG
          </span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-mono text-slate-400">⚡ Quick Start Options:</span>
        <button
          type="button"
          onClick={handleLoadSampleAudio}
          className="px-3.5 py-1.5 rounded-xl bg-navy-900/80 hover:bg-blue-600/30 border border-blue-500/30 hover:border-cyan-400 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Load Sample Audio Track</span>
        </button>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            isRecording
              ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
              : 'bg-navy-900/80 hover:bg-navy-800 text-rose-300 border-rose-500/30 hover:border-rose-400'
          }`}
        >
          {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>{isRecording ? `Recording (${recordingSeconds}s) - Click Stop` : 'Record Microphone (Live)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Parameters */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleTranscribe} className="glass-panel p-6 rounded-3xl space-y-6">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>1. Upload Audio Track</span>
            </h2>

            <Dropzone
              acceptedFormats={['.mp3', '.wav', '.m4a', '.flac', '.ogg']}
              maxSizeMB={50}
              selectedFile={selectedFile}
              onFileSelect={(f) => {
                setSelectedFile(f);
                setLiveTranscript('');
              }}
              title="Drag audio file here"
              subtitle="Supports MP3, WAV, M4A, FLAC (Max 50MB)"
              disabled={isSubmitting || status === 'processing' || status === 'queued'}
            />

            {selectedFile && (
              <div className="bg-navy-950/90 border border-cyan-500/30 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2 truncate max-w-[80%]">
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-mono truncate font-medium text-cyan-200">{selectedFile.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <audio
                  controls
                  src={URL.createObjectURL(selectedFile)}
                  className="w-full h-8 rounded-lg"
                />
              </div>
            )}

            <div className="pt-4 border-t border-blue-500/20 space-y-4">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>2. Recognition Settings</span>
              </h3>

              {/* Language selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Audio Language
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full bg-navy-900/80 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
                >
                  <option value="auto">Auto-Detect Language</option>
                  <option value="en">English</option>
                  <option value="ne">Nepali (नेपाली)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              {/* Output format */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Transcript Export Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['txt', 'srt', 'vtt'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setConfig({ ...config, outputFormat: fmt })}
                      className={`py-2 px-2 rounded-xl text-xs font-mono uppercase font-bold border transition-all ${
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

            <button
              type="submit"
              disabled={!selectedFile || isSubmitting || status === 'processing' || status === 'queued'}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                !selectedFile || isSubmitting || status === 'processing' || status === 'queued'
                  ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 hover:opacity-95 text-slate-950 shadow-glow-cyan transform hover:-translate-y-0.5'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isSubmitting ? 'Transcribing...' : 'Transcribe Audio'}</span>
            </button>
          </form>

          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="audio-to-text"
            onCancel={cancelCurrentJob}
            onRetry={resetJob}
          />
        </div>

        {/* Right Column: Output Result */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Transcribed Text Output
                </h3>
              </div>

              {((status === 'completed' && transcriptText) || liveTranscript) && (
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
                      download
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-glow-cyan transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {config.outputFormat.toUpperCase()}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="min-h-[300px] max-h-[480px] overflow-y-auto bg-navy-950/80 border border-blue-500/20 rounded-2xl p-5 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {transcriptText ? (
                transcriptText
              ) : status === 'processing' || status === 'queued' ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-cyan-300 text-xs">Whisper acoustic transcription in progress...</p>
                </div>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-2">
                  <FileText className="w-12 h-12 opacity-30 text-cyan-400" />
                  <p className="text-xs text-slate-400">Select an audio file or record from microphone to transcribe.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
