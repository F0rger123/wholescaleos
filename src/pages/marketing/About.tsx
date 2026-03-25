import { Target, Sparkles, Building2, Shield, Users, Zap } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-[#0f172a] text-white selection:bg-blue-500/30 pb-32">
      {/* Hero Section */}
      <section className="pt-32 pb-24 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter">
            The <span className="text-blue-500">Sovereign</span> <br /> Blueprint.
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium">
            We're not just another CRM. We're building the infrastructure for the next generation of real estate empires.
          </p>
        </div>
      </section>

      {/* Why We Built This */}
      <section className="max-w-7xl mx-auto px-6 mb-40">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-black italic">Why we built WholeScale OS</h2>
            <p className="text-gray-400 leading-relaxed">
              In 2023, we saw a massive gap in the market. Legacy CRMs were bloated, slow, and most importantly, they held your data hostage. 
              We started as a internal tool for high-volume wholesalers who needed to triage thousands of leads without losing their minds.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Today, WholeScale OS has evolved into a complete infrastructure stack for all real estate professionals—from solo agents to national agencies. 
              Our philosophy remains the same: <strong>Speed, Sovereignty, and Scale.</strong>
            </p>
          </div>
          <div className="p-1 rounded-[3rem] bg-gradient-to-br from-blue-600/20 to-transparent border border-white/10 overflow-hidden">
             <div className="bg-[#121a2d] rounded-[2.8rem] p-12 aspect-[4/3] flex items-center justify-center">
                <Building2 size={120} className="text-blue-500/20" />
             </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 mb-40">
        <div className="p-10 rounded-[3rem] bg-[#121a2d] border border-blue-500/20 space-y-6">
           <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><Target size={32} /></div>
           <h3 className="text-2xl font-black italic">Our Mission</h3>
           <p className="text-gray-400 leading-relaxed">
             Empower real estate professionals with state-of-the-art AI infrastructure to eliminate manual triage and maximize closing velocity.
           </p>
        </div>
        <div className="p-10 rounded-[3rem] bg-[#121a2d] border border-indigo-500/20 space-y-6">
           <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500"><Sparkles size={32} /></div>
           <h3 className="text-2xl font-black italic">Our Vision</h3>
           <p className="text-gray-400 leading-relaxed">
             To become the definitive operating system for real estate, where every transaction is powered by sovereign data and intelligent automation.
           </p>
        </div>
      </section>

      {/* Values */}
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 mb-40">
        {[
          { icon: Zap, title: 'Extreme Speed', desc: 'Milliseconds matter. Our triage engine is built for the fastest response times in the industry.' },
          { icon: Shield, title: 'Data Sovereignty', desc: "Your data is yours. We provide the infrastructure, you provide the empire." },
          { icon: Users, title: 'Small Team, Big Impact', desc: "We're a small team of engineers and operators passionate about real estate tech." }
        ].map((value, i) => (
          <div key={i} className="p-8 rounded-3xl bg-[#1e293b]/30 border border-white/5 text-center group hover:border-blue-500/30 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-white/5 text-blue-400 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <value.icon size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">{value.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{value.desc}</p>
          </div>
        ))}
      </div>

      <section className="max-w-4xl mx-auto px-6 bg-gradient-to-br from-blue-600/10 to-transparent rounded-[40px] border border-white/5 p-12 md:p-20 text-center">
         <h2 className="text-3xl font-black italic mb-6 leading-tight">
           "The industry is changing. The winners will be those who embrace automation without losing the human touch."
         </h2>
         <p className="text-blue-500 font-black uppercase tracking-widest text-xs">— The WholeScale Engineering Core</p>
      </section>
    </div>
  );
}
