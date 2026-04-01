import React, { useState } from 'react';
import { Bot, Database, Mic, User, Target, Save, Loader2, Sparkles, BrainCircuit, Headphones, Upload } from 'lucide-react';

const AITrainingStudio: React.FC = () => {
  const [activeSection, setActiveSection] = useState('model');
  const [saving, setSaving] = useState(false);

  const sections = [
    { id: 'model', label: 'Model Selection', icon: Sparkles, desc: 'Choose the brain for your OS Bot' },
    { id: 'data', label: 'Training Data', icon: Database, desc: 'Upload conversations and lead history' },
    { id: 'knowledge', label: 'Knowledge Base', icon: BrainCircuit, desc: 'Add files and URLs for context' },
    { id: 'voice', label: 'Voice & Audio', icon: Headphones, desc: 'Configure STT and TTS properties' },
    { id: 'personality', label: 'Personality', icon: User, desc: 'Define tone, behavior, and constraints' },
    { id: 'scoring', label: 'Smart Lead Scoring', icon: Target, desc: 'Train the deal scoring algorithm' }
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      // Logic to save to Supabase would go here
    }, 1500);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-8 reveal">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--t-border)] pb-8">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Bot size={36} className="text-[var(--t-primary)]" /> AI Training Studio
          </h1>
          <p className="text-[var(--t-text-muted)] mt-1">Refine and deploy high-performance real estate AI agents.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[var(--t-primary)] text-[var(--t-on-primary)] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(99,102,241,0.3)] disabled:opacity-50"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Deploy Model
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all text-left group ${
                activeSection === s.id 
                  ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] shadow-lg shadow-[var(--t-primary)]/5' 
                  : 'bg-[var(--t-surface)] border-[var(--t-border)] hover:border-[var(--t-primary)]/30'
              }`}
            >
              <div className={`p-3 rounded-xl transition-colors ${activeSection === s.id ? 'bg-[var(--t-primary)] text-[var(--t-on-primary)]' : 'bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]'}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className={`font-bold transition-colors ${activeSection === s.id ? 'text-white' : 'text-[var(--t-text-secondary)] group-hover:text-white'}`}>{s.label}</p>
                <p className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-wider mt-0.5">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--t-surface)] rounded-[2.5rem] border border-[var(--t-border)] p-10 min-h-[600px] relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--t-primary)]/5 blur-[100px] rounded-full pointer-events-none -mr-48 -mt-48" />

             {activeSection === 'model' && (
                <div className="space-y-8 reveal">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.4em] text-[var(--t-primary)]">
                    <Sparkles size={12} /> Model Intelligence
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">Choose Your Foundation</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                       { name: 'Gemini 2.0 Flash', desc: 'Superior speed & low latency for live chat.', recommended: true },
                       { name: 'Claude 3.5 Sonnet', desc: 'Best for complex logic & documentation.' },
                       { name: 'GPT-4o', desc: 'Well-rounded performance & reliability.' },
                       { name: 'Ollama Llama3 (Local)', desc: 'Privacy-focused local execution.' }
                     ].map((m) => (
                        <div key={m.name} className="p-6 rounded-2xl border border-[var(--t-border)] bg-[var(--t-background)]/50 cursor-pointer hover:border-[var(--t-primary)] transition-all group">
                           <div className="flex justify-between items-start mb-2 text-white font-bold">
                             {m.name}
                             {m.recommended && <span className="text-[9px] bg-[var(--t-primary)]/20 text-[var(--t-primary)] px-2 py-0.5 rounded-full">Recommended</span>}
                           </div>
                           <p className="text-sm text-[var(--t-text-muted)]">{m.desc}</p>
                        </div>
                     ))}
                  </div>
                </div>
             )}

             {activeSection === 'data' && (
                <div className="space-y-8 reveal">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.4em] text-indigo-400">
                    <Database size={12} /> Data Ingestion
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">Fine-Tuning Datasets</h2>
                  <div className="border-2 border-dashed border-[var(--t-border)] rounded-3xl p-12 text-center space-y-4 hover:border-indigo-500/50 transition-all cursor-pointer">
                    <Upload size={48} className="mx-auto text-[var(--t-text-muted)]" />
                    <div>
                      <p className="font-bold">Drop training logs here</p>
                      <p className="text-sm text-[var(--t-text-muted)]">Upload .csv, .json, or .txt exported from your CRM</p>
                    </div>
                  </div>
                </div>
             )}

             {activeSection === 'voice' && (
                <div className="space-y-8 reveal">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.4em] text-rose-400">
                    <Mic size={12} /> Auditory Intelligence
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">Voice AI Configuration</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-[var(--t-text-secondary)]">Speech-to-Text Engine</label>
                      <select className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-white outline-none">
                         <option>Web Speech API (Default)</option>
                         <option>Whisper-1 (OpenAI)</option>
                         <option>Deepgram (Enterprise)</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-[var(--t-text-secondary)]">Text-to-Speech Voice</label>
                      <select className="w-full bg-[var(--background)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-white outline-none">
                         <option>Ally (Warm/Professional)</option>
                         <option>James (Direct/Crisp)</option>
                         <option>Bot (Digital/Neutral)</option>
                      </select>
                    </div>
                  </div>
                </div>
             )}

             {activeSection === 'scoring' && (
                <div className="space-y-8 reveal">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.4em] text-emerald-400">
                    <Target size={12} /> Optimization
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">Smart Lead Scoring (SLS)</h2>
                  <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
                     <div className="flex items-center justify-between mb-6">
                       <h4 className="font-bold text-emerald-400">Weightage Configuration</h4>
                       <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase">Enabled</span>
                     </div>
                     <div className="space-y-6">
                       {[
                         { label: 'Time Since Last Contact', weight: 85 },
                         { label: 'Equity Percentage', weight: 92 },
                         { label: 'Motivation Indicator Keywords', weight: 78 },
                         { label: 'Property Age & Condition', weight: 45 }
                       ].map((item) => (
                         <div key={item.label} className="space-y-2">
                           <div className="flex justify-between text-xs font-bold">
                             <span>{item.label}</span>
                             <span>{item.weight}%</span>
                           </div>
                           <div className="h-2 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.weight}%` }} />
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
             )}

             {/* default view */}
             {(activeSection === 'personality' || activeSection === 'knowledge') && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                  <Bot size={64} />
                   <h3 className="text-xl font-bold uppercase italic tracking-tighter">{activeSection.toUpperCase()} ENGINE</h3>
                   <p className="max-w-md text-sm">Fine-tuning the {activeSection} module is currently in progress. Changes here will effect all OS Bot instances across your dashboard.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITrainingStudio;
