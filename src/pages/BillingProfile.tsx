import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, BarChart3, Users, User, 
  ChevronRight, Download, Plus, AlertCircle,
  Copy, Share2, Wallet, ArrowUpRight, Check,
  Camera, Twitter, Linkedin
} from 'lucide-react';
import { useStore } from '../store/useStore';

type TabType = 'billing' | 'analytics' | 'referral' | 'profile';

export default function BillingProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const { currentUser } = useStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as TabType;
    if (tab && ['billing', 'analytics', 'referral', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/dashboard/billing?tab=${tab}`);
  };

  const referralCode = `WHOLESCALE-${currentUser?.name?.split(' ')[0]?.toUpperCase() || 'AGENT'}`;
  const referralLink = `https://wholescaleos.com/signup?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'referral', label: 'Referral', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--t-border)] pb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase">Account Management</h1>
          <p className="text-gray-500 text-sm">Manage your subscription, view analytics, and track referrals.</p>
        </div>
        
        <div className="flex bg-[var(--t-surface-dim)] p-1 rounded-2xl border border-[var(--t-border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[60vh]">
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'referral' && (
          <ReferralTab 
            code={referralCode} 
            onCopy={copyToClipboard} 
            copied={copied} 
          />
        )}
        {activeTab === 'profile' && <ProfileTab user={currentUser} />}
      </div>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 reveal">
      <div className="lg:col-span-2 space-y-8">
        {/* Current Plan Card */}
        <div className="p-8 rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CreditCard size={120} />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-4">
              <div className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-widest inline-block">Current Plan</div>
              <div>
                <h2 className="text-4xl font-black">Solo Tier</h2>
                <p className="opacity-80 font-medium">$27/month • Billed Annually</p>
              </div>
            </div>
            <button className="px-6 py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-gray-100 transition-all text-sm">
              Change Plan
            </button>
          </div>
          <div className="mt-12 pt-8 border-t border-white/20 flex flex-wrap gap-8 relative z-10">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Next Billing Date</div>
              <div className="text-sm font-bold">April 25, 2024</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Payment Method</div>
              <div className="text-sm font-bold flex items-center gap-2">Visa ending in 4242 <ChevronRight size={14} /></div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold italic tracking-tight">Invoice History</h3>
            <button className="text-xs font-bold text-blue-500 flex items-center gap-2"><Download size={14} /> Export All</button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] hover:border-blue-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><Download size={18} /></div>
                  <div>
                    <div className="text-sm font-bold">INV-2024-00{i}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Mar {25 - i}, 2024</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm font-black">$27.00</div>
                  <div className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-[9px] font-bold uppercase tracking-widest">Paid</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
          <h3 className="text-lg font-bold">Referral Balance</h3>
          <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
            <div className="text-3xl font-black text-indigo-400">$14.50</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Available to Apply</div>
          </div>
          <button className="w-full py-4 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-indigo-500/50 text-xs font-bold transition-all">
            Apply to Next Invoice
          </button>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-500 text-[10px] font-medium">
            <AlertCircle size={14} /> Auto-apply is active for all referrals
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-white/5 space-y-6">
          <h3 className="text-lg font-bold">Payment Methods</h3>
          <div className="space-y-3">
             <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--t-bg)] border border-blue-500/20">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-5 bg-blue-600 rounded" />
                   <span className="text-sm font-bold">•••• 4242</span>
                </div>
                <span className="text-[9px] font-black text-blue-500 uppercase">Default</span>
             </div>
          </div>
          <button className="w-full py-3 rounded-xl border border-dashed border-[var(--t-border)] hover:border-blue-500/50 text-xs text-gray-500 font-bold flex items-center justify-center gap-2 transition-all">
            <Plus size={14} /> Add New Method
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const stats = [
    { label: 'Leads Managed', value: '1,284', trend: '+12%', color: 'blue' },
    { label: 'Closed Deals', value: '42', trend: '+5%', color: 'green' },
    { label: 'Revenue Generated', value: '$840k', trend: '+18%', color: 'purple' },
    { label: 'Lead Retention', value: '92%', trend: '+3%', color: 'orange' }
  ];

  return (
    <div className="space-y-8 reveal">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700 text-${stat.color}-500`}>
              <BarChart3 size={60} />
            </div>
            <div className="relative z-10 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</div>
              <div className="text-3xl font-black">{stat.value}</div>
              <div className={`text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend} <span className="text-gray-500 opacity-50 uppercase">vs last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] h-[400px] flex flex-col justify-between">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold italic">Growth Velocity</h3>
              <div className="flex gap-2">
                 {['7D', '1M', '6M', '1Y'].map(p => (
                   <button key={p} className={`px-3 py-1 rounded-lg text-[10px] font-black ${p === '1M' ? 'bg-blue-600' : 'bg-white/5 text-gray-500'}`}>{p}</button>
                 ))}
              </div>
           </div>
           
           <div className="flex-1 flex items-end gap-2 pb-4">
              {[40, 60, 45, 90, 65, 80, 55, 100, 70, 85, 95, 110].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-lg group relative" style={{ height: `${h}%` }}>
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all">+{h}</div>
                </div>
              ))}
           </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-blue-500/20 space-y-8 relative overflow-hidden">
           <div className="absolute inset-0 bg-blue-600/5 blur-[100px]" />
           <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Time Saved</h3>
              <p className="text-xs text-gray-400 mb-8 leading-relaxed">AI automation has offloaded hours of administrative work this month.</p>
              
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-gray-400">Total Hours Saved</span>
                    <span className="text-xl font-black text-blue-500">142h</span>
                 </div>
                 <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-gray-400">Estimated Value</span>
                    <span className="text-xl font-black text-green-500">$7,100</span>
                 </div>
              </div>
              
              <div className="mt-8 p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20">
                 <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Elite Efficiency</div>
                 <p className="text-[11px] text-gray-300">You are in the top 5% of WholeScale OS users for automation efficiency.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ReferralTab({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 reveal">
      <div className="lg:col-span-2 space-y-8">
        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-900/40 via-[#121a2d] to-[#0f172a] border border-blue-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="relative z-10 space-y-8 text-center md:text-left">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">10% Recurring Commission</div>
             <h2 className="text-4xl md:text-5xl font-black leading-none">Share the OS, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Get Paid.</span></h2>
             
             <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between group">
                   <code className="text-blue-400 font-mono font-bold">{code}</code>
                   <button onClick={onCopy} className="text-xs text-gray-500 hover:text-white font-bold flex items-center gap-2 transition-all">
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                   </button>
                </div>
                <button onClick={onCopy} className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/20">
                   <Share2 size={18} /> Copy Link
                </button>
             </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
           <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Earned</div>
              <div className="text-3xl font-black font-mono">$1,240</div>
           </div>
           <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Referrals</div>
              <div className="text-3xl font-black font-mono">14</div>
           </div>
           <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending Payouts</div>
              <div className="text-3xl font-black font-mono text-orange-400">$45.00</div>
           </div>
        </div>

        <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold italic">Referral Activity</h3>
              <div className="text-xs text-gray-500 font-bold uppercase">Status</div>
           </div>
           <div className="space-y-4">
              {[
                { name: 'Marcus Sterling', date: 'Mar 12, 2024', plan: 'Solo', amount: '$2.70' },
                { name: 'Elena Rodriguez', date: 'Mar 08, 2024', plan: 'Pro', amount: '$9.70' },
                { name: 'David Vance', date: 'Feb 28, 2024', plan: 'Team', amount: '$19.70' }
              ].map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black">{ref.name[0]}</div>
                      <div>
                         <div className="text-sm font-bold">{ref.name}</div>
                         <div className="text-[10px] text-gray-500 font-bold uppercase">{ref.plan} Plan • Signed up {ref.date}</div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-sm font-black text-green-500">{ref.amount}</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase">Monthly Earnings</div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="space-y-8">
         <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-8">
            <div className="space-y-2">
               <h3 className="text-xl font-bold italic">Withdraw Rewards</h3>
               <p className="text-xs text-gray-400">Convert your earnings into dashboard credits or cash via PayPal.</p>
            </div>
            
            <div className="space-y-4">
               <button className="w-full p-6 rounded-2xl bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all group flex flex-col items-center gap-2">
                  <Wallet size={24} className="text-blue-500 group-hover:text-white" />
                  <span className="text-sm font-black">Apply to Subscription</span>
                  <span className="text-[9px] opacity-60 font-bold uppercase">Best Value (No Fees)</span>
               </button>
               <button className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all flex flex-col items-center gap-2">
                  <ArrowUpRight size={24} className="text-gray-500" />
                  <span className="text-sm font-bold">Withdraw to PayPal</span>
                  <span className="text-[9px] opacity-60 font-medium uppercase">$50 Minimum reached</span>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 reveal">
      <div className="lg:col-span-2 space-y-12">
        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-blue-600 overflow-hidden flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                {user?.name?.[0] || 'A'}
              </div>
              <button className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl hover:scale-110 transition-all text-blue-500">
                <Camera size={18} />
              </button>
            </div>
            <div className="space-y-1">
               <h2 className="text-2xl font-black italic">{user?.name || 'Authorized User'}</h2>
               <p className="text-gray-500 text-sm">{user?.email || 'user@wholescaleos.com'}</p>
               <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">
                  <Check size={12} /> Pro Affiliate
               </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
              <input type="text" defaultValue={user?.name} className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Official Email</label>
              <input type="email" defaultValue={user?.email} className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
              <input type="tel" placeholder="+1 (555) 000-0000" className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Professional License #</label>
              <input type="text" placeholder="RE-123456789" className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
           <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Professional Bio</label>
           <textarea rows={4} placeholder="Tell the world about your expertise..." className="w-full px-5 py-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none transition-all resize-none" />
        </section>

        <section className="space-y-6">
           <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Social Connections</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)]">
                 <Twitter size={18} className="text-gray-500" />
                 <input type="text" placeholder="@username" className="bg-transparent text-sm outline-none flex-1" />
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)]">
                 <Linkedin size={18} className="text-gray-500" />
                 <input type="text" placeholder="linkedin.com/in/..." className="bg-transparent text-sm outline-none flex-1" />
              </div>
           </div>
        </section>
      </div>

      <div className="space-y-8">
         <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-bold">Public Profile</h3>
               <div className="w-12 h-6 rounded-full bg-blue-600 p-1 relative">
                  <div className="w-4 h-4 rounded-full bg-white absolute right-1" />
               </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
               Enabling this allows agents and leads to view your public profile at <span className="text-blue-500 underline">wholescaleos.com/agent/{user?.name?.toLowerCase()?.replace(/\s+/g, '-')}</span>
            </p>
         </div>

         <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
            <h3 className="text-lg font-bold italic">Identity Verification</h3>
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-xs text-green-500 font-bold">
                  <Check size={16} /> Email Verified
               </div>
               <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                  <div className="w-4 h-4 rounded-full border border-gray-500" /> Identity Pending
               </div>
            </div>
            <button className="w-full py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
               Start Verification
            </button>
         </div>

         <button className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black shadow-2xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Save Changes
         </button>
      </div>
    </div>
  );
}
