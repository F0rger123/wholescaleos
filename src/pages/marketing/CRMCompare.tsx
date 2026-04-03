import { 
  Check, Shield, Zap, Globe, Bot as Brain
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CRMCompare() {
  const competitors = [
    { name: 'PropStream', color: 'blue', price: 99 },
    { name: 'Wise Agent', color: 'green', price: 32 },
    { name: 'Follow Up Boss', color: 'purple', price: 69 },
    { name: 'kvCORE', color: 'indigo', price: 499 }
  ];

  const features = [
    { name: 'Sovereign AI Assistant', ws: true, others: [false, false, false, true] },
    { name: 'Integrated SMS & WhatsApp', ws: true, others: [false, true, true, true] },
    { name: 'Google Calendar Sync', ws: true, others: [true, true, true, true] },
    { name: 'Team Collaboration Hub', ws: true, others: [false, true, true, true] },
    { name: 'Native iOS/Android App', ws: true, others: [true, true, true, true] },
    { name: 'White-Label Branding', ws: true, others: [false, false, false, false] },
    { name: 'Zero Setup Fees', ws: true, others: [true, true, false, false] },
  ];

  return (
    <div className="pb-32 bg-black text-[#dee5ff] selection:bg-indigo-500/30">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--t-primary-dim)] blur-[120px] rounded-full pointer-events-none opacity-20" />
        <h1 className="text-5xl md:text-7xl font-black mb-8 italic tracking-tighter">
          The Last CRM You'll <span className="text-[var(--t-primary)]">Ever Need.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
          Stop stitching together 5 different tools. WholeScale OS is the only platform that combines AI, skip tracing, and full-stack communications into one sovereign infrastructure.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="rounded-[3rem] bg-[#0a0a0a]/80 border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-10 px-8 text-xs font-black uppercase tracking-[0.2em] text-[var(--t-text-muted)]">Feature Infrastructure</th>
                <th className="py-10 px-8 text-center bg-[var(--t-primary-dim)]">
                   <div className="text-xl font-black italic mb-1">WholeScale <span className="text-[var(--t-primary)]">OS</span></div>
                   <div className="text-[10px] text-[var(--t-primary)] font-bold uppercase tracking-widest">The Standard</div>
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
                  <td className="py-8 px-8 font-bold text-[var(--t-text)]">{f.name}</td>
                  <td className="py-8 px-8 text-center bg-[var(--t-primary-dim)]/30">
                    <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] text-[var(--t-primary)] flex items-center justify-center mx-auto shadow-lg shadow-[var(--t-primary)]/10">
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
                        <div className="text-gray-700 font-black">—</div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              
              {/* Pricing Row */}
              <tr className="bg-white/[0.02] border-t-2 border-indigo-500/30">
                <td className="py-10 px-8">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Entry Price</div>
                  <div className="text-lg font-bold text-[var(--t-text)]">Monthly Cost</div>
                </td>
                <td className="py-10 px-8 text-center bg-[var(--t-primary-dim)]">
                  <div className="text-3xl font-black text-[var(--t-text)]">$27</div>
                  <div className="text-[10px] text-[var(--t-primary)] font-bold uppercase tracking-widest mt-1">Solo Plan</div>
                </td>
                {competitors.map((c, i) => {
                  const yearlySavings = (c.price - 27) * 12;
                  return (
                    <td key={i} className="py-10 px-8 text-center group">
                      <div className="text-xl font-bold text-gray-400">${c.price}</div>
                      {yearlySavings > 0 && (
                        <div className="mt-2 inline-block px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-500 uppercase tracking-tighter">
                          Save ${yearlySavings.toLocaleString()}/yr
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
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
            <div className="w-16 h-16 rounded-3xl bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] shadow-xl shadow-[var(--t-primary)]/5">
              <p.icon size={32} />
            </div>
            <h3 className="text-2xl font-bold">{p.title}</h3>
            <p className="text-[var(--t-text-muted)] leading-relaxed text-sm">{p.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-40 max-w-5xl mx-auto px-6">
        <div className="rounded-[4rem] p-16 bg-gradient-to-br from-[var(--t-primary)] to-[#000] text-center relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Globe size={200} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-8 text-white">Ready to upgrade your infrastructure?</h2>
          <p className="text-[var(--t-text-muted)] mb-12 text-lg max-w-2xl mx-auto">
            Join 5,000+ elite agents who have digitized their entire operation with WholeScale OS.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/login?signup=true" className="px-10 py-5 rounded-2xl bg-[var(--t-primary)] text-white font-bold hover:scale-105 transition-all shadow-xl shadow-black/20">
              Start Your Free Trial
            </Link>
            <Link to="/contact" className="px-10 py-5 rounded-2xl bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 transition-all">
              Book a Strategy Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
