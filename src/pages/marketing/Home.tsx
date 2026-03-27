import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, LineChart, Line, BarChart, Bar 
} from 'recharts';
import {
  ArrowRight, Shield, Users, MessageSquare,
  LayoutDashboard, Map, Sparkles, TrendingUp, Clock, 
  PlayCircle, BarChart3, Award, Trophy
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: {
      staggerChildren: 0.1
    }
  },
  viewport: { once: true }
};

function StatCounter({ value, duration = 2000, suffix = '' }: { value: string | number, duration?: number, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const startTime = useRef<number | null>(null);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (!inView) return;
    
    let animationFrameId: number;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(easedProgress * numericValue));
      if (progress < 1) animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [inView, numericValue, duration]);

  return <span ref={ref}>{displayValue.toLocaleString()}{suffix}</span>;
}

export default function Home() {
  const [adminHours, setAdminHours] = useState(20);
  const [leadsPerMonth, setLeadsPerMonth] = useState(100);
  const [dealValue, setDealValue] = useState(15000);
  const [timeframe, setTimeframe] = useState(90);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('area');

  const calculateTimeSaved = () => {
    const savedPerWeek = adminHours * 0.2;
    const savedPerYear = savedPerWeek * 52;
    const dollarValue = savedPerYear * 50;
    return { week: savedPerWeek.toFixed(1), year: Math.round(savedPerYear), dollars: dollarValue.toLocaleString() };
  };

  const calculateRetention = () => {
    const currentRetained = leadsPerMonth * 0.7;
    const osRetained = leadsPerMonth * 0.9;
    const extraLeads = osRetained - currentRetained;
    const extraRevenue = extraLeads * (dealValue * 0.05);
    return { extra: Math.round(extraLeads), revenue: Math.round(extraRevenue).toLocaleString() };
  };

  const timeSaved = calculateTimeSaved();
  const retention = calculateRetention();

  const chartData = useMemo(() => {
    const data = [];
    const monthlyExtra = (leadsPerMonth * 0.2) * (dealValue * 0.05);
    const steps = timeframe === 30 ? 4 : timeframe === 60 ? 8 : 12;
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
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute top-[20%] right-[10%] w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" 
        />

        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles size={12} className="animate-pulse" /> Elite Real estate Infrastructure
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
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:flex-1 md:flex-none">
                <Link
                  to="/pricing"
                  className="w-full px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-black transition-all flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(159,167,255,0.3)] group hover-glow hover-lift"
                >
                  Get Started Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:flex-1 md:flex-none md:w-64 px-10 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-lg font-black transition-all flex items-center justify-center gap-3 hover-lift hover-glow-subtle shadow-xl"
              >
                <PlayCircle size={20} /> Watch Demo
              </motion.button>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-6xl mx-auto mt-24"
          >
            <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] opacity-20" />
            <div className="relative rounded-[2.5rem] border border-white/10 bg-[#0f1930]/60 backdrop-blur-3xl p-3 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="bg-[#060e20] rounded-[2rem] border border-white/5 aspect-[16/9] flex overflow-hidden">
                <div className="w-20 border-r border-white/5 flex flex-col items-center py-6 gap-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500"><LayoutDashboard size={20} /></div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600"><Users size={20} /></div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600"><Map size={20} /></div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600"><MessageSquare size={20} /></div>
                </div>
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-center p-8 rounded-3xl bg-[#0f172a]/90 border border-white/10 shadow-2xl">
                  <h3 className="text-xl font-bold mb-2">[Dashboard Preview - Coming Soon]</h3>
                  <p className="text-gray-500 text-sm">We're updating our platform with new features.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 bg-[#060e20] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="space-y-12"
            >
              <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-black mb-12 leading-tight">
                Designed for the <br /> 
                <span className="astral-gradient-text leading-[1.2]">1% of Closers.</span>
              </motion.h2>
              <div className="space-y-8">
                {[
                  { icon: Clock, title: 'Speed is the Variable', desc: 'AI triage handles incoming leads in milliseconds. Never let a motivated seller go cold while you sleep.' },
                  { icon: Shield, title: 'Absolute Privacy', desc: 'Your data is encrypted and sovereign. No more platform fees for data you created.' },
                  { icon: TrendingUp, title: 'Compound Growth', desc: 'Automate the busy work and focus 100% of your energy on high-leverage deal negotiations.' }
                ].map((benefit, i) => (
                  <motion.div 
                    key={i} 
                    variants={fadeInUp}
                    className="flex gap-6 group p-4 rounded-2xl transition-all"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/5"
                    >
                      <benefit.icon size={28} />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">{benefit.title}</h3>
                      <p className="text-[#6d758c] leading-relaxed group-hover:text-[#a3aac4] transition-colors">{benefit.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4 pt-12">
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="aspect-square rounded-[2rem] bg-indigo-600 p-8 flex flex-col justify-end shadow-[0_20px_40px_rgba(99,102,241,0.2)]"
                >
                  <div className="text-4xl font-black mb-2 italic">
                    <StatCounter value={90} suffix="%" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Manual Triage Reduced</div>
                </motion.div>
                <div className="aspect-square rounded-[2rem] bg-[#0f1930] border border-white/5" />
              </div>
              <div className="space-y-4">
                 <div className="aspect-square rounded-[2rem] bg-[#0f1930] border border-white/5" />
                 <motion.div 
                  whileHover={{ y: -10 }}
                  className="aspect-square rounded-[2rem] bg-purple-600 p-8 flex flex-col justify-end shadow-[0_20px_40px_rgba(168,85,247,0.2)]"
                >
                  <div className="text-4xl font-black mb-2 italic">
                    <StatCounter value={2.5} suffix="x" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Conversion Rate Increase</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-32 bg-[#060e20] relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-6 text-center mb-16"
        >
          <h2 className="text-4xl md:text-7xl font-black mb-6 leading-tight">Stop Bleeding <span className="astral-gradient-text px-2">Revenue.</span></h2>
          <p className="text-[#a3aac4] text-lg font-medium">Real-time projection showing the power of WholeScale OS.</p>
        </motion.div>
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="astral-glass p-10 rounded-[3rem] border border-white/5 space-y-12"
          >
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-black uppercase tracking-wider text-indigo-400">Weekly Admin Hours</label>
                  <span className="text-2xl font-black italic">{adminHours}h</span>
                </div>
                <input 
                  type="range" min="5" max="80" value={adminHours} 
                  onChange={(e) => setAdminHours(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-black uppercase tracking-wider text-purple-400">Monthly Leads</label>
                  <span className="text-2xl font-black italic">{leadsPerMonth}</span>
                </div>
                <input 
                  type="range" min="10" max="1000" value={leadsPerMonth} 
                  onChange={(e) => setLeadsPerMonth(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-black uppercase tracking-wider text-green-400">Avg Deal Value</label>
                  <span className="text-2xl font-black italic">${dealValue.toLocaleString()}</span>
                </div>
                <input 
                  type="range" min="5000" max="100000" step="5000" value={dealValue} 
                  onChange={(e) => setDealValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="text-3xl font-black italic text-indigo-400 mb-1">${timeSaved.dollars}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#6d758c]">Annual Time Value</div>
              </div>
              <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/10">
                <div className="text-3xl font-black italic text-green-400 mb-1">${retention.revenue}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#6d758c]">Recovered Revenue</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="astral-glass p-10 rounded-[3rem] border border-white/5 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-black italic uppercase tracking-tight">Growth Projection</h3>
              <div className="flex bg-white/5 p-1 rounded-xl">
                {(['area', 'bar', 'line'] as const).map(type => (
                  <button 
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${chartType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#6d758c" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#6d758c" fontSize={10} axisLine={false} tickLine={false} dx={-10} tickFormatter={v => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="traditional" stroke="#6d758c" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#6d758c" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#6d758c" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px' }} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="traditional" fill="#312e81" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#6d758c" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#6d758c" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="traditional" stroke="#6d758c" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 flex items-center justify-between text-xs font-black uppercase tracking-widest text-[#6d758c]">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600" /> OS Projection</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-600" /> Traditional Setup</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="py-32 bg-[#060e20] relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-black leading-[0.9] italic tracking-tighter uppercase mb-8">Dominance <br /> is Inevitable.</h2>
            <div className="bg-[#0f1930]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-indigo-500/20 group-hover:text-indigo-500/40 transition-colors">
                <Trophy size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                {[
                  { name: 'Marcus Sterling', deals: 42, volume: '$12.4M', color: 'text-indigo-400' },
                  { name: 'Sarah Vanguard', deals: 38, volume: '$9.1M', color: 'text-gray-400' },
                  { name: 'Elite Real Estate', deals: 31, volume: '$7.8M', color: 'text-gray-500' }
                ].map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black ${i === 0 ? 'text-indigo-400' : 'text-gray-600'}`}>0{i + 1}</div>
                      <div>
                        <div className="font-black italic uppercase tracking-tight">{user.name}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.deals} Deals Closed</div>
                      </div>
                    </div>
                    <div className={`text-xl font-black italic ${user.color}`}>{user.volume}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {[
              { quote: "The closest thing I've found to a 'Cheat Code' for real estate automation.", author: "Jameson K.", title: "Platinum Team Leader" },
              { quote: "Finally, an OS that doesn't feel like a legacy spreadsheet with a skin.", author: "Dahlia R.", title: "Top 1% Producer" }
            ].map((t, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="astral-glass p-10 rounded-[2.5rem] border border-white/5 relative group hover-lift"
              >
                <Award className="absolute top-10 right-10 text-white/5 group-hover:text-white/10 transition-colors" size={48} />
                <p className="text-xl font-medium leading-relaxed mb-8 italic text-[#a3aac4]">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black tracking-tighter italic">WS</div>
                  <div>
                    <div className="font-black italic uppercase tracking-tight">{t.author}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.title}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-32 bg-[#060e20]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl md:text-7xl font-black mb-6 leading-tight">Built for <br /><span className="astral-gradient-text tracking-[-0.05em] px-2 italic">Scale.</span></h2>
            <p className="text-[#a3aac4] max-w-xl mx-auto text-lg font-medium">One platform. Every tool. Zero friction.</p>
          </motion.div>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-10"
          >
            {[
              { title: 'AI Automation Hub', desc: 'Auto-pilot your triage with Gemini-powered analysis and suggested replies.', icon: Sparkles },
              { title: 'Interactive Map View', desc: 'Visualize your entire portfolio and lead pipeline with high-precision mapping.', icon: Map },
              { title: 'Integrated CRM Hub', desc: 'A unified inbox for SMS and Email with AI-driven triage and threaded history.', icon: LayoutDashboard },
              { title: 'Elite Task Engine', desc: 'Kanban-style task tracking designed for high-velocity real estate teams.', icon: BarChart3 },
              { title: 'Custom Agent Profiles', desc: 'Generate high-converting public landing pages with QR codes in seconds.', icon: Users },
              { title: 'Secure Sovereign Data', desc: 'Absolute ownership of your data with enterprise-grade encryption.', icon: Shield }
            ].map((f, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                whileHover={{ y: -15, borderColor: 'rgba(99, 102, 241, 0.4)' }}
                className="astral-glass p-10 rounded-[3rem] border border-white/5 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-8 font-black group-hover:scale-110 transition-transform group-hover:bg-indigo-500/20 shadow-inner">
                  <f.icon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-indigo-200 transition-colors uppercase italic">{f.title}</h3>
                <p className="text-[#6d758c] leading-relaxed text-sm group-hover:text-[#a3aac4] transition-colors">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-900 opacity-90" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle_at_20%_30%,#fff_0%,transparent_50%)]" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto px-6 text-center relative z-10"
        >
          <h2 className="text-6xl md:text-8xl font-black mb-12 text-white tracking-tighter italic leading-[0.9]">Ready to <br />Own the Market?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login?signup=true" className="block px-12 py-6 rounded-2xl bg-white text-indigo-600 text-xl font-black shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover-glow">
                Start Free Trial
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/pricing" className="block px-12 py-6 rounded-2xl bg-white/10 border border-white/20 text-white text-xl font-black backdrop-blur-md hover:bg-white/20 transition-all">
                View All Tiers
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
