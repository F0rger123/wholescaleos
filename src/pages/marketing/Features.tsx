import { 
  Bot, Users, Layers, Zap, Shield, BarChart3, 
  Map as MapIcon, Mail, MessageSquare, 
  Smartphone, Globe, LayoutDashboard, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  const sections = [
    {
      title: 'AI-Powered Automation',
      subtitle: 'Intelligence at the Edge',
      icon: Bot,
      color: 'blue',
      features: [
        { name: 'Multimodal SMS Analysis', desc: 'Our proprietary AI extracts intent, sentiment, and key property data from every incoming text in milliseconds.', icon: MessageSquare },
        { name: 'Smart AI Context Replies', desc: 'Draft professional, context-aware responses instantly, maintaining your brand voice across all channels.', icon: Sparkles },
        { name: 'Automated Lead Triage', desc: 'Let the system handle the grunt work. Leads are tagged, scored, and routed without you lifting a finger.', icon: Zap },
        { name: 'Voice-to-Task Conversion', desc: 'Speak your tasks into existence. Our AI converts voice notes into actionable Kanban items.', icon: Bot },
      ]
    },
    {
      title: 'Operations & Strategy',
      subtitle: 'Command and Control',
      icon: Layers,
      color: 'indigo',
      features: [
        { name: 'Geospatial Intelligence', desc: 'Visualize your entire portfolio with high-precision mapping and heat-maps of market activity.', icon: MapIcon },
        { name: 'Advanced Deal Logic', desc: 'Built-in calculators for Wholesale, Fix & Flip, and Rental properties with scenario persistence.', icon: BarChart3 },
        { name: 'Unified CRM Protocol', desc: 'A sovereign data hub where you own every lead, message, and transaction record. No platform lock-in.', icon: LayoutDashboard },
        { name: 'Global Import Engine', desc: 'Seamlessly ingest data from CSVs, PDFs, or live property URLs with 99.9% extraction accuracy.', icon: Globe },
      ]
    },
    {
      title: 'Team Synchronization',
      subtitle: 'High-Velocity Collaboration',
      icon: Users,
      color: 'purple',
      features: [
        { name: 'Encrypted Team Channels', desc: 'Secure, real-time communication infrastructure for localized and distributed teams.', icon: Users },
        { name: 'Permission Architecture', desc: 'Fine-grained, role-based access control (RBAC) to protect your most sensitive business data.', icon: Shield },
        { name: 'Unified Schedules', desc: 'Sync calendars across Gmail and Outlook to eliminate appointment friction and double-bookings.', icon: Smartphone },
        { name: 'Enterprise Email Relay', desc: 'Connect your own domains via Resend or SendGrid for 100% deliverability on outbound campaigns.', icon: Mail },
      ]
    }
  ];

  return (
    <div className="bg-[#0f172a] text-white overflow-hidden pb-40">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 text-center px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Sparkles size={12} /> Engineering the Future
          </div>
          <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter">
            Feature <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Mastery.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Every tool in the OS is engineered for maximum leverage. <br className="hidden md:block"/> No feature is fluff. Every pixel is profit.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      <div className="max-w-7xl mx-auto px-6 space-y-40">
        {sections.map((section, idx) => (
          <div key={idx} className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-20 items-center`}>
            <div className="flex-1 space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-widest text-[10px]">
                  <div className={`p-2 rounded-lg bg-${section.color}-500/10 border border-${section.color}-500/20`}>
                    <section.icon size={16} />
                  </div>
                  {section.subtitle}
                </div>
                <h2 className="text-4xl md:text-6xl font-black italic tracking-tight">{section.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-12">
                {section.features.map((feature, fIdx) => (
                  <div key={fIdx} className="group cursor-default">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-blue-500 group-hover:scale-110 transition-transform duration-300">
                        <feature.icon size={20} />
                      </div>
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{feature.name}</h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full relative group">
              <div className={`absolute inset-0 bg-${section.color}-600/10 blur-[100px] rounded-full group-hover:bg-${section.color}-600/20 transition-all duration-700 opacity-50`} />
              <div className="relative aspect-[4/3] rounded-[3rem] bg-[#121a2d] border border-white/5 shadow-2xl overflow-hidden flex items-center justify-center p-12">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                 <section.icon size={160} className={`text-${section.color}-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700`} />
                 
                 {/* Floating bits to make it look "premium" */}
                 <div className="absolute top-10 right-10 w-24 h-24 rounded-2xl bg-white/5 border border-white/5 animate-bounce-slow" />
                 <div className="absolute bottom-10 left-10 w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/10 animate-pulse" />
                 
                 <div className="relative text-center z-10">
                   <div className="inline-block p-4 rounded-3xl bg-[#0f172a]/90 border border-white/10 backdrop-blur-xl shadow-2xl">
                     <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
                     <p className="text-sm font-bold text-green-400 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                       Optimized & Ready
                     </p>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <section className="mt-40 max-w-5xl mx-auto px-6">
        <div className="p-12 md:p-20 rounded-[4rem] bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden text-center shadow-[0_50px_100px_rgba(37,99,235,0.3)]">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
           <div className="relative z-10 space-y-10">
             <h2 className="text-4xl md:text-7xl font-black italic text-white tracking-tighter">Stop Juggling. <br /> Start Compounding.</h2>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
               <Link 
                 to="/pricing"
                 className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white text-blue-600 text-xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center"
               >
                 Initialize Your OS
               </Link>
               <button className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white/10 border border-white/20 text-white text-xl font-bold backdrop-blur-md">
                 Book Enterprise Demo
               </button>
             </div>
           </div>
        </div>
      </section>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
