import { 
  Check, Shield, Zap, Globe, Bot as Brain
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CRMCompare() {
  const competitors = [
    { name: 'PropStream', color: 'blue' },
    { name: 'Wise Agent', color: 'green' },
    { name: 'RealGeeks', color: 'indigo' },
    { name: 'Follow Up Boss', color: 'purple' }
  ];

  const features = [
    { name: 'AI Lead Triage', ws: true, others: [false, false, false, false] },
    { name: 'Built-in Skip Tracing', ws: true, others: [true, false, false, false] },
    { name: 'Unlimited AI Credits*', ws: true, others: [false, false, false, false] },
    { name: 'Integrated SMS Inbox', ws: true, others: [false, true, true, true] },
    { name: 'Custom AI Personality', ws: true, others: [false, false, false, false] },
    { name: 'Public Lead Sharing', ws: true, others: [false, false, false, false] },
    { name: 'Voice AI Automations', ws: true, others: [false, false, false, false] },
    { name: 'White Label Option', ws: true, others: [false, false, false, false] },
    { name: 'Zero Setup Fees', ws: true, others: [true, true, false, false] },
  ];

  return (
    <div className="pb-32 bg-[#0f172a]">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-black mb-8 italic tracking-tighter">
          The Last CRM You'll <span className="text-blue-500">Ever Need.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
          Stop stitching together 5 different tools. WholeScale OS is the only platform that combines AI, skip tracing, and full-stack communications into one sovereign infrastructure.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="rounded-[3rem] bg-[#121a2d]/50 border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-10 px-8 text-xs font-black uppercase tracking-[0.2em] text-gray-500">Feature Infrastructure</th>
                <th className="py-10 px-8 text-center bg-blue-600/10">
                   <div className="text-xl font-black italic mb-1">WholeScale <span className="text-blue-500">OS</span></div>
                   <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">The Standard</div>
                </th>
                {competitors.map((c, i) => (
                  <th key={i} className="py-10 px-8 text-center">
                    <div className="text-sm font-bold text-gray-400">{c.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {features.map((f, fIdx) => (
                <tr key={fIdx} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                  <td className="py-8 px-8 font-bold text-gray-300">{f.name}</td>
                  <td className="py-8 px-8 text-center bg-blue-600/5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
                      <Check size={20} strokeWidth={3} />
                    </div>
                  </td>
                  {f.others.map((v, vIdx) => (
                    <td key={vIdx} className="py-8 px-8 text-center">
                      {v ? (
                        <div className="w-6 h-6 rounded-full bg-gray-500/10 text-gray-500 flex items-center justify-center mx-auto border border-white/5">
                          <Check size={14} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="text-gray-700 font-black">â€”</div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="mt-40 grid md:grid-cols-3 gap-12 max-w-7xl mx-auto px-6">
        {[
          { 
            icon: Brain, 
            title: 'Sovereign AI', 
            desc: 'Don\'t settle for static scripts. Our AI learns your voice and handles the heavy lifting of lead triage while you sleep.' 
          },
          { 
            icon: Shield, 
            title: 'Infrastructure Integrity', 
            desc: 'Own your data. No hidden middle-men processing your leads. Pure, direct connection to your business growth.' 
          },
          { 
            icon: Zap, 
            title: 'Instant Skip Tracing', 
            desc: 'The best data in the industry, integrated directly into your workflow. No more CSV exports and imports.' 
          }
        ].map((p, i) => (
          <div key={i} className="space-y-6 reveal">
            <div className="w-16 h-16 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-600/5">
              <p.icon size={32} />
            </div>
            <h3 className="text-2xl font-bold">{p.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{p.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-40 max-w-5xl mx-auto px-6">
        <div className="rounded-[4rem] p-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Globe size={200} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to upgrade your infrastructure?</h2>
          <p className="text-blue-100 mb-12 text-lg max-w-2xl mx-auto">
            Join 5,000+ elite agents who have digitized their entire operation with WholeScale OS.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/login?signup=true" className="px-10 py-5 rounded-2xl bg-white text-blue-600 font-bold hover:scale-105 transition-all shadow-xl shadow-black/20">
              Start Your Free Trial
            </Link>
            <Link to="/contact" className="px-10 py-5 rounded-2xl bg-blue-800/30 text-white font-bold border border-white/20 hover:bg-blue-800/40 transition-all">
              Book a Strategy Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
