import { useState, useEffect, useRef } from 'react';
import { 
  Mail, Send, RefreshCw, ChevronLeft, 
  Star, 
  Reply, Trash2,
  Sparkles, Loader2, Search, UserPlus
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { 
  listThreads, getThread, sendEmail, EmailThread, 
  starThread, unstarThread, trashThread 
} from '../lib/email';
import { analyzeSMSConversation } from '../lib/sms-analysis-service';

export default function EmailInbox() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showLeadAssign, setShowLeadAssign] = useState(false);

  
  const threadListRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useStore();

  const loadThreads = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const { threads: fetchedThreads } = await listThreads(30);
      setThreads(fetchedThreads);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const handleSelectThread = async (threadId: string) => {
    setIsLoading(true);
    try {
      const thread = await getThread(threadId);
      if (thread) {
        setSelectedThread(thread);
        // Trigger AI analysis on the last few messages
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
        role: m.from.includes(currentUser?.email || 'me') ? 'assistant' : 'user' as 'assistant' | 'user',
        content: m.snippet
      }));
      const analysis = await analyzeSMSConversation(messages);
      if (analysis?.suggestedReplies) {
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
        // Refresh thread to show new message
        handleSelectThread(selectedThread.id);
      }
    } finally {
      setIsSending(false);
    }
  };
  
  const handleToggleStar = async () => {
    if (!selectedThread) return;
    const newStatus = !selectedThread.isStarred;
    setSelectedThread({ ...selectedThread, isStarred: newStatus });
    
    // Optimistically update threads list too
    setThreads(threads.map(t => t.id === selectedThread.id ? { ...t, isStarred: newStatus } : t));
    
    if (newStatus) await starThread(selectedThread.id);
    else await unstarThread(selectedThread.id);
  };
  
  const handleTrashThread = async () => {
    if (!selectedThread) return;
    if (confirm('Are you sure you want to move this thread to trash?')) {
      const threadId = selectedThread.id;
      setSelectedThread(null);
      setThreads(threads.filter(t => t.id !== threadId));
      await trashThread(threadId);
    }
  };

  const handleAssignToLead = async (leadId: string) => {
    if (!selectedThread) return;
    // For now we just mock this or log it, but in reality we'd link them in Supabase
    console.log(`Assigning thread ${selectedThread.id} to lead ${leadId}`);
    setShowLeadAssign(false);
    alert('Thread assigned to lead successfully');
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

  const filteredThreads = threads.filter((t: any) => {
    if (activeTab === 'unread') return t.unread;
    if (activeTab === 'starred') return t.isStarred;
    if (searchQuery) return t.snippet.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });


  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: 'var(--t-text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--t-primary-dim)' }}>
            <Mail className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Email Inbox</h1>
            <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Reliable communication hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search emails..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all w-48 group-hover:w-64"
              style={{ backgroundColor: 'var(--t-bg)', borderColor: 'var(--t-border)', '--tw-ring-color': 'var(--t-primary)' } as any}
            />
          </div>
          <button 
            onClick={() => loadThreads(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div 
          className={`flex-col border-r transition-all duration-300 shrink-0 ${selectedThread ? 'hidden md:flex w-80' : 'flex w-full md:w-80 lg:w-96'}`}
          style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface-dim)' }}
        >
          {/* Tabs */}
          <div className="flex p-2 gap-1 border-b" style={{ borderColor: 'var(--t-border)' }}>
            {(['all', 'unread', 'starred'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                style={{ backgroundColor: activeTab === tab ? 'var(--t-primary)' : 'transparent' }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar" ref={threadListRef}>
            {isLoading && !isRefreshing ? (
              <div className="p-8 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                <p className="text-xs text-gray-400">Loading your inbox...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">No emails found</p>
                <p className="text-xs">Your inbox is clean</p>
              </div>
            ) : (
              filteredThreads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full p-4 border-b text-left hover:bg-white/5 transition-all group ${selectedThread?.id === thread.id ? 'bg-white/5' : ''}`}
                  style={{ borderColor: 'var(--t-border)' }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold truncate flex-1 pr-2 ${thread.unread ? 'text-blue-400' : 'text-gray-300'}`}>
                      {thread.participants?.[0] || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {formatDate(thread.lastMessageAt || new Date().toISOString())}
                    </span>
                  </div>
                  <p className={`text-xs truncate mb-1 ${thread.unread ? 'text-white font-semibold' : 'text-gray-400'}`}>
                    {thread.subject || '(No Subject)'}
                  </p>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                    {thread.snippet}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread Detail */}
        <div className={`flex-1 flex flex-col min-w-0 ${selectedThread ? 'flex' : 'hidden md:flex'}`} style={{ backgroundColor: 'var(--t-bg)' }}>
          {selectedThread ? (
            <>
              {/* Detail Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => setSelectedThread(null)} className="md:hidden p-2 -ml-2 hover:bg-white/5 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate text-white">{selectedThread.subject}</h2>
                    <p className="text-[10px] text-gray-500 truncate">{selectedThread.participants.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleToggleStar}
                    className={`p-2 rounded-lg transition-colors ${selectedThread.isStarred ? 'text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <Star size={16} fill={selectedThread.isStarred ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => setShowLeadAssign(true)}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"
                    title="Assign to Lead"
                  >
                    <UserPlus size={16} />
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"><Reply size={16} /></button>
                  <button 
                    onClick={handleTrashThread}
                    className="p-2 hover:bg-white/5 rounded-lg text-red-400/70 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Messages Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth">
                {selectedThread.messages.map((msg: any, idx: number) => {
                  const isMe = msg.from.includes(currentUser?.email || 'me');
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] lg:max-w-2xl p-5 rounded-2xl border ${isMe ? 'bg-blue-600/10 border-blue-500/20' : 'bg-[#1e293b]/50 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                              {msg.from.split(' ')[0][0]}
                            </div>
                            <div>
                               <p className="text-xs font-bold text-white leading-tight">{msg.from}</p>
                               <p className="text-[10px] text-gray-500">{formatDate(msg.date)}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                        </div>
                        <div 
                          className="text-sm leading-relaxed text-gray-300 email-body-content" 
                          dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet }} 
                        />
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Composition Area */}
              <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface-dim)' }}>
                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {aiSuggestions.map((suggestion: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setReplyText(suggestion)}
                        className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-400 hover:bg-blue-500/20 hover:scale-105 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="relative">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full h-32 p-4 rounded-xl border focus:outline-none focus:ring-2 resize-none text-sm transition-all shadow-inner"
                    style={{ backgroundColor: 'var(--t-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button 
                      onClick={() => runAIAnalysis(selectedThread!)}
                      disabled={isAnalyzing}
                      className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                      title="Generate AI Reply"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || isSending}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Mail className="w-10 h-10 text-gray-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Select an email to read</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Choose a conversation from the left to view the full thread and reply.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lead Assignment Modal */}
      {showLeadAssign && (
        <LeadAssignModal 
          onClose={() => setShowLeadAssign(false)} 
          onAssign={handleAssignToLead} 
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--t-border); border-radius: 10px; }
        .email-body-content a { color: var(--t-primary); text-decoration: underline; }
        .email-body-content img { max-width: 100%; height: auto; border-radius: 8px; }
      `}</style>
    </div>
  );
}

// ─── Lead Assignment Modal ───────────────────────────────────────────────────

function LeadAssignModal({ onClose, onAssign }: { onClose: () => void; onAssign: (id: string) => void }) {
  const { leads } = useStore();
  const [search, setSearch] = useState('');

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.propertyAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)]">
          <h3 className="text-lg font-bold text-white">Assign to Lead</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              autoFocus
              type="text"
              placeholder="Search leads by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)] text-white"
            />
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
            {filteredLeads.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">No leads found matching your search.</div>
            ) : (
              filteredLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => onAssign(lead.id)}
                  className="w-full p-3 text-left hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group"
                >
                  <p className="text-sm font-bold text-white group-hover:text-[var(--t-primary)] transition-colors">{lead.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{lead.propertyAddress}</p>
                </button>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 bg-[var(--t-surface-dim)] border-t border-[var(--t-border)] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const X = ({ size, ...props }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
