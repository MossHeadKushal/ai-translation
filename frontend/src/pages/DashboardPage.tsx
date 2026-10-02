import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../utils/toolsData';
import { 
  Box, 
  Mic, 
  Video, 
  FileText, 
  Sparkles, 
  Languages, 
  Volume2, 
  ArrowRight, 
  Zap,
  CheckCircle
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Box': return Box;
      case 'Mic': return Mic;
      case 'Video': return Video;
      case 'FileText': return FileText;
      case 'Sparkles': return Sparkles;
      case 'Languages': return Languages;
      case 'Volume2': return Volume2;
      default: return Box;
    }
  };

  const categories = ['all', '3D & Vision', 'Audio & Video', 'Language & NLP', 'Speech'];

  const filteredTools = selectedCategory === 'all'
    ? TOOLS
    : TOOLS.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-12">
      {/* Hero Section with rich visual aesthetics */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-8 sm:p-12 border border-blue-500/30 bg-gradient-to-br from-[#071841]/90 via-[#0B296B]/50 to-[#030917]/90 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-8 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Self-Hosted • Zero Paid Third-Party APIs • No User Accounts</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Anonymous Local <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AI Processing Suite
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            A production-ready toolbox powered by a high-concurrency Go backend. Generate 3D models from images, transcribe audio/video with Whisper, run OCR, translate English &amp; Nepali, and synthesize neural speech entirely on your hardware.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/tools/image-to-3d"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 text-slate-950 font-bold text-sm shadow-glow-cyan hover:opacity-95 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <Box className="w-4 h-4" />
              <span>Launch Image → 3D</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/system"
              className="px-6 py-3 rounded-2xl bg-navy-900/80 hover:bg-navy-800 text-slate-200 border border-blue-500/30 hover:border-cyan-400/50 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Worker Diagnostics</span>
            </Link>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>100% Anonymous</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Zero Cloud Billing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>24h Auto Cleanup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Live SSE Progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-500/20 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Available AI Processing Tools</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Select an engine to start instant job execution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-navy-950/70 p-1 rounded-2xl border border-blue-500/20">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-glow-blue'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat === 'all' ? 'All Engines (7)' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => {
          const Icon = getToolIcon(tool.iconName);
          const is3D = tool.id === 'image-to-3d';

          return (
            <Link
              key={tool.id}
              to={`/tools/${tool.id}`}
              className={`group glass-panel rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
                is3D
                  ? 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-glow-cyan bg-gradient-to-b from-navy-900/90 to-navy-950/90'
                  : 'border-blue-500/20 hover:border-cyan-400/50 hover:shadow-glow-blue'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-glow-cyan transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-900/40 text-cyan-300 border border-cyan-500/30 font-semibold">
                    {tool.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                  <span>{tool.name}</span>
                  {is3D && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-extrabold">
                      Primary
                    </span>
                  )}
                </h3>

                <p className="text-xs text-cyan-200/80 font-mono mt-1 mb-3">
                  {tool.tagline}
                </p>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {tool.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <span>Formats:</span>
                  <span className="text-cyan-300 font-semibold">
                    {tool.outputFormats.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>Launch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
