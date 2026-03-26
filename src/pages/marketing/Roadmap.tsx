import { 
  Zap, Bot as Brain, Shield, Rocket, 
  Target, Globe, Sparkles, Code
} from 'lucide-react';

export default function Roadmap() {
  const steps = [
    {
      quarter: 'Q1 2024',
      status: 'Completed',
      items: [
        'AI Triage Engine Alpha',
        'Multi-Carrier SMS Integration',
        'Custom Theme Engine v2',
        'Team Collaboration Suite'
      ],
      icon: Target
    },
    {
      quarter: 'Q2 2024',
      status: 'Current Focus',
      items: [
        'Voice AI Beta Launch',
        'Automated Skip Tracing API',
        'Advanced Analytics Dashboard',
        'Marketing Automation Pro'
      ],
      icon: Rocket,
      active: true
    },
    {
      quarter: 'Q3 2024',
      status: 'Planned',
      items: [
        'White Label Infrastructure',
        'AI Video Outreach Beta',
        'Mobile App (iOS & Android)',
        'Enterprise API Access'
      ],
      icon: Globe
    },
    {
      quarter: 'Q4 2024',
      status: 'Future',
      items: [
        'Global Expansion',
        'Web3 Data Integrity v1',
        'AI Real Estate Agent v1',
        'Open Marketplace'
      ],
      icon: Sparkles
    }
  ];

  return (
    <div className="pb-32 bg-[#0f172a]">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-black mb-8 italic tracking-tighter">
          The Future of <span className="text-blue-500">Real Estate.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
          We are building the sovereign infrastructure for the modern real estate empire. 
          See where we're headed and join us in defining the next era of growth.
        </p>
      </section>

      {/* Roadmap Timeline */}
      <section className="max-w-5xl mx-auto px-6">
        <div className="space-y-12">
          {steps.map((s, i) => (
            <div key={i} className={`relative flex gap-8 group ${s.active ? 'scale-105' : ''}`}>
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                  s.status === 'Completed' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                  s.active ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-600/30' :
                  'bg-white/5 border-white/10 text-gray-500'
                }`}>
                  <s.icon size={28} />
                </div>
                {i !== steps.length - 1 && (
                  <div className="w-1 flex-1 bg-gradient-to-b from-blue-600/20 to-transparent my-4 rounded-full" />
                )}
              </div>
              
              <div className={`flex-1 p-8 rounded-[2.5rem] border transition-all duration-500 ${
                s.active ? 'bg-[#1e293b] border-blue-500/50 shadow-2xl' : 'bg-[#121a2d] border-white/5 hover:border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">{s.quarter}</h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    s.status === 'Completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    s.active ? 'bg-blue-500 text-white animate-pulse' :
                    'bg-white/5 text-gray-500 border border-white/5'
                  }`}>
                    {s.status}
                  </span>
                </div>
                
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {s.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-gray-400">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'Completed' ? 'bg-green-500' : s.active ? 'bg-blue-500' : 'bg-gray-600'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mt-40 max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold mb-16">Built with Sovereign Technology</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Brain, label: 'Gemini AI', desc: 'Predictive Analysis' },
            { icon: Shield, label: 'Supabase', desc: 'Real-time Security' },
            { icon: Zap, label: 'Vite', desc: 'Instant Rendering' },
            { icon: Code, label: 'REST API', desc: 'Full Extensibility' }
          ].map((t, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all">
              <t.icon size={32} className="mx-auto mb-4 text-blue-500" />
              <div className="font-bold text-lg mb-1">{t.label}</div>
              <div className="text-xs text-gray-500">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
