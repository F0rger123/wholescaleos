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
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Conversations List */}
      <div className={`flex flex-col border-r border-slate-800 bg-slate-900/40 ${selectedPhone ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}`}>
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <button
              key={conv.phone}
              onClick={() => setSelectedPhone(conv.phone)}
              className={`w-full p-4 flex gap-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors relative ${selectedPhone === conv.phone ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                {conv.leadId ? (
                  <div className="w-full h-full rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                    {conv.leadName?.charAt(0)}
                  </div>
                ) : (
                  <User className="text-slate-500 w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="font-semibold text-white truncate text-sm">
                    {conv.leadName || conv.phone}
                  </span>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {format(new Date(conv.timestamp), 'h:mm a')}
                  </span>
                </div>
                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <div className="absolute right-4 bottom-4 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {conv.unreadCount}
                </div>
              )}
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Thread */}
      <div className={`flex-1 flex flex-col bg-slate-900/60 ${!selectedPhone ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedPhone ? (
          <div className="text-center p-8 max-w-sm">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select a conversation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Choose a contact from the left to view your message history and send SMS replies.
            </p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedPhone(null)}
                  className="p-2 -ml-2 md:hidden hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-sm">
                  {activeConversation?.leadName?.charAt(0) || <User size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{activeConversation?.leadName || activeConversation?.phone}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">{activeConversation?.phone}</span>
                    {activeConversation?.leadId && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <ShieldCheck size={10} /> Linked to Lead
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!activeConversation?.leadId && (
                  <button className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 rounded-lg transition-colors">
                    <UserPlus size={14} /> Link Lead
                  </button>
                )}
                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
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
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                          {format(new Date(msg.created_at), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.direction === 'outbound' 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                      }`}>
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
            <div className="p-4 border-t border-slate-800 bg-slate-900/80">
              <form onSubmit={handleSend} className="flex gap-2">
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type an SMS reply..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Messaging via your connected Gmail account to SMS gateways.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
