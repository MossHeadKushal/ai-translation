import React, { useState } from 'react';
import { useJobRunner } from '../../hooks/useJobRunner';
import { Dropzone } from '../../components/Dropzone';
import { JobProgressCard } from '../../components/JobProgressCard';
import { Viewer3D } from '../../components/Viewer3D';
import type { ImageTo3DConfig } from '../../types';
import { api } from '../../services/api';
import { 
  Box, 
  Download, 
  RefreshCw, 
  Settings2, 
  Sparkles, 
  Layers, 
  Sliders, 
  Check, 
  FileCode,
  Info,
  Gem,
  Shield,
  Trophy
} from 'lucide-react';

const SAMPLE_PRESETS = [
  {
    name: 'Cyber Gem Crystal',
    icon: Gem,
    color: '#00F0FF',
    accent: '#071841',
  },
  {
    name: 'Security Shield',
    icon: Shield,
    color: '#3B82F6',
    accent: '#1E1B4B',
  },
  {
    name: 'Golden Trophy',
    icon: Trophy,
    color: '#F59E0B',
    accent: '#451A03',
  },
];

export const ImageTo3DView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeSampleName, setActiveSampleName] = useState<string>('');
  const [config, setConfig] = useState<ImageTo3DConfig>({
    outputFormat: 'glb',
    quality: 'balanced',
    texture: true,
    removeBackground: true,
    geometryDetail: 'medium',
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
  } = useJobRunner();

  // Generate synthetic test image on a canvas and convert to File
  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setActiveSampleName(preset.name);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw stylized radial background
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 240);
    grad.addColorStop(0, preset.color);
    grad.addColorStop(1, preset.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Draw geometric shape
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(256, 256, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = preset.accent;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3D TARGET', 256, 256);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${preset.name.toLowerCase().replace(/\s+/g, '_')}.png`, {
          type: 'image/png',
        });
        setSelectedFile(file);
      }
    }, 'image/png');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    await startJob('image-to-3d', selectedFile, undefined, config);
  };

  const handleResetAll = () => {
    resetJob();
    setSelectedFile(null);
    setActiveSampleName('');
  };

  const downloadUrl = job?.jobId ? api.getDownloadUrl(job.jobId) : '';
  const resultModelUrl = job?.jobId && job?.outputFilename ? api.getResultFileUrl(job.jobId) : undefined;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Tool Header */}
      <div className="border-b border-blue-500/20 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-slate-950 font-bold shadow-glow-cyan">
              <Box className="w-6 h-6 text-[#071841]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Image to 3D Generation
              </h1>
              <p className="text-xs font-mono text-cyan-300">
                Core Vision Engine • Offline Reconstruction Pipeline
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Generate high-resolution 3D models with surface normals, textured UV maps, and geometry directly from a single 2D input image.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-blue-900/40 text-blue-200 border border-blue-500/30">
            Outputs: GLB, OBJ, STL
          </span>
        </div>
      </div>

      {/* Quick Test Presets */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-slate-400">⚡ Quick Test Image Presets:</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PRESETS.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm flex items-center gap-2 ${
                  activeSampleName === preset.name
                    ? 'bg-blue-600 text-white border-cyan-400 shadow-glow-blue'
                    : 'bg-navy-900/80 hover:bg-blue-600/30 border-blue-500/30 hover:border-cyan-400 text-slate-200 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Configuration (40%) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleGenerate} className="glass-panel p-6 rounded-3xl space-y-6">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>1. Select Input Image</span>
            </h2>

            <Dropzone
              acceptedFormats={['.png', '.jpg', '.jpeg', '.webp']}
              maxSizeMB={20}
              selectedFile={selectedFile}
              onFileSelect={(f) => {
                setSelectedFile(f);
                setActiveSampleName('');
              }}
              title="Drag image here"
              subtitle="Supports high-res PNG, JPG, or WEBP (Max 20MB)"
              disabled={isSubmitting || status === 'processing' || status === 'queued'}
            />

            {/* Model Generation Settings */}
            <div className="pt-4 border-t border-blue-500/20 space-y-4">
              <h3 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>2. Pipeline Parameters</span>
              </h3>

              {/* Format select */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target 3D Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['glb', 'obj', 'stl'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setConfig({ ...config, outputFormat: fmt })}
                      className={`py-2 px-3 rounded-xl text-xs font-mono uppercase font-bold border transition-all ${
                        config.outputFormat === fmt
                          ? 'bg-blue-600 text-white border-cyan-400 shadow-glow-blue'
                          : 'bg-navy-900/60 text-slate-400 border-white/5 hover:text-white hover:bg-navy-800'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Reconstruction Quality
                </label>
                <select
                  value={config.quality}
                  onChange={(e) => setConfig({ ...config, quality: e.target.value as any })}
                  className="w-full bg-navy-900/80 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
                >
                  <option value="fast">Fast (Optimal for browser viewer)</option>
                  <option value="balanced">Balanced (High precision)</option>
                  <option value="high">High Fidelity (Dense vertex mesh)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-navy-900/40 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-navy-900/60">
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Auto Background Removal</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.removeBackground}
                    onChange={(e) => setConfig({ ...config, removeBackground: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-navy-900/40 border border-white/5 text-xs text-slate-300 cursor-pointer hover:bg-navy-900/60">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Generate Diffuse Texture Map</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.texture}
                    onChange={(e) => setConfig({ ...config, texture: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedFile || isSubmitting || status === 'processing' || status === 'queued'}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                  !selectedFile || isSubmitting || status === 'processing' || status === 'queued'
                    ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 hover:opacity-95 text-slate-950 shadow-glow-cyan transform hover:-translate-y-0.5'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Starting Job...' : 'Generate 3D Model'}</span>
              </button>
            </div>
          </form>

          {/* Real-time Progress tracker */}
          <JobProgressCard
            status={status}
            progress={progress}
            stage={stage}
            errorMessage={error}
            toolId="image-to-3d"
            onCancel={cancelCurrentJob}
            onRetry={handleResetAll}
          />
        </div>

        {/* Right Column: Interactive 3D Canvas / Preview Result (60%) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Interactive 3D Viewport
                </h3>
              </div>
              {status === 'completed' && (
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Render Ready</span>
                </span>
              )}
            </div>

            {/* 3D Canvas */}
            <Viewer3D
              modelUrl={resultModelUrl}
              fallbackName={selectedFile ? `${selectedFile.name.split('.')[0]}_3D` : 'Sample 3D Crystal Mesh'}
            />

            {/* Result actions when completed */}
            {status === 'completed' && (
              <div className="p-4 rounded-2xl bg-navy-900/80 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 shadow-xl">
                <div>
                  <h4 className="text-xs font-mono uppercase text-cyan-300 font-bold mb-1 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4" />
                    <span>{job?.outputFilename || `mesh_output.${config.outputFormat}`}</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Format: {config.outputFormat.toUpperCase()} • Generated locally with Zero API fees
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <a
                    href={downloadUrl}
                    download
                    className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {config.outputFormat.toUpperCase()}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="p-2.5 rounded-xl bg-navy-800 text-slate-300 hover:text-white border border-white/10 hover:border-cyan-400/40 transition-colors"
                    title="Process another image"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Pipeline info alert */}
            <div className="p-3.5 rounded-2xl bg-navy-950/60 border border-blue-500/20 text-xs text-slate-400 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-slate-300 font-medium">
                  Self-Hosted 3D Pipeline Architecture:
                </p>
                <p className="text-[11px] font-mono text-slate-400">
                  Upload Image → Depth Estimation → Marching Cubes Mesh → UV Texture Projection → GLB / OBJ Conversion
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
