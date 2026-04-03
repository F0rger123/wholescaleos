import { useState, useMemo } from 'react';
import { X, Paperclip, Plus, Mail, User, CheckCircle2, Eye, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Lead, useStore } from '../store/useStore';
import { sendEmail } from '../lib/email';
import { DEFAULT_TEMPLATES, AGENT_EMAIL_TEMPLATES, AgentTemplate } from '../lib/default-templates';
import { BookOpenText } from 'lucide-react';

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
}

export default function EmailComposeModal({ 
  isOpen, 
  onClose, 
  lead: initialLead, 
  initialSubject = '', 
  initialBody = '',
  attachment,
  isAttachmentLoading = false,
  onSuccess
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

  const allTemplates = useMemo(() => [...AGENT_EMAIL_TEMPLATES, ...DEFAULT_TEMPLATES], []);
  const categories = useMemo(() => ['All', ...Array.from(new Set(allTemplates.map(t => t.category)))], [allTemplates]);

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'All') return allTemplates;
    return allTemplates.filter(t => t.category === templateCategory);
  }, [allTemplates, templateCategory]);

  // Filter leads for selection
  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return leads.filter(l => 
      l.name.toLowerCase().includes(q) || 
      l.email?.toLowerCase().includes(q) ||
      l.propertyAddress.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [leads, searchQuery]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const { contacts } = useStore.getState();
    return (contacts || []).filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email?.toLowerCase().includes(q)
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

  const handleApplyTemplate = (template: AgentTemplate) => {
    let newBody = template.body || template.html || '';
    let newSubject = template.subject;

    // Replace variables
    const vars: Record<string, string> = {
      '{{name}}': selectedLead?.name || 'there',
      '{{address}}': selectedLead?.propertyAddress || 'your property',
      '{{area}}': selectedLead?.city || 'your area',
      '{{agent_name}}': currentUser?.name || 'your agent',
      '{{offer_amount}}': '$' + ((selectedLead as any)?.metadata?.estimatedValue?.toLocaleString() || '---'),
      '{{closing_date}}': '30 days from now',
      '{{inspection_period}}': '7'
    };

    Object.entries(vars).forEach(([key, val]) => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      newBody = newBody.replace(regex, val);
      newSubject = newSubject.replace(regex, val);
    });

    setSubject(newSubject);
    setBody(newBody);
    setShowTemplates(false);
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
        attachments: attachment ? [attachment] : []
      });

      if (result.success) {
        // Log to timeline if lead exists
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
        
        // Show success and close
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
      <div className="bg-[var(--t-surface)] w-full max-w-2xl rounded-2xl border border-[var(--t-border)] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)] bg-[var(--t-primary-dim)]/20 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--t-primary-dim)] rounded-lg text-[var(--t-primary)]">
              <Mail size={20} />
            </div>
            <h3 className="text-lg font-bold text-[var(--t-text)]">
              {showConfirm ? 'Confirm Selection' : 'New Message'}
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
                            filteredLeads.map(l => (
                              <button
                                key={l.id}
                                onClick={() => handleSelectLead(l, 'lead')}
                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--t-surface-hover)] transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] text-xs font-bold">
                                  {l.name[0]}
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
                            filteredContacts.map(c => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectLead(c, 'contact')}
                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--t-surface-hover)] transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] text-xs font-bold">
                                  {c.name[0]}
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
              <div className="flex items-center justify-between pb-2">
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--t-primary-dim)]/10 hover:bg-[var(--t-primary-dim)]/20 text-[var(--t-primary)] rounded-lg text-xs font-bold transition-all border border-[var(--t-primary-dim)]/20"
                >
                  <BookOpenText size={14} />
                  {showTemplates ? 'Hide Templates' : 'Use Agent Template'}
                </button>
                <p className="text-[10px] text-[var(--t-text-muted)] font-medium">✨ High-converting scripts included</p>
              </div>

              {showTemplates && (
                <div className="space-y-3 p-3 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTemplateCategory(cat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap ${templateCategory === cat ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)]' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border-[var(--t-border)] hover:border-[var(--t-primary-dim)]'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t)}
                        className="p-3 text-left bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl hover:border-[var(--t-primary-dim)] hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors truncate">{t.name}</p>
                          <span className="text-[8px] font-bold px-1 py-0.5 bg-[var(--t-border)] text-[var(--t-text-muted)] rounded uppercase">{t.category}</span>
                        </div>
                        <p className="text-[10px] text-[var(--t-text-muted)] line-clamp-1">{t.subject}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                className="w-full h-64 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl p-4 text-sm text-[var(--t-text)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none resize-none transition-all"
              />

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

