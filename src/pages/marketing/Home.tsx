import { Link } from 'react-router-dom';
import {
  ArrowRight, Shield, Zap, Users, MessageSquare,
  LayoutDashboard, Map
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center max-w-4xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-5 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
              <Zap size={14} className="fill-current" /> Part of the WholeScale Ecosystem
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              The <span className="text-blue-500">Sovereign</span> Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Real Estate Professionals.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-3xl mx-auto">
              Scale your wholesale, creative finance, or traditional brokerage with AI-powered automation
              and a secure, private infrastructure designed for elite performance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login?signup=true"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-lg font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30"
              >
                Start for Free <ArrowRight size={20} />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-lg font-bold transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>

          /* Hero Visual */
          <div className="relative animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 blur-[100px] opacity-10 animate-pulse" />
            <div className="relative rounded-3xl border border-white/10 bg-[#1e293b]/50 backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <div className="ml-4 h-6 w-32 rounded bg-white/5" />
              </div>
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                alt="Dashboard Preview"
                className="rounded-xl border border-white/5 shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-32 bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to <span className="text-blue-500">DOMINATE</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Stop juggling multiple tools. WholeScale OS brings everything into one unified,
              AI-enhanced workspace.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: 'AI SMS Automation',
                desc: 'Gemini-powered conversation analysis, intent detection, and suggested replies built for speed.',
                icon: MessageSquare,
                color: 'blue'
              },
              {
                title: 'Agent Public Profiles',
                desc: 'Generate premium, high-converting public landing pages with QR codes and integrated lead capture.',
                icon: Users,
                color: 'indigo'
              },
              {
                title: 'Integrated CRM Hub',
                desc: 'A unified inbox for SMS and Email with AI-driven triage and threaded conversation history.',
                icon: LayoutDashboard,
                color: 'purple'
              },
              {
                title: 'Global Map View',
                desc: 'Visualize your entire portfolio and lead pipeline on a dynamic interactive map for geographic insights.',
                icon: Map,
                color: 'green'
              },
              {
                title: 'Visual Workflow Builder',
                desc: 'Automate complex real estate processes with an intuitive visual canvas for rapid scale.',
                icon: Zap,
                color: 'orange'
              },
              {
                title: 'Secure Infrastructure',
                desc: 'Your data is private, encrypted, and owned entirely by you. No platform lock-in or data sharing.',
                icon: Shield,
                color: 'red'
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-3xl bg-[#1e293b]/30 border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${feature.color}-500/10 text-${feature.color}-400 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* New Profile Showcase Callout */}
          <div className="rounded-[2.5rem] p-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                NEW Feature
              </div>
              <h3 className="text-3xl font-bold">Showcase Your Expertise with Agent Profiles</h3>
              <p className="text-gray-400 leading-relaxed">
                Generate professional public landing pages in seconds. Manage your bio, specialties,
                and social links from your dashboard. Includes built-in lead capture and QR codes
                for your physical marketing materials.
              </p>
              <Link to="/pricing" className="inline-flex items-center gap-2 text-blue-500 font-bold hover:text-blue-400 transition-colors">
                Learn more about Profiles <ArrowRight size={18} />
              </Link>
            </div>
            <div className="w-full md:w-96 aspect-[4/5] rounded-3xl bg-[#0f172a] shadow-2xl border border-white/10 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent z-10" />
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80"
                alt="Agent Profile Preview"
                className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-1000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-32 relative overflow-hidden bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold italic tracking-tight">Trusted by Leaders.</h2>
            <p className="text-gray-500">See why top performers choose WholeScaleOS to power their empire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
              <p className="text-gray-300 italic">"The AI SMS automation saved me 15 hours a week. I can focus on closing deals while the system handles the initial triage."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-500/30">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-bold">Jason Rivera</div>
                  <div className="text-[10px] text-gray-500 uppercase font-black">Elite Acquisitions</div>
                </div>
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-white/5 border border-blue-500/30 space-y-6 shadow-2xl shadow-blue-500/10 scale-105 z-10">
              <p className="text-gray-300 italic">"The sovereign OS approach is what I've been waiting for. My data, my rules, and the most powerful AI I've ever used in real estate."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-500/30">
                  <img src="/assets/testimonials/agent-2.png" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-bold">Sarah Jenkins</div>
                  <div className="text-[10px] text-blue-500 uppercase font-black">Jenkins Realty Group</div>
                </div>
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
              <p className="text-gray-300 italic">"The new Agent Profiles are a game changer. My conversion rate on flyers went up 40% after adding the profile QR code."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-500/30">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-bold">Marcus Thorne</div>
                  <div className="text-[10px] text-gray-500 uppercase font-black">Thorne Investors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-4">Trusted by industry leaders.</h2>
            <p className="text-gray-400">Join 500+ real estate teams scaling their business with WholeScale OS.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all">
            {/* Mock Partner Logos */}
            <div className="flex items-center gap-2 font-bold text-xl"><Shield size={24} /> SECURE</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Zap size={24} /> VELOCITY</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Users size={24} /> NETWORK</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600 opacity-5" />
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-8">Ready to transform your business?</h2>
          <p className="text-xl text-gray-400 mb-12">
            Experience the future of real estate operations today.
            No credit card required to start.
          </p>
          <Link
            to="/login?signup=true"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-[#0f172a] text-xl font-bold hover:bg-gray-200 transition-all hover:scale-105"
          >
            Start Free Trial <ArrowRight size={24} />
          </Link>
        </div>
      </section>
    </div>
  );
}
