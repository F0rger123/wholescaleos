import { useState, useEffect } from 'react';
import { 
  Plus, Mail, Send, X, Trash2, Play, Loader2,
  CheckCircle, Layout, Sparkles,
  Copy, ChevronDown
} from 'lucide-react';
import { 
  dbEmailTemplate, dbEmailCampaign, fetchEmailTemplates, 
  saveEmailTemplate, deleteEmailTemplate,
  fetchEmailCampaigns, saveEmailCampaign, deleteEmailCampaign,
  updateEmailCampaign, sendEmail
} from '../../lib/email';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import RichTextEditor from './RichTextEditor';
import { DEFAULT_TEMPLATES } from '../../lib/default-templates';

const EmailTemplatePreview = ({ html, body, scale = 0.25, className = "" }: { html?: string, body?: string, scale?: number, className?: string }) => {
  const previewHtml = html || `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      ${(body || '').replace(/\n/g, '<br/>')}
    </div>
  `;

  return (
    <div className={`rounded-lg border border-[var(--t-border)] bg-white overflow-hidden relative ${className}`}>
      <div 
        className="absolute inset-0 origin-top-left p-8 bg-white pointer-events-none"
        style={{ 
          width: `${100 / scale}%`, 
          height: `${100 / scale}%`, 
          transform: `scale(${scale})` 
        }}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );
};

const AdminEmailCampaigns = () => {
  const { currentUser } = useStore();
  const [templates, setTemplates] = useState<dbEmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<dbEmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<dbEmailTemplate> | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Partial<dbEmailCampaign> | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns'>('templates');
  const [isSending, setIsSending] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, c] = await Promise.all([
        fetchEmailTemplates(),
        fetchEmailCampaigns()
      ]);
      setTemplates(t);
      setCampaigns(c);
    } catch (error) {
      console.error('Error loading email data:', error);
      toast.error('Failed to load email data');
    } finally {
      setLoading(false);
    }
  };

  const getInterpolatedHtml = (html: string) => {
    const vars: Record<string, string> = {
      '{{name}}': 'John Doe',
      '{{address}}': '123 Luxury Lane',
      '{{area}}': 'Beverly Hills',
      '{{city}}': 'Los Angeles',
      '{{agent_name}}': currentUser?.name || 'Agent Name',
      '{{price}}': '$1,250,000'
    };

    let processed = html;
    Object.entries(vars).forEach(([key, val]) => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processed = processed.replace(regex, val);
    });
    return processed;
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.html_content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await saveEmailTemplate({
        ...editingTemplate,
        id: editingTemplate.id || crypto.randomUUID()
      } as dbEmailTemplate);
      toast.success('Template saved successfully');
      setShowTemplateModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteEmailTemplate(id);
      toast.success('Template deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleSaveCampaign = async () => {
    if (!editingCampaign?.name || !editingCampaign?.template_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await saveEmailCampaign({
        ...editingCampaign,
        id: editingCampaign.id || crypto.randomUUID(),
        status: editingCampaign.status || 'draft',
        recipient_count: 0,
        success_count: 0,
        fail_count: 0
      } as dbEmailCampaign);
      toast.success('Campaign saved successfully');
      setShowCampaignModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Failed to save campaign');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await deleteEmailCampaign(id);
      toast.success('Campaign deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleLaunchCampaign = async (campaign: dbEmailCampaign) => {
    if (!window.confirm(`Launch campaign "${campaign.name}"? This will send emails to all matching recipients.`)) return;
    
    setIsSending(true);
    const toastId = toast.loading('Launching campaign...');

    try {
      if (!supabase) throw new Error('Supabase not initialized');

      // 1. Get recipients (for demo, we'll use active users)
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .not('email', 'is', null);

      if (pError) throw pError;

      if (!profiles || profiles.length === 0) {
        toast.error('No recipients found', { id: toastId });
        return;
      }

      toast.loading(`Sending to ${profiles.length} recipients...`, { id: toastId });

      // 2. Get template content
      const template = templates.find(t => t.id === campaign.template_id);
      if (!template) throw new Error('Template not found');

      let successCount = 0;
      let failCount = 0;

      // 3. Send emails
      for (const profile of profiles) {
        try {
          const personalizedHtml = (template.html_content || template.body || '')
            .replace(/{{name}}/g, profile.full_name || 'there')
            .replace(/{{email}}/g, profile.email);

          await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: personalizedHtml
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${profile.email}:`, err);
          failCount++;
        }
      }

      // 4. Update campaign stats
      await updateEmailCampaign(campaign.id, {
        status: 'completed',
        last_run_at: new Date().toISOString(),
        recipient_count: profiles.length,
        success_count: successCount,
        fail_count: failCount
      });

      toast.success(`Sent ${successCount} emails. ${failCount} failed.`, { id: toastId });
      loadData();
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast.error('Failed to launch campaign', { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const handleImportPredefined = (tpl: any) => {
    setEditingTemplate({
      name: tpl.name,
      subject: tpl.subject,
      category: tpl.category,
      description: tpl.description,
      html_content: tpl.html || tpl.body || tpl.content || '',
    });
    setShowTemplateModal(true);
  };

  const handleUpdateTemplateImage = async (_: string, file: File) => {
    if (!supabase) return;
    
    const toastId = toast.loading('Uploading image...');
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('email-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('email-assets')
        .getPublicUrl(fileName);

      // Re-replace in content
      // If we clicked an image, we should replace that specific img src.
      // This is handled in the onClick handler below.
      
      toast.success('Image updated', { id: toastId });
      return publicUrl;
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] italic">
            Email <span className="text-[var(--t-primary)]">Campaigns</span>
          </h1>
          <p className="text-[var(--t-text-muted)] mt-1">Manage templates and broadcast lists</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingTemplate({});
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--t-primary)] text-white rounded-lg font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--t-primary-rgb),0.3)]"
          >
            <Plus size={20} />
            New Template
          </button>
          <button
            onClick={() => {
              setEditingCampaign({});
              setShowCampaignModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--t-surface)] text-[var(--t-text)] border border-[var(--t-border)] rounded-lg font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
          >
            <Mail size={20} />
            New Campaign
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all ${
            activeTab === 'templates'
              ? 'bg-[var(--t-primary)] text-white shadow-lg'
              : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
          }`}
        >
          <Layout size={18} />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all ${
            activeTab === 'campaigns'
              ? 'bg-[var(--t-primary)] text-white shadow-lg'
              : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
          }`}
        >
          <Send size={18} />
          Campaigns
        </button>
      </div>

      {activeTab === 'templates' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="group p-5 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl transition-all hover:border-[var(--t-primary)]/50 flex gap-6"
              >
                {/* HTML Preview Thumbnail */}
                <EmailTemplatePreview 
                  html={tpl.html_content} 
                  body={tpl.body}
                  className="w-24 h-32 flex-shrink-0"
                />

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black uppercase tracking-wider text-lg">{tpl.name}</h3>
                      <span className="px-2 py-0.5 bg-[var(--t-primary)]/10 text-[var(--t-primary)] text-[10px] font-black uppercase rounded-full">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--t-text-muted)]">Subject: {tpl.subject}</p>
                    {tpl.description && (
                      <p className="text-xs text-[var(--t-text-muted)] mt-2 italic">{tpl.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setShowTemplateModal(true);
                      }}
                      className="p-2 text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-2 text-[var(--t-text-muted)] hover:text-[var(--t-error)] transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            ))}

            {templates.length === 0 && !loading && (
              <div className="text-center py-12 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl">
                <Layout className="mx-auto text-[var(--t-text-muted)] mb-3 opacity-20" size={48} />
                <p className="text-[var(--t-text-muted)] font-black uppercase tracking-widest text-sm">No templates found</p>
                <p className="text-xs text-[var(--t-text-muted)] mt-1">Start by creating a custom template or use the library</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-[var(--t-primary)]" size={20} />
                <h2 className="font-black uppercase tracking-[0.15em] text-sm">Template Library</h2>
              </div>
              <div className="space-y-3">
                {DEFAULT_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleImportPredefined(tpl)}
                    className="w-full text-left p-3 bg-black/20 border border-[var(--t-border)] rounded-xl group transition-all hover:border-[var(--t-primary)] flex gap-3"
                  >
                    <EmailTemplatePreview 
                      html={tpl.html} 
                      body={tpl.body}
                      scale={0.15}
                      className="w-12 h-16 flex-shrink-0 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase tracking-wider text-[10px] mb-0.5 group-hover:text-[var(--t-primary)] truncate">{tpl.name}</p>
                      <p className="text-[9px] text-[var(--t-text-muted)] line-clamp-2 leading-tight">{tpl.description || tpl.subject}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(camp => (
            <div
              key={camp.id}
              className="p-6 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    camp.status === 'completed' ? 'bg-[var(--t-success)]/10 text-[var(--t-success)]' :
                    camp.status === 'sending' ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)]' :
                    'bg-[var(--t-text-muted)]/10 text-[var(--t-text-muted)]'
                  }`}>
                    {camp.status === 'completed' ? <CheckCircle size={24} /> :
                     camp.status === 'sending' ? <Loader2 size={24} className="animate-spin" /> :
                     <Mail size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-wider text-lg">{camp.name}</h3>
                    <p className="text-sm text-[var(--t-text-muted)]">
                      {templates.find(t => t.id === camp.template_id)?.name || 'Unknown Template'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {camp.status === 'draft' && (
                    <button
                      onClick={() => handleLaunchCampaign(camp)}
                      disabled={isSending}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[var(--t-primary)] text-white rounded-lg font-black uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                      <Play size={18} />
                      {isSending ? 'Launching...' : 'Launch'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-2.5 bg-black/20 text-[var(--t-text-muted)] hover:text-[var(--t-error)] rounded-lg transition-colors border border-[var(--t-border)]"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[var(--t-border)]">
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-1">Status</p>
                  <p className="font-black uppercase text-sm">{camp.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-1">Recipients</p>
                  <p className="text-sm font-black">{camp.recipient_count}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-1">Success</p>
                  <p className="text-sm font-black text-[var(--t-success)]">{camp.success_count}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-1">Last Run</p>
                  <p className="text-sm font-black">
                    {camp.last_run_at ? new Date(camp.last_run_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div className="text-center py-12 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl">
              <Mail className="mx-auto text-[var(--t-text-muted)] mb-3 opacity-20" size={48} />
              <p className="text-[var(--t-text-muted)] font-black uppercase tracking-widest text-sm">No campaigns found</p>
            </div>
          )}
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-[800px] max-h-[80vh] bg-[var(--t-surface)]/90 border border-[var(--t-border)] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col">
            <div className="p-6 border-b border-[var(--t-border)] flex items-center justify-between bg-black/20">
              <h2 className="text-xl font-black uppercase tracking-wider text-[var(--t-text)]">
                {editingTemplate?.id ? 'Edit Template' : 'New Template'}
              </h2>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="p-2 hover:bg-black/20 rounded-full transition-colors text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Column */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-2">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={editingTemplate?.name || ''}
                        onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                        className="w-full px-4 py-3 bg-black/20 border border-[var(--t-border)] rounded-xl focus:border-[var(--t-primary)] transition-colors outline-none text-sm"
                        placeholder="e.g., Welcome Email"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        value={editingTemplate?.category || ''}
                        onChange={e => setEditingTemplate({...editingTemplate, category: e.target.value})}
                        className="w-full px-4 py-3 bg-black/20 border border-[var(--t-border)] rounded-xl focus:border-[var(--t-primary)] transition-colors outline-none text-sm"
                        placeholder="e.g., Onboarding"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-2">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={editingTemplate?.subject || ''}
                      onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                      className="w-full px-4 py-3 bg-black/20 border border-[var(--t-border)] rounded-xl focus:border-[var(--t-primary)] transition-colors outline-none text-sm"
                      placeholder="Hello {{name}}! Check this out..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingTemplate?.description || ''}
                      onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                      className="w-full px-4 py-3 bg-black/20 border border-[var(--t-border)] rounded-xl focus:border-[var(--t-primary)] transition-colors outline-none h-20 resize-none text-sm"
                      placeholder="What is this template for?"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest">
                      Email Body (HTML/Text)
                    </label>
                    <div className="border border-[var(--t-border)] rounded-2xl overflow-hidden bg-black/20">
                      <RichTextEditor
                        value={editingTemplate?.html_content || ''}
                        onChange={(val: string) => setEditingTemplate({...editingTemplate, html_content: val})}
                        minHeight="300px"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest">
                    <div className="flex items-center gap-2">
                       <Layout size={12} />
                       Live Preview
                    </div>
                    <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                       <button 
                         onClick={() => setPreviewDevice('desktop')}
                         className={`px-2 py-1 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)]' : 'hover:bg-white/5'}`}
                       >
                         Desktop
                       </button>
                       <button 
                         onClick={() => setPreviewDevice('mobile')}
                         className={`px-2 py-1 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)]' : 'hover:bg-white/5'}`}
                       >
                         Mobile
                       </button>
                    </div>
                  </div>
                  <div className={`sticky top-0 bg-white rounded-2xl border border-[var(--t-border)] shadow-xl overflow-hidden transition-all duration-500 flex flex-col mx-auto ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'} min-h-[500px]`}>
                    <div className="p-3 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between gap-2">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                      </div>
                      <div className="flex-1 bg-white rounded px-2 py-0.5 text-[8px] text-zinc-400 truncate border border-zinc-200 text-center">
                        {editingTemplate?.subject || 'No Subject'}
                      </div>
                      <div className="w-10" /> {/* Spacer */}
                    </div>
                    <div 
                      className="flex-1 p-8 overflow-y-auto preview-frame bg-white cursor-pointer"
                      onClick={async (e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG') {
                          const imgTarget = target as HTMLImageElement;
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = 'image/*';
                          fileInput.onchange = async (ev) => {
                            const file = (ev.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const newUrl = await handleUpdateTemplateImage('image', file);
                              if (newUrl) {
                                // Direct DOM manipulation for instant feedback, plus state update
                                const oldSrc = imgTarget.src;
                                setEditingTemplate(prev => ({
                                  ...prev!,
                                  html_content: prev!.html_content?.replace(oldSrc, newUrl) || ''
                                }));
                              }
                            }
                          };
                          fileInput.click();
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: getInterpolatedHtml(editingTemplate?.html_content || '<div class="text-zinc-300 italic">No content...</div>') }}
                    />
                  </div>
                  <p className="text-[10px] text-center text-[var(--t-text-muted)] font-bold uppercase tracking-widest opacity-50">
                    * Personalized variables will be resolved when sending.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--t-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs border border-[var(--t-border)] hover:bg-black/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-black uppercase tracking-wider text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-500">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-xl font-black uppercase tracking-wider text-white">New Campaign</h2>
              <button 
                onClick={() => setShowCampaignModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={editingCampaign?.name || ''}
                  onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-[var(--t-primary)] transition-colors outline-none text-white"
                  placeholder="e.g., Q1 Product Update"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">
                  Select Template
                </label>
                <div className="relative">
                  <select
                    value={editingCampaign?.template_id || ''}
                    onChange={e => setEditingCampaign({...editingCampaign, template_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-[var(--t-primary)] transition-colors outline-none appearance-none text-white"
                  >
                    <option value="" className="bg-zinc-900">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id} className="bg-zinc-900">{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20" size={16} />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/5">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCampaign}
                className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-black uppercase tracking-wider text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--t-primary-rgb),0.3)]"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmailCampaigns;
