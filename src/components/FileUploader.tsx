import { useState, useRef } from 'react';
import { Upload, X as CloseIcon, Loader2, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';
import { uploadFile, generateUniqueFileName, StorageBucket } from '../lib/storage';

interface FileUploaderProps {
  bucket: StorageBucket;
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: Error) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  label?: string;
  className?: string;
  showPreview?: boolean;
}

export function FileUploader({
  bucket,
  onUploadComplete,
  onUploadError,
  allowedTypes = ['image/*'],
  maxSizeMB = 5,
  label = 'Upload File',
  className = '',
  showPreview = true,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setSuccess(false);

    // Validation
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large (max ${maxSizeMB}MB)`);
      return;
    }

    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      setError(`File type ${file.type} is not allowed`);
      return;
    }

    // Generate preview
    if (showPreview && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }

    // Start upload
    setIsUploading(true);
    setProgress(10); // Initial progress

    try {
      const fileName = generateUniqueFileName(file.name);
      const { url, error: uploadErr } = await uploadFile(bucket, fileName, file);

      if (uploadErr) throw uploadErr;
      if (url) {
        setProgress(100);
        setSuccess(true);
        onUploadComplete(url);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      onUploadError?.(err);
    } finally {
      setIsUploading(false);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const removePreview = () => {
    setPreviewUrl(null);
    setSuccess(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-[var(--t-text-muted)]">{label}</label>}
      
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={allowedTypes.join(',')}
          className="hidden"
          disabled={isUploading}
        />

        {!previewUrl || !showPreview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
              isUploading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-[var(--t-primary)] hover:bg-[var(--t-primary)]/5 cursor-pointer'
            }`}
            style={{ 
              borderColor: error ? 'var(--t-error)' : 'var(--t-border)',
              backgroundColor: success ? 'var(--t-success-dim)' : 'transparent'
            }}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-[var(--t-primary)] mb-2" />
            ) : success ? (
              <CheckCircle2 className="w-8 h-8 text-[var(--t-success)] mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-[var(--t-text-muted)] mb-2" />
            )}
            <span className="text-sm font-medium text-[var(--t-text-muted)]">
              {isUploading ? `Uploading... ${progress}%` : success ? 'Upload Complete!' : 'Click to Upload or Drag & Drop'}
            </span>
          </button>
        ) : (
          <div className="relative group rounded-xl overflow-hidden border border-[var(--t-border)]">
            <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Change File"
              >
                <Upload size={18} />
              </button>
              <button
                type="button"
                onClick={removePreview}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Remove"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-sm font-medium">Uploading {progress}%</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-[var(--t-error)] font-medium flex items-center gap-1">
            <CloseIcon size={12} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
