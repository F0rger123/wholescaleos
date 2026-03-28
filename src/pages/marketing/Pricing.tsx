import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Zap, Shield, Users, CreditCard, Sparkles, X, Info } from 'lucide-react';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const { currentUser } = useStore();

  const handleCheckout = async (planName: string) => {
    if (planName === 'Free') {
      window.location.href = '/login?signup=true&plan=Free';
      return;
    }

    if (!currentUser) {
      window.location.href = `/login?signup=true&plan=${planName}`;
      return;
    }

    setLoading(planName);

    try {
      if (!supabase) throw new Error('Supabase not configured');

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || currentUser?.id;

      const response = await fetch('https://jdneeubmkgefhrfcurji.supabase.co/functions/v1/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          plan: planName.toLowerCase(),
          billing: billingCycle,
          user_id: currentUserId,
          success_url: `${window.location.origin}/settings?tab=billing`,
          cancel_url: `${window.location.origin}/pricing`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Checkout failed. Please ensure Supabase Edge Functions are deployed.');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: 0,
      desc: 'Perfect for individual agents getting started.',
      features: [
        'Dashboard, Leads & Map',
        'Basic AI (50 credits/mo)',
        'Email sending (Gmail)',
        'SMS (Gmail gateway)',
        '1 team member',
        'Standard Support'
      ],
      cta: 'Get Started',
      popular: false,
      color: 'gray'
    },
    {
      name: 'Solo',
      price: 27,
      desc: 'Advanced tools for the solo power user.',
      features: [
        'Everything in Free',
        'Unlimited AI credits',
        'SMS (Brevo/Twilio ready)',
        'Voice AI & Call Scripts',
        'Email Templates',
        'Lead Scoring Engine'
      ],
      cta: 'Start Solo Trial',
      popular: false,
      color: 'blue'
    },
    {
      name: 'Pro',
      price: 97,
      desc: 'The sweet spot for growing teams.',
      features: [
        'Everything in Solo',
        'Up to 5 team members',
        'Analytics Dashboard',
        'Advanced AI Automations',
        'API Access',
        'Priority Support'
      ],
      cta: 'Go Pro Now',
      popular: true,
      color: 'indigo'
    },
    {
      name: 'Team',
      price: 197,
      desc: 'High-velocity collaboration for agencies.',
      features: [
        'Everything in Pro',
        'Up to 20 members',
        'Team Leaderboard',
        'Role-based Permissions',
        'White Labeling (Partial)',
        'Dedicated Account Manager'
      ],
      cta: 'Scale Your Team',
      popular: false,
      color: 'purple'
    },
    {
      name: 'Agency',
      price: 497,
      desc: 'Full-scale enterprise infrastructure.',
      features: [
        'Everything in Team',
        'Unlimited members',
        'Full White Label (Branded)',
        'Custom Domain Integration',
        'API Priority & SLA',
        'Custom Training & Onboarding'
      ],
      cta: 'Go Enterprise',
      popular: false,
      color: 'green',
      detailedFeatures: [
        { category: 'Team & Infrastructure', items: ['Everything in Team', 'Unlimited members', 'Full White Label (Branded)', 'Custom Domain Integration'] },
        { category: 'Performance', items: ['API Priority & SLA', 'Custom Training & Onboarding', 'Dedicated Success Team', 'Custom 24/7 Phone Support'] },
      ]
    }
  ].map(p => ({
    ...p,
    detailedFeatures: p.detailedFeatures || [
      { category: 'Features', items: p.features }
    ]
  }));

  const calculatePrice = (monthlyPrice: number) => {
    if (billingCycle === 'annual') {
      // 2 months free = (10/12) of annual cost if paid monthly, but usually it's just price * 10
      return monthlyPrice === 0 ? 0 : Math.round(monthlyPrice * 10 / 12);
    }
    return monthlyPrice;
  };

  return (
    <div className="pb-32 bg-[#0f172a]">
      {/* Hero Section */}
      <section className="pt-20 pb-16 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-100">
          Built for <span className="text-blue-500">Every Stage</span> of Growth.
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
          Choose the infrastructure that scales with your empire. Transparent pricing, no hidden fees.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="w-14 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 p-1 relative transition-colors hover:border-blue-500"
          >
            <div className={`w-5 h-5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 transition-all duration-300 ${billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-white' : 'text-gray-500'}`}>Annual</span>
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
              2 Months Free
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <div className="max-w-[1400px] mx-auto px-6 grid md:grid-cols-3 lg:grid-cols-5 gap-6">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-2 ${plan.popular
              ? 'bg-[#1e293b] border-blue-500 shadow-2xl shadow-blue-500/20 z-10 scale-105'
              : 'bg-[#121a2d] border-white/5 hover:border-white/10'
              }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                Most Popular
              </div>
            )}
            
            <button 
              onClick={() => setSelectedPlan(plan)}
              className="absolute top-6 right-6 p-1.5 rounded-lg text-gray-600 hover:text-blue-400 transition-colors"
              title="View Detailed Features"
            >
              <Info size={16} />
            </button>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                {plan.name}
                {plan.name === 'Agency' && <Sparkles size={16} className="text-yellow-400" />}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">${calculatePrice(plan.price)}</span>
                <span className="text-gray-500 text-sm font-medium">/mo</span>
              </div>
              <p className="text-gray-500 text-xs mt-4 leading-relaxed font-medium">{plan.desc}</p>
            </div>

            <div className="h-px bg-white/5 mb-8" />

            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-3 text-xs text-gray-400 leading-tight">
                  <Check size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.name)}
              disabled={loading !== null}
              className={`group flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover-glow hover-lift ${plan.popular
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                } ${loading === plan.name ? 'opacity-50 cursor-wait' : ''}`}
            >
              {loading === plan.name ? 'Connecting...' : plan.cta}
              {loading !== plan.name && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <section className="mt-32 max-w-7xl mx-auto px-6 overflow-x-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4 tracking-tight">Compare Features</h2>
          <p className="text-gray-400">Deep dive into the infrastructure specifics.</p>
        </div>
        
        <div className="min-w-[800px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-6 px-4 text-xs font-black uppercase tracking-widest text-gray-500">Core Features</th>
                {plans.map((p, i) => (
                  <th key={i} className="py-6 px-4 text-center">
                    <div className="text-sm font-bold text-white mb-1">{p.name}</div>
                    <div className="text-[10px] text-blue-500 font-black">${calculatePrice(p.price)}/mo</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm text-gray-400">
              {[
                { label: 'AI Triage Credits', values: ['50/mo', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
                { label: 'Team Members', values: ['1', '1', '5', '20', 'Unlimited'] },
                { label: 'Lead Management', values: ['Basic', 'Pro', 'Elite', 'Elite', 'Custom'] },
                { label: 'Integrated SMS', values: ['Gateways', 'Direct', 'Direct', 'Direct', 'API Priority'] },
                { label: 'Agent Profiles', values: ['No', 'Yes', 'Yes', 'Custom', 'Full White Label'] },
                { label: 'White Labeling', values: ['No', 'No', 'No', 'Partial', 'Full Branding'] },
                { label: 'Support Tier', values: ['Email', 'Standard', 'Priority', 'Dedicated', 'SLA & Training'] },
              ].map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-6 px-4 font-bold text-white/80">{row.label}</td>
                  {row.values.map((v, vIdx) => (
                    <td key={vIdx} className="py-6 px-4 text-center">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="mt-32 max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-8 py-8 px-12 rounded-[2rem] bg-white/5 border border-white/5 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex items-center gap-2 font-bold text-sm"><Shield size={18} /> Enterprise Secure</div>
          <div className="flex items-center gap-2 font-bold text-sm"><CreditCard size={18} /> Secure Checkout</div>
          <div className="flex items-center gap-2 font-bold text-sm"><Zap size={18} /> Instant Onboarding</div>
          <div className="flex items-center gap-2 font-bold text-sm hidden md:flex"><Users size={18} /> 5k+ Active Users</div>
        </div>
      </section>

      {/* ROI Callout */}
      <section className="mt-32 max-w-5xl mx-auto px-6">
        <div className="rounded-[3rem] p-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={120} />
          </div>
          <h2 className="text-3xl font-extrabold mb-6">Unsure which plan is right for you?</h2>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
            Our enterprise consultants can help you architect the perfect system for your team's specific workflow and scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact" className="px-8 py-4 rounded-xl bg-white text-[#0f172a] font-bold transition-all hover:scale-105">
              Talk to an Expert
            </Link>
            <Link to="/features" className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 font-bold border border-white/10 transition-all">
              Compare Features
            </Link>
          </div>
        </div>
      </section>

      {/* Detailed Plan Modal */}
      {selectedPlan && (
        <PlanDetailModal 
          plan={selectedPlan} 
          billingCycle={billingCycle}
          handleCheckout={handleCheckout}
          onClose={() => setSelectedPlan(null)} 
          calculatePrice={calculatePrice}
        />
      )}
    </div>
  );
}

function PlanDetailModal({ plan, billingCycle, onClose, calculatePrice, handleCheckout }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#121a2d] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/5 bg-[#0f172a]/50">
          <div>
            <h3 className="text-2xl md:text-3xl font-black italic text-white flex items-center gap-3 text-wrap">
              {plan.name} <span className="text-sm font-bold text-blue-500 not-italic uppercase tracking-widest block md:inline">Protocol</span>
            </h3>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{plan.desc}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all shrink-0">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 md:p-8 max-h-[60vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar space-y-10">
          <div className="flex items-center justify-between p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">Price ({billingCycle})</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">${calculatePrice(plan.price)}</span>
                <span className="text-gray-500 font-bold">/ month</span>
              </div>
            </div>
            <button 
              onClick={() => handleCheckout(plan.name)}
              className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20"
            >
              Initialize Plan
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {plan.detailedFeatures.map((section: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-2">{section.category}</h4>
                <ul className="space-y-3">
                  {section.items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                      <Check size={16} className="text-blue-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-[#0f172a]/50 border-t border-white/5 flex items-center justify-between">
           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Built for Sovereignty.</p>
           <button onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Close Overview</button>
        </div>
      </div>
    </div>
  );
}
