import React from 'react';
import { X, Copy, Check, Download, Phone, MessageSquare, Zap, Plus, Save } from 'lucide-react';

interface CallScriptTemplate {
  name: string;
  category: string;
  script: string;
  description: string;
}

interface CallScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  templates: CallScriptTemplate[];
  onChange?: () => void;
}

export function CallScriptModal({ isOpen, onClose, leadName, templates }: CallScriptModalProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const [isAdding, setIsAdding] = React.useState(false);
  const [newTmpl, setNewTmpl] = React.useState({ name: '', category: 'Custom', description: '', script: '' });

  const handleSaveCustom = () => {
    try {
      const existing = localStorage.getItem('user_custom_scripts');
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(newTmpl);
      localStorage.setItem('user_custom_scripts', JSON.stringify(parsed));
      setIsAdding(false);
      setNewTmpl({ name: '', category: 'Custom', description: '', script: '' });
      if (typeof window !== 'undefined') window.location.reload(); // Quick refresh to show templates
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-hover)]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[var(--t-accent-dim)]/50">
              <Zap className="w-6 h-6 text-[var(--t-accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Call Script Library</h2>
              <p className="text-sm text-[var(--t-text-muted)]">Customized templates for <span className="text-white font-medium">{leadName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="px-4 py-2 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Plus size={16} /> Add Custom
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/10 transition-colors text-[var(--t-text-muted)] hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isAdding && (
            <div className="bg-[var(--t-surface-dim)] border border-[var(--t-primary)] p-5 rounded-xl space-y-4 mb-6 relative shadow-[0_0_15px_rgba(var(--t-primary-rgb),0.1)]">
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2"><Plus size={18} className="text-[var(--t-primary)]"/> Create Custom Script</h3>
              <p className="text-xs text-[var(--t-text-muted)]">Use <code className="bg-black/30 px-1 py-0.5 rounded text-[var(--t-accent)]">{`{{lead.name}}`}</code> and <code className="bg-black/30 px-1 py-0.5 rounded text-[var(--t-accent)]">{`{{lead.address}}`}</code> as dynamic placeholders.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Template Name" 
                  value={newTmpl.name}
                  onChange={e => setNewTmpl(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-primary)]"
                />
                <input 
                  type="text" 
                  placeholder="Category (e.g., Creative Finance)" 
                  value={newTmpl.category}
                  onChange={e => setNewTmpl(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-primary)]"
                />
              </div>
              <textarea 
                placeholder="Tactical Description / Internal Notes..."
                value={newTmpl.description}
                onChange={e => setNewTmpl(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-primary)] min-h-[60px]"
              />
              <textarea 
                placeholder="Hi {{lead.name}}, I'm looking to buy your property at {{lead.address}}..."
                value={newTmpl.script}
                onChange={e => setNewTmpl(prev => ({ ...prev, script: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-primary)] min-h-[100px]"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-[var(--t-text-muted)] hover:text-white transition-colors">Cancel</button>
                <button 
                  onClick={handleSaveCustom}
                  disabled={!newTmpl.name || !newTmpl.script}
                  className="px-6 py-2 bg-[var(--t-success)] hover:bg-[var(--t-success-hover)] disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-[var(--t-success)]/20"
                >
                  <Save size={16} /> Save Template
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6">
            {templates.map((tmpl, idx) => (
              <div 
                key={idx} 
                className="group relative flex flex-col bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl overflow-hidden hover:border-[var(--t-accent)]/30 transition-all"
              >
                <div className="p-4 border-b border-[var(--t-border)] flex items-center justify-between bg-black/5">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-[var(--t-accent)] text-white shadow-lg shadow-[var(--t-accent)]/20">
                      {tmpl.category}
                    </span>
                    <h3 className="font-bold text-white tracking-tight">{tmpl.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCopy(tmpl.script, idx)}
                      className="p-2 rounded-lg hover:bg-[var(--t-accent)]/10 text-[var(--t-text-muted)] hover:text-[var(--t-accent)] transition-all flex items-center gap-2 text-xs font-bold"
                    >
                      {copiedIndex === idx ? (
                        <><Check size={14} className="text-[var(--t-success)]" /> Copied</>
                      ) : (
                        <><Copy size={14} /> Copy</>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[var(--t-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                       <MessageSquare size={12} className="text-[var(--t-accent)]" /> Script Content
                    </div>
                    <div className="bg-black/20 rounded-xl p-4 text-[var(--t-text-secondary)] leading-relaxed text-sm whitespace-pre-wrap border border-white/5 font-medium">
                      {tmpl.script}
                    </div>
                  </div>
                  
                  <div className="md:w-64 shrink-0">
                    <div className="text-xs font-bold text-[var(--t-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                      Tactical Notes
                    </div>
                    <p className="text-xs text-[var(--t-text-muted)] leading-relaxed bg-[var(--t-surface-subtle)] p-3 rounded-lg border border-[var(--t-border)]">
                      {tmpl.description}
                    </p>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2">
                       <button className="p-2 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-lg text-[10px] font-bold hover:bg-[var(--t-primary)] hover:text-white transition-all flex items-center justify-center gap-2">
                         <Phone size={12} /> Start Call
                       </button>
                       <button className="p-2 bg-[var(--t-success)]/10 text-[var(--t-success)] rounded-lg text-[10px] font-bold hover:bg-[var(--t-success)] hover:text-white transition-all flex items-center justify-center gap-2">
                         <Download size={12} /> Export
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--t-border)] bg-[var(--t-surface-hover)] flex justify-between items-center">
          <p className="text-[10px] text-[var(--t-text-muted)] uppercase font-bold tracking-widest flex items-center gap-2">
             <Zap size={12} className="text-[var(--t-accent)]" /> AI-Generated Strategy
          </p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[var(--t-surface-subtle)] hover:bg-[var(--t-surface-hover)] text-white text-sm font-bold rounded-xl border border-[var(--t-border)] transition-all"
          >
            Close Library
          </button>
        </div>
      </div>
    </div>
  );
}
