import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Modal } from './Modal';
import { Sparkles, Cpu, ArrowRight } from 'lucide-react';

export const AIModelSelectionDialog: React.FC = () => {
  const { isAiFirstUse, setIsAiFirstUse, setAiModel } = useStore();
  const [provider, setProvider] = useState<'gemini' | 'local'>('local');

  if (!isAiFirstUse) return null;

  const handleSave = () => {
    let model = 'os-bot';
    if (provider === 'gemini') model = 'gemini-3.1-flash-lite';
    else if (provider === 'local') model = 'os-bot';

    setAiModel(model);
    if (provider === 'local') {
      localStorage.setItem('user_ai_provider', 'local');
    } else {
      localStorage.setItem('user_ai_provider', provider);
    }
    
    setIsAiFirstUse(false);
  };

  const providers = [
    { 
      id: 'local', 
      label: 'OS Bot (Built-in AI)', 
      icon: <Cpu className="w-6 h-6 text-purple-400" />, 
      desc: 'Zero cost, unlimited messages, runs 100% in your browser.',
      color: 'bg-purple-500/10 border-purple-500/30'
    },
    { 
      id: 'gemini', 
      label: 'OS Bot (Cloud Brain)', 
      icon: <Sparkles className="w-6 h-6 text-blue-400" />, 
      desc: 'High-performance cloud intelligence (Requires OS Key).',
      color: 'bg-blue-500/10 border-blue-500/30'
    }
  ];

  return (
    <Modal
      isOpen={isAiFirstUse}
      onClose={() => setIsAiFirstUse(false)}
      title="Initialize OS Intelligence"
      maxWidth="max-w-xl"
      showClose={false}
    >
      <div className="p-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">Select Your Primary AI Directive</h2>
          <p className="text-[var(--t-text-muted)] text-sm leading-relaxed">
            Choose the neural engine that will power your WholeScale workspace. 
            You can swap providers or configure API keys later in Settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id as any)}
              className={`flex items-center gap-6 p-6 rounded-[24px] border transition-all text-left group hover:scale-[1.02] active:scale-[0.98] ${
                provider === p.id 
                  ? `${p.color} ring-1 ring-[var(--t-primary)] shadow-lg shadow-[var(--t-primary)]/10` 
                  : 'bg-[var(--t-surface-dim)] border-[var(--t-border)] hover:border-[var(--t-primary)]/50'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6 ${
                provider === p.id ? 'bg-white/10' : 'bg-black/20'
              }`}>
                {p.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">{p.label}</h3>
                <p className="text-xs text-[var(--t-text-muted)] mt-1">{p.desc}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                provider === p.id ? 'border-[var(--t-primary)] bg-[var(--t-primary)]' : 'border-[var(--t-border)]'
              }`}>
                {provider === p.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </div>
            </button>
          ))}
        </div>

        {/* Hidden endpoint for OS Bot — Issue 5 */}
        {provider === 'local' && (
          <div className="p-5 rounded-2xl bg-[var(--t-primary)]/5 border border-[var(--t-primary)]/20 animate-in fade-in slide-in-from-top-2 text-center">
             <p className="text-xs text-[var(--t-text-muted)] italic">
               OS Bot is a zero-latency, local neural engine. No configuration required.
             </p>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full group h-16 rounded-[24px] bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white font-black text-lg transition-all flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(var(--t-primary-rgb),0.3)] hover:shadow-[var(--t-primary-dim)] hover:-translate-y-1 active:translate-y-0"
        >
          Confirm Tactical Intelligence <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-center text-[10px] text-[var(--t-text-muted)] italic">
          Tactical Note: You will need to provide API keys in Settings if choosing cloud providers.
        </p>
      </div>
    </Modal>
  );
};
