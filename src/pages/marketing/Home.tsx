import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, LineChart, Line, BarChart, Bar 
} from 'recharts';
import {
  ArrowRight, Shield, Users, MessageSquare,
  LayoutDashboard, Map, Sparkles, TrendingUp, Clock, 
  PlayCircle, BarChart3, Award, Trophy
} from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useEffect, useRef } from 'react';

function StatCounter({ value, duration = 2000, suffix = '' }: { value: string | number, duration?: number, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(easedProgress * numericValue));
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [numericValue, duration]);

  return <>{displayValue.toLocaleString()}{suffix}</>;
}

export default function Home() {
  const [adminHours, setAdminHours] = useState(20);
  const [leadsPerMonth, setLeadsPerMonth] = useState(100);
  const [dealValue, setDealValue] = useState(15000);
  const [timeframe, setTimeframe] = useState(90);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('area');

  const benefitsReveal = useScrollReveal();
  const calculatorReveal = useScrollReveal();
  const leaderboardReveal = useScrollReveal();
  const featuresReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();
  const testimonialsReveal = useScrollReveal();

  const calculateTimeSaved = () => {
    const savedPerWeek = adminHours * 0.2;
    const savedPerYear = savedPerWeek * 52;
    const dollarValue = savedPerYear * 50;
    return { week: savedPerWeek.toFixed(1), year: Math.round(savedPerYear), dollars: dollarValue.toLocaleString() };
  };

  const calculateRetention = () => {
    const currentRetained = leadsPerMonth * 0.7; // 30% loss
    const osRetained = leadsPerMonth * 0.9; // 90% retention
    const extraLeads = osRetained - currentRetained;
    const extraRevenue = extraLeads * (dealValue * 0.05); // Assuming 5% conversion of those leads
    return { extra: Math.round(extraLeads), revenue: Math.round(extraRevenue).toLocaleString() };
  };

  const timeSaved = calculateTimeSaved();
  const retention = calculateRetention();

  const chartData = useMemo(() => {
    const data = [];
    const monthlyExtra = (leadsPerMonth * 0.2) * (dealValue * 0.05); // 20% more leads * 5% conv
    const steps = timeframe === 30 ? 4 : timeframe === 60 ? 8 : 12; // weeks
    
    for (let i = 0; i <= steps; i++) {
       const weekRevenue = (monthlyExtra / 4) * i;
       data.push({
         name: `Week ${i}`,
         revenue: Math.round(weekRevenue),
         traditional: Math.round(weekRevenue * 0.4)
       });
    }
    return data;
  }, [leadsPerMonth, dealValue, timeframe]);

  return (
    <div className="flex flex-col bg-[#060e20] text-[#dee5ff] selection:bg-indigo-500/30">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative animate-astral-hero">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles size={12} className="animate-pulse" /> Elite Real Estate Infrastructure
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
              Scale Your <span className="astral-gradient-text">Empire</span> <br />
              <span className="astral-gradient-text">On Autopilot.</span>
            </h1>
            <p className="text-xl text-[#a3aac4] mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
              The Sovereign Operating System for high-volume real estate teams. 
              Own your data. Automate your triage. Build your legacy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/login?signup=true"
                className="w-full sm:flex-1 md:flex-none md:w-64 px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-black transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(159,167,255,0.3)] group hover-glow hover-lift"
              >
                Get Started Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:flex-1 md:flex-none md:w-64 px-10 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-lg font-black transition-all flex items-center justify-center gap-3 hover-lift hover-glow-subtle hover:scale-105 active:scale-95"
              >
                <PlayCircle size={20} /> Watch Demo
              </button>
            </div>
          </div>

          {/* Hero Visual - Premium CSS Mockup */}
          <div className="relative max-w-6xl mx-auto mt-24">
            <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] opacity-20" />
            <div className="relative rounded-[2.5rem] border border-white/10 bg-[#0f1930]/60 backdrop-blur-3xl p-3 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden hover-lift">
              <div className="bg-[#060e20] rounded-[2rem] border border-white/5 aspect-[16/9] flex overflow-hidden">
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
                  <h3 className="text-xl font-bold mb-2">[Dashboard Preview - Coming Soon]</h3>
                  <p className="text-gray-500 text-sm">We're updating our platform with new features.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 bg-[#060e20] relative" ref={benefitsReveal.elementRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <div className={`transition-all duration-1000 ${benefitsReveal.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
              <h2 className="text-4xl md:text-6xl font-black mb-12 leading-tight">
                Designed for the <br /> 
                <span className="astral-gradient-text leading-[1.2]">1% of Closers.</span>
              </h2>
              <div className="space-y-8">
                {[
                  { icon: Clock, title: 'Speed is the Variable', desc: 'AI triage handles incoming leads in milliseconds. Never let a motivated seller go cold while you sleep.' },
                  { icon: Shield, title: 'Absolute Privacy', desc: 'Your data is encrypted and sovereign. No more platform fees for data you created.' },
                  { icon: TrendingUp, title: 'Compound Growth', desc: 'Automate the busy work and focus 100% of your energy on high-leverage deal negotiations.' }
                ].map((benefit, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-6 group hover-lift p-4 rounded-2xl transition-all duration-700 ${benefitsReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                      <benefit.icon size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">{benefit.title}</h3>
                      <p className="text-[#6d758c] leading-relaxed group-hover:text-[#a3aac4] transition-colors">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`grid grid-cols-2 gap-4 transition-all duration-1000 ${benefitsReveal.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
              <div className="space-y-4 pt-12">
                <div className="aspect-square rounded-[2rem] bg-indigo-600 p-8 flex flex-col justify-end shadow-[0_20px_40px_rgba(99,102,241,0.2)] hover-lift">
                  <div className="text-4xl font-black mb-2 italic">
                    {benefitsReveal.isVisible ? <StatCounter value={90} suffix="%" /> : '0%'}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Manual Triage Reduced</div>
                </div>
                <div className="aspect-square rounded-[2rem] bg-[#0f1930] border border-white/5 hover-lift" />
              </div>
              <div className="space-y-4">
                 <div className="aspect-square rounded-[2rem] bg-[#0f1930] border border-white/5 hover-lift" />
                 <div className="aspect-square rounded-[2rem] bg-purple-600 p-8 flex flex-col justify-end shadow-[0_20px_40px_rgba(168,85,247,0.2)] hover-lift">
                  <div className="text-4xl font-black mb-2 italic">
                    {benefitsReveal.isVisible ? <StatCounter value={2.5} suffix="x" /> : '0x'}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Conversion Rate Increase</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leverage Calculators */}
      <section className="py-32 bg-[#060e20]" ref={calculatorReveal.elementRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-1000 ${calculatorReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-6xl font-black mb-6">Calculate Your Leverage</h2>
            <p className="text-[#6d758c] text-lg max-w-xl mx-auto font-medium">See how much time and revenue you're leaving on the table.</p>
          </div>
          <div className={`grid md:grid-cols-2 gap-12 transition-all duration-1000 ${calculatorReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
            {/* Time Saved Calculator */}
            <div className="p-10 rounded-[3rem] bg-[#0f1930]/40 backdrop-blur-3xl border border-indigo-500/20 shadow-2xl space-y-10 hover-lift">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500"><Clock size={24} /></div>
                <h3 className="text-2xl font-black italic">Time Refined</h3>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#4b5563] mb-4">Admin Hours / Week</label>
                  <input 
                    type="range" min="1" max="40" value={adminHours}
                    onChange={(e) => setAdminHours(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="mt-4 text-3xl font-black text-blue-500">{adminHours} <span className="text-sm text-gray-400">Hours</span></div>
                </div>

                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase">Weekly Savings</span>
                    <span className="text-xl font-black text-white">{timeSaved.week}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase">Annual Savings</span>
                    <span className="text-xl font-black text-white">{timeSaved.year}h</span>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Yearly Leverage</span>
                    <span className="text-2xl font-black text-blue-500">${timeSaved.dollars}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Retention Calculator */}
            <div className="p-10 rounded-[3rem] bg-[#0f1930]/40 backdrop-blur-3xl border border-purple-500/20 shadow-2xl space-y-10 hover-lift relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                 <TrendingUp size={120} className="text-indigo-500" />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500"><TrendingUp size={24} /></div>
                  <h3 className="text-2xl font-black italic">Revenue Growth</h3>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                   {[30, 60, 90].map(d => (
                     <button 
                       key={d}
                       onClick={() => setTimeframe(d)}
                       className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${timeframe === d ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                     >
                       {d}D
                     </button>
                   ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-10 relative z-10">
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between mb-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#4b5563]">Leads / Month</label>
                      <span className="text-xs font-bold text-indigo-400">{leadsPerMonth}</span>
                    </div>
                    <input 
                      type="range" min="1" max="500" value={leadsPerMonth}
                      onChange={(e) => setLeadsPerMonth(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#4b5563]">Avg. Profit / Deal</label>
                      <span className="text-xs font-bold text-indigo-400">${dealValue.toLocaleString()}</span>
                    </div>
                    <input 
                      type="range" min="5000" max="50000" step="5000" value={dealValue}
                      onChange={(e) => setDealValue(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-bold uppercase tracking-widest">Added Revenue ({timeframe} Days)</span>
                        <span className="text-xl font-black text-indigo-500">${(parseInt(retention.revenue.replace(/,/g, '')) * (timeframe/30)).toLocaleString()}+</span>
                     </div>
                     <p className="text-[10px] text-gray-500 italic leading-relaxed">
                        "OS-powered triage captures 20% more deals by eliminating lead decay."
                     </p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Projected Advantage</span>
                      <div className="flex gap-2">
                         {(['area', 'bar', 'line'] as const).map(t => (
                           <button 
                             key={t}
                             onClick={() => setChartType(t)}
                             className={`p-2 rounded-lg border transition-all ${chartType === t ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-600 hover:text-white'}`}
                           >
                              {t === 'area' ? <BarChart3 size={12} /> : t === 'bar' ? <BarChart3 size={12} className="rotate-90" /> : <TrendingUp size={12} />}
                           </button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="h-[220px] w-full bg-[#0b1120]/50 rounded-2xl border border-white/5 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                         {chartType === 'area' ? (
                           <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#9fa7ff" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#be83fa" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                              <Tooltip 
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                                itemStyle={{ color: '#fff' }}
                              />
                              <Area type="monotone" dataKey="revenue" stroke="#9fa7ff" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                           </AreaChart>
                         ) : chartType === 'bar' ? (
                           <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                              <Tooltip 
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                              />
                              <Bar dataKey="revenue" fill="#9fa7ff" radius={[4, 4, 0, 0]} />
                           </BarChart>
                         ) : (
                           <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                              <Tooltip 
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                              />
                              <Line type="monotone" dataKey="revenue" stroke="#be83fa" strokeWidth={3} dot={false} />
                           </LineChart>
                         )}
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Leaderboard */}
      <section className="py-32 relative overflow-hidden" ref={leaderboardReveal.elementRef}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[150px] rounded-full" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className={`space-y-8 transition-all duration-1000 ${leaderboardReveal.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] animate-astral-nav">Affiliate Program</div>
              <h2 className="text-5xl md:text-7xl font-black italic leading-[0.9]">Earn 10% <br /><span className="astral-gradient-text">Recurring.</span></h2>
              <p className="text-xl text-[#a3aac4] leading-relaxed font-medium max-w-lg">
                Refer other agents and builders to the OS. Earn a 10% lifetime commission on every subscription, plus exclusive perks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                 <Link to="/login?signup=true" className="px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-all shadow-xl shadow-indigo-600/20 text-center hover-glow hover-lift">
                    Get Your Referral Link
                 </Link>
              </div>
            </div>

            <div className={`p-2 rounded-[3.5rem] bg-gradient-to-br from-indigo-500/20 to-transparent border border-white/10 backdrop-blur-3xl hover-lift transition-all duration-1000 ${leaderboardReveal.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
              <div className="bg-[#0f1930]/80 rounded-[3rem] p-8 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black italic flex items-center gap-2 uppercase tracking-tight">
                     <Trophy size={20} className="text-yellow-500 animate-pulse" /> Top Referrers
                   </h3>
                   <span className="text-[10px] font-black uppercase text-[#6d758c] tracking-[0.2em]">This Month</span>
                </div>
                
                <div className="space-y-4">
                   {[
                     { name: 'Marcus Sterling', referrals: 42, reward: 'Elite Builder' },
                     { name: 'Elena Rodriguez', referrals: 38, reward: 'Master Closer' },
                     { name: 'David Vance', referrals: 31, reward: 'Power Affiliate' },
                     { name: 'Sarah Chen', referrals: 24, reward: 'Rising Star' },
                     { name: 'Luke Holloway', referrals: 19, reward: 'Growth Agent' }
                   ].map((user, i) => (
                     <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group hover:bg-white/10 cursor-pointer">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xs font-black text-indigo-400 border border-indigo-500/10">{i + 1}</div>
                           <div>
                              <div className="text-sm font-black group-hover:text-indigo-300 transition-colors uppercase italic">{user.name}</div>
                              <div className="text-[9px] font-black text-[#5b21b6] uppercase tracking-[0.2em]">{user.reward}</div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-lg font-black text-white">{user.referrals}</div>
                           <div className="text-[9px] font-black text-[#6d758c] uppercase tracking-widest">Referrals</div>
                        </div>
                     </div>
                   ))}
                </div>
                
                <div className="pt-8 border-t border-white/5">
                   <div className="flex items-center gap-4 p-5 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-transform cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:rotate-12 transition-transform"><Award size={24} /></div>
                      <div>
                         <div className="text-sm font-black text-white uppercase italic">Join the Leaderboard</div>
                         <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Top 10 referrers get a 2024 Swag Box</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-32 bg-[#060e20]" ref={featuresReveal.elementRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-24 transition-all duration-1000 ${featuresReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-7xl font-black mb-6 leading-tight">Built for <br /><span className="astral-gradient-text tracking-[-0.05em] px-2 italic">Scale.</span></h2>
            <p className="text-[#a3aac4] max-w-xl mx-auto text-lg font-medium">One platform. Every tool. Zero friction.</p>
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
              <div 
                key={i} 
                className={`astral-glass p-10 rounded-[3rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-700 hover-lift group ${featuresReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-8 font-black group-hover:scale-110 transition-transform group-hover:bg-indigo-500/20 shadow-inner">
                  <f.icon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-indigo-200 transition-colors uppercase italic">{f.title}</h3>
                <p className="text-[#6d758c] leading-relaxed text-sm group-hover:text-[#a3aac4] transition-colors">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-[#060e20]" ref={testimonialsReveal.elementRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-20 transition-all duration-1000 ${testimonialsReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-6xl font-black italic mb-6">Trusted by Empire Builders.</h2>
            <p className="text-[#6d758c] text-lg font-medium">Join the next generation of real estate operations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { text: '"WholeScale OS is why we\'re closing 3x more deals. The AI triage is like having a second brain that never sleeps."', highlight: false },
              { text: '"The absolute best ROI of any tool I\'ve used in 10 years. Our team communications are finally centralized."', highlight: true },
              { text: '"The sovereign data approach is what real estate needed. My data, my rules, and incredible speed."', highlight: false }
            ].map((t, i) => (
              <div 
                key={i} 
                className={`p-10 rounded-[2.5rem] italic transition-all duration-700 hover-lift ${
                  t.highlight 
                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 font-black scale-105 relative z-10 border border-indigo-400/30 hover-glow' 
                    : 'bg-white/5 border border-white/5 text-[#a3aac4] astral-glass font-medium'
                } ${testimonialsReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 relative overflow-hidden" ref={ctaReveal.elementRef}>
        <div className="absolute inset-0 bg-indigo-600" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-900 opacity-90" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,#fff_0%,transparent_50%)]" />
        
        <div className={`max-w-4xl mx-auto px-6 text-center relative z-10 transition-all duration-1000 ${ctaReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-6xl md:text-8xl font-black mb-12 text-white tracking-tighter italic leading-[0.9]">Ready to <br />Own the Market?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/login?signup=true" className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white text-indigo-600 text-xl font-black shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:scale-105 transition-all hover-glow">
              Start Free Trial
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white/10 border border-white/20 text-white text-xl font-black backdrop-blur-md hover:bg-white/20 transition-all">
              View All Tiers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
