import { 
  Globe, Smartphone, 
  Cpu, Layers, Zap, Lock, Database
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Integrations() {
  const { currentUser } = useStore();

  const integrations = [
    { 
      id: 'google-suite',
      name: 'Google Ecosystem', 
      desc: 'Seamlessly sync with Gmail, Calendar, and Google Tasks.',
      icon: Globe,
      connected: !!currentUser, // Placeholder for actual connection logic
      status: 'Active',
      type: 'Core'
    },
    { 
      id: 'gemini-ai',
      name: 'Google Gemini AI', 
      desc: 'Power your lead triage and SMS replies with state-of-the-art LLMs.',
      icon: Cpu,
      connected: !!localStorage.getItem('user_gemini_api_key'),
      status: 'Connected',
      type: 'AI'
    },
    { 
      id: 'brevo-sms',
      name: 'Brevo SMS', 
      desc: 'Transactional SMS infrastructure for reliable delivery.',
      icon: Smartphone,
      connected: true,
      status: 'System Default',
      type: 'Communication'
    },
    { 
      id: 'zapier',
      name: 'Zapier', 
      desc: 'Connect WholeScale OS to 5,000+ other apps.',
      icon: Zap,
      connected: false,
      status: 'Coming Soon',
      type: 'Automation'
    },
    { 
      id: 'supabase',
      name: 'Cloud Infrastructure', 
      desc: 'Sovereign database and real-time synchronization.',
      icon: Database,
      connected: true,
      status: 'Active',
      type: 'Infrastructure'
    }
  ];

  return (
    <div className="pb-32 bg-[#0f172a] text-white">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-black mb-8 italic tracking-tighter">
          Connected <span className="text-indigo-500">Infrastructure.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
          WholeScale OS isn't just a silo. It's the central nervous system for your real estate operation, deeply integrated with the tools you already use.
        </p>
      </section>

      {/* Integration Grid */}
      <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {integrations.map((item) => (
          <div 
            key={item.id} 
            className="group p-8 rounded-[2.5rem] bg-[#121a2d]/50 border border-white/5 hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-indigo-500/5 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <item.icon size={32} />
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                item.status === 'Coming Soon' ? 'bg-gray-500/10 text-gray-500' : 'bg-green-500/10 text-green-500'
              }`}>
                {item.status}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold">{item.name}</h3>
                {item.type && <span className="text-[10px] text-gray-500 font-bold uppercase">{item.type}</span>}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">{item.desc}</p>
              
              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.connected ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
                  <span className="text-xs font-bold text-gray-500">
                    {item.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {item.status !== 'Coming Soon' && (
                  <button className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
                    Manage →
                  </button>
                )}
              </div>
            </div>

            {/* Subtle background icon */}
            <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
              <item.icon size={120} />
            </div>
          </div>
        ))}
      </section>

      {/* API Reference */}
      <section className="mt-40 max-w-7xl mx-auto px-6">
        <div className="rounded-[4rem] p-16 bg-[#121a2d] border border-white/5 flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
          <div className="flex-1 space-y-8">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/10 text-indigo-400 text-xs font-bold uppercase tracking-widest">
               <Layers size={16} /> Developer Protocol
             </div>
             <h2 className="text-4xl md:text-5xl font-black italic">Open Infrastructure <span className="text-indigo-500">for Power Users.</span></h2>
             <p className="text-gray-400 leading-relaxed">
               Every feature in WholeScale OS is built on a sovereign API layer. Whether you're building custom automations or deep data synchronizations, our infrastructure is open to your growth.
             </p>
             <div className="flex items-center gap-8">
               <div className="flex items-center gap-3">
                 <Zap className="text-indigo-500" size={20} />
                 <span className="text-sm font-bold">Real-time Webhooks</span>
               </div>
               <div className="flex items-center gap-3">
                 <Lock className="text-indigo-500" size={20} />
                 <span className="text-sm font-bold">mTLS Encryption</span>
               </div>
             </div>
          </div>
          <div className="flex-1 w-full max-w-md bg-black/40 rounded-3xl p-8 border border-white/10 font-mono text-xs text-indigo-300 shadow-inner">
            <pre className="overflow-x-auto">
{`{
  "integration": "BREVO_GATEWAY",
  "status": "protocol_active",
  "uptime": "99.999%",
  "latency": "12ms",
  "auth": "HS256_SOVEREIGN"
}`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
