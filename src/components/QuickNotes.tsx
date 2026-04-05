import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, X, GripHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore';

export function QuickNotes() {
  const { 
    quickNotes, 
    setQuickNotes, 
    isQuickNotesOpen, 
    setQuickNotesOpen,
    setNotesDocked,
  } = useStore();

  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem('wholescale_quicknotes_pos');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.x !== -1 && p.y !== -1) {
          setPos(p);
        }
      } catch (e) {}
    }
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    // Only drag from the handle or header, prevent dragging when clicking inside textarea
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    setIsDragging(true);
    let initialX = pos.x;
    let initialY = pos.y;

    if (initialX === -1) {
      initialX = window.innerWidth / 2;
      initialY = window.innerHeight / 2;
    }

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY
    };

    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      e.preventDefault();

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      let newX = dragRef.current.initialX + dx;
      let newY = dragRef.current.initialY + dy;

      // Keep within bounds
      const padding = 20;
      const w = Math.min(500, window.innerWidth - padding * 2);
      const h = Math.min(window.innerHeight * 0.8, 550);
      
      if (newX < w / 2 + padding) newX = w / 2 + padding;
      if (newX > window.innerWidth - w / 2 - padding) newX = window.innerWidth - w / 2 - padding;
      if (newY < h / 2 + padding) newY = h / 2 + padding;
      if (newY > window.innerHeight - h / 2 - padding) newY = window.innerHeight - h / 2 - padding;

      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
        if (dragRef.current) {
          localStorage.setItem('wholescale_quicknotes_pos', JSON.stringify(pos));
        }
        dragRef.current = null;
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pos]);

  if (!isQuickNotesOpen) return null;

  return (
    <div 
      className="fixed shadow-2xl flex flex-col w-[450px] h-[550px] z-[150]"
      style={{ 
        maxWidth: '500px', 
        maxHeight: '80vh',
        left: pos.x === -1 ? '50%' : `${pos.x}px`,
        top: pos.y === -1 ? '50%' : `${pos.y}px`,
        transform: pos.x === -1 ? 'translate(-50%, -50%)' : 'translate(-50%, -50%)',
        transition: isDragging ? 'none' : 'box-shadow 0.3s ease'
      }}
    >
      <div className="w-full h-full bg-[var(--t-sidebar-bg)] border border-[var(--t-border)] shadow-2xl overflow-hidden flex flex-col rounded-3xl" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div 
          className="bg-[var(--t-surface)] border-b border-[var(--t-border)] px-4 py-3 flex items-center justify-between shrink-0 cursor-move select-none group"
          onMouseDown={startDrag}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <StickyNote size={14} className="text-[var(--t-primary)]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--t-text)] leading-tight">Quick Notes</h3>
              <p className="text-[10px] text-[var(--t-text-muted)] font-medium">Auto-saved to your profile</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <GripHorizontal size={14} className="text-[var(--t-text-muted)] mr-2 cursor-grab" />
            
            <button 
              onClick={() => {
                setNotesDocked(true);
                setQuickNotesOpen(false);
              }} 
              className="p-1.5 hover:bg-[var(--t-error)]/10 rounded-lg text-[var(--t-error)]/70 hover:text-[var(--t-error)] transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-0 relative group isolate bg-[var(--t-background)]">
          <textarea 
            value={quickNotes} 
            onChange={(e) => setQuickNotes(e.target.value)} 
            placeholder="Type your notes here... They auto-save instantly." 
            className="w-full h-full p-6 bg-transparent border-none focus:outline-none focus:ring-0 resize-none custom-scrollbar text-sm leading-relaxed" 
            style={{ color: 'var(--t-text)' }} 
          />
        </div>
      </div>
    </div>
  );
}
