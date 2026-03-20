import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Search, MessageSquare, User, 
  Send, Loader2, ArrowLeft, MoreVertical, 
  CheckCircle2, UserPlus, Smartphone, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { sendSMSViaAI } from '../lib/gemini';

interface SMSMessage {
  id: string;
  phone_number: string;
  content: string;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  created_at: string;
  lead_id?: string;
}

interface Conversation {
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  leadName?: string;
  leadId?: string;
}

export function SMSInbox() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const leads = useStore(state => state.leads);
  const currentUser = useStore(state => state.currentUser);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('sms_changes')
        .on('postgres_changes', { event: 'INSERT', table: 'sms_messages', schema: 'public' }, () => {
          fetchMessages();
        })
        .subscribe();
      return () => { supabase!.removeChannel(channel); };
    }
  }, []);

  useEffect(() => {
    processConversations(messages);
  }, [messages, leads]);

  useEffect(() => {
    scrollToBottom();
    if (selectedPhone) {
      markAsRead(selectedPhone);
    }
  }, [selectedPhone, messages]);

  const fetchMessages = async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching SMS:', err);
    } finally {
      setLoading(false);
    }
  };

  const processConversations = (allMessages: SMSMessage[]) => {
    const groups: Record<string, Conversation> = {};
    
    allMessages.forEach(msg => {
      if (!groups[msg.phone_number]) {
        const lead = leads.find(l => l.phone?.replace(/\D/g, '') === msg.phone_number.replace(/\D/g, ''));
        groups[msg.phone_number] = {
          phone: msg.phone_number,
          lastMessage: msg.content,
          timestamp: msg.created_at,
          unreadCount: 0,
          leadName: lead?.name,
          leadId: lead?.id
        };
      }
      if (!msg.is_read && msg.direction === 'inbound') {
        groups[msg.phone_number].unreadCount++;
      }
    });

    setConversations(Object.values(groups).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  };

  const markAsRead = async (phone: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase
      .from('sms_messages')
      .update({ is_read: true })
      .eq('phone_number', phone)
      .eq('direction', 'inbound')
      .eq('is_read', false);
    
    if (!error) {
      useStore.getState().markSMSAsRead(phone);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedPhone || sending) return;

    setSending(true);
    try {
      const result = await sendSMSViaAI(selectedPhone, replyText.trim());
      if (result.success) {
        // Optimistically add to UI or wait for Supabase insert
        // The sendSMSViaAI should also insert the outbound record eventually.
        // Let's ensure it does. (Wait, let's add it here for immediate feedback)
        if (isSupabaseConfigured && supabase && currentUser?.id) {
          const lead = leads.find(l => l.phone?.replace(/\D/g, '') === selectedPhone.replace(/\D/g, ''));
          await supabase.from('sms_messages').insert({
            user_id: currentUser.id,
            lead_id: lead?.id,
            phone_number: selectedPhone,
            content: replyText.trim(),
            direction: 'outbound',
            is_read: true
          });
        }
        setReplyText('');
        fetchMessages();
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Failed to send SMS:', err);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter(c => 
    c.phone.includes(searchQuery) || 
    c.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMessages = [...messages]
    .filter(m => m.phone_number === selectedPhone)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const activeConversation = conversations.find(c => c.phone === selectedPhone);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--t-primary)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-2xl border overflow-hidden" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)', borderColor: 'var(--t-border)' }}>
      {/* Conversations List */}
      <div className={`flex flex-col border-r ${selectedPhone ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}`} style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)', borderColor: 'var(--t-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--t-border)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--t-text-color)' }}>Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-1"
              style={{ 
                backgroundColor: 'var(--t-background)', 
                border: '1px solid var(--t-border)', 
                color: 'var(--t-text)',
                // @ts-expect-error custom prop
                '--tw-ring-color': 'var(--t-primary)' 
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <button
              key={conv.phone}
              onClick={() => setSelectedPhone(conv.phone)}
              className={`w-full p-4 flex gap-3 border-b transition-colors relative`}
              style={selectedPhone === conv.phone ? { 
                background: 'var(--t-primary-dim)', 
                borderLeft: '2px solid var(--t-primary)',
                borderColor: 'rgba(var(--t-border-rgb), 0.5)'
              } : {
                borderColor: 'rgba(var(--t-border-rgb), 0.5)'
              }}
              onMouseEnter={(e) => { if (selectedPhone !== conv.phone) e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'; }}
              onMouseLeave={(e) => { if (selectedPhone !== conv.phone) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--t-surface)' }}>
                {conv.leadId ? (
                  <div className="w-full h-full rounded-full flex items-center justify-center font-bold"
                    style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                  >
                    {conv.leadName?.charAt(0)}
                  </div>
                ) : (
                  <User className="w-6 h-6" style={{ color: 'var(--t-text-muted)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="font-semibold truncate text-sm" style={{ color: 'var(--t-text)' }}>
                    {conv.leadName || conv.phone}
                  </span>
                  <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--t-text-muted)' }}>
                    {format(new Date(conv.timestamp), 'h:mm a')}
                  </span>
                </div>
                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-medium' : ''}`} style={{ color: conv.unreadCount > 0 ? 'var(--t-text)' : 'var(--t-text-muted)' }}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <div className="absolute right-4 bottom-4 w-5 h-5 text-white rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--t-primary)' }}
                >
                  {conv.unreadCount}
                </div>
              )}
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center" style={{ color: 'var(--t-text-muted)' }}>
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Thread */}
      <div className={`flex-1 flex flex-col ${!selectedPhone ? 'hidden md:flex items-center justify-center' : 'flex'}`} style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.6)' }}>
        {!selectedPhone ? (
          <div className="text-center p-8 max-w-sm">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--t-surface)' }}>
              <Smartphone className="w-10 h-10" style={{ color: 'var(--t-text-muted)' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--t-text)' }}>Select a conversation</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
              Choose a contact from the left to view your message history and send SMS replies.
            </p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className={`p-4 border-b flex items-center justify-between`} style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.8)', borderColor: 'var(--t-border)' }}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedPhone(null)}
                  className="p-2 -ml-2 md:hidden rounded-lg transition-colors"
                  style={{ color: 'var(--t-text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>
                  {activeConversation?.leadName?.charAt(0) || <User size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{activeConversation?.leadName || activeConversation?.phone}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>{activeConversation?.phone}</span>
                    {activeConversation?.leadId && (
                      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--t-success)' }}>
                        <ShieldCheck size={10} /> Linked to Lead
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!activeConversation?.leadId && (
                  <button className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                  >
                    <UserPlus size={14} /> Link Lead
                  </button>
                )}
                <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--t-text-muted)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedMessages.map((msg, idx) => {
                const showDate = idx === 0 || 
                  format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(selectedMessages[idx-1].created_at), 'yyyy-MM-dd');

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-6">
                        <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text-muted)' }}>
                          {format(new Date(msg.created_at), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.direction === 'outbound' 
                          ? 'text-white rounded-tr-none' 
                          : 'rounded-tl-none'
                      }`}
                      style={msg.direction === 'outbound' 
                        ? { background: 'var(--t-primary)', color: 'var(--t-text-on-primary)' } 
                        : { backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }
                      }
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[9px] opacity-60">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                          {msg.direction === 'outbound' && <CheckCircle2 size={10} className="opacity-60" />}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area */}
            <div className="p-4 border-t" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.8)', borderColor: 'var(--t-border)' }}>
              <form onSubmit={handleSend} className="flex gap-2">
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type an SMS reply..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1"
                  style={{ 
                    backgroundColor: 'var(--t-background)', 
                    border: '1px solid var(--t-border)', 
                    color: 'var(--t-text)',
                    // @ts-expect-error custom prop
                    '--tw-ring-color': 'var(--t-primary)' 
                  }}
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
                  style={{ background: 'var(--t-primary)' }}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
              <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--t-text-muted)' }}>
                Messaging via your connected Gmail account to SMS gateways.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
