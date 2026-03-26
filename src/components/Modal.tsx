import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
  showClose?: boolean;
  closeOnOutsideClick?: boolean;
  zIndex?: number;
  className?: string;
  containerClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'max-w-2xl',
  showClose = true,
  closeOnOutsideClick = true,
  zIndex = 9500,
  className = '',
  containerClassName = ''
}) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.classList.add('modal-open');
    } else {
      const timer = setTimeout(() => {
        setIsRendered(false);
        // Only remove if no other modals are open (approximate check)
        if (document.querySelectorAll('[data-modal-backdrop]').length <= 1) {
          document.body.classList.remove('modal-open');
        }
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }

    return () => {
      // Cleanup on unmount
      if (document.querySelectorAll('[data-modal-backdrop]').length <= 1) {
        document.body.classList.remove('modal-open');
      }
    };
  }, [isOpen]);

  if (!isOpen && !isRendered) return null;

  return (
    <div 
      data-modal-backdrop
      className={`fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      } ${containerClassName}`}
      style={{ zIndex }}
      onClick={() => closeOnOutsideClick && onClose()}
    >
      <div 
        className={`relative w-full ${maxWidth} bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[32px] shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh] ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="p-6 border-b border-[var(--t-border)] flex items-center justify-between shrink-0">
            {title ? (
              <h3 className="text-xl font-bold text-white">{title}</h3>
            ) : <div />}
            
            {showClose && (
              <button 
                onClick={onClose}
                className="p-2 text-[var(--t-text-muted)] hover:text-white hover:bg-[var(--t-surface-hover)] rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
