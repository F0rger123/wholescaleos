import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, BarChart3, Users, User, 
  ChevronRight, Download, Plus, AlertCircle,
  Copy, Share2, Wallet, ArrowUpRight, Check,
  Camera, Twitter, Linkedin, Loader2, Ticket
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

type TabType = 'billing' | 'analytics' | 'revenue-share' | 'profile';

function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleApply = async () => {
    if (!supabase || !code.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in first');

      // Lookup promo code
      const { data: promo, error: lookupErr } = await (supabase as any)
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (lookupErr || !promo) throw new Error('Invalid or expired promo code');

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        throw new Error('This promo code has reached its maximum uses');
      }

      // Check expiry
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        throw new Error('This promo code has expired');
      }

      // Check if already redeemed
      const { data: existing } = await (supabase as any)
        .from('promo_redemptions')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('user_id', user.id)
        .single();

      if (existing) throw new Error('You have already used this code');

      // Redeem
      const { error: redeemErr } = await (supabase as any)
        .from('promo_redemptions')
        .insert({ promo_code_id: promo.id, user_id: user.id });
      if (redeemErr) throw redeemErr;

      // Increment usage
      await (supabase as any)
        .from('promo_codes')
        .update({ current_uses: promo.current_uses + 1 })
        .eq('id', promo.id);

      const typeMsg: Record<string, string> = {
        free_forever: 'Free forever access activated!',
        free_limited: `${promo.duration_months} months free activated!`,
        percent_off: `${promo.value}% discount applied!`,
        fixed_off: `$${promo.value} credit applied!`,
        one_time: `$${promo.value} one-time credit applied!`,
      };
      setMessage(typeMsg[promo.type] || 'Code applied successfully!');
      setStatus('success');
      setCode('');
    } catch (err: any) {
      setMessage(err.message || 'Failed to apply code');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--t-text-muted)' }} />
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code (e.g. WOS-LAUNCH50)"
            className="w-full pl-10 pr-3 py-3 rounded-xl text-sm font-mono"
            style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
        </div>
        <button
          onClick={handleApply}
          disabled={status === 'loading' || !code.trim()}
          className="px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
        </button>
      </div>
      {message && (
        <p className={`text-xs font-bold ${status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
          {status === 'success' ? '✓ ' : '✕ '}{message}
        </p>
      )}
    </div>
  );
}
export default function BillingProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const { currentUser, applyReferralCode } = useStore();
  const [copied, setCopied] = useState(false);
  const [refCodeInput, setRefCodeInput] = useState('');
  const [isApplyingRef, setIsApplyingRef] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && (['billing', 'analytics', 'referral', 'profile'] as string[]).includes(tabParam)) {
      setActiveTab(tabParam === 'referral' ? 'revenue-share' : tabParam as TabType);
    }
  }, [location.search]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const urlTab = tab === 'revenue-share' ? 'referral' : tab;
    navigate(`/dashboard/billing?tab=${urlTab}`);
  };

  const currentReferralCode = currentUser?.referralCode || `WHOLESCALE-${currentUser?.name?.split(' ')[0]?.toUpperCase() || 'AGENT'}`;
  const referralLink = `https://wholescaleos.com/signup?ref=${currentReferralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyReferral = async () => {
    if (!refCodeInput.trim()) return;
    setIsApplyingRef(true);
    try {
      const result = await applyReferralCode(refCodeInput.trim());
      if (result.success) {
        alert('Revenue Share code applied successfully!');
        setRefCodeInput('');
      } else {
        alert(result.error || 'Failed to apply Revenue Share code');
      }
    } catch (err) {
      alert('An error occurred while applying the Revenue Share code');
    } finally {
      setIsApplyingRef(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'revenue-share', label: 'Revenue Share', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--t-border)] pb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase">Account Management</h1>
          <p className="text-gray-500 text-sm">Manage your subscription, view analytics, and track revenue share.</p>
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
        {activeTab === 'revenue-share' && (
          <RevenueShareTab 
            code={currentReferralCode} 
            onCopy={copyToClipboard} 
            copied={copied}
            refCodeInput={refCodeInput}
            setRefCodeInput={setRefCodeInput}
            onApply={handleApplyReferral}
            isApplying={isApplyingRef}
          />
        )}
        {activeTab === 'profile' && <ProfileTab user={currentUser} />}
      </div>
    </div>
  );
}

function BillingTab() {
  const { currentUser, team, getMemberPrice } = useStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const planLimits: Record<string, number> = {
    'free': 1,
    'solo': 1,
    'pro': 5,
    'team': 20,
    'agency': 9999
  };

  const currentPlan = (currentUser?.subscriptionTier || 'Free').toLowerCase();
  const maxSeats = planLimits[currentPlan] || 1;
  const currentSeats = Math.max(1, team?.length || 1);
  const remainingSeats = Math.max(0, maxSeats - currentSeats);

  const [targetSeats, setTargetSeats] = useState(currentSeats);
  const seatPrice = getMemberPrice(currentPlan);
  const extraSeats = Math.max(0, targetSeats - maxSeats);
  const extraCost = extraSeats * seatPrice;

  // Sync targetSeats with currentSeats when plan or team changes
  useEffect(() => {
    setTargetSeats(currentSeats);
  }, [currentSeats]);

  const handleUpgrade = async (overriddenSeats?: number) => {
    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const seatsToRequest = overriddenSeats || targetSeats;
      
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { 
          plan: currentPlan === 'free' ? 'solo' : currentPlan,
          seats: seatsToRequest,
          success_url: `${window.location.origin}/dashboard/billing?tab=billing&success=true`,
          cancel_url: `${window.location.origin}/dashboard/billing?tab=billing`
        }
      });

      if (error) {
        // Handle specific edge function errors
        const errorData = error instanceof Error ? { message: error.message } : error;
        throw errorData;
      }

      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from payment service');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const msg = err?.message || err?.error || '';
      if (msg.includes('Price ID') || msg.includes('Invalid Stripe request')) {
        const detail = err?.detail || 'Please ensure your Stripe Price IDs match those in the edge function.';
        alert(`⚠️ Stripe Configuration Error:\n\n${msg}\n\n${detail}`);
      } else if (msg.includes('FunctionsHttpError') || msg.includes('Failed to send') || msg.includes('FunctionsFetchError')) {
        alert('⚠️ Could not reach the checkout service. Please check your connection and try again.');
      } else if (msg.includes('Unauthorized')) {
        alert('🔒 Session expired. Please refresh and try again.');
      } else {
        alert(`⚠️ Checkout failed: ${msg || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = () => {
    if (remainingSeats > 0) {
       // Still have slots in existing plan
       alert(`You have ${remainingSeats} slots remaining in your ${currentUser?.subscriptionTier} plan. You can invite them from the Team page!`);
       navigate('/dashboard/team');
    } else {
       // Need to pay for an extra seat or upgrade
       if (currentPlan === 'agency') {
          alert('Agency plan already includes unlimited seats!');
          return;
       }
       // If they click 'Add Team Member' and are full, increment target and prompt to pay
       const nextTarget = currentSeats + 1;
       setTargetSeats(nextTarget);
       handleUpgrade(nextTarget);
    }
  };

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
              <div className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-widest inline-block">
                {currentUser?.subscriptionStatus === 'active' ? 'Active Plan' : 'Subscription Required'}
              </div>
              <div>
                <h2 className="text-4xl font-black">{currentUser?.subscriptionTier || 'Free Tier'}</h2>
                <p className="opacity-80 font-medium">
                  {currentUser?.subscriptionTier === 'Free' ? 'Unlock full OS potential' : 
                    `${currentPlan === 'team' ? '$197' : currentPlan === 'pro' ? '$97' : '$27'}/mo base + $${seatPrice}/mo per extra seat`}
                </p>
              </div>

              {currentUser?.subscriptionTier && currentUser.subscriptionTier !== 'Free' && (
                <div className="mt-4 flex items-center gap-4 bg-white/10 px-4 py-2 rounded-2xl border border-white/20 w-fit backdrop-blur-sm">
                  <div className="text-sm font-bold opacity-90"><Users size={16} className="inline mr-2 opacity-50"/> Team Seats:</div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setTargetSeats(Math.max(1, targetSeats - 1))}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-lg leading-none transition-all cursor-pointer border border-white/10"
                    >-</button>
                    <span className="font-mono font-bold w-6 text-center text-lg">{targetSeats}</span>
                    <button 
                      onClick={() => setTargetSeats(targetSeats + 1)}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-lg leading-none transition-all cursor-pointer border border-white/10"
                    >+</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                      {currentSeats} of {maxSeats} used
                    </div>
                    {targetSeats !== currentSeats && (
                      <div className="text-[10px] font-bold uppercase tracking-widest bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                        Update required
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => handleUpgrade()}
              disabled={loading}
              className={`px-6 py-3 rounded-xl border font-bold transition-all text-sm disabled:opacity-50 ${targetSeats > currentSeats ? 'bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'bg-white text-blue-600 hover:bg-gray-100'}`}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 
                (currentUser?.subscriptionTier === 'Free' ? 'Upgrade Now' : 
                (targetSeats > currentSeats ? `Update: +$${extraCost}/mo` : 'Change Plan'))}
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

        {/* Team Member Add-On Pricing */}
        <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
          <h3 className="text-lg font-bold italic tracking-tight" style={{ color: 'var(--t-text)' }}>Team Member Add-Ons</h3>
          <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Each plan includes a set number of team seats. Add more members as your team grows.</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { plan: 'Free', price: '$0', included: 1, extra: '—', canAdd: false, highlight: false },
              { plan: 'Solo', price: '$27', included: 1, extra: '$10/mo', canAdd: true, highlight: false },
              { plan: 'Pro', price: '$97', included: 5, extra: '$10/mo', canAdd: true, highlight: true },
              { plan: 'Team', price: '$197', included: 20, extra: '$5/mo', canAdd: true, highlight: false },
              { plan: 'Agency', price: '$497', included: '∞', extra: 'Included', canAdd: false, highlight: false },
            ].map((p) => {
              const isCurrent = (currentUser?.subscriptionTier || 'Free').toLowerCase() === p.plan.toLowerCase();
              return (
                <div key={p.plan} className={`p-4 rounded-2xl border space-y-3 transition-all ${isCurrent ? 'ring-2' : ''}`}
                  style={{
                    backgroundColor: isCurrent ? 'var(--t-primary-dim)' : 'var(--t-bg)',
                    borderColor: isCurrent ? 'var(--t-primary)' : 'var(--t-border)',
                    '--tw-ring-color': 'var(--t-primary)',
                  } as any}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">{p.plan}</span>
                    {isCurrent && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">Current</span>}
                  </div>
                  <div className="text-xl font-black">{p.price}<span className="text-[10px] font-normal text-gray-500">/mo</span></div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Included Seats</div>
                    <div className="text-sm font-black">{p.included}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Extra Seats</div>
                    <div className="text-sm font-bold" style={{ color: p.canAdd ? 'var(--t-primary)' : 'var(--t-text-muted)' }}>{p.extra}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {(currentUser?.subscriptionTier || 'Free') !== 'Free' && (currentUser?.subscriptionTier || 'Free').toLowerCase() !== 'agency' && (
            <button
              onClick={handleAddTeamMember}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-dashed hover:border-blue-500/50 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
            >
              <Plus size={14} /> {remainingSeats > 0 ? `Add Team Member (${remainingSeats} slots left)` : 'Buy Extra Seat / Add Team Member'}
            </button>
          )}
        </div>

        {/* Apply Promo Code */}
        <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-4">
          <h3 className="text-lg font-bold italic tracking-tight" style={{ color: 'var(--t-text)' }}>Apply Promo Code</h3>
          <PromoCodeInput />
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
          <h3 className="text-lg font-bold">Revenue Share Balance</h3>
          <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
            <div className="text-3xl font-black text-indigo-400 font-mono">
              ${(currentUser?.availableEarnings || 0).toFixed(2)}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Available to Apply</div>
          </div>
          <button className="w-full py-4 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-indigo-500/50 text-xs font-bold transition-all disabled:opacity-50" disabled={(currentUser?.availableEarnings || 0) <= 0}>
            Apply to Next Invoice
          </button>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-500 text-[10px] font-medium">
            <AlertCircle size={14} /> Auto-apply is active for all revenue share partners
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
          <button 
            onClick={() => handleUpgrade()}
            className="w-full py-3 rounded-xl border border-dashed border-[var(--t-border)] hover:border-blue-500/50 text-xs text-gray-500 font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={14} /> Add New Method
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { leads } = useStore();
  const [timeframe, setTimeframe] = useState<'7D' | '1M' | '6M' | '1Y'>('1M');

  // Timeframe calculation
  
  const stats = [
    { label: 'Leads Managed', value: leads.length.toLocaleString(), trend: '+12%', color: 'blue' },
    { label: 'Closed Deals', value: leads.filter(l => l.status === 'closed-won').length.toString(), trend: '+5%', color: 'green' },
    { label: 'Revenue Generated', value: `$${Math.round(leads.filter(l => l.status === 'closed-won').reduce((s, l) => s + (l.offerAmount || 0), 0) / 1000)}k`, trend: '+18%', color: 'purple' },
    { label: 'Active Pipeline', value: leads.filter(l => !l.status?.startsWith('closed')).length.toString(), trend: '+3%', color: 'orange' }
  ];

  // Growth Velocity Grouping
  const chartData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    const days = timeframe === '7D' ? 7 : timeframe === '1M' ? 30 : timeframe === '6M' ? 180 : 365;
    date.setDate(date.getDate() - (11 - i) * (days / 11));
    const count = leads.filter(l => new Date(l.createdAt) <= date).length;
    return { h: Math.max(10, (count / (leads.length || 1)) * 100), count };
  });

  return (
    <div className="space-y-8 reveal">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700 text-${stat.color}-500`}>
              <BarChart3 size={60} />
            </div>
            <div className="relative z-10 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-text-muted)]">{stat.label}</div>
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className={`text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-[var(--t-success)]' : 'text-[var(--t-error)]'}`}>
                {stat.trend} <span className="text-[var(--t-text-muted)] opacity-50 uppercase">vs last period</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] h-[400px] flex flex-col justify-between">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold italic text-white uppercase tracking-tighter">Growth Velocity</h3>
              <div className="flex gap-2">
                 {(['7D', '1M', '6M', '1Y'] as const).map(p => (
                   <button 
                    key={p} 
                    onClick={() => setTimeframe(p)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${timeframe === p ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-[var(--t-text-muted)] hover:bg-white/10'}`}
                   >
                    {p}
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="flex-1 flex items-end gap-2 pb-4">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-lg group relative" style={{ height: `${d.h}%` }}>
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all text-white shadow-xl z-20 whitespace-nowrap">{d.count} Leads</div>
                </div>
              ))}
           </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--t-surface-dim)] to-[var(--t-surface)] border border-blue-500/20 space-y-8 relative overflow-hidden">
           <div className="absolute inset-0 bg-blue-600/5 blur-[100px]" />
           <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2 text-white italic uppercase tracking-tighter">Time Saved</h3>
              <p className="text-xs text-[var(--t-text-muted)] mb-8 leading-relaxed">AI automation has offloaded hours of administrative work this month.</p>
              
              <div className="space-y-6">
                 {(() => {
                    const { tasks } = useStore.getState();
                    const completedTasks = tasks.filter(t => t.status === 'done').length;
                    const leadCount = leads.length;
                    // Formula: 10 mins per lead + 15 mins per completed task
                    const totalMins = (leadCount * 10) + (completedTasks * 15);
                    const hours = Math.floor(totalMins / 60);
                    const value = hours * 50; // Assume $50/hr value
                    
                    return (
                      <>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                           <span className="text-xs font-bold text-[var(--t-text-muted)]">Total Hours Saved</span>
                           <span className="text-xl font-black text-blue-500">{hours}h</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                           <span className="text-xs font-bold text-[var(--t-text-muted)]">Estimated Value</span>
                           <span className="text-xl font-black text-[var(--t-success)]">${value.toLocaleString()}</span>
                        </div>
                      </>
                    );
                 })()}
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

function RevenueShareTab({ 
  code, 
  onCopy, 
  copied,
  refCodeInput,
  setRefCodeInput,
  onApply,
  isApplying
}: { 
  code: string; 
  onCopy: () => void; 
  copied: boolean;
  refCodeInput: string;
  setRefCodeInput: (v: string) => void;
  onApply: () => void;
  isApplying: boolean;
}) {
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [rates, setRates] = useState<any>(null);

  useEffect(() => {
    if (currentUser?.id) {
      fetchReferralData();
    }
  }, [currentUser?.id]);

  async function fetchReferralData() {
    setLoading(true);
    try {
      // Fetch system settings for rates
      const { data: settingsData } = await (supabase as any)
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_rates')
        .single();
      
      if (settingsData) setRates(settingsData.value);

      // Fetch referrals with profile info
      const { data: refData, error: refError } = await (supabase as any)
        .from('referrals')
        .select(`
          id,
          signup_date,
          status,
          referred_id,
          referred:profiles!referrals_referred_id_fkey (
            full_name,
            subscription_tier
          )
        `)
        .eq('referrer_id', (currentUser as any).id);

      if (refError) throw refError;
      setReferrals((refData as any) || []);

      // Fetch earnings
      const { data: earnData } = await (supabase as any)
        .from('referral_earnings')
        .select('*')
        .eq('user_id', (currentUser as any).id)
        .order('created_at', { ascending: false });

      setEarnings(earnData || []);
    } catch (err) {
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Determine tier from referral count
  const referralCount = referrals.length;
  const tiers = [
    { name: 'Bronze', minReferrals: 0, rate: rates?.bronze || 10, color: '#cd7f32' },
    { name: 'Silver', minReferrals: 5, rate: rates?.silver || 15, color: '#9ca3af' },
    { name: 'Gold', minReferrals: 15, rate: rates?.gold || 20, color: '#eab308' },
    { name: 'Platinum', minReferrals: 50, rate: rates?.platinum || 25, color: '#94a3b8' },
    { name: 'Diamond', minReferrals: 100, rate: rates?.diamond || 35, color: '#3b82f6' },
  ];

  const currentTier = [...tiers].reverse().find(t => referralCount >= t.minReferrals) || tiers[0];
  const nextTier = tiers[tiers.indexOf(currentTier) + 1];
  const progressToNext = nextTier ? Math.min(100, ((referralCount - currentTier.minReferrals) / (nextTier.minReferrals - currentTier.minReferrals)) * 100) : 100;
  const referralsNeeded = nextTier ? nextTier.minReferrals - referralCount : 0;

  const totalEarned = earnings.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 reveal">
      <div className="lg:col-span-2 space-y-8">
        {/* Tier Card */}
        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-900/40 via-[#121a2d] to-[#0f172a] border border-blue-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="relative z-10 space-y-6">
            {/* Current Tier Badge */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-[0.2em]"
                style={{ backgroundColor: currentTier.color + '20', borderColor: currentTier.color + '50', color: currentTier.color }}>
                ★ {currentTier.name} Tier — {currentTier.rate}% Commission
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Network Strength</div>
                <div className="text-sm font-black" style={{ color: currentTier.color }}>{referralCount} active users</div>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-black leading-none">Share the OS, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Earn Profit.</span></h2>
            
            {/* Tier Progress */}
            {nextTier && (
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span style={{ color: currentTier.color }}>{currentTier.name}</span>
                  <span style={{ color: nextTier.color }}>{nextTier.name} ({nextTier.rate}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressToNext}%`, backgroundColor: currentTier.color }} />
                </div>
                <p className="text-[10px] font-bold text-center" style={{ color: 'var(--t-text-muted)' }}>
                  {referralsNeeded} more partner{referralsNeeded !== 1 ? 's' : ''} to reach {nextTier.name} Rewards
                </p>
              </div>
            )}

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

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
           <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Earned</div>
              <div className="text-2xl font-black font-mono">${totalEarned.toFixed(2)}</div>
           </div>
           <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Available</div>
              <div className="text-2xl font-black font-mono text-green-400">${(currentUser?.availableEarnings || 0).toFixed(2)}</div>
           </div>
           <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending</div>
              <div className="text-2xl font-black font-mono text-orange-400">${pendingEarnings.toFixed(2)}</div>
           </div>
           <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Share Partners</div>
              <div className="text-2xl font-black font-mono" style={{ color: currentTier.color }}>{referralCount}</div>
           </div>
        </div>

        {/* Referred Users */}
        <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold italic">Share Partners</h3>
              <div className="text-xs text-gray-500 font-bold uppercase">Status</div>
           </div>
           <div className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
                </div>
              ) : referrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-3xl bg-[var(--t-surface-dim)] border border-dashed border-[var(--t-border)] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)]">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--t-text)]">No revenue share partners yet</p>
                    <p className="text-[10px] text-[var(--t-text-muted)] mt-1">Start sharing your unique link to earn commissions.</p>
                  </div>
                </div>
              ) : (
                referrals.map((ref, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black">
                          {ref.referred?.name?.[0] || 'U'}
                        </div>
                        <div>
                           <div className="text-sm font-bold">{ref.referred?.name || 'Anonymous User'}</div>
                           <div className="text-[10px] text-gray-500 font-bold uppercase">
                             {ref.referred?.subscription_tier || 'Free'} Plan • Joined {new Date(ref.signup_date).toLocaleDateString()}
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-sm font-black text-green-500">
                          ${earnings.filter(e => e.referred_user_id === ref.referred_id).reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}
                        </div>
                        <div className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${ref.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                          {ref.status}
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      <div className="space-y-8">
          <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-8">
            <div className="space-y-2">
               <h3 className="text-xl font-bold italic">Enter Referral Code</h3>
               <p className="text-xs text-gray-400">Were you referred by someone? Enter their code here to get 1 month of Pro free.</p>
            </div>
            
            <div className="space-y-4">
               <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Enter code (e.g. WHOLESCALE-ADAM)" 
                    value={refCodeInput}
                    disabled={!!currentUser?.referredBy}
                    onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm text-white focus:border-blue-500 outline-none transition-all disabled:opacity-50" 
                  />
                  {currentUser?.referredBy && (
                    <p className="text-[10px] text-green-500 font-bold ml-1 flex items-center gap-1">
                      <Check size={12} /> Referral code active
                    </p>
                  )}
               </div>
               <button 
                onClick={onApply}
                disabled={isApplying || !!currentUser?.referredBy || !refCodeInput.trim()}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
               >
                  {isApplying ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Apply Code'}
               </button>
            </div>
         </div>

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
  const { updateProfile } = useStore();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    licenseNumber: user?.licenseNumber || '',
    socialLinks: {
      twitter: user?.socialLinks?.twitter || user?.socialLinks?.x || '',
      linkedin: user?.socialLinks?.linkedin || '',
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 1MB for base64 storage
    if (file.size > 1024 * 1024) {
      alert('Photo must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        setSaving(true);
        await updateProfile({ avatarUrl: base64String });
        alert('Photo updated successfully!');
      } catch (err) {
        console.error('Failed to upload photo:', err);
        alert('Failed to upload photo.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        bio: formData.bio,
        licenseNumber: formData.licenseNumber,
        socialLinks: {
          x: formData.socialLinks.twitter,
          linkedin: formData.socialLinks.linkedin
        }
      });
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 reveal">
      <div className="lg:col-span-2 space-y-12">
        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="w-32 h-32 rounded-3xl bg-blue-600 overflow-hidden flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.avatar || user?.name?.[0] || 'A'
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl hover:scale-110 transition-all text-blue-500"
              >
                <Camera size={18} />
              </button>
            </div>
            <div className="space-y-1">
               <h2 className="text-2xl font-black italic text-white">{formData.name || 'Authorized User'}</h2>
               <p className="text-[var(--t-text-muted)] text-sm">{formData.email || 'user@wholescaleos.com'}</p>
               <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">
                  <Check size={12} /> Pro Affiliate
               </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] ml-1">Full Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm text-white focus:border-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] ml-1">Official Email</label>
              <input 
                type="email" 
                value={formData.email} 
                disabled
                className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm text-[var(--t-text-muted)] outline-none cursor-not-allowed opacity-60" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] ml-1">Phone Number</label>
              <input 
                type="tel" 
                placeholder="+1 (555) 000-0000" 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm text-white focus:border-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] ml-1">Professional License #</label>
              <input 
                type="text" 
                placeholder="RE-123456789" 
                value={formData.licenseNumber}
                onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm text-white focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
           <label className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] ml-1">Professional Bio</label>
           <textarea 
            rows={4} 
            placeholder="Tell the world about your expertise..." 
            value={formData.bio}
            onChange={e => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-5 py-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-sm text-white focus:border-blue-500 outline-none transition-all resize-none" 
           />
        </section>

        <section className="space-y-6">
           <h3 className="text-sm font-black uppercase tracking-widest text-[var(--t-text-muted)]">Social Connections</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)]">
                 <Twitter size={18} className="text-[var(--t-text-muted)]" />
                 <input 
                  type="text" 
                  placeholder="@username" 
                  value={formData.socialLinks.twitter}
                  onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, twitter: e.target.value }})}
                  className="bg-transparent text-sm text-white outline-none flex-1" 
                 />
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)]">
                 <Linkedin size={18} className="text-[var(--t-text-muted)]" />
                 <input 
                  type="text" 
                  placeholder="linkedin.com/in/..." 
                  value={formData.socialLinks.linkedin}
                  onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: e.target.value }})}
                  className="bg-transparent text-sm text-white outline-none flex-1" 
                 />
              </div>
           </div>
        </section>
      </div>

      <div className="space-y-8">
         <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-bold text-white">Public Profile</h3>
               <div className="w-12 h-6 rounded-full bg-blue-600 p-1 relative">
                  <div className="w-4 h-4 rounded-full bg-white absolute right-1" />
               </div>
            </div>
            <p className="text-xs text-[var(--t-text-muted)] leading-relaxed">
               Enabling this allows agents and leads to view your public profile at <span className="text-blue-500 underline">wholescaleos.com/agent/{user?.name?.toLowerCase()?.replace(/\s+/g, '-')}</span>
            </p>
         </div>

         <div className="p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
            <h3 className="text-lg font-bold italic text-white">Identity Verification</h3>
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-xs text-[var(--t-success)] font-bold">
                  <Check size={16} /> Email Verified
               </div>
               <div className="flex items-center gap-3 text-xs text-[var(--t-text-muted)] font-bold">
                  <div className="w-4 h-4 rounded-full border border-[var(--t-text-muted)]" /> Identity Pending
               </div>
            </div>
            <button className="w-full py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
               Start Verification
            </button>
         </div>

         <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black shadow-2xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
         >
            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
         </button>
      </div>
    </div>
  );
}
