import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
            {variant === 'danger' ? <AlertCircle className="w-4 h-4 text-[var(--t-error)]" /> : <div className="w-2 h-2 rounded-full" style={{ background: 'var(--t-primary)' }} />}
            {title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors" style={{ color: 'var(--t-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          <div className="text-sm leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>
            {message}
          </div>
        </div>

        <div className="p-4 flex gap-3 bg-white/5 border-t" style={{ borderColor: 'var(--t-border)' }}>
          <button 
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{ 
              background: 'var(--t-background)', 
              borderColor: 'var(--t-border)', 
              color: 'var(--t-text-secondary)' 
            }}
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-lg active:scale-95"
            style={{ 
              background: variant === 'danger' ? 'var(--t-error)' : 'var(--t-primary)'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
