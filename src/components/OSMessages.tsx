import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle, CheckCircle2, X, Sparkles, MessageSquare, Clock, Settings, Bell, Mail, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export interface OSMessage {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface MessagePreferences {
  daily_summary_enabled: boolean;
  weekly_summary_enabled: boolean;
  transaction_alerts_enabled: boolean;
  task_reminders_enabled: boolean;
}

export function OSMessages({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<OSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'messages' | 'settings'>('messages');
  const [prefs, setPrefs] = useState<MessagePreferences | null>(null);
  const { currentUser } = useStore();

  useEffect(() => {
    if (isOpen && currentUser) {
      if (view === 'messages') {
        fetchMessages();
      } else {
        fetchPreferences();
      }
    }
  }, [isOpen, currentUser, view]);

  const fetchPreferences = async () => {
    if (!supabase || !currentUser) return;
    try {
      const { data } = await supabase
        .from('user_os_messages_preferences')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
      
      if (data) setPrefs(data);
    } catch (err) {
      console.error('Fetch preferences error:', err);
    }
  };

  const updatePreference = async (key: keyof MessagePreferences) => {
    if (!supabase || !currentUser || !prefs) return;
    try {
      const newPrefs = { ...prefs, [key]: !prefs[key] };
      setPrefs(newPrefs);
      await supabase
        .from('user_os_messages_preferences')
        .upsert({ user_id: currentUser.id, ...newPrefs });
    } catch (err) {
      console.error('Update preferences error:', err);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      if (!supabase || !currentUser) return;
      
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-end p-4 pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        className="pointer-events-auto w-full max-w-md bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--t-border)] bg-gradient-to-r from-[var(--t-primary-dim)]/20 to-transparent flex items-center justify-between">
          <button 
            onClick={() => setView('messages')}
            className={`flex items-center gap-3 transition-opacity ${view === 'settings' ? 'opacity-40 hover:opacity-100' : ''}`}
          >
            <div className="p-2 bg-[var(--t-primary-dim)]/30 text-[var(--t-primary)] rounded-xl">
              <MessageSquare size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-[var(--t-text)]">OS Messages</h3>
              <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Intelligent Comms</p>
            </div>
          </button>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setView(view === 'messages' ? 'settings' : 'messages')}
              className={`p-2 rounded-xl transition-all ${view === 'settings' ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)]' : 'hover:bg-[var(--t-border)] text-[var(--t-text-muted)]'}`}
            >
              <Settings size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[var(--t-border)] rounded-xl transition-colors text-[var(--t-text-muted)]">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {view === 'messages' ? (
            loading ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <Clock className="w-8 h-8 text-[var(--t-primary)] animate-spin" />
                <p className="text-xs font-bold text-[var(--t-text-muted)] uppercase">Syncing your status...</p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg) => (
                <motion.div 
                  layout
                  key={msg.id}
                  onClick={() => markAsRead(msg.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${
                    msg.read ? 'bg-transparent border-[var(--t-border)] opacity-60' : 'bg-[var(--t-primary-dim)]/5 border-[var(--t-primary-dim)]/30 shadow-lg'
                  }`}
                >
                  {!msg.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--t-primary)] animate-pulse" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      msg.type === 'summary' ? 'bg-blue-500/10 text-blue-500' :
                      msg.type === 'alert' ? 'bg-red-500/10 text-red-500' :
                      msg.type === 'reminder' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {msg.type === 'summary' ? <Calendar size={18} /> :
                       msg.type === 'alert' ? <AlertCircle size={18} /> :
                       msg.type === 'reminder' ? <Clock size={18} /> :
                       <Sparkles size={18} />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[var(--t-text)]">{msg.title}</p>
                      <p className="text-xs text-[var(--t-text-muted)] leading-relaxed">{msg.message}</p>
                      <p className="text-[10px] text-[var(--t-text-muted)] pt-1">{format(new Date(msg.created_at), 'h:mm a · MMM d')}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 bg-[var(--t-border)] rounded-full flex items-center justify-center mx-auto text-[var(--t-text-muted)]">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--t-text)]">You're all caught up!</p>
                  <p className="text-xs text-[var(--t-text-muted)]">No new messages from OS Bot.</p>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-[var(--t-primary-dim)]/10 rounded-2xl border border-[var(--t-primary-dim)]/20">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="text-[var(--t-primary)]" size={18} />
                  <p className="text-sm font-bold text-[var(--t-text)]">Email Summary Hub</p>
                </div>
                <p className="text-xs text-[var(--t-text-muted)] leading-relaxed">
                  WholeScale OS sends high-level summaries of your real estate activity directly to your inbox.
                </p>
              </div>

              <div className="space-y-2">
                <SettingToggle 
                  icon={<Calendar size={16} />}
                  title="Daily OS Summary"
                  description="24-hour activity report"
                  enabled={prefs?.daily_summary_enabled ?? false}
                  onToggle={() => updatePreference('daily_summary_enabled')}
                />
                <SettingToggle 
                  icon={<Bell size={16} />}
                  title="Weekly Performance"
                  description="Week-over-week growth"
                  enabled={prefs?.weekly_summary_enabled ?? false}
                  onToggle={() => updatePreference('weekly_summary_enabled')}
                />
                <SettingToggle 
                  icon={<AlertCircle size={16} />}
                  title="Transaction Alerts"
                  description="Real-time deal updates"
                  enabled={prefs?.transaction_alerts_enabled ?? false}
                  onToggle={() => updatePreference('transaction_alerts_enabled')}
                />
                <SettingToggle 
                  icon={<Clock size={16} />}
                  title="Task Reminders"
                  description="Automated due-date emails"
                  enabled={prefs?.task_reminders_enabled ?? false}
                  onToggle={() => updatePreference('task_reminders_enabled')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--t-border)] bg-[var(--t-surface-dim)] flex items-center justify-center">
          {view === 'messages' ? (
            <button 
              className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-colors"
              onClick={async () => {
                if (!supabase || !currentUser) return;
                setMessages(prev => prev.map(m => ({ ...m, read: true })));
                await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
              }}
            >
              Mark all as read
            </button>
          ) : (
            <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--t-text-muted)]">
              Managed by WholeScale AI
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SettingToggle({ icon, title, description, enabled, onToggle }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  enabled: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl hover:border-[var(--t-primary-dim)] transition-all">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--t-border)] text-[var(--t-text-muted)] rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--t-text)]">{title}</p>
          <p className="text-[10px] text-[var(--t-text-muted)]">{description}</p>
        </div>
      </div>
      <button onClick={onToggle} className="text-[var(--t-primary)] transition-transform active:scale-95">
        {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-[var(--t-text-muted)]" />}
      </button>
    </div>
  );
}
