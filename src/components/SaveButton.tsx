import { useState } from 'react';
import { Check, Loader2, Save, AlertCircle } from 'lucide-react';

interface SaveButtonProps {
  onSave: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function SaveButton({ onSave, disabled, className, label = 'Save Lead' }: SaveButtonProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'saving' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (disabled || status !== 'idle') return;

    try {
      setStatus('checking');
      await new Promise(resolve => setTimeout(resolve, 800)); // Aesthetic pause
      
      setStatus('saving');
      await onSave();
      
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'checking':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Validating Data...</span>
          </>
        );
      case 'saving':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Syncing to Cloud...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check className="w-5 h-5 animate-bounce" />
            <span>Successfully Saved!</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-5 h-5" />
            <span>Sync Failed</span>
          </>
        );
      default:
        return (
          <>
            <Save className="w-5 h-5" />
            <span>{label}</span>
          </>
        );
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || status !== 'idle'}
      className={`
        relative overflow-hidden group
        min-w-[160px] h-12 px-6 rounded-xl font-bold transition-all duration-300
        flex items-center justify-center gap-2
        ${status === 'idle' ? 'bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white hover:shadow-lg hover:shadow-[var(--t-primary-dim)] hover:-translate-y-0.5' : ''}
        ${status === 'checking' || status === 'saving' ? 'bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)] cursor-wait' : ''}
        ${status === 'success' ? 'bg-[var(--t-success)] text-white shadow-lg shadow-[var(--t-success-dim)]' : ''}
        ${status === 'error' ? 'bg-[var(--t-error)] text-white' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-2 transition-all duration-300">
        {getStatusContent()}
      </div>
      
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
    </button>
  );
}
