export type ToolId = 
  | 'image-to-3d'
  | 'audio-to-text'
  | 'video-to-text'
  | 'image-to-text'
  | 'summarizer'
  | 'translator'
  | 'text-to-speech';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ToolMetadata {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  badge: string;
  category: '3D & Vision' | 'Audio & Video' | 'Language & NLP' | 'Speech';
  acceptedFormats: string[];
  maxSizeMB: number;
  outputFormats: string[];
  isTextBased?: boolean;
}

export interface JobEventData {
  jobId: string;
  tool: ToolId;
  status: JobStatus;
  progress: number;
  stage: string;
  errorMessage?: string;
  outputFilename?: string;
  result?: any;
}

export interface Job {
  jobId: string;
  tool: ToolId;
  status: JobStatus;
  progress: number;
  stage?: string;
  inputFilename?: string;
  outputFilename?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  result?: any;
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  mockMode: boolean;
  activeJobs: number;
  maxConcurrentJobs: number;
  retentionHours: number;
  storageUsageMb?: number;
  tools: Record<ToolId, {
    available: boolean;
    engine: string;
    mock: boolean;
    description: string;
  }>;
}

export interface ImageTo3DConfig {
  outputFormat: 'glb' | 'obj' | 'stl';
  quality: 'fast' | 'balanced' | 'high';
  texture: boolean;
  removeBackground: boolean;
  geometryDetail: 'low' | 'medium' | 'high';
}

export interface AudioToTextConfig {
  language?: string;
  outputFormat: 'txt' | 'srt' | 'vtt' | 'json';
  timestamps: boolean;
  diarization: boolean;
}

export interface VideoToTextConfig {
  language?: string;
  outputFormat: 'txt' | 'srt' | 'vtt' | 'json';
  timestamps: boolean;
  extractAudioOnly?: boolean;
}

export interface OCRConfig {
  language?: string;
  preserveLayout: boolean;
  enhanceContrast: boolean;
}

export interface SummarizerConfig {
  length: 'short' | 'medium' | 'detailed';
  format: 'paragraph' | 'bullet_points' | 'executive';
  focusKeywords?: string;
}

export interface TranslatorConfig {
  sourceLanguage: 'en' | 'ne' | 'auto';
  targetLanguage: 'ne' | 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ja';
  formality: 'default' | 'formal' | 'informal';
}

export interface TTSConfig {
  language: 'en' | 'ne';
  voice: 'natural_female' | 'natural_male' | 'deep_male' | 'clarity_female';
  speed: number;
  pitch: number;
  outputFormat: 'mp3' | 'wav';
}
