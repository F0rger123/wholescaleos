import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Zap, Shield, Users, CreditCard, Sparkles } from 'lucide-react';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

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
      color: 'green'
    }
  ];

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

            <Link
              to={plan.name === 'Agency' ? '/contact' : '/login?signup=true'}
              className={`group flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${plan.popular
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
            >
              {plan.cta}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ))}
      </div>

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
    </div>
  );
}
