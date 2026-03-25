import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '$0',
      desc: 'Perfect for individual agents getting started.',
      features: [
        'Up to 100 Leads',
        'Basic Map View',
        'Deal Calculators',
        'Standard Email Notifications',
        'Mobile App Access'
      ],
      cta: 'Start for Free',
      popular: false
    },
    {
      name: 'Professional',
      price: '$99',
      desc: 'Advanced tools for growing real estate teams.',
      features: [
        'Unlimited Leads',
        'Full AI SMS Automation',
        'Suggested Replies Hub',
        'Team Presence & Chat',
        'Google Calendar Sync',
        'Priority Support'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      desc: 'Seamless scale for large organizations.',
      features: [
        'Dedicated Success Manager',
        'Custom AI Model Tuning',
        'Advanced Security & SSO',
        'API Access',
        'White-label Options',
        'Unlimited Team Members'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="pb-32">
      <section className="pt-20 pb-20 text-center px-6">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Simple, <span className="text-blue-500">Transparent</span> Pricing</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Choose the plan that fits your growth. No hidden fees, no long-term contracts.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`relative p-8 rounded-3xl border transition-all hover:scale-105 duration-300 ${plan.popular
                ? 'bg-[#1e293b] border-blue-500 shadow-2xl shadow-blue-500/10 z-10'
                : 'bg-[#0b1120] border-white/5'
              }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-500 text-white text-xs font-bold uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-gray-400 text-sm">/mo</span>}
              </div>
              <p className="text-gray-400 text-sm mt-4">{plan.desc}</p>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={18} className="text-blue-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              to={plan.price === 'Custom' ? '/contact' : '/login?signup=true'}
              className={`block w-full py-4 rounded-xl text-center font-bold transition-all ${plan.popular
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-32 max-w-3xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            { q: 'Can I change plans later?', a: 'Yes, you can upgrade or downgrade your plan at any time from your account settings.' },
            { q: 'Is there a free trial?', a: 'Yes! All plans come with a 14-day free trial, no credit card required.' },
            { q: 'Do you offer annual discounts?', a: 'We do! Save 20% when you pay annually for any Professional or Enterprise plan.' }
          ].map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#1e293b]/30 border border-white/5">
              <h4 className="font-bold mb-2 text-white">{faq.q}</h4>
              <p className="text-gray-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
