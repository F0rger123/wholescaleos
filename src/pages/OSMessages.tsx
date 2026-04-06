import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, AlertCircle, CheckCircle2, Sparkles, MessageSquare, 
  Clock, Settings, Bell, Mail, Users, ArrowRightLeft, Bot, Smartphone 
} from 'lucide-react';
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



export function OSMessages() {
  const [messages, setMessages] = useState<OSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'messages' | 'settings'>('messages');
  const [prefs, setPrefs] = useState<any>(null);
  const { currentUser } = useStore();

  useEffect(() => {
    if (currentUser) {
      if (view === 'messages') {
        fetchMessages();
      } else {
        fetchPreferences();
      }
    }
  }, [currentUser, view]);

  const fetchPreferences = async () => {
    if (!supabase || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('user_os_messages_preferences')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setPrefs(data);
      } else {
        // Initialize default prefs if none exist
        const defaultPrefs = {
          user_id: currentUser.id,
          daily_summary_enabled: true,
          weekly_summary_enabled: true,
          transaction_alerts_enabled: true,
          task_reminders_enabled: true,
          lead_captured_alerts_enabled: true,
          status_change_alerts_enabled: true,
          ai_insight_alerts_enabled: true,
          task_escalation_alerts_enabled: false,
          contract_signed_alerts_enabled: true,
          document_uploaded_alerts_enabled: false,
          payment_received_alerts_enabled: true,
          low_balance_alerts_enabled: true,
          sms_delivered_alerts_enabled: false,
          email_opened_alerts_enabled: true,
          link_clicked_alerts_enabled: true,
          bounce_alerts_enabled: true,
          api_error_alerts_enabled: false,
          system_maintenance_alerts_enabled: true,
          new_feature_alerts_enabled: true
        };
        setPrefs(defaultPrefs);
        await supabase.from('user_os_messages_preferences').insert(defaultPrefs);
      }
    } catch (err) {
      console.error('Fetch preferences error:', err);
    }
  };

  const updatePreference = async (key: string) => {
    if (!supabase || !currentUser || !prefs) return;
    try {
      const newPrefs = { ...prefs, [key]: !prefs[key] };
      setPrefs(newPrefs);
      await supabase
        .from('user_os_messages_preferences')
        .upsert(newPrefs);
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
        .limit(50);
        
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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--t-primary-dim)] text-[var(--t-primary)] rounded-2xl shadow-xl shadow-[var(--t-primary-dim)]/20">
            <MessageSquare size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--t-text)] tracking-tight">OS Messages</h1>
            <p className="text-sm text-[var(--t-text-muted)] font-bold uppercase tracking-[0.2em]">Intelligent Communication Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-[var(--t-surface-subtle)] rounded-2xl border border-[var(--t-border)]">
          <button 
            onClick={() => setView('messages')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'messages' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
          >
            Insights
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'settings' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
          >
            Preferences
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-6">
          {view === 'messages' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="py-24 astral-glass border border-[var(--t-border)] rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-black text-[var(--t-text-muted)] uppercase tracking-widest">Aggregating Global Activity...</p>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <motion.div 
                    layout
                    key={msg.id}
                    onClick={() => markAsRead(msg.id)}
                    className={`p-6 rounded-[2rem] astral-glass border transition-all cursor-pointer group relative ${
                      msg.read ? 'border-[var(--t-border)] opacity-60' : 'border-[var(--t-primary-dim)]/40 bg-[var(--t-primary-dim)]/5 shadow-2xl'
                    }`}
                  >
                    {!msg.read && (
                      <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-[var(--t-primary)] shadow-[0_0_15px_var(--t-primary)]" />
                    )}
                    
                    <div className="flex gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        msg.type === 'summary' ? 'bg-blue-500/20 text-blue-400' :
                        msg.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                        msg.type === 'reminder' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-[var(--t-primary-dim)] text-[var(--t-primary)]'
                      }`}>
                        {msg.type === 'summary' ? <Calendar size={24} /> :
                         msg.type === 'alert' ? <AlertCircle size={24} /> :
                         msg.type === 'reminder' ? <Clock size={24} /> :
                         <Sparkles size={24} />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-black text-[var(--t-text)]">{msg.title}</p>
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest bg-[var(--t-surface-subtle)] px-2 py-1 rounded-md">{format(new Date(msg.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                        <p className="text-sm text-[var(--t-text-secondary)] leading-relaxed">{msg.message}</p>
                        
                        {msg.link && (
                          <div className="pt-2">
                            <span className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1 group">
                              View Details <Sparkles size={10} className="group-hover:rotate-12 transition-transform" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-24 text-center astral-glass border border-[var(--t-border)] rounded-[2.5rem] space-y-6">
                  <div className="w-20 h-20 bg-[var(--t-surface-subtle)] rounded-full flex items-center justify-center mx-auto text-[var(--t-text-muted)] shadow-inner">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--t-text)]">Optimal Silence</h3>
                    <p className="text-sm text-[var(--t-text-muted)] font-medium">Your WholeScale network is operating at peak efficiency.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="text-[var(--t-primary)]" size={20} />
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--t-text-muted)]">Core Summaries</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingToggle 
                    icon={<Calendar size={18} />}
                    title="Daily OS Summary"
                    description="24-hour network activity digest"
                    enabled={prefs?.daily_summary_enabled ?? false}
                    onToggle={() => updatePreference('daily_summary_enabled')}
                  />
                  <SettingToggle 
                    icon={<Bell size={18} />}
                    title="Weekly Performance"
                    description="Comparative growth analytics"
                    enabled={prefs?.weekly_summary_enabled ?? false}
                    onToggle={() => updatePreference('weekly_summary_enabled')}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-[var(--t-primary)]" size={20} />
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--t-text-muted)]">Granular Alerts</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingToggle 
                    icon={<Users size={18} />}
                    title="Lead Captured"
                    description="Immediate alert for new leads"
                    enabled={prefs?.lead_captured_alerts_enabled ?? false}
                    onToggle={() => updatePreference('lead_captured_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<ArrowRightLeft size={18} />}
                    title="Status Changes"
                    description="Alert when CRM status updates"
                    enabled={prefs?.status_change_alerts_enabled ?? false}
                    onToggle={() => updatePreference('status_change_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<Bot size={18} />}
                    title="AI Insights"
                    description="Machine-learning recommendations"
                    enabled={prefs?.ai_insight_alerts_enabled ?? false}
                    onToggle={() => updatePreference('ai_insight_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<AlertCircle size={18} />}
                    title="Task Escalation"
                    description="Alert for overdue high-priority tasks"
                    enabled={prefs?.task_escalation_alerts_enabled ?? false}
                    onToggle={() => updatePreference('task_escalation_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<CheckCircle2 size={18} />}
                    title="Contract Signed"
                    description="Closing momentum notifications"
                    enabled={prefs?.contract_signed_alerts_enabled ?? false}
                    onToggle={() => updatePreference('contract_signed_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<Smartphone size={18} />}
                    title="SMS Deliverability"
                    description="Reports on sent/failed messages"
                    enabled={prefs?.sms_delivered_alerts_enabled ?? false}
                    onToggle={() => updatePreference('sms_delivered_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<Mail size={18} />}
                    title="Email Tracking"
                    description="Opens and link click notifications"
                    enabled={prefs?.email_opened_alerts_enabled ?? false}
                    onToggle={() => updatePreference('email_opened_alerts_enabled')}
                  />
                  <SettingToggle 
                    icon={<Settings size={18} />}
                    title="System Updates"
                    description="New features and maintenance"
                    enabled={prefs?.new_feature_alerts_enabled ?? false}
                    onToggle={() => updatePreference('new_feature_alerts_enabled')}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
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
    <div 
      onClick={onToggle}
      className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all cursor-pointer select-none ${
        enabled ? 'border-[var(--t-primary-dim)] bg-[var(--t-primary-dim)]/5' : 'border-[var(--t-border)] hover:border-[var(--t-text-muted)]/30'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${enabled ? 'bg-[var(--t-primary)] text-white' : 'bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)]'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-sm font-black ${enabled ? 'text-[var(--t-text)]' : 'text-[var(--t-text-muted)]'}`}>{title}</p>
          <p className="text-[10px] text-[var(--t-text-muted)] font-medium">{description}</p>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-border)]'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-7 shadow-lg shadow-black/20' : 'left-1'}`} />
      </div>
    </div>
  );
}
