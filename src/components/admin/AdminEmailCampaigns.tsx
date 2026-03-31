import { useState, useEffect } from 'react';
import { 
  Plus, Mail, Send, 
  Trash2, Play, Loader2,
  AlertTriangle, CheckCircle
} from 'lucide-react';
import { 
  dbEmailTemplate, dbEmailCampaign, fetchEmailTemplates, 
  fetchEmailCampaigns, saveEmailCampaign, deleteEmailCampaign,
  updateEmailCampaign, sendEmail
} from '../../lib/email';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export default function AdminEmailCampaigns() {
  const [templates, setTemplates] = useState<dbEmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<dbEmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  
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
    } catch (err) {
      toast.error('Failed to load email data');
    } finally {
      setLoading(false);
    }
  }

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
        });

        if (result.success) successCount++;
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
        });
        if (result.success) success++;
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
                onClick={() => setPreviewMode('edit')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${previewMode === 'edit' ? 'bg-purple-600 text-white' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
              >
                Edit
              </button>
              <button 
                onClick={() => setPreviewMode('preview')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${previewMode === 'preview' ? 'bg-purple-600 text-white' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
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
                <textarea 
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Hello {{name}}..."
                  className="w-full h-48 bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none resize-none transition-all"
                  style={{ color: 'var(--t-text)' }}
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

      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-green-600 text-white font-black text-sm flex items-center gap-3 shadow-2xl animate-bounce z-[100]">
          <CheckCircle size={18} /> {message}
        </div>
      )}
    </div>
  );
}
