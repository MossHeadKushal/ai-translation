import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { TOOLS } from '../utils/toolsData';
import { ImageTo3DView } from '../features/image-to-3d/ImageTo3DView';
import { AudioToTextView } from '../features/audio-to-text/AudioToTextView';
import { VideoToTextView } from '../features/video-to-text/VideoToTextView';
import { OCRView } from '../features/ocr/OCRView';
import { SummarizerView } from '../features/summarizer/SummarizerView';
import { TranslatorView } from '../features/translator/TranslatorView';
import { TTSView } from '../features/text-to-speech/TTSView';
import { ChevronRight, Home } from 'lucide-react';

export const ToolPage: React.FC = () => {
  const { toolId } = useParams<{ toolId: string }>();

  const currentTool = TOOLS.find((t) => t.id === toolId);

  if (!currentTool) {
    return <Navigate to="/" replace />;
  }

  const renderToolView = () => {
    switch (currentTool.id) {
      case 'image-to-3d':
        return <ImageTo3DView />;
      case 'audio-to-text':
        return <AudioToTextView />;
      case 'video-to-text':
        return <VideoToTextView />;
      case 'image-to-text':
        return <OCRView />;
      case 'summarizer':
        return <SummarizerView />;
      case 'translator':
        return <TranslatorView />;
      case 'text-to-speech':
        return <TTSView />;
      default:
        return <ImageTo3DView />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <Link to="/" className="hover:text-cyan-300 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Toolbox</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-500">{currentTool.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-cyan-300 font-semibold">{currentTool.name}</span>
      </nav>

      {/* Feature Component */}
      {renderToolView()}
    </div>
  );
};
