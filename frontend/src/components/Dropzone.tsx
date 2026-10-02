import React, { useRef, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface DropzoneProps {
  acceptedFormats: string[];
  maxSizeMB: number;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  acceptedFormats,
  maxSizeMB,
  selectedFile,
  onFileSelect,
  title = 'Upload File',
  subtitle,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File is too large (${formatFileSize(file.size)}). Max allowed is ${maxSizeMB} MB.`);
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExt = acceptedFormats.some((fmt) => fmt.toLowerCase() === ext);

    if (!isValidExt && acceptedFormats.length > 0) {
      setErrorMessage(`Unsupported file format. Please upload: ${acceptedFormats.join(', ')}`);
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setErrorMessage(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            disabled ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-900/20' : ''
          } ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-glow-cyan'
              : 'border-blue-500/30 hover:border-cyan-400/60 bg-navy-900/40 hover:bg-navy-900/70'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-400/20 border border-blue-400/30 flex items-center justify-center mb-4 text-cyan-300 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8 animate-pulse" />
          </div>

          <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {subtitle || `Drag and drop your file here, or browse from your computer`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md">
            {acceptedFormats.map((fmt) => (
              <span
                key={fmt}
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-300 border border-blue-500/30"
              >
                {fmt.replace('.', '')}
              </span>
            ))}
            <span className="text-[10px] font-mono text-slate-400 ml-1">
              (Up to {maxSizeMB} MB)
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-navy-900/70 border border-blue-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4 overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Upload Preview"
                className="w-16 h-16 object-cover rounded-xl border border-cyan-400/40 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <File className="w-7 h-7" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100 truncate">{selectedFile.name}</p>
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Binary file'}
              </p>
              <button
                type="button"
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium mt-1 inline-block"
              >
                Change File
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-2"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
