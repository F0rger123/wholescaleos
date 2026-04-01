import React from 'react';
import { Bot, Upload, Database, Settings2, ShieldCheck, Sparkles, Plus } from 'lucide-react';

const AdminAITraining: React.FC = () => {
  const models = [
    { name: 'OS Lead Scorer v2.1', status: 'Active', accuracy: '94.2%', lastUpdate: '2h ago', icon: Sparkles },
    { name: 'Probate Specialist v1.0', status: 'Training', accuracy: '88.7%', lastUpdate: '1d ago', icon: Bot },
    { name: 'Market Analyzer Pro', status: 'Active', accuracy: '91.5%', lastUpdate: '3h ago', icon: Database }
  ];

  return (
    <div className="space-y-6 reveal">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model Status */}
        {models.map((model) => (
          <div key={model.name} className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 space-y-4 hover:border-[var(--t-primary)]/40 hover-glow transition-all">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-[var(--t-primary)]/10 text-[var(--t-primary)]">
                <model.icon size={20} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full ${model.status === 'Active' ? 'bg-[var(--t-success)]/10 text-[var(--t-success)]' : 'bg-[var(--t-warning)]/10 text-[var(--t-warning)]'}`}>
                {model.status}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-white">{model.name}</h4>
              <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-widest text-[var(--t-text-muted)]">
                <span>Accuracy: {model.accuracy}</span>
                <span>{model.lastUpdate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Data Upload */}
        <div className="bg-[var(--t-surface)] rounded-[2rem] border border-[var(--t-border)] p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Upload size={24} />
              </div>
              <h3 className="text-xl font-bold">Global Training Data</h3>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-all">
              <Plus size={16} /> Add Dataset
            </button>
          </div>

          <div className="space-y-4">
             {[
               { name: 'Property Records 2024.csv', size: '154MB', date: '2026-03-31' },
               { name: 'Lead Conversion Conversations.json', size: '24MB', date: '2026-03-28' },
               { name: 'Real Estate Strategy KB.pdf', size: '12MB', date: '2026-03-25' }
             ].map((file) => (
                <div key={file.name} className="p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-background)]/30 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Database size={16} className="text-[var(--t-text-muted)]" />
                    <div>
                      <p className="text-sm font-bold">{file.name}</p>
                      <p className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-widest">{file.size} • {file.date}</p>
                    </div>
                  </div>
                  <button className="p-2 opacity-0 group-hover:opacity-100 transition-all text-indigo-400 hover:text-indigo-300">
                    <Settings2 size={16} />
                  </button>
                </div>
             ))}
          </div>
        </div>

        {/* System Overrides */}
        <div className="bg-[var(--t-surface)] rounded-[2rem] border border-[var(--t-border)] p-8">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold">Model Deployment Controls</h3>
           </div>

           <div className="space-y-6">
              {[
                { label: 'Auto-retrain on new Conversions', status: true },
                { label: 'Allow Lead Scorer override', status: true },
                { label: 'Enable RAG-based context injection', status: true },
                { label: 'Require Admin approve on model swap', status: false }
              ].map((item) => (
                 <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-background)]/30 hover:border-[var(--t-primary)]/20 transition-all">
                    <span className="text-sm font-medium">{item.label}</span>
                    <button className={`w-10 h-5 rounded-full relative transition-colors ${item.status ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-subtle)]'}`}>
                       <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${item.status ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAITraining;
