import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Search, MessageSquare, User, 
  Send, Loader2, ArrowLeft, MoreVertical, 
  CheckCircle2, UserPlus, Smartphone,
  Plus, X, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { sendSMSViaAI } from '../lib/gemini';
import { ConfirmModal } from '../components/ConfirmModal';
import { pollSMSMessages } from '../lib/sms-polling';
import { googleEcosystem } from '../lib/google-ecosystem';

interface SMSMessage {
  id: string;
  phone_number: string;
  content: string;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  created_at: string;
  lead_id?: string;
}

import { CARRIER_GATEWAYS } from '../lib/sms-gateways';

const CARRIER_OPTIONS = [
  'Auto-Detect (Universal Blast)',
  ...Object.keys(CARRIER_GATEWAYS)
];

interface Conversation {
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  leadName?: string;
  leadId?: string;
  pinned?: boolean;
  archived?: boolean;
  blocked?: boolean;
  carrierHint?: string;
}

export function SMSInbox() {
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone');

  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const leads = useStore(state => state.leads);
  const currentUser = useStore(state => state.currentUser);
  const addLead = useStore(state => state.addLead);
  const contacts = useStore(state => state.contacts);
  const addContact = useStore(state => state.addContact);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // 3-dot dropdown menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit-name modal state  
  const [editNameModal, setEditNameModal] = useState<{ isOpen: boolean; currentName: string; phone: string }>(
    { isOpen: false, currentName: '', phone: '' }
  );
  const [editNameValue, setEditNameValue] = useState('');

  // Carrier map: phone → carrier string, persisted in localStorage + Supabase leads
  const [carrierMap, setCarrierMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('sms_carrier_map') || '{}'); } catch { return {}; }
  });

  // Sync carrierMap from leads state on load
  useEffect(() => {
    const mapFromLeads: Record<string, string> = { ...carrierMap };
    leads.forEach(l => {
      if (l.phone && (l as any).carrier) {
        mapFromLeads[l.phone.replace(/\D/g, '')] = (l as any).carrier;
      }
    });
    // Add any from localStorage that might not be leads
    setCarrierMap(mapFromLeads);
  }, [leads]);

  const saveCarrier = async (phone: string, carrier: string) => {
    const rawPhone = phone.replace(/\D/g, '');
    const next = { ...carrierMap, [rawPhone]: carrier };
    setCarrierMap(next);
    localStorage.setItem('sms_carrier_map', JSON.stringify(next));

    // Persist to Supabase if it's a lead
    if (isSupabaseConfigured && supabase) {
      const lead = leads.find(l => l.phone?.replace(/\D/g, '') === rawPhone);
      if (lead) {
        try {
          await supabase.from('leads').update({ carrier }).eq('id', lead.id);
          console.log(`[SMS] Persisted carrier '${carrier}' to lead: ${lead.name}`);
        } catch (err) {
          console.warn('[SMS] Failed to persist carrier to lead:', err);
        }
      }
    }
  };

  // Pinned / archived / blocked sets persisted in localStorage
  const [pinnedPhones, setPinnedPhones] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sms_pinned') || '[]')); } catch { return new Set(); }
  });
  const [archivedPhones, setArchivedPhones] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sms_archived') || '[]')); } catch { return new Set(); }
  });
  const [blockedPhones, setBlockedPhones] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sms_blocked') || '[]')); } catch { return new Set(); }
  });
  const togglePin = (phone: string) => {
    const next = new Set(pinnedPhones);
    next.has(phone) ? next.delete(phone) : next.add(phone);
    setPinnedPhones(next);
    localStorage.setItem('sms_pinned', JSON.stringify([...next]));
  };
  const toggleArchive = (phone: string) => {
    const next = new Set(archivedPhones);
    next.has(phone) ? next.delete(phone) : next.add(phone);
    setArchivedPhones(next);
    localStorage.setItem('sms_archived', JSON.stringify([...next]));
    if (next.has(phone) && selectedPhone === phone) setSelectedPhone(null);
  };
  const toggleBlock = (phone: string) => {
    if (!blockedPhones.has(phone) && !confirm(`Block ${formatPhoneNumber(phone)}? You won't receive messages from this number.`)) return;
    const next = new Set(blockedPhones);
    next.has(phone) ? next.delete(phone) : next.add(phone);
    setBlockedPhones(next);
    localStorage.setItem('sms_blocked', JSON.stringify([...next]));
    if (next.has(phone) && selectedPhone === phone) setSelectedPhone(null);
  };

  // Carrier picker modal: shown before sending to a phone with unknown carrier
  const [carrierPicker, setCarrierPicker] = useState<{
    isOpen: boolean;
    phone: string;
    message: string;
    selectedCarrier: string;
  }>({ isOpen: false, phone: '', message: '', selectedCarrier: 'Auto-Detect (Universal Blast)' });

  // Contact search in compose
  const [contactSearch, setContactSearch] = useState('');
  const allContacts = [...contacts, ...leads.filter(l => l.phone).map(l => ({ name: l.name, phone: l.phone! }))];
  const filteredContactSearch = contactSearch
    ? allContacts.filter(c =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.phone.includes(contactSearch)
      ).slice(0, 8)
    : [];

  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;
    try {
      // Try user_id first (correct column name)
      const { data, error: _error } = await supabase
        .from('sms_messages')
        .select('*')
        .or(`user_id.eq.${currentUser.id},agent_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching SMS:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    // console.log('[SMS Inbox] Manual refresh triggered.');
    try {
      await pollSMSMessages();
      await fetchMessages();
      // Simple notification via title update or similar could be added here
      // For now we'll just rely on the spinning icon and updated list
    } catch (err) {
      console.error('[SMS Inbox] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!currentUser?.id) return;
    setSyncingContacts(true);
    try {
      const data = await googleEcosystem.getContacts(currentUser.id);
      const connections = data.connections || [];
      let syncedCount = 0;
      connections.forEach((conn: any) => {
        const name = conn.names?.[0]?.displayName || 'Unknown';
        const phoneObj = conn.phoneNumbers?.find((p: any) => p.value);
        let phoneValue = phoneObj ? phoneObj.value : '';
        if (phoneValue) {
          const rawPhone = phoneValue.replace(/\D/g, '');
          if (rawPhone && !useStore.getState().contacts.some(c => c.phone.replace(/\D/g, '') === rawPhone)) {
             useStore.getState().addContact({ name, phone: phoneValue, notes: 'Imported from Google Contacts' });
             syncedCount++;
          }
        }
      });
      alert(`Synced ${syncedCount} new contacts from Google!`);
    } catch (err: any) {
      console.error('[SMS Inbox] Sync failed:', err);
      alert('Failed to sync contacts: ' + err.message);
    } finally {
      setSyncingContacts(false);
    }
  };

  useEffect(() => {
    if (phoneParam) {
      setSelectedPhone(phoneParam);
    }
  }, [phoneParam]);

  // Close 3-dot menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages via realtime
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('sms_changes')
        .on('postgres_changes', { event: 'INSERT', table: 'sms_messages', schema: 'public' }, () => {
          fetchMessages();
        })
        .subscribe();
    }

    // Fallback: poll every 15 seconds in case realtime isn't enabled on Supabase
    const refreshInterval = setInterval(fetchMessages, 15000);

    return () => { 
      if (channel && supabase) supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [fetchMessages]);

  const processConversations = (allMessages: SMSMessage[]) => {
    const groups: Record<string, Conversation> = {};
    
    allMessages.forEach(msg => {
      if (!msg.phone_number) return;
      const rawPhone = msg.phone_number.replace(/\D/g, '');
      if (!groups[rawPhone]) {
        const lead = leads.find(l => l.phone?.replace(/\D/g, '') === rawPhone);
        groups[rawPhone] = {
          phone: rawPhone,
          lastMessage: msg.content,
          timestamp: msg.created_at,
          unreadCount: 0,
          leadName: lead?.name,
          leadId: lead?.id
        };
      }
      if (!msg.is_read && msg.direction === 'inbound') {
        groups[rawPhone].unreadCount++;
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

  const executeSend = async (phone: string, textToSend: string, carrier?: string) => {
    setSending(true);
    const optimisticMsg: SMSMessage = {
      id: `optimistic-${Date.now()}`,
      phone_number: phone,
      content: textToSend,
      direction: 'outbound',
      is_read: true,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Pass carrier (undefined = universal blast, string = specific CARRIER_GATEWAYS key)
      const effectiveCarrier = carrier === 'Auto-Detect (Universal Blast)' ? undefined : carrier;
      const result = await sendSMSViaAI(phone, textToSend, effectiveCarrier);

      if (result.success) {
        if (isSupabaseConfigured && supabase && currentUser?.id) {
          const lead = leads.find(l => l.phone?.replace(/\D/g, '') === phone.replace(/\D/g, ''));
          supabase.from('sms_messages').insert({
            user_id: currentUser.id,
            lead_id: lead?.id ?? null,
            phone_number: phone,
            content: textToSend,
            direction: 'outbound',
            is_read: true
          }).select().single().then(({ data: inserted, error: insertError }) => {
            if (!insertError && inserted) {
              setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? inserted : m));
            } else if (insertError) {
              console.warn('[SMS] DB insert error (message still sent):', insertError.message);
            }
          });
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setReplyText(textToSend);
        alert(`❌ Send failed: ${result.message}`);
      }
    } catch (err: any) {
      console.error('[SMS] Failed to send:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setReplyText(textToSend);
      alert(`❌ SMS Error: ${err?.message || 'Check your Google connection in Settings.'}`);
    } finally {
      setSending(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedPhone || sending) return;

    const textToSend = replyText.trim();
    const rawPhone = selectedPhone.replace(/\D/g, '');
    const knownCarrier = carrierMap[rawPhone];

    // Show picker if: no carrier saved OR saved as the catch-all universal option
    const needsPicker = !knownCarrier || knownCarrier === 'Auto-Detect (Universal Blast)';

    if (needsPicker) {
      setCarrierPicker({
        isOpen: true,
        phone: rawPhone,
        message: textToSend,
        selectedCarrier: knownCarrier || 'Auto-Detect (Universal Blast)'
      });
      return;
    }

    setReplyText('');
    executeSend(rawPhone, textToSend, knownCarrier);
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    processConversations(messages);
  }, [messages, leads]);

  useEffect(() => {
    scrollToBottom();
    if (selectedPhone) {
      markAsRead(selectedPhone);
    }
  }, [selectedPhone, messages]);

  const filteredConversations = conversations
    .filter(c => {
      const raw = c.phone.replace(/\D/g, '');
      if (blockedPhones.has(raw)) return false;     // Never show blocked
      if (archivedPhones.has(raw) && !searchQuery) return false; // Hide archived unless searching
      return (
        c.phone.includes(searchQuery) ||
        c.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aPin = pinnedPhones.has(a.phone.replace(/\D/g, ''));
      const bPin = pinnedPhones.has(b.phone.replace(/\D/g, ''));
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const selectedMessages = [...messages]
    .filter(m => m.phone_number && m.phone_number.replace(/\D/g, '') === selectedPhone?.replace(/\D/g, ''))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const activeConversation = conversations.find(c => c.phone.replace(/\D/g, '') === selectedPhone?.replace(/\D/g, ''));

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: 'var(--t-text-color)' }}>Messages</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl transition-all hover:bg-[var(--t-surface-hover)] disabled:opacity-50"
                style={{ color: 'var(--t-text-muted)' }}
                title="Check for new messages now"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={handleSyncContacts}
                disabled={syncingContacts}
                className="p-2 rounded-xl transition-all hover:bg-[var(--t-surface-hover)] disabled:opacity-50"
                style={{ color: 'var(--t-text-muted)' }}
                title="Sync Google Contacts"
              >
                <UserPlus size={16} className={syncingContacts ? 'animate-pulse text-[var(--t-primary)]' : ''} />
              </button>
              <button 
                onClick={() => setShowCompose(true)}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'var(--t-primary)', color: 'white' }}
                title="New Message"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
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
              onClick={() => setSelectedPhone(conv.phone.replace(/\D/g, ''))}
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
                    {conv.leadName || formatPhoneNumber(conv.phone)}
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
                  <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{activeConversation?.leadName || formatPhoneNumber(activeConversation?.phone || '')}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>{formatPhoneNumber(activeConversation?.phone || '')}</span>
                    {/* Clickable carrier badge */}
                    <button
                      onClick={() => {
                        const rawPhone = selectedPhone?.replace(/\D/g, '') || '';
                        setCarrierPicker({
                          isOpen: true,
                          phone: rawPhone,
                          message: '',
                          selectedCarrier: carrierMap[rawPhone] || 'Auto-Detect (Universal Blast)'
                        });
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                      style={
                        carrierMap[selectedPhone?.replace(/\D/g, '') || ''] &&
                        carrierMap[selectedPhone?.replace(/\D/g, '') || ''] !== 'Auto-Detect (Universal Blast)'
                          ? { background: 'color-mix(in srgb, var(--t-success) 15%, transparent)', color: 'var(--t-success)', border: '1px solid color-mix(in srgb, var(--t-success) 30%, transparent)' }
                          : { background: 'color-mix(in srgb, var(--t-warning) 15%, transparent)', color: 'var(--t-warning)', border: '1px solid color-mix(in srgb, var(--t-warning) 30%, transparent)' }
                      }
                      title="Click to set carrier for correct SMS routing"
                    >
                      📡 {carrierMap[selectedPhone?.replace(/\D/g, '') || ''] && carrierMap[selectedPhone?.replace(/\D/g, '') || ''] !== 'Auto-Detect (Universal Blast)'
                        ? carrierMap[selectedPhone?.replace(/\D/g, '') || '']
                        : '⚠️ Carrier unknown — tap to set'}
                    </button>
                  </div>
                </div>

              </div>
                <div className="flex gap-2 items-center">
                {!activeConversation?.leadId && (
                  <button 
                    onClick={() => {
                      const name = prompt("Enter name for this contact:");
                      if (name && selectedPhone) {
                        addLead({
                          name,
                          email: '',
                          phone: selectedPhone,
                          status: 'new',
                          source: 'other',
                          propertyAddress: 'Unknown',
                          propertyType: 'single-family',
                          estimatedValue: 0,
                          offerAmount: 0,
                          lat: 34.0522,
                          lng: -118.2437,
                          notes: 'Saved from SMS inbox',
                          assignedTo: currentUser?.id || '',
                          probability: 50,
                          engagementLevel: 3,
                          timelineUrgency: 3,
                          competitionLevel: 1
                        });
                      }
                    }}
                    className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                  >
                    <UserPlus size={14} /> Save as Lead
                  </button>
                )}
                {/* 3-dot dropdown menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--t-text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setMenuOpen(prev => !prev)}
                    title="More options"
                  >
                    <MoreVertical size={20} />
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 rounded-xl border shadow-xl py-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-100"
                      style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
                    >
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-text)' }}
                        onClick={() => {
                          setMenuOpen(false);
                          setEditNameModal({
                            isOpen: true,
                            currentName: activeConversation?.leadName || '',
                            phone: selectedPhone || ''
                          });
                          setEditNameValue(activeConversation?.leadName || '');
                        }}
                      >
                        ✏️ Edit Contact Name
                      </button>
                      {!contacts.find(c => c.phone.replace(/\D/g, '') === selectedPhone?.replace(/\D/g, '')) && !activeConversation?.leadId && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
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
                      <div style={{ borderTop: '1px solid var(--t-border)', margin: '4px 0' }} />
                      {/* Mark read / unread */}
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-text)' }}
                        onClick={() => {
                          setMenuOpen(false);
                          if (activeConversation?.unreadCount && activeConversation.unreadCount > 0) {
                            markAsRead(selectedPhone || '');
                          } else {
                            // Mark as unread: bump unread count locally
                            setConversations(prev => prev.map(c =>
                              c.phone === activeConversation?.phone ? { ...c, unreadCount: 1 } : c
                            ));
                          }
                        }}
                      >
                        {activeConversation?.unreadCount ? '✅ Mark as Read' : '🔵 Mark as Unread'}
                      </button>
                      {/* Pin to top */}
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-text)' }}
                        onClick={() => { setMenuOpen(false); if (selectedPhone) togglePin(selectedPhone.replace(/\D/g, '')); }}
                      >
                        {pinnedPhones.has(selectedPhone?.replace(/\D/g, '') || '') ? '📌 Unpin' : '📌 Pin to Top'}
                      </button>
                      {/* Archive */}
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-text)' }}
                        onClick={() => { setMenuOpen(false); if (selectedPhone) toggleArchive(selectedPhone.replace(/\D/g, '')); }}
                      >
                        {archivedPhones.has(selectedPhone?.replace(/\D/g, '') || '') ? '📥 Unarchive' : '📦 Archive'}
                      </button>
                      {/* Set carrier */}
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-text)' }}
                        onClick={() => {
                          setMenuOpen(false);
                          const rawPhone = selectedPhone?.replace(/\D/g, '') || '';
                          setCarrierPicker({
                            isOpen: true,
                            phone: rawPhone,
                            message: '',  // empty = carrier-only save (no send)
                            selectedCarrier: carrierMap[rawPhone] || 'Auto-Detect (Universal Blast)'
                          });
                        }}
                      >
                        📡 Set Carrier ({carrierMap[selectedPhone?.replace(/\D/g, '') || ''] || 'Unknown'})
                      </button>
                      {/* Add to lead / View lead */}
                      {!activeConversation?.leadId ? (
                        <button
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                          style={{ color: 'var(--t-primary)' }}
                          onClick={() => {
                            setMenuOpen(false);
                            const name = prompt('Enter name for new lead:');
                            if (name && selectedPhone) {
                              addLead({ name, email: '', phone: selectedPhone, status: 'new', source: 'other',
                                propertyAddress: 'Unknown', propertyType: 'single-family',
                                estimatedValue: 0, offerAmount: 0, lat: 0, lng: 0,
                                notes: 'Added from SMS inbox', assignedTo: currentUser?.id || '',
                                probability: 50, engagementLevel: 3, timelineUrgency: 3, competitionLevel: 1 });
                            }
                          }}
                        >
                          <UserPlus size={14} /> Add to Leads
                        </button>
                      ) : (
                        <button
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                          style={{ color: 'var(--t-primary)' }}
                          onClick={() => {
                            setMenuOpen(false);
                            window.location.href = `/leads?id=${activeConversation.leadId}`;
                          }}
                        >
                          👤 View Lead Profile
                        </button>
                      )}
                      <div style={{ borderTop: '1px solid var(--t-border)', margin: '4px 0' }} />
                      {/* Block */}
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-error)' }}
                        onClick={() => { setMenuOpen(false); if (selectedPhone) toggleBlock(selectedPhone.replace(/\D/g, '')); }}
                      >
                        🚫 {blockedPhones.has(selectedPhone?.replace(/\D/g, '') || '') ? 'Unblock Number' : 'Block Number'}
                      </button>
                      {/* Delete */}
                      <button
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-colors"
                        style={{ color: 'var(--t-error)' }}
                        onClick={() => {
                          setMenuOpen(false);
                          if (confirm(`Delete all messages with ${formatPhoneNumber(selectedPhone || '')}?`)) {
                            setMessages(prev => prev.filter(m => m.phone_number.replace(/\D/g, '') !== selectedPhone?.replace(/\D/g, '')));
                            setSelectedPhone(null);
                          }
                        }}
                      >
                        🗑️ Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
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

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>New Message</h3>
              <button onClick={() => setShowCompose(false)} style={{ color: 'var(--t-text-muted)' }}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
                  <input 
                    type="tel"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="e.g. 555-0123"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-1 transition-all"
                    style={{ 
                      backgroundColor: 'var(--t-background)', 
                      border: '1px solid var(--t-border)', 
                      color: 'var(--t-text)',
                      // @ts-expect-error custom prop
                      '--tw-ring-color': 'var(--t-primary)' 
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Contact / Lead search */}
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Search Contacts &amp; Leads</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); }}
                    placeholder="Search by name or number..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-1 transition-all"
                    style={{
                      backgroundColor: 'var(--t-background)',
                      border: '1px solid var(--t-border)',
                      color: 'var(--t-text)',
                      // @ts-expect-error
                      '--tw-ring-color': 'var(--t-primary)'
                    }}
                  />
                </div>
                {filteredContactSearch.length > 0 && (
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {filteredContactSearch.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setNewNumber(c.phone);
                          setContactSearch('');
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl text-left transition-colors hover:bg-[var(--t-surface-hover)] border border-transparent hover:border-[var(--t-border)]"
                        style={{ backgroundColor: 'var(--t-background)' }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[var(--t-primary-dim)] flex items-center justify-center font-bold text-[10px]" style={{ color: 'var(--t-primary)' }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--t-text)' }}>{c.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Fallback: show all contacts when not searching */}
                {!contactSearch && contacts.length > 0 && (
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {contacts.slice(0, 6).map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => { setSelectedPhone(contact.phone); setShowCompose(false); }}
                        className="flex items-center gap-2 p-2 rounded-xl text-left transition-colors hover:bg-[var(--t-surface-hover)] border border-transparent hover:border-[var(--t-border)]"
                        style={{ backgroundColor: 'var(--t-background)' }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[var(--t-primary-dim)] flex items-center justify-center font-bold text-[10px]" style={{ color: 'var(--t-primary)' }}>
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--t-text)' }}>{contact.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{contact.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                className="w-full py-2.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--t-primary)', color: 'white' }}
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Name Modal */}
      {editNameModal.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl border shadow-2xl p-6 w-80 space-y-4 animate-in fade-in zoom-in-95" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <h3 className="font-bold text-base" style={{ color: 'var(--t-text)' }}>Edit Contact Name</h3>
            <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{formatPhoneNumber(editNameModal.phone)}</p>
            <input
              autoFocus
              type="text"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editNameValue.trim() && editNameModal.phone) {
                    // Save / update contact name — addContact is idempotent for UI purposes
                    addContact({ name: editNameValue.trim(), phone: editNameModal.phone });
                    // Update conversations list immediately
                    setConversations(prev => prev.map(c =>
                      c.phone.replace(/\D/g, '') === editNameModal.phone.replace(/\D/g, '')
                        ? { ...c, leadName: editNameValue.trim() }
                        : c
                    ));
                    setEditNameModal({ isOpen: false, currentName: '', phone: '' });
                  }
                }
                if (e.key === 'Escape') setEditNameModal({ isOpen: false, currentName: '', phone: '' });
              }}
              placeholder="Enter name..."
              className="w-full px-4 py-2 rounded-xl text-sm outline-none focus:ring-1"
              style={{ backgroundColor: 'var(--t-background)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditNameModal({ isOpen: false, currentName: '', phone: '' })}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (editNameValue.trim() && editNameModal.phone) {
                    addContact({ name: editNameValue.trim(), phone: editNameModal.phone });
                    setConversations(prev => prev.map(c =>
                      c.phone.replace(/\D/g, '') === editNameModal.phone.replace(/\D/g, '')
                        ? { ...c, leadName: editNameValue.trim() }
                        : c
                    ));
                    setEditNameModal({ isOpen: false, currentName: '', phone: '' });
                  }
                }}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--t-primary)' }}
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Carrier Picker Modal */}
      {carrierPicker.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border shadow-2xl p-6 w-96 space-y-5 animate-in fade-in zoom-in-95" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--t-text)' }}>Select Carrier for {formatPhoneNumber(carrierPicker.phone)}</h3>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                Choose the recipient's carrier so we route through the correct SMS gateway.
                This is saved so you won't be asked again.
              </p>
            </div>
            <select
              value={carrierPicker.selectedCarrier}
              onChange={(e) => setCarrierPicker(prev => ({ ...prev, selectedCarrier: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--t-background)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            >
              {CARRIER_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setCarrierPicker({ isOpen: false, phone: '', message: '', selectedCarrier: 'Auto-Detect (Universal Blast)' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
              >Cancel</button>
              <button
                onClick={() => {
                  const { phone, message, selectedCarrier } = carrierPicker;
                  // Save carrier for this phone
                  saveCarrier(phone, selectedCarrier);
                  setCarrierPicker({ isOpen: false, phone: '', message: '', selectedCarrier: 'Auto-Detect (Universal Blast)' });
                  // Only send if we have a message (not just a carrier-save from the menu)
                  if (message) {
                    setReplyText('');
                    executeSend(phone, message, selectedCarrier === 'Auto-Detect (Universal Blast)' ? undefined : selectedCarrier);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--t-primary)' }}
              >{carrierPicker.message ? 'Save & Send' : 'Save Carrier'}</button>
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
