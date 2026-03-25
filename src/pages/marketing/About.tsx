import { Target, Heart, Sparkles, Building2 } from 'lucide-react';

export default function About() {
  return (
    <div className="pb-32">
      <section className="pt-20 pb-32 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-4xl md:text-6xl font-bold mb-8">Our Mission: <span className="text-blue-500">Unlocking Scale</span></h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
          We believe that every real estate professional deserves the tools to operate at the 
          highest level. WholeScale OS was built to eliminate the friction of manual operations, 
          allowing you to focus on what matters: building relationships and closing deals.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 mb-32">
        {[
          { icon: Target, title: 'Precision', desc: 'Every feature is engineered for accuracy, from deal calculations to AI insights.' },
          { icon: Sparkles, title: 'Innovation', desc: "We leverage the latest in AI and cloud technology to keep you ahead of the market." },
          { icon: Heart, title: 'User First', desc: 'Our platform is designed by real estate professionals, for real estate professionals.' }
        ].map((value, i) => (
          <div key={i} className="p-8 rounded-3xl bg-[#1e293b]/30 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto mb-6">
              <value.icon size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">{value.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{value.desc}</p>
          </div>
        ))}
      </div>

      <section className="max-w-4xl mx-auto px-6 bg-[#1e293b]/20 rounded-[40px] border border-white/5 p-12 md:p-20">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center shrink-0 shadow-2xl shadow-blue-600/20">
            <Building2 size={48} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-6 italic">"The real estate industry is changing. The winners will be those who embrace automation without losing the human touch."</h2>
            <p className="text-blue-400 font-bold">— The WholeScale Team</p>
          </div>
        </div>
      </section>
    </div>
  );
}
