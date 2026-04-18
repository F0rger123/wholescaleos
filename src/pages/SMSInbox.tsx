import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  MessageSquare, 
  MoreVertical, 
  Plus, 
  Smartphone, 
  Shield, 
  CheckCircle2, 
  X,
  PlusCircle,
  ArrowDownCircle,
  Brain,
  Loader2,
  UserPlus
} from 'lucide-react';

import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { SMSAnalysis } from '../lib/sms-analysis-service';

// --- Types ---
interface SMSMessage {
  id: string;
  content: string;
  sender: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  read: boolean;
  metadata?: any;
}

interface Conversation {
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  leadName?: string;
  leadId?: string;
  isHighIntent?: boolean;
}

const CARRIER_OPTIONS = [
  'Auto-Detect (Universal Blast)',
  'verizon',
  'at&t',
  't-mobile',
  'sprint',
  'boost-mobile',
  'cricket-wireless',
  'metro-pcs',
  'u.s.-cellular',
  'virgin-mobile',
];

// --- Helpers ---
const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const stripSmsPrefix = (content: string) => {
  const prefixes = [
    /^\d+\/[^:]+:\s*/, // "2/Verizon: "
    /^[^:]+:\s*/,      // "Verizon: "
  ];
  let stripped = content;
  for (const p of prefixes) {
    stripped = stripped.replace(p, '');
  }
  return stripped;
};

// --- Components ---
const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onClose 
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--t-text)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--t-text-muted)' }}>{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all"
            style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text)' }}
          >Cancel</button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all"
            style={{ background: 'var(--t-error)', color: '#fff' }}
          >Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default function SMSInbox() {
  const { 
    currentUser, 
    leads, 
    addTimelineEntry
  } = useStore();
  
  // Real messages state (fetched via Gmail API mocked here or connected to Supabase)
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [newNumber, setNewNumber] = useState('');

  const [pinnedPhones, setPinnedPhones] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Contacts / Leads matching
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string; id: string }>>([]);
  const [editNameModal, setEditNameModal] = useState({ isOpen: false, currentName: '', phone: '' });
  const [editNameValue, setEditNameValue] = useState('');
  const [carrierMap, setCarrierMap] = useState<Record<string, string>>({});
  const [carrierPicker, setCarrierPicker] = useState({ isOpen: false, phone: '', message: '', selectedCarrier: 'Auto-Detect (Universal Blast)' });
  const [analysis, setAnalysis] = useState<SMSAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Analyze conversation on phone selection
  useEffect(() => {
    if (!selectedPhone) {
      setAnalysis(null);
      return;
    }

    async function runAnalysis() {
      setAnalyzing(true);
      try {
        const result = await analyzeSMSConversation(selectedMessages);
        if (result) {
          setAnalysis(result);
        }
      } catch (err) {
        console.error('SMS Analysis failed:', err);
      } finally {
        setAnalyzing(false);
      }
    }

    if (selectedMessages.length > 0) {
      runAnalysis();
    }
  }, [selectedPhone, selectedMessages.length]);


  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');

  const [showCompose, setShowCompose] = useState(false);

  // Recovery / Confirm Modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from local storage / init
  useEffect(() => {
    const savedCarrierMap = localStorage.getItem('ws_carrier_map');
    if (savedCarrierMap) setCarrierMap(JSON.parse(savedCarrierMap));

    const savedPinned = localStorage.getItem('ws_pinned_sms');
    if (savedPinned) setPinnedPhones(new Set(JSON.parse(savedPinned)));

    const savedContacts = localStorage.getItem('ws_sms_contacts');
    if (savedContacts) setContacts(JSON.parse(savedContacts));

    // Initial mock data
    setMessages([
      { id: '1', content: 'Is the house still for sale?', phone_number: '5550123', sender: '5550123', direction: 'inbound', created_at: new Date(Date.now() - 3600000).toISOString(), read: false },
      { id: '2', content: 'Yes it is! Are you interested in a tour?', phone_number: '5550123', sender: 'Me', direction: 'outbound', created_at: new Date(Date.now() - 1800000).toISOString(), read: true },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPhone]);

  // Aggregate messages into conversations
  const conversations = useMemo(() => {
    const map: Record<string, Conversation> = {};
    
    messages.forEach(msg => {
      const p = msg.phone_number.replace(/\D/g, '');
      const existing = map[p];
      
      if (!existing || new Date(msg.created_at) > new Date(existing.timestamp)) {
        const lead = leads.find(l => l.phone.replace(/\D/g, '') === p);
        const contact = contacts.find(c => c.phone.replace(/\D/g, '') === p);
        
        map[p] = {
          phone: p,
          lastMessage: msg.content,
          timestamp: msg.created_at,
          unreadCount: (existing?.unreadCount || 0) + (msg.direction === 'inbound' && !msg.read ? 1 : 0),
          leadName: lead?.name || contact?.name || formatPhoneNumber(p),
          leadId: lead?.id
        };
      }
    });

    return Object.values(map).sort((a, b) => {
      const aPinned = pinnedPhones.has(a.phone) ? 1 : 0;
      const bPinned = pinnedPhones.has(b.phone) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [messages, leads, contacts, pinnedPhones]);

  const filteredConversations = conversations.filter(c => 
    c.phone.includes(searchQuery) || 
    (c.leadName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedMessages = useMemo(() => {
    if (!selectedPhone) return [];
    const p = selectedPhone.replace(/\D/g, '');
    return messages
      .filter(m => m.phone_number.replace(/\D/g, '') === p)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, selectedPhone]);

  const activeConversation = conversations.find(c => c.phone === selectedPhone?.replace(/\D/g, ''));

  const markAsRead = (phone: string) => {
    const p = phone.replace(/\D/g, '');
    setMessages(prev => prev.map(m => 
      m.phone_number.replace(/\D/g, '') === p ? { ...m, read: true } : m
    ));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPhone || !currentUser) return;

    const rawPhone = selectedPhone.replace(/\D/g, '');
    const carrier = carrierMap[rawPhone];

    if (!carrier) {
      setCarrierPicker({
        isOpen: true,
        phone: rawPhone,
        message: replyText,
        selectedCarrier: 'Auto-Detect (Universal Blast)'
      });
      return;
    }

    executeSend(rawPhone, replyText, carrier === 'Auto-Detect (Universal Blast)' ? undefined : carrier);
  };

  const executeSend = async (phone: string, text: string, _carrier?: string) => {
    setSending(true);
    try {
      // Mock Gmail/Gateway send
      await new Promise(r => setTimeout(r, 800));
      
      const newMsg: SMSMessage = {
        id: Math.random().toString(36).substring(7),
        content: text,
        phone_number: phone,
        sender: 'Me',
        direction: 'outbound',
        created_at: new Date().toISOString(),
        read: true
      };
      
      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
      
      // Update timeline if it's a lead
      const lead = leads.find(l => l.phone.replace(/\D/g, '') === phone);
      if (lead) {
        addTimelineEntry(lead.id, {
          type: 'sms',
          content: `SMS Sent: ${text}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'System'
        });
      }
    } catch (err) {
      toast.error('Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const saveCarrier = (phone: string, carrier: string) => {
    const newMap = { ...carrierMap, [phone]: carrier };
    setCarrierMap(newMap);
    localStorage.setItem('ws_carrier_map', JSON.stringify(newMap));
  };

  const togglePin = (phone: string) => {
    const newPinned = new Set(pinnedPhones);
    if (newPinned.has(phone)) newPinned.delete(phone);
    else newPinned.add(phone);
    setPinnedPhones(newPinned);
    localStorage.setItem('ws_pinned_sms', JSON.stringify(Array.from(newPinned)));
  };

  const addContact = (contact: { name: string; phone: string }) => {
    const id = Math.random().toString(36).substring(7);
    const updated = [...contacts.filter(c => c.phone.replace(/\D/g, '') !== contact.phone.replace(/\D/g, '')), { ...contact, id }];
    setContacts(updated);
    localStorage.setItem('ws_sms_contacts', JSON.stringify(updated));
    toast.success('Contact saved');
  };



  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--t-bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--t-primary)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      {/* Sidebar - Conversation List */}
      <div className={`w-full md:w-80 flex flex-col border-r transition-all ${selectedPhone ? 'hidden md:flex' : 'flex'}`} style={{ borderColor: 'var(--t-border)', background: 'rgba(var(--t-surface-rgb), 0.4)' }}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold uppercase tracking-widest pl-2" style={{ color: 'var(--t-text)' }}>Inbox</h1>
            <button 
              onClick={() => setShowCompose(true)}
              className="p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors group-focus-within:text-[var(--t-primary)]" style={{ color: 'var(--t-text-muted)' }} />
            <input 
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all flex-1"
              style={{ 
                backgroundColor: 'var(--t-surface)', 
                border: '1px solid var(--t-border)', 
                color: 'var(--t-text)',
                // @ts-expect-error custom prop
                '--tw-ring-color': 'var(--t-primary)'
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar">
          {filteredConversations.map((conv) => (
            <button
              key={conv.phone}
              onClick={() => {
                setSelectedPhone(conv.phone);
                markAsRead(conv.phone);
              }}
              className={`w-full p-4 rounded-2xl text-left transition-all relative border ${
                selectedPhone?.replace(/\D/g, '') === conv.phone 
                  ? 'border-[var(--t-primary)]/50' 
                  : 'border-transparent hover:bg-[var(--t-surface-hover)]'
              }`}
              style={selectedPhone?.replace(/\D/g, '') === conv.phone ? { backgroundColor: 'var(--t-primary-dim)' } : {}}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate max-w-[120px]" style={{ color: selectedPhone?.replace(/\D/g, '') === conv.phone ? 'var(--t-primary)' : 'var(--t-text)' }}>
                    {conv.leadName}
                  </span>
                  {pinnedPhones.has(conv.phone) && <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-primary)]" />}
                </div>
                <span className="text-[10px] opacity-60" style={{ color: 'var(--t-text-muted)' }}>
                  {format(new Date(conv.timestamp), 'h:mm a')}
                </span>
              </div>
              <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                {stripSmsPrefix(conv.lastMessage)}
              </p>
              {conv.unreadCount > 0 && (
                <div className="absolute right-4 bottom-4 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
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
            <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.8)', borderColor: 'var(--t-border)' }}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedPhone(null)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-[var(--t-surface-hover)]"
                >
                  <X size={20} />
                </button>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg" style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
                  {activeConversation?.leadName?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight" style={{ color: 'var(--t-text)' }}>{activeConversation?.leadName}</h2>
                  <p className="text-[10px] font-mono opacity-60" style={{ color: 'var(--t-text-muted)' }}>{formatPhoneNumber(selectedPhone)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative">
                <button 
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-2 rounded-xl transition-all ${menuOpen ? 'bg-[var(--t-surface-hover)]' : 'hover:bg-[var(--t-surface-hover)]'}`} 
                  style={{ color: 'var(--t-text)' }}
                >
                  <MoreVertical size={20} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-56 rounded-2xl shadow-2xl border p-2 z-[100] animate-in slide-in-from-top-2 duration-200" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                    {/* Rename option */}
                    <button
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors rounded-xl font-medium"
                      style={{ color: 'var(--t-text)' }}
                      onClick={() => {
                        setMenuOpen(false);
                        setEditNameValue(activeConversation?.leadName || '');
                        setEditNameModal({ isOpen: true, currentName: activeConversation?.leadName || '', phone: selectedPhone });
                      }}
                    >
                      🏷️ Rename Contact
                    </button>
                    {!activeConversation?.leadId && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors rounded-xl font-medium"
                        style={{ color: 'var(--t-primary)' }}
                        onClick={() => {
                          setMenuOpen(false);
                          const name = prompt("Enter contact name:");
                          if (name && selectedPhone) addContact({ name, phone: selectedPhone });
                        }}
                      >
                        <UserPlus size={14} /> Save Contact
                      </button>
                    )}
                    <div className="my-1 border-t" style={{ borderColor: 'var(--t-border)' }} />
                    <button
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors rounded-xl font-medium"
                      style={{ color: 'var(--t-text)' }}
                      onClick={() => {
                        setMenuOpen(false);
                        togglePin(selectedPhone?.replace(/\D/g, '') || '');
                      }}
                    >
                      {pinnedPhones.has(selectedPhone?.replace(/\D/g, '') || '') ? '📍 Unpin from Top' : '📌 Pin to Top'}
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors rounded-xl font-medium"
                      style={{ color: 'var(--t-text)' }}
                      onClick={() => {
                        setMenuOpen(false);
                        const rawPhone = selectedPhone?.replace(/\D/g, '') || '';
                        setCarrierPicker({
                          isOpen: true,
                          phone: rawPhone,
                          message: '',
                          selectedCarrier: carrierMap[rawPhone] || 'Auto-Detect (Universal Blast)'
                        });
                      }}
                    >
                      📡 Set Carrier ({carrierMap[selectedPhone?.replace(/\D/g, '') || ''] || 'Unknown'})
                    </button>
                    <div className="my-1 border-t" style={{ borderColor: 'var(--t-border)' }} />
                    <button
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors rounded-xl font-medium"
                      style={{ color: 'var(--t-error)' }}
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Conversation?',
                          message: `Are you sure you want to delete all messages with ${activeConversation?.leadName}? This cannot be undone.`,
                          onConfirm: () => {
                            setMessages(prev => prev.filter(m => m.phone_number.replace(/\D/g, '') !== selectedPhone?.replace(/\D/g, '')));
                            setSelectedPhone(null);
                          }
                        });
                      }}
                    >
                      🗑️ Delete Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary Banner (Item 12) */}
            {analysis && (
              <div className="px-4 py-3 border-b flex items-center gap-3 animate-in slide-in-from-top-2 duration-300" style={{ backgroundColor: 'rgba(var(--t-primary-rgb), 0.03)', borderColor: 'var(--t-border)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'var(--t-primary-dim)' }}>
                  <Brain size={16} className="text-[var(--t-primary)]" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-primary)] mb-0.5">AI Conversation Analysis</div>
                  <p className="text-[11px] font-medium italic leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                    "{analysis.summary}"
                  </p>
                </div>
                {analysis.intent === 'interest' && (
                  <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--t-success)]/10 text-[var(--t-success)] border border-[var(--t-success)]/20 uppercase tracking-tighter">
                    High Intent
                  </div>
                )}
              </div>
            )}

            {/* Messages Panel */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
              {selectedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-sm font-medium">No messages yet. Send a text to start the conversation.</p>
                </div>
              ) : (
                selectedMessages.map((msg, idx) => {
                  const showDate = idx === 0 || 
                    format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(selectedMessages[idx-1].created_at), 'yyyy-MM-dd');

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span className="text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text-muted)' }}>
                            {format(new Date(msg.created_at), 'MMMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.direction === 'outbound' 
                            ? 'rounded-tr-none' 
                            : 'rounded-tl-none'
                        }`}
                        style={msg.direction === 'outbound' 
                          ? { background: 'var(--t-primary)', color: 'var(--t-on-primary)' } 
                          : { backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }
                        }
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{stripSmsPrefix(msg.content)}</p>
                          <div className={`flex items-center gap-1.5 mt-2 opacity-60 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] font-bold">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                            {msg.direction === 'outbound' && <CheckCircle2 size={10} />}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area */}
            <div className="p-4 border-t bg-[var(--t-surface)]/40 backdrop-blur-xl" style={{ borderColor: 'var(--t-border)' }}>
              
              {/* AI Suggested Replies (Item 12) */}
              {analysis && analysis.suggestedReplies && analysis.suggestedReplies.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                  {analysis.suggestedReplies.map((reply: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setReplyText(reply)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--t-primary)]/20 bg-[var(--t-primary)]/5 hover:bg-[var(--t-primary)]/10 text-[10px] font-bold transition-all whitespace-nowrap"
                      style={{ color: 'var(--t-primary)' }}
                    >
                      ✨ {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Replies (Item 15) */}
              <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar opacity-60 hover:opacity-100 transition-opacity">
                {[
                  "One second, let me check...",
                  "Can you send the address?",
                  "Are you free for a call?",
                  "I got your message, thanks!",
                  "I'll follow up shortly."
                ].map((qr: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(qr)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap hover:border-[var(--t-primary)]/30"
                    style={{ color: 'var(--t-text-muted)' }}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSend} className="relative group">
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full pl-4 pr-12 py-3.5 rounded-2xl text-sm outline-none transition-all"
                  style={{ 
                    backgroundColor: 'var(--t-surface)', 
                    border: '1px solid var(--t-border)', 
                    color: 'var(--t-text)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all disabled:opacity-50 hover:scale-110 active:scale-95"
                  style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowDownCircle className="w-5 h-5 -rotate-90" />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold uppercase tracking-widest" style={{ color: 'var(--t-text)' }}>New Message</h3>
              <button onClick={() => setShowCompose(false)} className="p-2 rounded-full hover:bg-[var(--t-surface-hover)]" style={{ color: 'var(--t-text-muted)' }}><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--t-text)' }}>Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
                  <input 
                    type="tel"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="Enter recipient..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm outline-none transition-all"
                    style={{ backgroundColor: 'var(--t-background)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--t-text)' }}>Quick Select</label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {[...leads, ...contacts].slice(0, 5).map((person, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setNewNumber(person.phone);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[var(--t-surface-hover)] border border-transparent hover:border-[var(--t-border)]"
                      style={{ backgroundColor: 'var(--t-background)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--t-primary-dim)] flex items-center justify-center font-bold text-[10px]" style={{ color: 'var(--t-primary)' }}>
                          {person.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold" style={{ color: 'var(--t-text)' }}>{person.name}</p>
                          <p className="text-[10px] opacity-60" style={{ color: 'var(--t-text-muted)' }}>{formatPhoneNumber(person.phone)}</p>
                        </div>
                      </div>
                      <PlusCircle size={14} className="text-[var(--t-primary)] opacity-40" />
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  if (newNumber.trim()) {
                    setSelectedPhone(newNumber.trim());
                    setShowCompose(false);
                    setNewNumber('');
                  }
                }}
                disabled={!newNumber.trim()}
                className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-[var(--t-primary)]/20"
                style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
              >
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Name Modal */}
      {editNameModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--t-text)' }}>Rename Contact</h3>
            <p className="text-xs mb-4 opacity-60" style={{ color: 'var(--t-text-muted)' }}>Updating for {formatPhoneNumber(editNameModal.phone)}</p>
            <input
              autoFocus
              type="text"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-6"
              style={{ backgroundColor: 'var(--t-background)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditNameModal({ isOpen: false, currentName: '', phone: '' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (editNameValue.trim() && editNameModal.phone) {
                    addContact({ name: editNameValue.trim(), phone: editNameModal.phone });
                    setEditNameModal({ isOpen: false, currentName: '', phone: '' });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
              >Save Name</button>
            </div>
          </div>
        </div>
      )}

      {/* Carrier Picker Modal */}
      {carrierPicker.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-[var(--t-primary-dim)] flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-[var(--t-primary)]" />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--t-text)' }}>Carrier Verification</h3>
              <p className="text-xs leading-relaxed opacity-60" style={{ color: 'var(--t-text-muted)' }}>
                To reach {formatPhoneNumber(carrierPicker.phone)}, please select their wireless provider. This ensures delivery through the proper gateway.
              </p>
            </div>
            
            <div className="space-y-6">
              <select
                value={carrierPicker.selectedCarrier}
                onChange={(e) => setCarrierPicker(prev => ({ ...prev, selectedCarrier: e.target.value }))}
                className="w-full px-4 py-4 rounded-2xl text-sm outline-none appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--t-background)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
              >
                {CARRIER_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={() => setCarrierPicker({ isOpen: false, phone: '', message: '', selectedCarrier: 'Auto-Detect (Universal Blast)' })}
                  className="flex-1 py-4 rounded-2xl text-sm font-bold"
                  style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
                >Cancel</button>
                <button
                  onClick={() => {
                    const { phone, message, selectedCarrier } = carrierPicker;
                    saveCarrier(phone, selectedCarrier);
                    setCarrierPicker({ isOpen: false, phone: '', message: '', selectedCarrier: 'Auto-Detect (Universal Blast)' });
                    if (message) {
                      executeSend(phone, message, selectedCarrier === 'Auto-Detect (Universal Blast)' ? undefined : selectedCarrier);
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-[var(--t-primary)]/20"
                  style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
                >Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
