import { useState, useEffect } from 'react';
import { 
  Plus, Mail, Send, X, Trash2, Play, Loader2,
  AlertTriangle, CheckCircle, Layout, Sparkles,
  Copy
} from 'lucide-react';
import { 
  dbEmailTemplate, dbEmailCampaign, fetchEmailTemplates, 
  fetchEmailCampaigns, saveEmailCampaign, deleteEmailCampaign,
  updateEmailCampaign, sendEmail
} from '../../lib/email';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import RichTextEditor from './RichTextEditor';

const PREDEFINED_TEMPLATES = [
  {
    id: 'tpl_welcome',
    name: 'Branded Welcome',
    subject: 'Welcome to WholeScale OS, {{name}}! 🚀',
    category: 'Onboarding',
    description: 'A premium welcome email with platform highlights.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #0a0a0c; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f1f23;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -1px; font-style: italic; text-transform: uppercase; margin: 0;">WholeScale <span style="color: #8b5cf6;">OS</span></h1>
        </div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">Welcome aboard, {{name}}!</h2>
        <p style="color: #a1a1aa; line-height: 1.6; font-size: 16px;">We're thrilled to have you join the most powerful property acquisition platform in the game. Here's how to get started:</p>
        <div style="background: #161618; padding: 24px; border-radius: 16px; margin: 30px 0;">
          <ul style="margin: 0; padding-left: 20px; color: #d4d4d8;">
            <li style="margin-bottom: 12px;">Import your first leads via URL or PDF</li>
            <li style="margin-bottom: 12px;">Setup your Team Hub and invite collaborators</li>
            <li style="margin-bottom: 12px;">Link your Stripe account for effortless billing</li>
          </ul>
        </div>
        <a href="https://wholescaleos.pages.dev/dashboard" style="display: block; width: 100%; padding: 16px; background: #8b5cf6; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Launch Dashboard</a>
        <p style="text-align: center; color: #52525b; font-size: 12px; margin-top: 40px;">© 2026 WholeScale OS. All rights reserved.</p>
      </div>
    `
  },
  {
    id: 'tpl_feature',
    name: 'Feature Update',
    subject: 'New Feature: AI Lead Scraping is Here! ✨',
    category: 'Product',
    description: 'Highlight new platform capabilities.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px;">
        <div style="display: inline-block; padding: 4px 12px; background: #ede9fe; color: #8b5cf6; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">New Release</div>
        <h2 style="font-size: 36px; font-weight: 900; letter-spacing: -2px; margin: 0 0 20px 0;">AI Scraping has arrived.</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Stop wasting time on manual entry. Our new AI engine can now extract property data directly from any URL or PDF document with 99% accuracy.</p>
        <img src="https://images.unsplash.com/photo-1551288049-bbbda5366391?auto=format&fit=crop&q=80&w=800&h=400" style="width: 100%; border-radius: 16px; margin: 30px 0;" />
        <div style="border-left: 4px solid #8b5cf6; padding-left: 20px; margin: 30px 0;">
          <p style="font-weight: 700; margin: 0;">"The AI import saved our team 20+ hours in the first week alone."</p>
          <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">— Sarah Jenkins, Pro Agency User</p>
        </div>
        <a href="https://wholescaleos.pages.dev/imports" style="display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Explore Feature</a>
      </div>
    `
  },
  {
    id: 'tpl_promo',
    name: 'Flash Sale',
    subject: 'Flash Sale: 40% OFF Pro & Team Tiers 💸',
    category: 'Marketing',
    description: 'High-conversion sales template.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: linear-gradient(135deg, #4f46e5, #9333ea); color: #ffffff; padding: 50px; border-radius: 24px; text-align: center;">
        <h3 style="text-transform: uppercase; letter-spacing: 3px; font-size: 14px; font-weight: 900; margin-bottom: 20px;">Limited Time Offer</h3>
        <h1 style="font-size: 64px; font-weight: 900; margin: 0; line-height: 0.8;">40% OFF</h1>
        <p style="font-size: 18px; margin: 30px 0; opacity: 0.9;">Upgrade to Pro or Team this week and lock in our lowest price ever.</p>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 16px; backdrop-filter: blur(10px); margin-bottom: 30px;">
          <p style="margin: 0; font-weight: 700;">Use Code: <span style="background: #ffffff; color: #4f46e5; padding: 4px 10px; border-radius: 4px;">GROWTH2024</span></p>
        </div>
        <a href="https://wholescaleos.pages.dev/pricing" style="display: inline-block; padding: 18px 40px; background: #ffffff; color: #4f46e5; text-decoration: none; border-radius: 99px; font-weight: 900; text-transform: uppercase; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">Claim Discount</a>
      </div>
    `
  },
  {
    id: 'tpl_abandoned_lead',
    name: 'Abandoned Lead Follow-up',
    subject: 'Still interested in {{address}}? 🤔',
    category: 'Sales',
    description: 'Re-engage leads that haven\'t been contacted recently.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Checking in...</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hi {{name}}, I noticed we haven't connected in a while regarding the property at <strong>{{address}}</strong>. Are you still looking to sell or move forward with an offer?</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 16px; margin: 30px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 700;">Market Alert:</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Inventory is currently low in your area, meaning now is a prime time to get a competitive value for your property.</p>
        </div>
        <a href="https://wholescaleos.pages.dev/leads" style="display: block; width: 100%; padding: 16px; background: #4f46e5; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Reply to Message</a>
      </div>
    `
  },
  {
    id: 'tpl_open_house',
    name: 'Open House Invitation',
    subject: 'You\'re Invited: Open House at {{address}} 🏠',
    category: 'Marketing',
    description: 'Promote upcoming open houses to your lead list.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #0f172a; color: #ffffff; padding: 40px; border-radius: 24px; text-align: center;">
        <div style="display: inline-block; padding: 4px 12px; background: #3b82f6; color: #ffffff; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">VIP Invitation</div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">Open House Alert</h2>
        <p style="color: #94a3b8; margin-bottom: 30px;">Join us this weekend for an exclusive tour of this incredible property.</p>
        <div style="background: #1e293b; padding: 30px; border-radius: 24px; margin-bottom: 30px; border: 1px solid #334155;">
          <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">{{address}}</h3>
          <p style="color: #3b82f6; font-weight: 900; font-size: 18px; margin: 0;">Saturday 12pm - 4pm</p>
        </div>
        <a href="https://wholescaleos.pages.dev/calendar" style="display: block; width: 100%; padding: 16px; background: #ffffff; color: #0f172a; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">RSVP Now</a>
      </div>
    `
  },
  {
    id: 'tpl_survey',
    name: 'Client Survey',
    subject: 'How did we do? Tell us your feedback! ⭐',
    category: 'Operations',
    description: 'Post-closing feedback request.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 32px; border: 1px solid #e2e8f0; text-align: center;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Your opinion matters.</h2>
        <p style="color: #64748b; line-height: 1.6; font-size: 16px;">We recently closed the deal on <strong>{{address}}</strong> and we'd love to know how your experience was working with WholeScale OS.</p>
        <div style="margin: 40px 0; font-size: 30px; letter-spacing: 10px;">⭐ ⭐ ⭐ ⭐ ⭐</div>
        <a href="https://wholescaleos.pages.dev/settings" style="display: block; width: 100%; padding: 18px; background: #0f172a; color: #ffffff; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 900; text-transform: uppercase;">Take 2-Min Survey</a>
      </div>
    `
  },
  {
    id: 'tpl_revenue_share',
    name: 'Revenue Share Request',
    subject: 'Join our Revenue Share network and earn! 💸',
    category: 'Marketing',
    description: 'Invite users to become revenue share partners.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f8fafc; color: #0f172a; padding: 40px; border-radius: 24px; border: 1px dashed #cbd5e1; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 20px;">🤝</div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 15px;">Revenue Share Program.</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">We believe in sharing the rewards of our growth. Join our revenue share network by bringing your contacts to the platform and earn a lifetime commission on their usage!</p>
        <div style="background: #ffffff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 30px;">
          <p style="margin: 0; font-weight: 800; font-size: 14px; color: #64748b; text-transform: uppercase;">Your Partner Link:</p>
          <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 18px; color: #3b82f6; font-weight: bold;">wholescaleos.io/share/{{name}}</p>
        </div>
        <a href="https://wholescaleos.pages.dev/dashboard/billing?tab=referral" style="display: block; width: 100%; padding: 16px; background: #3b82f6; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Become a Partner</a>
      </div>
    `
  },
  {
    id: 'tpl_market_update',
    name: 'Market Update',
    subject: 'Monthly Market Trends: What\'s your home worth? 📈',
    category: 'Marketing',
    description: 'Provide value to leads with market insights.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 20px;">Market Trend Report: {{name}}</h2>
        <p style="color: #4b5563; margin-bottom: 30px;">The real estate market is shifting. Here's a quick update on current trends in your area to help you make informed decisions.</p>
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 12px; text-align: center;">
            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #6b7280; text-transform: uppercase;">Avg Sale Price</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; color: #059669;">+4.2% ↑</p>
          </div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 12px; text-align: center;">
            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #6b7280; text-transform: uppercase;">Inventory</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; color: #dc2626;">-12.5% ↓</p>
          </div>
        </div>
        <a href="https://wholescaleos.pages.dev/map" style="display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">View Local Heatmap</a>
      </div>
    `
  },
  {
    id: 'tpl_new_listing',
    name: 'New Listing Alert',
    subject: 'Just Listed: New Investment Property! 🔥 {{address}}',
    category: 'Sales',
    description: 'Alert buyers or sellers about new listings.',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 0; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800&h=450" style="width: 100%; display: block;" />
        <div style="padding: 30px;">
          <div style="display: inline-block; padding: 4px 10px; background: #dcfce7; color: #166534; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">New Listing</div>
          <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 10px 0;">{{address}}</h2>
          <p style="font-size: 20px; font-weight: 900; color: #3b82f6; margin: 0 0 20px 0;">Asking: $245,000</p>
          <div style="height: 1px; background: #f1f5f9; margin: 20px 0;"></div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">Incredible off-market opportunity with high equity potential. Motivated seller. Needs minor cosmetic updates. ARV estimated at $380,000.</p>
          <a href="https://wholescaleos.pages.dev/leads" style="display: block; width: 100%; padding: 16px; background: #3b82f6; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Review Full Deal Package</a>
        </div>
      </div>
    `
  }
];

export interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  sent_at: string;
  status: string;
}

export default function AdminEmailCampaigns() {
  const [templates, setTemplates] = useState<dbEmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<dbEmailCampaign[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'sent'>('campaigns');
  
  // Create Campaign State
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template_id: '',
    recipients: '',
    scheduled_at: ''
  });

  // Individual Email (Legacy Mode/Quick Send)
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'scheduled' | 'completed'>('all');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tps, cps] = await Promise.all([
        fetchEmailTemplates(),
        fetchEmailCampaigns()
      ]);
      setTemplates(tps);
      setCampaigns(cps);

      // Load logs
      if (supabase) {
        const { data: logsData } = await supabase
          .from('email_logs')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(50);
        if (logsData) setLogs(logsData);
      }
    } catch (err) {
      toast.error('Failed to load email data');
    } finally {
      setLoading(false);
    }
  }

  const logEmail = async (to_email: string, subject: string, template_id?: string) => {
    if (!supabase) return;
    try {
      const { data: logEntry } = await supabase
        .from('email_logs')
        .insert({
          to_email,
          subject,
          template_id: template_id?.startsWith('tpl_') ? null : template_id, // exclude predefined string IDs
          status: 'sent'
        })
        .select()
        .single();
      
      if (logEntry) setLogs(prev => [logEntry, ...prev]);
    } catch (err) {
      console.warn('Failed to log email:', err);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.template_id || !newCampaign.recipients) {
      toast.error('Please fill in all fields');
      return;
    }

    const recipientsArray = newCampaign.recipients.split(',').map(r => r.trim()).filter(Boolean);
    
    const campaign = await saveEmailCampaign({
      name: newCampaign.name,
      template_id: newCampaign.template_id,
      status: 'draft',
      recipients: recipientsArray,
      metadata: {}
    });

    if (campaign) {
      setCampaigns([campaign, ...campaigns]);
      setShowNewModal(false);
      setNewCampaign({ name: '', template_id: '', recipients: '', scheduled_at: '' });
      toast.success('Campaign created');
    }
  };

  const handleSendCampaign = async (campaign: dbEmailCampaign) => {
    const template = templates.find(t => t.id === campaign.template_id);
    
    if (!template) {
      toast.error('Template not found');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    toast.loading(`Sending to ${campaign.recipients.length} recipients...`, { id: 'sending-campaign' });

    for (const recipient of campaign.recipients) {
      try {
        const result = await sendEmail({
          to: recipient,
          subject: template.subject,
          html: template.body.replace(/\{\{name\}\}/g, recipient.split('@')[0]),
          from: 'noreply@wholescaleos.com' // System branded sender
        });

        if (result.success) {
          successCount++;
          await logEmail(recipient, template.subject, template.id);
        }
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    await updateEmailCampaign(campaign.id, { status: 'completed' });
    setCampaigns(campaigns.map(c => c.id === campaign.id ? { ...c, status: 'completed' } : c));
    
    toast.dismiss('sending-campaign');
    if (failCount === 0) {
      toast.success(`Success! Sent ${successCount} emails.`);
    } else {
      toast.success(`Done. ${successCount} sent, ${failCount} failed.`);
    }
  };

  const handleQuickSend = async () => {
    if (!subject || !body || !supabase) return;
    setSending(true);
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('email, full_name');
        
      if (!users?.length) {
        toast.error('No users found in segment');
        return;
      }

      toast.loading('Launching quick campaign...', { id: 'quick-send' });

      let success = 0;
      for (const user of users) {
        if (!user.email) continue;
        const result = await sendEmail({
          to: user.email as string,
          subject: subject,
          html: body.replace(/\{\{name\}\}/g, user.full_name || 'User'),
          mode: 'system' // Branded sender
        });
        if (result.success) {
          success++;
          await logEmail(user.email as string, subject);
        }
      }

      toast.success(`Sent to ${success} users`, { id: 'quick-send' });
      setMessage(`Success! Sent to ${success} users.`);
      setSubject('');
      setBody('');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('Failed to send campaign:', err);
      toast.error('Failed to launch campaign');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (await deleteEmailCampaign(id)) {
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast.success('Campaign deleted');
    }
  };

  const applyLibraryTemplate = (tpl: typeof PREDEFINED_TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setBody(tpl.html);
    setShowLibrary(false);
    toast.success('Template applied!');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Send Section */}
        <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold italic uppercase tracking-tighter flex items-center gap-2">
              <Mail className="text-purple-500" size={20} /> Quick Send
            </h3>
            <div className="flex bg-[var(--t-bg)] p-1 rounded-xl border border-[var(--t-border)]">
              <button 
                onClick={() => setShowLibrary(true)}
                className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 hover:bg-[var(--t-surface-dim)] text-[var(--t-primary)]"
              >
                <Layout size={14} /> Templates
              </button>
              <div className="w-[1px] bg-[var(--t-border)] mx-1 self-stretch" />
              <button 
                onClick={() => setPreviewMode('edit')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${previewMode === 'edit' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
              >
                Edit
              </button>
              <button 
                onClick={() => setPreviewMode('preview')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${previewMode === 'preview' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
              >
                Preview
              </button>
            </div>
          </div>

          {previewMode === 'edit' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">Subject Line</label>
                <input 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Important update..."
                  className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none transition-all"
                  style={{ color: 'var(--t-text)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">Content (HTML)</label>
                <RichTextEditor 
                  value={body}
                  onChange={setBody}
                  placeholder="Hello {{name}}, launch your message here..."
                  minHeight="280px"
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="flex items-center gap-2 text-xs text-[var(--t-text-muted)]">
                  <AlertTriangle size={14} className="text-yellow-500" /> Use <code>{"{{name}}"}</code> for personalized names.
                </div>
                <button 
                  onClick={handleQuickSend}
                  disabled={sending || !subject || !body}
                  className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Launch Now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="p-8 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] min-h-[300px] overflow-y-auto shadow-inner">
                 <div className="mb-6 pb-4 border-b border-[var(--t-border)]">
                   <div className="text-[10px] font-black uppercase text-[var(--t-text-muted)] mb-1">Subject</div>
                   <div className="text-lg font-bold text-[var(--t-text)]">{subject || '(No Subject)'}</div>
                 </div>
                 <div className="prose prose-invert max-w-none text-[var(--t-text)]" dangerouslySetInnerHTML={{ __html: body.replace(/\{\{name\}\}/g, 'John Doe') || '<p class="text-[var(--t-text-muted)] italic">No content yet...</p>' }} />
               </div>
               <div className="flex justify-between items-center">
                  <p className="text-[10px] text-[var(--t-text-muted)] font-bold italic uppercase tracking-tighter">This is a preview using "John Doe" as the recipient.</p>
                  <button 
                    onClick={() => setPreviewMode('edit')}
                    className="px-6 py-2 rounded-xl border border-[var(--t-border)] text-[var(--t-text-muted)] font-bold text-sm hover:bg-white/5 transition-all"
                  >
                    Back to Editor
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Recent Campaigns Sidebar */}
        <div className="space-y-8">
          <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold italic uppercase tracking-tighter text-[var(--t-text)]">Campaigns</h3>
              <button 
                onClick={() => setShowNewModal(true)}
                className="p-2 rounded-xl bg-purple-600/10 text-purple-500 hover:bg-purple-600 hover:text-white transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="flex bg-[var(--t-bg)] p-1 rounded-xl border border-[var(--t-border)] mb-4">
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'campaigns' ? 'bg-purple-600 text-white' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
              >
                Campaigns
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'sent' ? 'bg-purple-600 text-white' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
              >
                Sent
              </button>
            </div>

            {activeTab === 'campaigns' ? (
              <>
                <div className="flex gap-2 p-1 bg-[var(--t-bg)] rounded-xl border border-[var(--t-border)] mb-4">
                  {(['all', 'draft', 'scheduled', 'completed'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeFilter === f ? 'bg-purple-600 text-white' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-purple-500" /></div>
                  ) : (campaigns.filter(c => activeFilter === 'all' || c.status === activeFilter)).length === 0 ? (
                    <div className="text-center py-8 text-xs text-[var(--t-text-muted)] italic">No {activeFilter !== 'all' ? activeFilter : ''} campaigns found</div>
                  ) : campaigns.filter(c => activeFilter === 'all' || c.status === activeFilter).map(c => (
                    <div key={c.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-bold text-[var(--t-text)] line-clamp-1">{c.name}</div>
                        <div className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          c.status === 'completed' ? 'text-green-500 bg-green-500/10' : 
                          c.status === 'scheduled' ? 'text-blue-500 bg-blue-500/10' :
                          'text-yellow-500 bg-yellow-500/10'
                        }`}>
                          {c.status}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase">
                            {c.recipients.length} Recipients
                          </span>
                          {c.metadata?.scheduled_at && (
                            <span className="text-[9px] text-purple-500 font-bold">
                              {new Date(c.metadata.scheduled_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status !== 'completed' && (
                            <button onClick={() => handleSendCampaign(c)} className="text-green-500 hover:scale-110 transition-transform">
                              <Play size={14} fill="currentColor" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:scale-110 transition-transform">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--t-text-muted)] italic">No sent emails found</div>
                ) : logs.map(log => (
                  <div key={log.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-[11px] font-bold text-[var(--t-text)] line-clamp-1">{log.subject}</div>
                      <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded">Sent</span>
                    </div>
                    <div className="text-[10px] text-[var(--t-text-muted)] mb-2 font-medium">{log.to_email}</div>
                    <div className="text-[9px] text-[var(--t-text-muted)] italic font-bold">
                      {new Date(log.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2.5rem] shadow-2xl p-8">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)] mb-6">Create Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2">Campaign Name</label>
                <input 
                  type="text"
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., Welcome Series March"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] text-[var(--t-text)] outline-none focus:border-purple-500 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2">Email Template</label>
                <select 
                  value={newCampaign.template_id}
                  onChange={e => setNewCampaign({ ...newCampaign, template_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] text-[var(--t-text)] outline-none focus:border-purple-500 transition-all"
                >
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2">Recipients (Comma separated)</label>
                <textarea 
                  value={newCampaign.recipients}
                  onChange={e => setNewCampaign({ ...newCampaign, recipients: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] text-[var(--t-text)] outline-none focus:border-purple-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2">Schedule Send (Optional)</label>
                <input 
                  type="datetime-local"
                  value={newCampaign.scheduled_at}
                  onChange={e => setNewCampaign({ ...newCampaign, scheduled_at: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] text-[var(--t-text)] outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-4 rounded-2xl border border-[var(--t-border)] text-[var(--t-text-muted)] font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCampaign}
                className="flex-[2] py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {showLibrary && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[3rem] shadow-2xl p-8 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8 shrink-0">
               <div>
                 <h3 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)] flex items-center gap-3">
                   <Sparkles className="text-purple-500" /> Template Library
                 </h3>
                 <p className="text-[10px] text-[var(--t-text-muted)] font-black uppercase tracking-widest mt-1">Pre-built high-conversion layouts</p>
               </div>
               <button onClick={() => setShowLibrary(false)} className="p-3 rounded-2xl hover:bg-[var(--t-surface-dim)]">
                 <X size={24} />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {PREDEFINED_TEMPLATES.map((tpl) => (
                     <div key={tpl.id} className="group relative rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface-dim)] overflow-hidden hover:border-purple-500/50 transition-all flex flex-col">
                        <div className="aspect-[4/5] bg-white overflow-hidden relative">
                           <iframe 
                             srcDoc={tpl.html} 
                             className="w-full h-full border-none pointer-events-none scale-[0.4] origin-top"
                             title={tpl.name}
                           />
                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button 
                                onClick={() => applyLibraryTemplate(tpl)}
                                className="px-6 py-2.5 rounded-full bg-white text-black font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
                              >
                                Apply Design
                              </button>
                           </div>
                        </div>
                        <div className="p-5 space-y-2">
                           <div className="flex items-center justify-between">
                             <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                               {tpl.category}
                             </span>
                             <div className="flex gap-1">
                               <button onClick={() => applyLibraryTemplate(tpl)} className="p-1.5 rounded-lg bg-[var(--t-surface)] text-[var(--t-text-muted)] hover:text-purple-500"><Copy size={14} /></button>
                             </div>
                           </div>
                           <h4 className="font-bold text-[var(--t-text)]">{tpl.name}</h4>
                           <p className="text-[10px] text-[var(--t-text-muted)] line-clamp-2 italic">{tpl.description}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-green-600 text-white font-black text-sm flex items-center gap-3 shadow-2xl animate-bounce z-[100]">
          <CheckCircle size={18} /> {message}
        </div>
      )}
    </div>
  );
}
