import React from 'react';
import { CloudCheck, ExternalLink, Globe, Smartphone, Shield, Zap } from 'lucide-react';

const AdminExternalServices: React.FC = () => {
  const services = [
    { label: 'Supabase', url: 'https://supabase.com/dashboard', desc: 'Database, Auth & Edge Functions' },
    { label: 'Resend', url: 'https://resend.com', desc: 'Transactional Email Infrastructure' },
    { label: 'Stripe', url: 'https://dashboard.stripe.com', desc: 'Payments & Subscription billing' },
    { label: 'Cloudflare', url: 'https://dash.cloudflare.com', desc: 'DNS, CDN & Security' },
    { label: 'Google AI Studio', url: 'https://aistudio.google.com', desc: 'Gemini Model Management' },
    { label: 'OpenAI Platform', url: 'https://platform.openai.com', desc: 'GPT-4o & API Keys' }
  ];

  const integrations = [
    { name: 'GoHighLevel', status: 'Connected', icon: Globe, color: 'text-blue-500' },
    { name: 'Twilio SMS', status: 'Pending', icon: Smartphone, color: 'text-red-500' },
    { name: 'Sentry', status: 'Disconnected', icon: Shield, color: 'text-gray-500' },
    { name: 'PostHog', status: 'Connected', icon: Zap, color: 'text-yellow-500' }
  ];

  return (
    <div className="space-y-8 reveal">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resource Suite */}
        <div className="bg-[var(--t-surface)] rounded-[2rem] border border-[var(--t-border)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <CloudCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Industry Resource Suite</h3>
              <p className="text-sm text-[var(--t-text-muted)]">Direct access to core infrastructure dashboards.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {services.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface-dim)]/50 hover:bg-[var(--t-surface-hover)] hover:border-[var(--t-primary)]/30 transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-white group-hover:text-[var(--t-primary)] transition-colors">{link.label}</span>
                  <span className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-wider">{link.desc}</span>
                </div>
                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-[var(--t-surface)] rounded-[2rem] border border-[var(--t-border)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">API Integrations</h3>
              <p className="text-sm text-[var(--t-text-muted)]">Active connections to third-party platforms.</p>
            </div>
          </div>

          <div className="space-y-4">
            {integrations.map((app) => (
              <div key={app.name} className="flex items-center justify-between p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-background)]/50">
                <div className="flex items-center gap-4">
                  <app.icon size={20} className={app.color} />
                  <div>
                    <p className="font-bold">{app.name}</p>
                    <p className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-widest">{app.status}</p>
                  </div>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-[var(--t-surface-subtle)] hover:bg-[var(--t-surface-hover)] transition-colors">
                  Configure
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-xs leading-relaxed text-[var(--t-text-muted)] italic">
              <strong>Note:</strong> API keys for these services are managed via Supabase Vault or encrypted environment variables for maximum security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExternalServices;
