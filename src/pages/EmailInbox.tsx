import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Send, RefreshCw, ChevronLeft, 
  Star, Trash2, Sparkles, Loader2, 
  Inbox, FileText, Layout, Plus, 
  Settings, Clock, Calendar, Search, Mail, Edit2, Trash, UserPlus,
  X, Eye, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { 
  listThreads, getThread, EmailThread,
  fetchEmailTemplates, saveEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  fetchEmailCampaigns, saveEmailCampaign, deleteEmailCampaign,
  fetchEmailSchedules, deleteEmailSchedule, dbEmailSchedule, dbEmailTemplate, dbEmailCampaign
} from '../lib/email';
import { AGENT_EMAIL_TEMPLATES, PRO_CAMPAIGN_TEMPLATES, AgentTemplate } from '../lib/default-templates';
import EmailComposeModal from '../components/EmailComposeModal';
import RichTextEditor from '../components/admin/RichTextEditor';
import { useStore } from '../store/useStore';

type EmailView = 'inbox' | 'sent' | 'starred' | 'trash' | 'templates' | 'campaigns' | 'scheduled';

export default function EmailInbox() {
  const [view, setView] = useState<EmailView>('inbox');
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [campaigns, setCampaigns] = useState<dbEmailCampaign[]>([]);
  const [schedules, setSchedules] = useState<dbEmailSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Templates & Campaigns State
  const [templates, setTemplates] = useState<dbEmailTemplate[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  // AI states
  const [showLeadAssign, setShowLeadAssign] = useState(false);
  const [replyConfig, setReplyConfig] = useState<{ 
    isOpen: boolean; 
    thread?: EmailThread;
    isReply?: boolean;
  }>({ isOpen: false });
  
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
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = (thread: EmailThread) => {
    setReplyConfig({
      isOpen: true,
      thread,
      isReply: true
    });
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
        <div className={`flex flex-col border-r border-[var(--t-border)] bg-[var(--t-surface)]/30 shrink-0 w-80 xl:w-96 ${selectedThread ? 'hidden lg:flex' : 'flex w-full lg:w-80 xl:w-96'}`}>
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
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 bg-[var(--t-border)]/50 animate-pulse rounded" />
                      <div className="h-3 w-12 bg-[var(--t-border)]/50 animate-pulse rounded" />
                    </div>
                    <div className="h-3 w-48 bg-[var(--t-border)]/50 animate-pulse rounded" />
                    <div className="h-3 w-full bg-[var(--t-border)]/50 animate-pulse rounded opacity-50" />
                  </div>
                ))}
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
              onAssignLead={() => setShowLeadAssign(true)}
              onRespond={() => handleRespond(selectedThread)}
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

      {replyConfig.isOpen && replyConfig.thread && (
        <EmailComposeModal 
          isOpen={replyConfig.isOpen}
          onClose={() => setReplyConfig({ isOpen: false })}
          threadId={replyConfig.thread.id}
          initialSubject={replyConfig.thread.subject.startsWith('Re:') ? replyConfig.thread.subject : `Re: ${replyConfig.thread.subject}`}
          replyTo={replyConfig.thread.participants[0]}
          isReply={true}
          onSuccess={() => handleSelectThread(replyConfig.thread!.id)}
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
        .email-content img { max-width: 100%; height: auto; border-radius: 0.5rem; }
        .email-content table { display: block; overflow-x: auto; max-width: 100%; }
        .email-content pre { white-space: pre-wrap; word-break: break-all; }
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
  const filtered = threads.filter((t: any) => 
    (t.snippet || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
  const [activeTab, setActiveTab] = useState<'mine' | 'pro'>('pro');
  const [selectedPreview, setSelectedPreview] = useState<AgentTemplate | dbEmailTemplate | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this template?')) {
      await deleteEmailTemplate(id);
      onRefresh();
    }
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex bg-[var(--t-surface-dim)] p-1 rounded-xl border border-[var(--t-border)]">
        <button 
          onClick={() => setActiveTab('pro')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'pro' ? 'bg-[var(--t-primary)] text-white shadow-md' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
        >
          PRO LIBRARY
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'mine' ? 'bg-[var(--t-primary)] text-white shadow-md' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
        >
          MY TEMPLATES
        </button>
      </div>

      {activeTab === 'mine' && (
        <button 
          onClick={onAdd}
          className="w-full p-3 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--t-border)] text-[var(--t-text-muted)] hover:border-[var(--t-primary-dim)] hover:text-[var(--t-primary)] rounded-xl transition-all font-bold text-xs"
        >
          <Plus size={14} /> Create Custom Template
        </button>
      )}

      <div className="space-y-2">
        {activeTab === 'pro' ? (
          AGENT_EMAIL_TEMPLATES.map(tmp => (
            <div 
              key={tmp.id} 
              onClick={() => setSelectedPreview(tmp)}
              className="group flex items-center gap-3 p-2 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-xl hover:border-[var(--t-primary-dim)] transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--t-surface-hover)] border border-[var(--t-border)] shrink-0">
                {tmp.imageUrl ? <img src={tmp.imageUrl} className="w-full h-full object-cover" /> : <Mail size={16} className="m-auto text-[var(--t-text-muted)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-bold truncate group-hover:text-[var(--t-primary)] transition-colors">{tmp.name}</h4>
                  <span className="text-[7px] font-bold px-1 py-0.5 bg-[var(--t-border)] text-[var(--t-text-muted)] rounded uppercase shrink-0">{tmp.category}</span>
                </div>
                <p className="text-[9px] text-[var(--t-text-muted)] truncate">{tmp.subject}</p>
              </div>
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="py-12 text-center text-[var(--t-text-muted)]">
            <p className="text-xs">No custom templates found.</p>
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

      {selectedPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setSelectedPreview(null)}>
           <div className="w-full max-w-xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-dim)]/50">
                 <div>
                    <h3 className="text-sm font-bold">{selectedPreview.name}</h3>
                    <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Template Preview</p>
                 </div>
                 <button onClick={() => setSelectedPreview(null)} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"><X size={18} /></button>
              </div>
              <div className="h-[500px] overflow-y-auto p-6 bg-white custom-scrollbar">
                 <div dangerouslySetInnerHTML={{ __html: ((selectedPreview as any).html || selectedPreview.body || '').replace(/{{header_image}}/g, (selectedPreview as any).imageUrl || '').replace(/{{name}}/g, 'John Doe').replace(/{{address}}/g, '123 Main St').replace(/{{agent_name}}/g, 'Sarah Agent').replace(/{{area}}/g, 'Beverly Hills').replace(/{{city}}/g, 'Los Angeles') }} />
              </div>
              <div className="p-4 border-t border-[var(--t-border)] flex justify-end gap-3 bg-[var(--t-surface-dim)]/50">
                <button onClick={() => setSelectedPreview(null)} className="px-6 py-2 text-xs font-bold text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded-xl transition-all">Close Preview</button>
              </div>
           </div>
        </div>
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
          <div key={cp.id} className="p-4 bg-[var(--t-surface-dim)]/50 border border-[var(--t-border)] rounded-2xl group relative overflow-hidden transition-all hover:border-[var(--t-primary-dim)]">
             {cp.status === 'sending' && (
               <motion.div 
                 initial={{ x: '-100%' }}
                 animate={{ x: '100%' }}
                 transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                 className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-[var(--t-primary)] to-transparent opacity-50"
               />
             )}
             <div className="flex items-center justify-between mb-3">
               <div>
                  <h4 className="text-sm font-bold text-[var(--t-text)]">{cp.name}</h4>
                  <p className="text-[9px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mt-0.5">{cp.metadata?.template_name || 'Manual Template'}</p>
               </div>
               <div className="flex items-center gap-2">
                 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${cp.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : cp.status === 'draft' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' : 'bg-[var(--t-primary-dim)]/10 text-[var(--t-primary)] border border-[var(--t-primary-dim)]/20'}`}>
                   {cp.status}
                 </span>
                 <button onClick={(e) => handleDelete(cp.id, e)} className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"><Trash size={12} /></button>
               </div>
             </div>

             <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[var(--t-text-muted)]">
                   <div className="flex items-center gap-3">
                     <div className="flex -space-x-1.5">
                        {[1,2,3].map(i => <div key={i} className="w-4 h-4 rounded-full bg-[var(--t-border)] border border-[var(--t-bg)] flex items-center justify-center text-[7px] font-bold">{i}</div>)}
                     </div>
                     <span className="font-bold">{(cp.recipients || []).length} recipients</span>
                   </div>
                   <span className="font-bold text-[var(--t-text)]">
                     {cp.status === 'completed' ? '100%' : `${Math.round(((cp.success_count || 0) / ((cp.recipients || []).length || 1)) * 100)}%`}
                   </span>
                </div>
                <div className="w-full h-1 bg-[var(--t-border)] rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: cp.status === 'completed' ? '100%' : `${((cp.success_count || 0) / ((cp.recipients || []).length || 1)) * 100}%` }}
                     className={`h-full ${cp.status === 'completed' ? 'bg-green-500' : 'bg-[var(--t-primary)]'}`}
                   />
                </div>
                <div className="flex items-center justify-between text-[9px]">
                   <span className="text-[var(--t-text-muted)]">
                     Sent: <span className="text-[var(--t-text)] font-bold">{cp.success_count || 0}</span>
                   </span>
                   {(cp.fail_count ?? 0) > 0 && (
                     <span className="text-red-400 font-bold">
                       Failed: {cp.fail_count}
                     </span>
                   )}
                </div>
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
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isUploading, setIsUploading] = useState(false);

  const { currentUser } = useStore();

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-6xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--t-border)] bg-black/5">
          <div>
            <h3 className="text-xl font-bold">{template ? 'Edit Template' : 'New Template'}</h3>
            <p className="text-xs text-[var(--t-text-muted)] mt-1">Design your premium email experience</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Edit Column */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar border-r border-[var(--t-border)] bg-black/5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest block mb-2">Template Name</label>
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none font-bold"
                  placeholder="e.g. Welcome Email"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest block mb-2">Subject Line</label>
                <input 
                  value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none font-bold"
                  placeholder="The subject line recipients will see"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest block mb-2">HTML Body Content</label>
              <div className="border border-[var(--t-border)] rounded-2xl overflow-hidden bg-[var(--t-input-bg)] shadow-inner">
                <RichTextEditor 
                  value={body} onChange={setBody}
                  placeholder="<p>Hello {{name}}!</p>"
                  minHeight="400px"
                />
              </div>
            </div>

            <div className="bg-[var(--t-primary-dim)]/10 p-4 rounded-2xl border border-[var(--t-primary-dim)]/20">
               <div className="flex items-center gap-2 mb-2">
                 <Sparkles size={14} className="text-[var(--t-primary)]" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-primary)]">Pro Tip</p>
               </div>
               <p className="text-xs text-[var(--t-text)] leading-relaxed">
                 Use variables like <code>{`{{name}}`}</code>, <code>{`{{address}}`}</code>, <code>{`{{city}}`}</code> to personalize your emails. Click any image in the preview to replace it.
               </p>
            </div>
          </div>

          {/* Preview Column */}
          <div className="flex-1 p-8 flex flex-col space-y-4 bg-[var(--t-surface-dim)]/30 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-[var(--t-primary-dim)]/10 flex items-center justify-center text-[var(--t-primary)]">
                   <Eye size={16} />
                 </div>
                 <div>
                   <p className="text-xs font-black uppercase tracking-widest">Live Preview</p>
                   {isUploading && <p className="text-[9px] font-bold text-[var(--t-primary)] animate-pulse">Uploading Image...</p>}
                 </div>
              </div>
              <div className="flex bg-black/10 rounded-lg p-1 border border-[var(--t-border)]">
                <button 
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${previewDevice === 'desktop' ? 'bg-[var(--t-primary)] text-white shadow-md' : 'text-[var(--t-text-muted)] hover:bg-black/5'}`}
                >
                  Desktop
                </button>
                <button 
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${previewDevice === 'mobile' ? 'bg-[var(--t-primary)] text-white shadow-md' : 'text-[var(--t-text-muted)] hover:bg-black/5'}`}
                >
                  Mobile
                </button>
              </div>
            </div>

            <div 
              className={`flex-1 bg-white rounded-2xl border border-[var(--t-border)] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 mx-auto ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'} min-h-[400px]`}
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
              <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-2">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                </div>
                <div className="flex-1 bg-white border border-zinc-200 rounded px-2 py-0.5 text-[8px] text-zinc-400 select-none truncate text-center">
                  {subject || 'No Subject'}
                </div>
                <div className="w-10" />
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar preview-frame">
                <div 
                  className="prose prose-sm max-w-none text-black"
                  dangerouslySetInnerHTML={{ __html: getInterpolatedHtml(body) }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--t-border)] flex justify-end gap-3 bg-black/5">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded-2xl transition-all">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !name}
            className="flex items-center gap-2 px-10 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-[var(--t-primary-dim)] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignWizard({ templates, onClose, onSave, onSetView }: { templates: dbEmailTemplate[], onClose: () => void, onSave: () => void, onSetView: (v: EmailView) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedTemplateSource, setSelectedTemplateSource] = useState<'custom' | 'pro'>('pro');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  const { leads, contacts } = useStore();

  const allTemplates = useMemo(() => {
    return selectedTemplateSource === 'pro' ? PRO_CAMPAIGN_TEMPLATES : templates;
  }, [selectedTemplateSource, templates]);

  const currentTemplate = useMemo(() => {
    return allTemplates.find((t: dbEmailTemplate | AgentTemplate) => t.id === selectedTemplateId);
  }, [allTemplates, selectedTemplateId]);

  const handleCreate = async () => {
    if (!name || !selectedTemplateId || selectedRecipientIds.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      // Map IDs to emails
      const leadEmails = leads.filter(l => selectedRecipientIds.includes(l.id) && l.email).map(l => l.email!);
      const contactEmails = contacts.filter(c => selectedRecipientIds.includes(c.id) && c.email).map(c => c.email!);
      const allRecipients = Array.from(new Set([...leadEmails, ...contactEmails]));

      await saveEmailCampaign({
        name,
        template_id: selectedTemplateId,
        recipients: allRecipients,
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 300000).toISOString(),
        metadata: { 
          scheduleType,
          source: selectedTemplateSource,
          template_name: currentTemplate?.name 
        }
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
      <div className="w-full max-w-[900px] bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)]">
          <div>
            <h3 className="text-lg font-bold">Campaign Wizard</h3>
            <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 h-[500px] overflow-hidden flex flex-col">
          {step === 1 && (
            <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-right-4 duration-300 h-full">
              {/* List Section */}
              <div className="w-full lg:w-72 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest block">Automation Name</label>
                  <input 
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all"
                    placeholder="e.g. November Follow-up Blast"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider block">Templates</label>
                    <div className="flex bg-[var(--t-surface-dim)] p-0.5 rounded-lg border border-[var(--t-border)]">
                      <button 
                        onClick={() => { setSelectedTemplateSource('pro'); setSelectedTemplateId(null); }}
                        className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${selectedTemplateSource === 'pro' ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'text-[var(--t-text-muted)]'}`}
                      >
                        PRO
                      </button>
                      <button 
                        onClick={() => { setSelectedTemplateSource('custom'); setSelectedTemplateId(null); }}
                        className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${selectedTemplateSource === 'custom' ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'text-[var(--t-text-muted)]'}`}
                      >
                        MY
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {allTemplates.map((tmp: dbEmailTemplate | AgentTemplate) => (
                      <button 
                        key={tmp.id}
                        onClick={() => setSelectedTemplateId(tmp.id)}
                        className={`w-full p-3 text-left border rounded-xl transition-all ${selectedTemplateId === tmp.id ? 'border-[var(--t-primary)] bg-[var(--t-primary-dim)]/10 ring-2 ring-[var(--t-primary)]/20' : 'border-[var(--t-border)] hover:border-[var(--t-primary-dim)] bg-[var(--t-surface-dim)]/30'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-[11px] font-bold truncate ${selectedTemplateId === tmp.id ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>{tmp.name}</p>
                          {selectedTemplateSource === 'pro' && <Sparkles size={10} className="text-[var(--t-primary)]" />}
                        </div>
                        <p className="text-[9px] text-[var(--t-text-muted)] truncate opacity-70 italic">{tmp.subject}</p>
                      </button>
                    ))}
                    {selectedTemplateSource === 'custom' && (
                      <button 
                        onClick={() => { onSetView('templates'); onClose(); }}
                        className="w-full p-4 border-2 border-dashed border-[var(--t-border)] rounded-xl flex flex-col items-center justify-center text-[var(--t-text-muted)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary-dim)] bg-black/5"
                      >
                        <Plus size={16} className="mb-1 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">New Template</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="flex-1 flex flex-col gap-4 bg-[var(--t-surface-dim)]/30 border border-[var(--t-border)] rounded-2xl p-4 overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--t-text-muted)] tracking-widest px-2">
                   <div className="flex items-center gap-2">
                      <Eye size={12} /> Live Preview
                   </div>
                   <div className="flex bg-black/10 rounded-lg p-0.5 border border-white/5">
                      <button 
                        onClick={() => setPreviewDevice('desktop')}
                        className={`px-3 py-0.5 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'hover:bg-white/5'}`}
                      >
                        Desktop
                      </button>
                      <button 
                        onClick={() => setPreviewDevice('mobile')}
                        className={`px-3 py-0.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-[var(--t-primary)] text-white shadow-sm' : 'hover:bg-white/5'}`}
                      >
                        Mobile
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col items-center justify-center">
                   {selectedTemplateId && currentTemplate ? (
                     <div className={`w-full bg-white rounded-xl border border-[var(--t-border)] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 min-h-0 ${previewDevice === 'mobile' ? 'max-w-[280px]' : 'w-full'} flex-1`}>
                        <div className="p-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-2">
                          <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                          </div>
                          <div className="flex-1 bg-white border border-zinc-200 rounded px-2 py-0.5 text-[7px] text-zinc-400 truncate text-center italic">
                            {currentTemplate.subject}
                          </div>
                          <div className="w-6" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar preview-frame text-black">
                           <div 
                             className="prose prose-sm max-w-none"
                             dangerouslySetInnerHTML={{ __html: (currentTemplate as any).html || currentTemplate.body || '' }} 
                           />
                        </div>
                     </div>
                   ) : (
                     <div className="text-center opacity-40">
                        <Mail className="mx-auto text-[var(--t-text-muted)] mb-3" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Select a Template</p>
                     </div>
                   )}
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
              <div className="p-6 bg-[var(--t-primary-dim)]/10 rounded-full mb-2 relative">
                 <Send size={48} className="text-[var(--t-primary)]" />
                 <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-[var(--t-primary)] rounded-full -z-10" 
                 />
              </div>
              <div className="max-w-sm">
                <h4 className="text-xl font-bold mb-2">Ready to Launch?</h4>
                <p className="text-sm text-[var(--t-text-muted)] mb-6">
                  You're about to launch "<span className="text-[var(--t-text)] font-semibold">{name}</span>" to <span className="text-[var(--t-text)] font-semibold">{selectedRecipientIds.length} recipients</span>.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                   <div className="p-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-left">
                      <p className="text-[8px] font-bold text-[var(--t-text-muted)] uppercase mb-1">Starting</p>
                      <p className="text-xs font-bold text-[var(--t-text)]">In 5 minutes</p>
                   </div>
                   <div className="p-3 bg-[var(--t-surface-dim)] border border(--t-border) rounded-2xl text-left">
                      <p className="text-[8px] font-bold text-[var(--t-text-muted)] uppercase mb-1">Frequency</p>
                      <p className="text-xs font-bold text-[var(--t-primary)] uppercase">{scheduleType}</p>
                   </div>
                </div>

                <div className="p-4 bg-[var(--t-surface-dim)] rounded-2xl border border-[var(--t-border)] text-left space-y-3">
                   <div className="flex justify-between items-center text-[11px] pb-2 border-b border-[var(--t-border)]">
                     <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[var(--t-text-muted)]" />
                        <span className="text-[var(--t-text-muted)]">Template:</span>
                     </div>
                     <span className="font-bold text-[var(--t-primary)]">{currentTemplate?.name}</span>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] text-[var(--t-text-muted)]">Subject Line Preview:</p>
                     <p className="text-[11px] font-bold text-[var(--t-text)] leading-tight italic">"{currentTemplate?.subject}"</p>
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
                disabled={(step === 1 && (!name || !selectedTemplateId)) || (step === 2 && selectedRecipientIds.length === 0)}
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

function ThreadDetail({ thread, onClose, onAssignLead, onRespond }: any) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

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
          <button 
            onClick={onRespond}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-xs shadow-lg shadow-[var(--t-primary-dim)] transition-all mr-2"
          >
            <Send size={14} className="rotate-[-45deg] translate-y-[-1px]" />
            Respond
          </button>
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
            <div className="flex-1 min-w-0 overflow-hidden">
              <div 
                className="pl-11 text-sm leading-relaxed text-[var(--t-text-muted)] email-content overflow-x-auto max-w-full break-words"
                dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet }}
              />
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-8 border-t border-[var(--t-border)] bg-[var(--t-surface-dim)]/30 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--t-primary-dim)]/20 flex items-center justify-center text-[var(--t-primary)]">
           <Mail size={24} />
        </div>
        <div className="text-center">
           <p className="text-sm font-bold text-[var(--t-text)]">End of Conversation</p>
           <p className="text-xs text-[var(--t-text-muted)]">No more messages in this thread.</p>
        </div>
        <button 
          onClick={onRespond}
          className="flex items-center gap-2 px-8 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-sm shadow-xl shadow-[var(--t-primary-dim)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Send size={18} className="rotate-[-45deg] translate-y-[-1px]" />
          Write a Response
        </button>
      </div>
    </>
  );
}

function LeadAssignModal({ onClose, onAssign }: { onClose: () => void; onAssign: (id: string) => void }) {
  const { leads } = useStore();
  const [search, setSearch] = useState('');

  const filteredLeads = leads.filter(l => 
    (l.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (l.propertyAddress || '').toLowerCase().includes(search.toLowerCase())
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
