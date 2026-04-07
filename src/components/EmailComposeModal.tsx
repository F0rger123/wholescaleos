import { useState, useMemo, useEffect } from 'react';
import { X, Paperclip, Plus, Mail, User, CheckCircle2, Eye, ExternalLink, BookOpen, Loader2, Bot, Sparkles, ImageIcon, Upload, Link as LinkIcon, Layout, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Lead, useStore } from '../store/useStore';
import { sendEmail, getThread } from '../lib/email';
import { DEFAULT_TEMPLATES, AGENT_EMAIL_TEMPLATES, AgentTemplate } from '../lib/default-templates';
import RichTextEditor from './admin/RichTextEditor';
import { supabase } from '../lib/supabase';
import { processPrompt } from '../lib/gemini';
import { toast } from 'react-hot-toast';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead;
  initialSubject?: string;
  initialBody?: string;
  attachment?: {
    filename: string;
    content: string; // base64
    contentType: string;
  } | null;
  isAttachmentLoading?: boolean;
  onSuccess?: () => void;
  isReply?: boolean;
  threadId?: string;
  replyTo?: string;
}

export default function EmailComposeModal({ 
  isOpen, 
  onClose, 
  lead: initialLead, 
  initialSubject = '', 
  initialBody = '',
  attachment,
  isAttachmentLoading = false,
  onSuccess,
  isReply = false,
  threadId,
  replyTo
}: EmailComposeModalProps) {

  const { currentUser, updateLead, leads } = useStore();
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(initialLead);
  const [to, setTo] = useState(initialLead?.email || '');
  const [subject, setSubject] = useState(initialSubject || (initialLead ? `Contract for ${initialLead.propertyAddress}` : ''));
  const [body, setBody] = useState(initialBody);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeadSelect, setShowLeadSelect] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'contacts'>('leads');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>('All');
  const [templateImages, setTemplateImages] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [userTemplates, setUserTemplates] = useState<AgentTemplate[]>([]);

  useEffect(() => {
    const loadUserTemplates = async () => {
      if (!currentUser?.id) return;
      const { data, error } = await supabase
        .from('user_email_templates')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (data && !error) {
        setUserTemplates(data.map(t => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          body: t.body || t.html_content || '',
          html: t.html_content || t.body || '',
          category: 'Custom',
          tags: ['custom']
        })));
      }
    };
    loadUserTemplates();
  }, [currentUser?.id]);

  const allTemplates = useMemo(() => [
    ...userTemplates,
    ...AGENT_EMAIL_TEMPLATES, 
    ...DEFAULT_TEMPLATES
  ], [userTemplates]);

  const categories = useMemo(() => ['All', 'Custom', ...Array.from(new Set(AGENT_EMAIL_TEMPLATES.map(t => t.category)))], []);

  const filteredTemplates = useMemo(() => {
    let base = allTemplates;
    if (templateCategory !== 'All') {
      base = base.filter(t => t.category === templateCategory);
    }
    return base;
  }, [allTemplates, templateCategory]);

  // Filter leads for selection
  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (leads as Lead[]).filter((l: Lead) => 
      (l.name || '').toLowerCase().includes(q) || 
      (l.email || '').toLowerCase().includes(q) ||
      (l.propertyAddress || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [leads, searchQuery]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const { contacts } = useStore.getState();
    return (contacts || []).filter((c: any) => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.email || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectLead = (l: any, type: 'lead' | 'contact') => {
    if (type === 'lead') {
      setSelectedLead(l);
      setTo(l.email || '');
      if (!subject || subject.startsWith('Contract for')) {
        setSubject(`Contract for ${l.propertyAddress}`);
      }
    } else {
      setTo(l.email || '');
      setSelectedLead(undefined);
    }
    setShowLeadSelect(false);
    setSearchQuery('');
  };

  const getInterpolatedHtml = (html: string) => {
    const vars: Record<string, string> = {
      '{{name}}': selectedLead?.name || 'there',
      '{{address}}': selectedLead?.propertyAddress || 'your property',
      '{{area}}': selectedLead?.city || 'your area',
      '{{city}}': selectedLead?.city || 'your city',
      '{{agent_name}}': currentUser?.name || 'your agent',
      '{{offer_amount}}': '$' + ((selectedLead as any)?.metadata?.estimatedValue?.toLocaleString() || '---'),
      '{{closing_date}}': '30 days from now',
      '{{inspection_period}}': '7',
      '{{header_image}}': templateImages['header_image'] || '',
      '{{price}}': '$' + ((selectedLead as any)?.metadata?.estimatedValue?.toLocaleString() || '450,000')
    };

    let processed = html;
    Object.entries(vars).forEach(([key, val]) => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processed = processed.replace(regex, val);
    });
    return processed;
  };

  const handleApplyTemplate = (template: AgentTemplate) => {
    let newBody = template.body || template.html || '';
    let newSubject = template.subject;

    // Set initial images if available
    if (template.imageUrl) {
      setTemplateImages({ 'header_image': template.imageUrl });
    }

    const processedHtml = getInterpolatedHtml(newBody);
    const processedSubject = getInterpolatedHtml(newSubject);

    setSubject(processedSubject);
    setBody(processedHtml);
    setShowTemplates(false);
    setShowHtmlPreview(true);
    toast.success(`Applied: ${template.name}`);
  };

  const handleSaveAsTemplate = async () => {
    if (!currentUser?.id) return;
    
    const name = window.prompt('Enter a name for this template:');
    if (!name) return;

    try {
      const { data, error } = await supabase
        .from('user_email_templates')
        .insert({
          user_id: currentUser.id,
          name,
          subject,
          html_content: body,
          category: 'Custom'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setUserTemplates(prev => [...prev, {
          id: data.id,
          name: data.name,
          subject: data.subject,
          body: data.html_content || '',
          html: data.html_content || '',
          category: 'Custom',
          tags: ['custom']
        }]);
        toast.success('Template saved successfully!');
      }
    } catch (err) {
      console.error('Save template error:', err);
      toast.error('Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleAIRecommend = async () => {
    setIsGeneratingAI(true);
    
    try {
      let aiResponseText = "";
      
      if (threadId) {
        // 1. Fetch Thread History for context
        const thread = await getThread(threadId);
        if (thread && thread.messages.length > 0) {
          const historyContext = thread.messages.map(m => 
            `${m.from.name || m.from.email}: ${m.snippet}`
          ).join('\n');

          const aiPrompt = `You are an expert real estate assistant. Based on the following email thread history, suggest a professional and effective reply to the last message. 
          Keep it concise, friendly, and focused on moving the deal forward.
          
          HISTORY:
          ${historyContext}
          
          RECIPIENT: ${selectedLead?.name || to}
          MY IDENTITY: ${currentUser?.name || 'an expert agent'}
          
          Provide ONLY the email body text. Do not include subject lines or greetings like 'Sure, here is a response'. 
          Use HTML tags like <p>, <br>, <strong> for formatting if needed, as this will be sent as an HTML email.
          
          If there are specific deal points mentioned in the thread (prices, dates), incorporate them.
          If the user is asking for a showing, suggest 2 possible times.`;

          const result = await processPrompt(aiPrompt, {}, 'os_bot');
          aiResponseText = result.response;
        }
      }

      if (aiResponseText) {
        // Use the AI generated text
        setBody(aiResponseText);
        setShowTemplates(false);
      } else {
        // Fallback to template selection based on lead status
        let recommendedId = 'follow-up-1'; 
        
        if (selectedLead) {
          if (selectedLead.status === 'new') recommendedId = 'intro-seller';
          else if (selectedLead.status === 'contract-in' || selectedLead.status === 'under-contract') recommendedId = 'offer-followup';
          else if (selectedLead.status === 'closed-lost') recommendedId = 'zombie-lead-revival';
          else if (selectedLead.status === 'closed-won') recommendedId = 'post-closing-followup';
          else recommendedId = 'follow-up-1';
        }

        const template = allTemplates.find(t => t.id === recommendedId) || allTemplates[0];
        handleApplyTemplate(template);
      }
    } catch (err) {
      console.error('AI Recommendation Error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter an AI prompt first.');
      return;
    }

    setIsAiGenerating(true);
    try {
      const prompt = `You are "OS Bot", an expert real estate AI. 
      Generate a professional email based on this request: "${aiPrompt}"
      
      Target Recipient: ${selectedLead?.name || to || 'Prospect'}
      Property Context: ${selectedLead?.propertyAddress || 'N/A'}
      
      Output Format (IMPORTANT):
      Provide the response as a JSON object with "subject" and "body" keys. 
      The body should be formatted as professional HTML for an email (use <p>, <strong>, etc.).
      Do not include any other text before or after the JSON.`;

      const result = await processPrompt(prompt, {}, 'os_bot');
      
      try {
        // AI might wrap response in backticks or start with text, let's try to extract JSON
        const jsonStr = result.response.match(/\{[\s\S]*\}/)?.[0] || result.response;
        const parsed = JSON.parse(jsonStr);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.body) setBody(parsed.body);
        setAiPrompt('');
        toast.success('AI Template Generated!');
      } catch (e) {
        // If not JSON, just put it in the body
        setBody(result.response);
        toast.success('Content generated (Plain Text)');
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      toast.error('Failed to generate AI content.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleUpdateTemplateImage = async (key: string, fileOrUrl: File | string) => {
    let finalUrl = '';
    
    if (typeof fileOrUrl === 'string') {
      finalUrl = fileOrUrl;
    } else {
      setIsUploading(true);
      try {
        if (!supabase) return;
        const fileExt = fileOrUrl.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${currentUser?.id}/${Date.now()}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('email-assets')
          .upload(filePath, fileOrUrl);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('email-assets')
          .getPublicUrl(filePath);
        
        finalUrl = data.publicUrl;
      } catch (err) {
        console.error('Upload error:', err);
        alert('Failed to upload image.');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (finalUrl) {
      setTemplateImages(prev => ({ ...prev, [key]: finalUrl }));
      const oldUrl = templateImages[key];
      if (oldUrl) {
         setBody(prev => prev.split(oldUrl).join(finalUrl));
      }
    }
  };

  const handleSend = async () => {
    if (!to || !to.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmail({
        to,
        subject,
        html: body.replace(/\n/g, '<br>'),
        attachments: attachment ? [attachment] : [],
        threadId,
        replyTo
      });

      if (result.success) {
        if (selectedLead) {
          const timelineEntry = {
            id: crypto.randomUUID(),
            type: 'email' as const,
            content: `Sent email: "${subject}"${attachment ? ` with attachment "${attachment.filename}"` : ''}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'System',
            metadata: {
              subject,
              recipient: to,
              hasAttachment: attachment ? 'true' : 'false'
            }
          };
          
          await updateLead(selectedLead.id, {
            timeline: [timelineEntry, ...(selectedLead.timeline || [])]
          });
        }
        
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (err: any) {
      console.error('Send Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handlePreviewPDF = () => {
    if (!attachment) return;
    try {
      const byteCharacters = atob(attachment.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      alert('Could not preview PDF. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-[var(--t-surface)] w-full ${showHtmlPreview ? 'max-w-6xl' : 'max-w-2xl'} rounded-2xl border border-[var(--t-border)] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)] bg-[var(--t-primary-dim)]/20 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--t-primary-dim)] rounded-lg text-[var(--t-primary)]">
              <Mail size={20} />
            </div>
            <h3 className="text-lg font-bold text-[var(--t-text)]">
              {showConfirm ? 'Confirm Selection' : (isReply ? 'Reply to Thread' : 'New Message')}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!showConfirm ? (
            <>
              <div className="space-y-2">
                {/* To Field with Lead Selector */}
                <div className="relative">
                  <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2 focus-within:border-[var(--t-primary)] transition-colors">
                    <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">To:</span>
                    <div className="flex-1 flex items-center gap-2">
                      <input 
                        type="text" 
                        value={to}
                        onChange={(e) => {
                          setTo(e.target.value);
                          setSearchQuery(e.target.value);
                          setShowLeadSelect(true);
                        }}
                        onFocus={() => setShowLeadSelect(true)}
                        placeholder="recipient@example.com"
                        className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)]"
                      />
                      {selectedLead && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--t-primary-dim)]/30 text-[var(--t-primary)] rounded-full text-xs font-medium">
                          <User size={10} />
                          {selectedLead.name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-[var(--t-primary)] hover:underline">Cc</button>}
                      {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-[var(--t-primary)] hover:underline">Bcc</button>}
                    </div>
                  </div>

                  {/* Contact Dropdown */}
                  {showLeadSelect && searchQuery && (filteredLeads.length > 0 || filteredContacts.length > 0) && (
                    <div className="absolute top-full left-14 right-0 mt-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="flex border-b border-[var(--t-border)]">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveTab('leads'); }}
                          className={`flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'leads' ? 'bg-[var(--t-primary-dim)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)]'}`}
                        >
                          Leads
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveTab('contacts'); }}
                          className={`flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'contacts' ? 'bg-[var(--t-primary-dim)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)]'}`}
                        >
                          Contacts
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto">
                        {activeTab === 'leads' ? (
                          filteredLeads.length > 0 ? (
                            filteredLeads.map((l: Lead) => (
                              <button
                                key={l.id}
                                onClick={() => handleSelectLead(l, 'lead')}
                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--t-surface-hover)] transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] text-xs font-bold">
                                  {(l.name || '?')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--t-text)] truncate">{l.name}</p>
                                  <p className="text-xs text-[var(--t-text-muted)] truncate">{l.email || 'No email'} · {l.propertyAddress}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-[var(--t-text-muted)]">No leads found</div>
                          )
                        ) : (
                          filteredContacts.length > 0 ? (
                            filteredContacts.map((c: any) => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectLead(c, 'contact')}
                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--t-surface-hover)] transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] text-xs font-bold">
                                  {(c.name || '?')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--t-text)] truncate">{c.name}</p>
                                  <p className="text-xs text-[var(--t-text-muted)] truncate">{c.email || 'No email'}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-[var(--t-text-muted)]">No contacts found</div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {showCc && (
                  <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2">
                    <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">Cc:</span>
                    <input 
                      type="text" 
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)]"
                    />
                  </div>
                )}

                {showBcc && (
                  <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2">
                    <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">Bcc:</span>
                    <input 
                      type="text" 
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)]"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2 focus-within:border-[var(--t-primary)] transition-colors">
                  <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">Subject:</span>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="No subject"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)] font-medium"
                  />
                </div>
              </div>

              {/* Template Quick Selection */}
              <div className="flex items-center gap-3 pb-2">
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--t-primary-dim)]/10 hover:bg-[var(--t-primary-dim)]/20 text-[var(--t-primary)] rounded-lg text-xs font-bold transition-all border border-[var(--t-primary-dim)]/20"
                >
                  <Bot size={14} />
                  {showTemplates ? 'Hide Templates' : 'Use Agent Template'}
                </button>
                <button 
                  onClick={handleAIRecommend}
                  disabled={isGeneratingAI}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-400 rounded-lg text-xs font-bold transition-all border border-purple-500/20 group"
                >
                  {isGeneratingAI ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                  )}
                  {isGeneratingAI ? 'OS Bot Thinking...' : 'AI Recommended Response'}
                </button>
              </div>

              {/* AI Prompt Section */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Sparkles size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Assistant</span>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 italic uppercase">Powered by 🤖 OS Bot</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                    placeholder="e.g. Write a friendly follow-up for a new lead from Austin..."
                    className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-600"
                  />
                  <button 
                    onClick={handleAIGenerate}
                    disabled={isAiGenerating || !aiPrompt.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isAiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {isAiGenerating ? '...' : 'Draft'}
                  </button>
                </div>
              </div>

              {showTemplates && (
                <div className="flex flex-col lg:flex-row gap-6 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 max-h-[600px] overflow-hidden">
                  {/* Sidebar: Categories & List */}
                  <div className="w-full lg:w-72 border-r border-[var(--t-border)] flex flex-col bg-black/5 overflow-hidden">
                    <div className="p-4 border-b border-[var(--t-border)] space-y-3 shrink-0">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest px-1">
                            <BookOpen size={12} />
                            Library
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {categories.map(cat => (
                             <button
                               key={cat}
                               onClick={() => setTemplateCategory(cat)}
                               className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all ${templateCategory === cat ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)] shadow-md' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border-[var(--t-border)] hover:border-[var(--t-primary-dim)]'}`}
                             >
                               {cat}
                             </button>
                           ))}
                         </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {filteredTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (editingTemplate?.id === t.id) {
                              handleApplyTemplate(t);
                            } else {
                              setEditingTemplate(t as any);
                            }
                          }}
                          onDoubleClick={() => handleApplyTemplate(t)}
                          className={`w-full text-left p-3 rounded-xl border transition-all group ${editingTemplate?.id === t.id ? 'bg-[var(--t-primary-dim)]/20 border-[var(--t-primary)] shadow-sm scale-[1.02]' : 'bg-[var(--t-surface)] border-[var(--t-border)] hover:border-[var(--t-primary-dim)]/50'}`}
                        >
                           <div className="flex items-center justify-between gap-2 mb-1">
                             <p className={`text-[11px] font-bold truncate ${editingTemplate?.id === t.id ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>{t.name}</p>
                             {t.category === 'Custom' && (
                               <button 
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   if (window.confirm('Delete this template?')) {
                                      const { error } = await supabase.from('user_email_templates').delete().eq('id', t.id);
                                      if (!error) {
                                        setUserTemplates(prev => prev.filter(ut => ut.id !== t.id));
                                        toast.success('Template deleted');
                                      }
                                   }
                                 }}
                                 className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--t-error)] transition-opacity"
                               >
                                 <Trash2 size={10} />
                               </button>
                             )}
                           </div>
                           <p className="text-[9px] text-[var(--t-text-muted)] line-clamp-1 opacity-70 italic">{t.subject}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview Pane */}
                  <div className="flex-1 bg-[var(--t-bg)] overflow-y-auto p-10 relative group custom-scrollbar">
                    {editingTemplate ? (
                    <div className="max-w-2xl mx-auto space-y-6">
                      <div className="flex items-center justify-between border-b border-[var(--t-border)] pb-4 mb-4">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t-text-muted)] mb-1">Live Preview</h3>
                          <p className="text-lg font-black text-[var(--t-text)]">{editingTemplate?.name || 'Untitled Template'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-all">
                            <X size={20} />
                          </button>
                        </div>
                      </div>

                      <div 
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[400px] border border-[var(--t-border)] transition-all duration-500 group-hover:scale-[1.01]"
                      >
                        <div className="p-8 email-content" dangerouslySetInnerHTML={{ __html: editingTemplate?.html || '<div class="flex items-center justify-center h-48 text-gray-400">Select a template to preview</div>' }} />
                      </div>
                      
                      <div className="flex items-center justify-center pt-8">
                        <button
                          onClick={() => handleApplyTemplate(editingTemplate!)}
                          disabled={!editingTemplate}
                          className="px-10 py-4 bg-[var(--t-primary)] text-[var(--t-on-primary)] rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[var(--t-primary-dim)] flex items-center gap-3 disabled:opacity-50"
                        >
                          <Zap size={20} />
                          Use This Blueprint
                        </button>
                      </div>
                    </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-[var(--t-primary-dim)]/10 flex items-center justify-center text-[var(--t-primary)] opacity-40">
                          <Eye size={32} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--t-text)] uppercase tracking-wider">Select a Template</p>
                          <p className="text-xs text-[var(--t-text-muted)] mt-1">Choose a layout from the list to see an instant preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Graphic Editor */}
              {Object.keys(templateImages).length > 0 && (
                <div className="p-4 bg-[var(--t-primary-dim)]/5 border border-[var(--t-primary-dim)]/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-bold text-[var(--t-primary)] uppercase tracking-widest flex items-center gap-1.5">
                       <ImageIcon size={12} /> Graphic Assets Found
                     </p>
                     {isUploading && <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--t-primary)] animate-pulse"><Loader2 size={10} className="animate-spin" /> Uploading...</div>}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(templateImages).map(([key, url]) => (
                      <div key={key} className="flex items-center gap-4 p-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl group">
                         <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--t-surface-hover)] border border-[var(--t-border)]">
                           <img src={url} className="w-full h-full object-cover" alt={key} />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-bold text-[var(--t-text)] truncate capitalize">{key.replace('_', ' ')}</p>
                           <p className="text-[9px] text-[var(--t-text-muted)] truncate">{url}</p>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <label className="p-2 hover:bg-[var(--t-primary-dim)]/20 hover:text-[var(--t-primary)] rounded-lg cursor-pointer transition-colors" title="Upload Replacement">
                               <Upload size={14} />
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*"
                                 onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) handleUpdateTemplateImage(key, file);
                                 }}
                               />
                            </label>
                            <button 
                              onClick={() => {
                                const newUrl = prompt('Enter Image URL:', url);
                                if (newUrl) handleUpdateTemplateImage(key, newUrl);
                              }}
                              className="p-2 hover:bg-[var(--t-primary-dim)]/20 hover:text-[var(--t-primary)] rounded-lg transition-colors" title="External URL"
                            >
                               <LinkIcon size={14} />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showHtmlPreview ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)]' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border-[var(--t-border)]'}`}
                  >
                    <Eye size={14} />
                    {showHtmlPreview ? 'Edit Mode' : 'Live HTML Preview'}
                  </button>
                  <button 
                    onClick={handleSaveAsTemplate}
                    disabled={isSavingTemplate}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--t-success-dim)]/10 hover:bg-[var(--t-success-dim)]/20 text-[var(--t-success)] rounded-lg text-xs font-bold transition-all border border-[var(--t-success-dim)]/20"
                  >
                    {isSavingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Save as Template
                  </button>
                </div>
              </div>

              <div className={showHtmlPreview ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "space-y-4"}>
                <div className="space-y-4">
                  <div className="border border-[var(--t-border)] rounded-2xl overflow-hidden bg-black/5">
                    <RichTextEditor 
                      value={body}
                      onChange={setBody}
                      placeholder="Write your message here..."
                      minHeight={showHtmlPreview ? "500px" : "250px"}
                    />
                  </div>
                </div>

                {showHtmlPreview && (
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest">
                      <div className="flex items-center gap-2">
                        <Layout size={12} />
                        Live HTML Preview
                      </div>
                      <div className="flex bg-black/5 rounded-lg p-1 border border-[var(--t-border)]">
                        <button 
                          onClick={() => setPreviewDevice('desktop')}
                          className={`px-2 py-1 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)]' : 'hover:bg-black/5'}`}
                        >
                          Desktop
                        </button>
                        <button 
                          onClick={() => setPreviewDevice('mobile')}
                          className={`px-2 py-1 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)]' : 'hover:bg-black/5'}`}
                        >
                          Mobile
                        </button>
                      </div>
                    </div>
                    <div 
                      className={`bg-white rounded-2xl border border-[var(--t-border)] shadow-xl overflow-hidden flex flex-col transition-all duration-500 mx-auto ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'} min-h-[500px] flex-1`}
                      onClick={async (e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG') {
                          const imgTarget = target as HTMLImageElement;
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = 'image/*';
                          fileInput.onchange = async (event: any) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setIsUploading(true);
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${Math.random()}.${fileExt}`;
                                const filePath = `templates/${fileName}`;

                                const { error: uploadError } = await supabase.storage
                                  .from('email-assets')
                                  .upload(filePath, file);

                                if (uploadError) throw uploadError;

                                const { data } = supabase.storage
                                  .from('email-assets')
                                  .getPublicUrl(filePath);
                                
                                const finalUrl = data.publicUrl;
                                const oldUrl = imgTarget.src;
                                setBody(prev => prev.split(oldUrl).join(finalUrl));
                                toast.success('Image updated');
                              } catch (err) {
                                console.error('Upload error:', err);
                                toast.error('Failed to upload image');
                              } finally {
                                setIsUploading(false);
                              }
                            }
                          };
                          fileInput.click();
                        }
                      }}
                    >
                      <div className="p-3 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between gap-2">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                        </div>
                        <div className="flex-1 bg-white rounded px-2 py-0.5 text-[8px] text-zinc-400 truncate border border-zinc-200 text-center">
                          {subject || 'No Subject'}
                        </div>
                        <div className="w-10" />
                      </div>
                      <div className="flex-1 p-8 overflow-y-auto bg-white">
                        <div 
                          className="prose prose-sm max-w-none text-black emails-preview-content cursor-pointer" 
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.tagName === 'IMG') {
                              const currentSrc = (target as HTMLImageElement).src;
                              // Find which key this belongs to, or create one
                              let key = Object.keys(templateImages).find(k => templateImages[k] === currentSrc) || `image_${Date.now()}`;
                              const fileInput = document.createElement('input');
                              fileInput.type = 'file';
                              fileInput.accept = 'image/*';
                              fileInput.onchange = (ev) => {
                                const file = (ev.target as HTMLInputElement).files?.[0];
                                if (file) handleUpdateTemplateImage(key, file);
                              };
                              fileInput.click();
                            }
                          }}
                          dangerouslySetInnerHTML={{ __html: body || '<div class="text-zinc-300 italic">No content...</div>' }} 
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-center text-[var(--t-text-muted)] font-bold uppercase tracking-widest opacity-50">
                      * Real variables will be injected on delivery.
                    </p>
                  </div>
                )}
              </div>

              {isAttachmentLoading && (
                <div className="flex items-center gap-3 p-3 bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-xl animate-pulse">
                  <Loader2 size={18} className="text-[var(--t-primary)] animate-spin" />
                  <p className="text-sm font-medium text-[var(--t-text-muted)]">Generating PDF attachment...</p>
                </div>
              )}

              {attachment && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[var(--t-primary-dim)]/30 border border-[var(--t-primary-dim)] rounded-xl group transition-all hover:bg-[var(--t-primary-dim)]/40">
                    <div className="flex items-center gap-3">
                      <Paperclip size={18} className="text-[var(--t-primary)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--t-text)]">{attachment.filename}</p>
                        <p className="text-xs text-[var(--t-text-muted)]">PDF Document</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handlePreviewPDF}
                        className="p-2 hover:bg-[var(--t-primary)] hover:text-[var(--t-on-primary)] text-[var(--t-primary)] rounded-lg transition-all flex items-center gap-2"
                        title="Preview PDF"
                      >
                        <Eye size={16} />
                        <span className="text-xs font-bold">Preview</span>
                      </button>
                      <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/50 hover:bg-white rounded-lg text-xs font-bold text-[var(--t-primary)] transition-all"
                      >
                        {showPreview ? <Eye size={14} /> : <BookOpen size={14} />}
                        {showPreview ? 'Hide Local Preview' : 'Toggle Local Preview'}
                      </button>
                    </div>
                  </div>

                  {showPreview && (
                    <div className="border border-[var(--t-border)] rounded-xl overflow-hidden bg-white h-96 flex flex-col">
                      <div className="p-2 bg-[var(--t-surface-hover)] border-b border-[var(--t-border)] flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider">PDF Preview</span>
                        <button 
                          onClick={handlePreviewPDF}
                          className="text-[var(--t-primary)] hover:underline flex items-center gap-1 text-[10px] font-bold"
                        >
                          Open in Full Screen <ExternalLink size={10} />
                        </button>
                      </div>
                      <iframe 
                        src={`data:${attachment.contentType};base64,${attachment.content}#toolbar=0`}
                        className="flex-1 w-full border-none"
                        title="PDF Preview"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-[var(--t-primary-dim)]/20 text-[var(--t-primary)] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-[var(--t-text)]">Ready to send?</h4>
                <p className="text-[var(--t-text-muted)]">
                  You are about to send an email to <span className="text-[var(--t-text)] font-medium">{to}</span>
                </p>
              </div>

              <div className="bg-[var(--t-surface-hover)] p-4 rounded-xl text-left border border-[var(--t-border)] max-w-md mx-auto space-y-3">
                <div>
                  <p className="text-xs font-medium text-[var(--t-text-muted)] uppercase tracking-wider">Subject</p>
                  <p className="text-sm text-[var(--t-text)] font-medium">{subject}</p>
                </div>
                {attachment && (
                  <div>
                    <p className="text-xs font-medium text-[var(--t-text-muted)] uppercase tracking-wider">Attachment</p>
                    <p className="text-sm text-[var(--t-text)] flex items-center gap-2">
                       <Paperclip size={14} /> {attachment.filename}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-6 py-2 text-sm font-medium text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors"
                >
                  Back to edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-hover)]/30 rounded-b-2xl">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-colors">
              <Paperclip size={20} />
            </button>
            <div className="h-6 w-px bg-[var(--t-border)]" />
            <button className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-colors">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors"
            >
              Cancel
            </button>
            {showConfirm ? (
            <button 
              onClick={handleSend}
              disabled={isSending}
              className="relative flex items-center gap-2 px-8 py-3 bg-[var(--t-success)] hover:bg-[var(--t-success-hover)] disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-[var(--t-success-dim)] transition-all hover:scale-[1.05] active:scale-[0.95] overflow-hidden"
            >
              {isSending ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" cy="12" r="10" 
                      stroke="currentColor" strokeWidth="4" fill="none" 
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                    />
                  </svg>
                  <span>Sending Message...</span>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-1 bg-white/30"
                  />
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Confirm & Send Now
                </>
              )}
            </button>
            ) : (
              <button 
                onClick={() => setShowConfirm(true)}
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] disabled:opacity-50 text-[var(--t-on-primary)] rounded-xl font-bold shadow-lg shadow-[var(--t-primary-dim)] transition-all"
              >
                <Eye size={18} />
                Preview & Confirm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
