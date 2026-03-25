import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Shield, Zap, Users, MessageSquare,
  LayoutDashboard, Map, Sparkles, TrendingUp, Clock, 
  PlayCircle, BarChart3
} from 'lucide-react';

export default function Home() {
  const [dealsPerMonth, setDealsPerMonth] = useState(2);
  const [avgProfitPerDeal, setAvgProfitPerDeal] = useState(15000);

  const calculateROI = () => {
    const monthlyGains = dealsPerMonth * avgProfitPerDeal * 0.2; // Assuming 20% efficiency increase
    const annualGains = monthlyGains * 12;
    return {
      monthly: monthlyGains.toLocaleString(),
      annual: annualGains.toLocaleString()
    };
  };

  const roi = calculateROI();

  return (
    <div className="flex flex-col bg-[#0f172a] text-white selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-pulse">
              <Sparkles size={12} /> Elite Real Estate Infrastructure
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
              Scale Your <span className="text-blue-500">Empire</span> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">On Autopilot.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
              The Sovereign Operating System for high-volume real estate teams. 
              Own your data. Automate your triage. Build your legacy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/login?signup=true"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-lg font-black transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(37,99,235,0.3)] group"
              >
                Get Started Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-lg font-bold transition-all flex items-center justify-center gap-3">
                <PlayCircle size={20} /> Watch Demo
              </button>
            </div>
          </div>

          {/* Hero Visual - Premium CSS Mockup */}
          <div className="relative max-w-6xl mx-auto">
            <div className="absolute inset-0 bg-blue-500/20 blur-[120px] opacity-20" />
            <div className="relative rounded-[2.5rem] border border-white/10 bg-[#121a2d]/80 backdrop-blur-3xl p-3 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="bg-[#0f172a] rounded-[2rem] border border-white/5 aspect-[16/9] flex overflow-hidden">
                {/* Mock Sidebar */}
                <div className="w-20 border-r border-white/5 flex flex-col items-center py-6 gap-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500"><LayoutDashboard size={20} /></div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600"><Users size={20} /></div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600"><Map size={20} /></div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600"><MessageSquare size={20} /></div>
                </div>
                {/* Mock Main Content */}
                <div className="flex-1 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-6 w-32 bg-white/5 rounded-full" />
                    <div className="h-8 w-8 rounded-full bg-blue-500/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 aspect-video rounded-3xl bg-blue-600/5 border border-blue-500/10 relative overflow-hidden flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 size={48} className="text-blue-500/30 mx-auto mb-4" />
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Analytics Dashboard</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-32 rounded-2xl bg-white/5 border border-white/5 p-4">
                        <div className="h-1.5 w-12 bg-green-500/20 rounded-full mb-3" />
                        <div className="h-3 w-full bg-white/5 rounded-full mb-2" />
                        <div className="h-3 w-2/3 bg-white/5 rounded-full" />
                      </div>
                      <div className="h-32 rounded-2xl bg-white/5 border border-white/5 p-4">
                        <div className="h-1.5 w-12 bg-blue-500/20 rounded-full mb-3" />
                        <div className="h-3 w-full bg-white/5 rounded-full mb-2" />
                        <div className="h-3 w-2/3 bg-white/5 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Overlay text for mockup */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-center p-8 rounded-3xl bg-[#0f172a]/90 border border-white/10 shadow-2xl">
                  <h3 className="text-xl font-bold mb-2">Live Screenshot Coming Soon</h3>
                  <p className="text-gray-500 text-sm">We're updating our platform with new features.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 bg-[#0b1120] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                Designed for the <br /> 
                <span className="text-blue-500">1% of Closers.</span>
              </h2>
              <div className="space-y-8">
                {[
                  { icon: Clock, title: 'Speed is the Variable', desc: 'AI triage handles incoming leads in milliseconds. Never let a motivated seller go cold while you sleep.' },
                  { icon: Shield, title: 'Absolute Privacy', desc: 'Your data is encrypted and sovereign. No more platform fees for data you created.' },
                  { icon: TrendingUp, title: 'Compound Growth', desc: 'Automate the busy work and focus 100% of your energy on high-leverage deal negotiations.' }
                ].map((benefit, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                      <benefit.icon size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                      <p className="text-gray-500 leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="aspect-square rounded-3xl bg-blue-600 p-8 flex flex-col justify-end">
                  <div className="text-4xl font-black mb-2">90%</div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">Manual Triage Reduced</div>
                </div>
                <div className="aspect-square rounded-3xl bg-[#1e293b] border border-white/5" />
              </div>
              <div className="space-y-4">
                 <div className="aspect-square rounded-3xl bg-[#1e293b] border border-white/5" />
                 <div className="aspect-square rounded-3xl bg-indigo-600 p-8 flex flex-col justify-end">
                  <div className="text-4xl font-black mb-2">2.5x</div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">Conversion Rate Increase</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-32 bg-[#0b1120]/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Calculate Your Leverage</h2>
            <p className="text-gray-400">See how much time and revenue you're leaving on the table.</p>
          </div>
          <div className="p-12 rounded-[3.5rem] bg-[#121a2d] border border-blue-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5"><Zap size={200} /></div>
            <div className="grid md:grid-cols-2 gap-16 relative z-10">
              <div className="space-y-12">
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-[#4b5563] mb-6">Deals Closed Per Month</label>
                  <input 
                    type="range" 
                    min="1" max="50" 
                    value={dealsPerMonth} 
                    onChange={(e) => setDealsPerMonth(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="mt-4 text-3xl font-black text-blue-500">{dealsPerMonth} <span className="text-sm text-gray-500">Deals</span></div>
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-[#4b5563] mb-6">Average Profit Per Deal</label>
                  <input 
                    type="range" 
                    min="5000" max="100000" step="5000"
                    value={avgProfitPerDeal} 
                    onChange={(e) => setAvgProfitPerDeal(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="mt-4 text-3xl font-black text-blue-500">${avgProfitPerDeal.toLocaleString()} <span className="text-sm text-gray-500">Profit</span></div>
                </div>
              </div>
              <div className="flex flex-col justify-center bg-blue-500/5 rounded-3xl p-8 border border-blue-500/10">
                <div className="space-y-8">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Estimated Monthly Gain</div>
                    <div className="text-5xl font-black text-white">${roi.monthly}</div>
                    <div className="text-[10px] text-green-400 font-bold mt-2 uppercase">Based on 20% efficiency increase</div>
                  </div>
                  <div className="pt-8 border-t border-white/5">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Estimated Annual Gain</div>
                    <div className="text-5xl font-black text-blue-500">${roi.annual}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Built for <span className="text-blue-500">Scale.</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">One platform. Every tool. Zero friction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'AI Automation Hub', desc: 'Auto-pilot your triage with Gemini-powered analysis and suggested replies.', icon: Sparkles },
              { title: 'Interactive Map View', desc: 'Visualize your entire portfolio and lead pipeline with high-precision mapping.', icon: Map },
              { title: 'Integrated CRM Hub', desc: 'A unified inbox for SMS and Email with AI-driven triage and threaded history.', icon: LayoutDashboard },
              { title: 'Elite Task Engine', desc: 'Kanban-style task tracking designed for high-velocity real estate teams.', icon: BarChart3 },
              { title: 'Custom Agent Profiles', desc: 'Generate high-converting public landing pages with QR codes in seconds.', icon: Users },
              { title: 'Secure Sovereign Data', desc: 'Absolute ownership of your data with enterprise-grade encryption.', icon: Shield }
            ].map((f, i) => (
              <div key={i} className="group p-10 rounded-[2.5rem] bg-[#121a2d] border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 mb-8 font-black group-hover:scale-110 transition-transform">
                  <f.icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold italic mb-4">Trusted by Empire Builders.</h2>
            <p className="text-gray-500 text-sm">Join the next generation of real estate operations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 italic text-gray-400">
               "WholeScale OS is why we're closing 3x more deals. The AI triage is like having a second brain that never sleeps."
            </div>
            <div className="p-8 rounded-3xl bg-blue-600 italic text-white shadow-2xl shadow-blue-600/20">
               "The absolute best ROI of any tool I've used in 10 years. Our team communications are finally centralized."
            </div>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 italic text-gray-400">
               "The sovereign data approach is what real estate needed. My data, my rules, and incredible speed."
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 relative overflow-hidden bg-blue-600">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-800" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-10 text-white tracking-tighter italic">Ready to Own the Market?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/login?signup=true" className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white text-blue-600 text-xl font-black shadow-2xl hover:scale-105 transition-all">
              Start Free Trial
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white/10 border border-white/20 text-white text-xl font-bold backdrop-blur-md">
              View All Tiers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
