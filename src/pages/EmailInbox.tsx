import { useState, useEffect, useRef } from 'react';
import { 
  Send, RefreshCw, ChevronLeft, 
  Star, Trash2, Sparkles, Loader2, 
  Inbox, FileText, Layout, Plus, 
  Settings, Clock, Calendar, Search, Mail, Edit2, Trash, UserPlus
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { 
  listThreads, getThread, sendEmail, EmailThread, 
  fetchEmailTemplates, saveEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  fetchEmailCampaigns, saveEmailCampaign, deleteEmailCampaign,
  fetchEmailSchedules, deleteEmailSchedule, dbEmailSchedule, dbEmailTemplate, dbEmailCampaign
} from '../lib/email';
import { analyzeConversation } from '../lib/ai-reply-service';
import EmailComposeModal from '../components/EmailComposeModal';

type EmailView = 'inbox' | 'sent' | 'starred' | 'trash' | 'templates' | 'campaigns' | 'scheduled';

export default function EmailInbox() {
  const [view, setView] = useState<EmailView>('inbox');
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [campaigns, setCampaigns] = useState<dbEmailCampaign[]>([]);
  const [schedules, setSchedules] = useState<dbEmailSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Templates & Campaigns State
  const [templates, setTemplates] = useState<dbEmailTemplate[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showLeadAssign, setShowLeadAssign] = useState(false);
  
  const { currentUser } = useStore();
  
  // Modals & Wizard State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<dbEmailTemplate | null>(null);
  const [isCampaignWizardOpen, setIsCampaignWizardOpen] = useState(false);

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      if (['inbox', 'sent', 'starred', 'trash'].includes(view)) {
        let q = '';
        if (view === 'sent') q = 'label:SENT';
        else if (view === 'starred') q = 'label:STARRED';
        else if (view === 'trash') q = 'label:TRASH';
        else q = 'label:INBOX';

        const { threads: fetchedThreads } = await listThreads(30, q);
        setThreads(fetchedThreads);
      } else if (view === 'templates') {
        const fetchedTemplates = await fetchEmailTemplates();
        setTemplates(fetchedTemplates);
      } else if (view === 'campaigns') {
        const fetchedCampaigns = await fetchEmailCampaigns();
        setCampaigns(fetchedCampaigns);
      } else if (view === 'scheduled') {
        const fetchedSchedules = await fetchEmailSchedules();
        setSchedules(fetchedSchedules);
      }
    } catch (err) {
      console.error('Email load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedThread(null);
  }, [view]);

  const handleSelectThread = async (threadId: string) => {
    setIsLoading(true);
    try {
      const thread = await getThread(threadId);
      if (thread) {
        setSelectedThread(thread);
        runAIAnalysis(thread);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runAIAnalysis = async (thread: EmailThread) => {
    setIsAnalyzing(true);
    try {
      const messages = thread.messages.slice(-5).map(m => ({
        role: m.from.email.includes(currentUser?.email || 'me') ? 'assistant' : 'user' as 'assistant' | 'user',
        content: m.snippet
      }));
      const analysis = await analyzeConversation(messages, 'email');
      if (analysis?.suggestedReplies && analysis.suggestedReplies.length > 0) {
        setAiSuggestions(analysis.suggestedReplies);
      }
    } catch (err) {
      console.error('AI Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread || isSending) return;
    
    setIsSending(true);
    try {
      const result = await sendEmail({
        to: selectedThread.participants[0],
        subject: selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`,
        html: `<p>${replyText.replace(/\n/g, '<br/>')}</p>`,
        threadId: selectedThread.id
      });
      
      if (result.success) {
        setReplyText('');
        handleSelectThread(selectedThread.id);
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="flex h-full bg-[var(--t-bg)] overflow-hidden">
      {/* ─── Sidebar Navigation ─── */}
      <div className="w-64 border-r border-[var(--t-border)] bg-[var(--t-surface-dim)]/50 flex flex-col shrink-0">
        <div className="p-4 mb-2">
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold shadow-lg shadow-[var(--t-primary-dim)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            Compose
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="pb-2 px-3 text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider">Mailbox</div>
          <SidebarItem active={view === 'inbox'} icon={<Inbox size={18} />} label="Inbox" onClick={() => setView('inbox')} badge={threads.filter(t => t.unread).length || undefined} />
          <SidebarItem active={view === 'sent'} icon={<Send size={18} />} label="Sent" onClick={() => setView('sent')} />
          <SidebarItem active={view === 'starred'} icon={<Star size={18} />} label="Starred" onClick={() => setView('starred')} />
          <SidebarItem active={view === 'trash'} icon={<Trash2 size={18} />} label="Trash" onClick={() => setView('trash')} />

          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider">Automations</div>
          <SidebarItem active={view === 'templates'} icon={<FileText size={18} />} label="Templates" onClick={() => setView('templates')} />
          <SidebarItem active={view === 'campaigns'} icon={<Layout size={18} />} label="Campaigns" onClick={() => setView('campaigns')} />
          <SidebarItem icon={<Calendar size={18} />} label="Scheduled" active={view === 'scheduled'} onClick={() => setView('scheduled')} />
        </nav>

        <div className="p-4 border-t border-[var(--t-border)]">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--t-surface-hover)] transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-on-primary)] text-xs font-bold">
              {currentUser?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--t-text)] truncate">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-[var(--t-text-muted)] truncate">{currentUser?.email}</p>
            </div>
            <Settings size={14} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-text)] transition-colors" />
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* List Pane */}
        <div className={`flex flex-col border-r border-[var(--t-border)] bg-[var(--t-surface)]/30 shrink-0 ${selectedThread ? 'hidden lg:flex w-80 xl:w-96' : 'flex w-full lg:w-80 xl:w-96'}`}>
          <div className="p-4 border-b border-[var(--t-border)] flex items-center justify-between">
            <h2 className="text-lg font-bold capitalize">{view}</h2>
            <button 
              onClick={() => loadData(true)}
              className="p-2 hover:bg-[var(--t-surface-hover)] rounded-lg text-[var(--t-text-muted)] transition-colors"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-text-muted)]" />
              <input 
                type="text" 
                placeholder={`Search ${view}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && !isRefreshing ? (
              <div className="p-8 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--t-primary)]" />
                <p className="text-xs text-[var(--t-text-muted)]">Loading...</p>
              </div>
            ) : view === 'templates' ? (
              <TemplatesList 
                templates={templates} 
                onRefresh={loadData} 
                onEdit={(t) => { setEditingTemplate(t); setIsTemplateModalOpen(true); }}
                onAdd={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }}
              />
            ) : view === 'scheduled' ? (
              <ScheduledList 
                schedules={schedules} 
                onRefresh={loadData} 
              />
            ) : view === 'campaigns' ? (
              <CampaignsList 
                campaigns={campaigns} 
                onRefresh={loadData}
                onAdd={() => setIsCampaignWizardOpen(true)}
              />
            ) : (
              <ThreadList 
                threads={threads} 
                selectedId={selectedThread?.id} 
                onSelect={handleSelectThread} 
                formatDate={formatDate}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </div>

        {/* View/Detail Pane */}
        <div className="flex-1 flex flex-col bg-[var(--t-bg)] min-w-0">
          {selectedThread ? (
            <ThreadDetail 
              thread={selectedThread} 
              onClose={() => setSelectedThread(null)}
              replyText={replyText}
              setReplyText={setReplyText}
              handleSendReply={handleSendReply}
              isSending={isSending}
              aiSuggestions={aiSuggestions}
              isAnalyzing={isAnalyzing}
              onRunAI={() => runAIAnalysis(selectedThread)}
              onAssignLead={() => setShowLeadAssign(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--t-surface-hover)] flex items-center justify-center mb-6 text-[var(--t-text-muted)]">
                {view === 'templates' ? <FileText size={40} /> : view === 'campaigns' ? <Layout size={40} /> : <Mail size={40} />}
              </div>
              <h2 className="text-xl font-bold mb-2">Select an item to view</h2>
              <p className="text-sm text-[var(--t-text-muted)] max-w-xs mx-auto">
                {view === 'templates' ? 'Choose a template to edit its structure.' : view === 'campaigns' ? 'View campaign stats and status.' : 'Pick a conversation to read the full thread.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      {isComposeOpen && (
        <EmailComposeModal 
          isOpen={isComposeOpen} 
          onClose={() => setIsComposeOpen(false)} 
        />
      )}

      {isTemplateModalOpen && (
        <TemplateModal 
          template={editingTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
          onSave={loadData}
        />
      )}

      {isCampaignWizardOpen && (
        <CampaignWizard 
          templates={templates}
          onClose={() => setIsCampaignWizardOpen(false)}
          onSave={loadData}
          onSetView={setView}
        />
      )}

      {showLeadAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <LeadAssignModal onClose={() => setShowLeadAssign(false)} onAssign={(id) => {
             console.log('Assigning to', id);
             setShowLeadAssign(false);
           }} />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--t-border); border-radius: 10px; }
      `}</style>
    </div>
  );
}

// ─── Sub-Components ───

function SidebarItem({ active, icon, label, onClick, badge }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${active ? 'bg-[var(--t-primary)] text-[var(--t-on-primary)] shadow-md' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-text)]'}`}
    >
      <span className={active ? 'text-[var(--t-on-primary)]' : 'text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)] transition-colors'}>{icon}</span>
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {badge && (
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? 'bg-[var(--t-on-primary)]/20 text-[var(--t-on-primary)]' : 'bg-[var(--t-primary-dim)] text-[var(--t-primary)]'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function ThreadList({ threads, selectedId, onSelect, formatDate, searchQuery }: any) {
  const filtered = threads.filter((t: any) => t.snippet.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase()));
  
  if (filtered.length === 0) return (
    <div className="p-12 text-center text-[var(--t-text-muted)]">
      <Mail size={40} className="mx-auto mb-4 opacity-20" />
      <p className="text-sm font-medium">Empty Folder</p>
    </div>
  );

  return (
    <div className="divide-y divide-[var(--t-border)]">
      {filtered.map((thread: any) => (
        <button
          key={thread.id}
          onClick={() => onSelect(thread.id)}
          className={`w-full p-4 text-left transition-all group ${selectedId === thread.id ? 'bg-[var(--t-primary-dim)]/20' : 'hover:bg-[var(--t-surface-hover)]/50'}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-xs font-bold truncate pr-2 ${thread.unread ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`}>
              {thread.messages?.[0]?.from.name || 'External'}
            </span>
            <span className="text-[10px] text-[var(--t-text-muted)] whitespace-nowrap">{formatDate(thread.lastMessageAt)}</span>
          </div>
          <p className={`text-xs truncate mb-1 ${thread.unread ? 'text-[var(--t-text)] font-semibold' : 'text-[var(--t-text-muted)]'}`}>
            {thread.subject || '(No Subject)'}
          </p>
          <p className="text-[11px] text-[var(--t-text-muted)] line-clamp-2 leading-tight">
            {thread.snippet}
          </p>
        </button>
      ))}
    </div>
  );
}

function TemplatesList({ templates, onRefresh, onEdit, onAdd }: { templates: dbEmailTemplate[], onRefresh: () => void, onEdit: (t: dbEmailTemplate) => void, onAdd: () => void }) {
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this template?')) {
      await deleteEmailTemplate(id);
      onRefresh();
    }
  };

  return (
    <div className="p-3 space-y-2">
      <button 
        onClick={onAdd}
        className="w-full p-3 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--t-border)] text-[var(--t-text-muted)] hover:border-[var(--t-primary-dim)] hover:text-[var(--t-primary)] rounded-xl transition-all font-bold text-xs"
      >
        <Plus size={14} /> Add Template
      </button>

      {templates.length === 0 ? (
        <div className="py-12 text-center text-[var(--t-text-muted)]">
          <p className="text-xs">No templates found.</p>
        </div>
      ) : (
        templates.map(tmp => (
          <div key={tmp.id} onClick={() => onEdit(tmp)} className="p-3 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-xl hover:border-[var(--t-primary-dim)] transition-all cursor-pointer group">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-bold truncate group-hover:text-[var(--t-primary)] transition-colors">{tmp.name}</h4>
              <div className="flex items-center gap-1">
                 <button onClick={(e) => { e.stopPropagation(); onEdit(tmp); }} className="p-1 hover:text-[var(--t-primary)] transition-colors"><Edit2 size={14} /></button>
                 <button onClick={(e) => handleDelete(tmp.id, e)} className="p-1 hover:text-red-400 transition-colors"><Trash size={14} /></button>
              </div>
            </div>
            <p className="text-[10px] text-[var(--t-text-muted)] truncate">{tmp.subject}</p>
          </div>
        ))
      )}
    </div>
  );
}

function ScheduledList({ schedules, onRefresh }: { schedules: dbEmailSchedule[], onRefresh: () => void }) {
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Cancel this scheduled email?')) {
      await deleteEmailSchedule(id);
      onRefresh();
    }
  };

  return (
    <div className="p-3 space-y-2">
      {schedules.length === 0 ? (
        <div className="py-12 text-center text-[var(--t-text-muted)]">
          <p className="text-xs">No upcoming scheduled emails.</p>
        </div>
      ) : (
        schedules.map(sc => (
          <div key={sc.id} className="p-3 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-xl group relative">
             <div className="flex items-center justify-between mb-1">
               <div className="flex items-center gap-2">
                 <Clock size={14} className="text-[var(--t-primary)]" />
                 <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase">
                   {new Date(sc.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${sc.status === 'sent' ? 'bg-green-500/10 text-green-500' : sc.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                   {sc.status}
                 </span>
                 <button onClick={(e) => handleDelete(sc.id, e)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"><Trash size={12} /></button>
               </div>
             </div>
             <p className="text-xs font-bold text-[var(--t-text)] mb-0.5">{sc.recipient_email}</p>
             {sc.error_message && <p className="text-[9px] text-red-400 font-medium">{sc.error_message}</p>}
          </div>
        ))
      )}
    </div>
  );
}

function CampaignsList({ campaigns, onRefresh, onAdd }: { campaigns: dbEmailCampaign[], onRefresh: () => void, onAdd: () => void }) {
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this campaign?')) {
      await deleteEmailCampaign(id);
      onRefresh();
    }
  };

  return (
    <div className="p-3 space-y-2">
      <button 
        onClick={onAdd}
        className="w-full p-3 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--t-border)] text-[var(--t-text-muted)] hover:border-[var(--t-primary-dim)] hover:text-[var(--t-primary)] rounded-xl transition-all font-bold text-xs"
      >
        <Plus size={14} /> New Campaign
      </button>

      {campaigns.length === 0 ? (
        <div className="py-12 text-center text-[var(--t-text-muted)]">
          <p className="text-xs">No active campaigns.</p>
        </div>
      ) : (
        campaigns.map(cp => (
          <div key={cp.id} className="p-3 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-xl group relative">
             <div className="flex items-center justify-between mb-2">
               <h4 className="text-sm font-bold truncate">{cp.name}</h4>
               <div className="flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${cp.status === 'completed' ? 'bg-green-500/10 text-green-500' : cp.status === 'draft' ? 'bg-gray-500/10 text-gray-400' : 'bg-blue-500/10 text-blue-500'}`}>
                   {cp.status}
                 </span>
                 <button onClick={(e) => handleDelete(cp.id, e)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"><Trash size={12} /></button>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="flex -space-x-2">
                 {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-[var(--t-border)] border border-[var(--t-bg)] flex items-center justify-center text-[8px] font-bold">{i}</div>)}
               </div>
               <span className="text-[10px] text-[var(--t-text-muted)]">{cp.recipients.length} recipients</span>
             </div>
          </div>
        ))
      )}
    </div>
  );
}

function TemplateModal({ template, onClose, onSave }: { template: dbEmailTemplate | null, onClose: () => void, onSave: () => void }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !subject || !body || isSaving) return;
    setIsSaving(true);
    try {
      if (template) {
        await updateEmailTemplate(template.id, { name, subject, body });
      } else {
        await saveEmailTemplate({ name, subject, body } as any);
      }
      onSave();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)]">
          <h3 className="text-lg font-bold">{template ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block mb-1">Template Name</label>
            <input 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
              placeholder="e.g. Welcome Email"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block mb-1">Email Subject</label>
            <input 
              value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
              placeholder="The subject line recipients will see"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block mb-1">HTML Body Content</label>
            <textarea 
              value={body} onChange={e => setBody(e.target.value)}
              className="w-full h-64 px-4 py-3 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none font-mono"
              placeholder="<p>Hello {{name}}!</p>"
            />
          </div>
          <div className="bg-[var(--t-primary-dim)]/10 p-3 rounded-xl">
             <p className="text-[10px] text-[var(--t-primary)] leading-tight">
               <strong>Tip:</strong> Use variable placeholders like <code>{`{{name}}`}</code>, <code>{`{{address}}`}</code>, <code>{`{{city}}`}</code> to personalize your emails. These will be automatically replaced with lead data during delivery.
             </p>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--t-border)] flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded-xl transition-all">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !name}
            className="flex items-center gap-2 px-8 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--t-primary-dim)] transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignWizard({ templates, onClose, onSave, onSetView }: { templates: dbEmailTemplate[], onClose: () => void, onSave: () => void, onSetView: (v: EmailView) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [isSaving, setIsSaving] = useState(false);
  
  const { leads, contacts } = useStore();

  const handleCreate = async () => {
    if (!name || !selectedTemplate || selectedRecipientIds.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      // Map IDs to emails
      const leadEmails = leads.filter(l => selectedRecipientIds.includes(l.id) && l.email).map(l => l.email!);
      const contactEmails = contacts.filter(c => selectedRecipientIds.includes(c.id) && c.email).map(c => c.email!);
      const allRecipients = Array.from(new Set([...leadEmails, ...contactEmails]));

      await saveEmailCampaign({
        name,
        template_id: selectedTemplate,
        recipients: allRecipients,
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 300000).toISOString(),
        metadata: { scheduleType }
      });
      onSave();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]);
  };

  const recipientsWithEmail = [
    ...leads.filter(l => l.email).map(l => ({ id: l.id, name: l.name, email: l.email, type: 'Lead', status: l.status })),
    ...contacts.filter(c => c.email).map(c => ({ id: c.id, name: c.name, email: c.email, type: 'Contact', status: 'Saved' }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)]">
          <div>
            <h3 className="text-lg font-bold">Campaign Wizard</h3>
            <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 h-[450px] overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block mb-2">Campaign Name</label>
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
                  placeholder="e.g. November Follow-up Blast"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block mb-2">Select Template</label>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map(tmp => (
                    <button 
                      key={tmp.id}
                      onClick={() => setSelectedTemplate(tmp.id)}
                      className={`p-4 text-left border rounded-2xl transition-all ${selectedTemplate === tmp.id ? 'border-[var(--t-primary)] bg-[var(--t-primary-dim)]/10 ring-2 ring-[var(--t-primary)]/20' : 'border-[var(--t-border)] hover:border-[var(--t-primary-dim)] bg-[var(--t-surface-dim)]/50'}`}
                    >
                      <p className="text-sm font-bold truncate mb-1">{tmp.name}</p>
                      <p className="text-[10px] text-[var(--t-text-muted)] truncate">{tmp.subject}</p>
                    </button>
                  ))}
                  <button 
                    onClick={() => { onSetView('templates'); onClose(); }}
                    className="p-4 border-2 border-dashed border-[var(--t-border)] rounded-2xl flex flex-col items-center justify-center text-[var(--t-text-muted)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary-dim)]"
                  >
                    <Plus size={20} className="mb-2" />
                    <span className="text-xs font-bold">New Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider">Select Recipients ({selectedRecipientIds.length})</label>
                <div className="flex gap-2">
                   <button onClick={() => setSelectedRecipientIds(recipientsWithEmail.map(r => r.id))} className="text-[10px] font-bold text-[var(--t-primary)] hover:underline uppercase">Select All</button>
                   <button onClick={() => setSelectedRecipientIds([])} className="text-[10px] font-bold text-[var(--t-text-muted)] hover:underline uppercase">Clear</button>
                </div>
              </div>
              <div className="space-y-1">
                {recipientsWithEmail.map(r => (
                  <button 
                    key={r.id}
                    onClick={() => toggleRecipient(r.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedRecipientIds.includes(r.id) ? 'bg-[var(--t-primary-dim)]/10 border-[var(--t-primary-dim)]' : 'border-transparent hover:bg-[var(--t-surface-hover)]'}`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedRecipientIds.includes(r.id) ? 'bg-[var(--t-primary)] border-[var(--t-primary)] text-white' : 'border-[var(--t-text-muted)]'}`}>
                          {selectedRecipientIds.includes(r.id) && <Plus size={12} className="rotate-45" />}
                       </div>
                       <div className="text-left">
                          <p className="text-xs font-bold">{r.name} <span className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--t-border)] text-[var(--t-text-muted)] rounded ml-1 uppercase">{r.type}</span></p>
                          <p className="text-[10px] text-[var(--t-text-muted)]">{r.email}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase px-2 py-0.5 bg-[var(--t-surface-dim)] rounded-md">{r.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div>
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block mb-4">Set Frequency</label>
                <div className="grid grid-cols-2 gap-3">
                   {(['once', 'daily', 'weekly', 'monthly'] as const).map(type => (
                     <button 
                       key={type}
                       onClick={() => setScheduleType(type)}
                       className={`p-4 text-left border rounded-2xl transition-all ${scheduleType === type ? 'border-[var(--t-primary)] bg-[var(--t-primary-dim)]/10 ring-2 ring-[var(--t-primary)]/20' : 'border-[var(--t-border)] hover:border-[var(--t-primary-dim)] bg-[var(--t-surface-dim)]/50'}`}
                     >
                       <div className="flex items-center gap-2 mb-1">
                          <Clock size={14} className={scheduleType === type ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'} />
                          <p className="text-sm font-bold capitalize">{type}</p>
                       </div>
                       <p className="text-[10px] text-[var(--t-text-muted)]">
                         {type === 'once' ? 'Send immediately' : type === 'daily' ? 'Every day at 9 AM' : type === 'weekly' ? 'Every Monday at 9 AM' : '1st of every month'}
                       </p>
                     </button>
                   ))}
                </div>
               </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col items-center justify-center text-center">
              <div className="p-6 bg-[var(--t-primary-dim)]/10 rounded-full mb-4">
                 <Send size={48} className="text-[var(--t-primary)]" />
              </div>
              <div className="max-w-sm">
                <h4 className="text-xl font-bold mb-2">Ready to Launch?</h4>
                <p className="text-sm text-[var(--t-text-muted)] mb-6">
                  You're about to launch "<span className="text-[var(--t-text)] font-semibold">{name}</span>" for <span className="text-[var(--t-text)] font-semibold">{selectedRecipientIds.length} recipients</span>.
                  Frequency: <span className="text-[var(--t-primary)] font-bold uppercase">{scheduleType}</span>
                </p>
                <div className="p-4 bg-[var(--t-surface-dim)] rounded-2xl border border-[var(--t-border)] text-left space-y-2">
                   <div className="flex justify-between text-[11px]">
                     <span className="text-[var(--t-text-muted)]">Template:</span>
                     <span className="font-bold">{templates.find(t => t.id === selectedTemplate)?.name}</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                     <span className="text-[var(--t-text-muted)]">Subject:</span>
                     <span className="font-bold">{templates.find(t => t.id === selectedTemplate)?.subject}</span>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--t-border)] flex justify-between gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded-xl transition-all">
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded-xl transition-all">Cancel</button>
            {step < 4 ? (
              <button 
                onClick={() => setStep(s => s + 1)}
                disabled={(step === 1 && (!name || !selectedTemplate)) || (step === 2 && selectedRecipientIds.length === 0)}
                className="px-8 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--t-primary-dim)] transition-all disabled:opacity-30"
              >
                Continue
              </button>
            ) : (
              <button 
                onClick={handleCreate}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--t-primary-dim)] transition-all"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Launch Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadDetail({ thread, onClose, replyText, setReplyText, handleSendReply, isSending, aiSuggestions, isAnalyzing, onRunAI, onAssignLead }: any) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages.length]);

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)] bg-[var(--t-surface)]/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate text-[var(--t-text)]">{thread.subject}</h2>
            <p className="text-[10px] text-[var(--t-text-muted)] truncate">
              {thread.participants.join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onAssignLead} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors"><UserPlus size={18} /></button>
          <button className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {thread.messages.map((msg: any, idx: number) => (
          <div key={msg.id} className="group">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] text-xs font-bold">
                 {msg.from.name[0]}
               </div>
               <div>
                  <p className="text-xs font-bold text-[var(--t-text)]">{msg.from.name}</p>
                  <p className="text-[10px] text-[var(--t-text-muted)]">{msg.from.email} · {idx === 0 ? 'Original message' : `Reply #${idx}`}</p>
               </div>
            </div>
            <div 
              className="pl-11 text-sm leading-relaxed text-[var(--t-text-muted)] email-content"
              dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet }}
            />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-6 border-t border-[var(--t-border)] bg-[var(--t-surface-dim)]/30 space-y-4">
        {aiSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((s: string, i: number) => (
              <button 
                key={i} 
                onClick={() => setReplyText(s)}
                className="px-3 py-1.5 bg-[var(--t-primary-dim)]/20 border border-[var(--t-primary-dim)] text-[var(--t-primary)] rounded-full text-[10px] font-medium hover:bg-[var(--t-primary-dim)]/40 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="relative group">
          <textarea 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="w-full h-32 p-4 bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none resize-none transition-all group-focus-within:border-[var(--t-primary-dim)]"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
             <button 
               onClick={onRunAI}
               disabled={isAnalyzing}
               className="p-2.5 bg-[var(--t-primary-dim)]/20 text-[var(--t-primary)] hover:bg-[var(--t-primary-dim)]/40 rounded-xl transition-all disabled:opacity-50"
             >
               {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
             </button>
             <button 
               onClick={handleSendReply}
               disabled={!replyText.trim() || isSending}
               className="flex items-center gap-2 px-5 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-xs shadow-lg shadow-[var(--t-primary-dim)] transition-all disabled:opacity-50"
             >
               {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
               Send Reply
             </button>
          </div>
        </div>
      </div>
    </>
  );
}

function LeadAssignModal({ onClose, onAssign }: { onClose: () => void; onAssign: (id: string) => void }) {
  const { leads } = useStore();
  const [search, setSearch] = useState('');

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.propertyAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-md bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)]">
        <h3 className="text-lg font-bold text-[var(--t-text)]">Assign to Lead</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-[var(--t-surface-hover)] rounded-lg text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-text-muted)]" />
          <input 
            autoFocus
            type="text"
            placeholder="Search leads by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] text-[var(--t-text)] outline-none"
          />
        </div>

        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
          {filteredLeads.length === 0 ? (
            <div className="py-8 text-center text-[var(--t-text-muted)] text-sm">No leads found.</div>
          ) : (
            filteredLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => onAssign(lead.id)}
                className="w-full p-3 text-left hover:bg-[var(--t-surface-hover)] rounded-xl transition-all group"
              >
                <p className="text-sm font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors">{lead.name}</p>
                <p className="text-[11px] text-[var(--t-text-muted)] truncate">{lead.propertyAddress}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const X = ({ size, ...props }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
