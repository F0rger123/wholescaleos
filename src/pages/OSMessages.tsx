import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, AlertCircle, CheckCircle2, Clock, Mail, Users, Bot, 
  Smartphone, Plus, X, Send, Target, Zap, Settings
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

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
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<any>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMsg, setCustomMsg] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    template_content: '',
    recipient_type: 'self'
  });
  
  const { currentUser } = useStore();

  useEffect(() => {
    if (currentUser) {
      fetchPreferences();
    }
  }, [currentUser]);

  const fetchPreferences = async () => {
    if (!supabase || !currentUser) return;
    setLoading(true);
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
        const defaultPrefs = {
          user_id: currentUser.id,
          daily_summary_enabled: true,
          weekly_summary_enabled: true,
          monthly_performance_report_enabled: true,
          deal_closed_alerts_enabled: true,
          offer_made_alert_enabled: true,
          offer_accepted_alert_enabled: true,
          contract_signed_alert_enabled: true,
          calendar_digest_enabled: true,
          task_reminders_enabled: true,
          task_overdue_alert_enabled: true,
          new_lead_alerts_enabled: true,
          lead_inactivity_alert_enabled: true,
          lead_score_high_alert_enabled: true,
          email_open_notification_enabled: true,
          sms_received_alert_enabled: true,
          goal_milestone_alert_enabled: true,
          team_activity_summary_enabled: true
        };
        setPrefs(defaultPrefs);
        await supabase.from('user_os_messages_preferences').insert(defaultPrefs);
      }
    } catch (err) {
      console.error('Fetch preferences error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string) => {
    if (!supabase || !currentUser || !prefs) return;
    try {
      const newValue = !prefs[key];
      const newPrefs = { ...prefs, [key]: newValue };
      setPrefs(newPrefs);
      
      const { error } = await supabase
        .from('user_os_messages_preferences')
        .upsert(newPrefs);
        
      if (error) throw error;
      toast.success(`${key.replace(/_/g, ' ')} updated`, {
        style: { background: 'var(--t-surface)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }
      });
    } catch (err) {
      console.error('Update preferences error:', err);
      toast.error('Failed to update preference');
    }
  };

  const handleCreateCustom = async () => {
    if (!supabase || !currentUser) return;
    if (!customMsg.name || !customMsg.template_content) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_os_messages_custom')
        .insert({
          ...customMsg,
          user_id: currentUser.id
        });

      if (error) throw error;
      toast.success('Custom message template saved!');
      setShowCustomModal(false);
      setCustomMsg({ name: '', description: '', trigger_type: 'manual', template_content: '', recipient_type: 'self' });
    } catch (err) {
      console.error('Create custom error:', err);
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--t-primary-dim)] text-[var(--t-primary)] rounded-2xl shadow-xl shadow-[var(--t-primary-dim)]/20">
            <Settings size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--t-text)] tracking-tight">OS Messages</h1>
            <p className="text-sm text-[var(--t-text-muted)] font-bold uppercase tracking-[0.2em]">Configuration Engine</p>
          </div>
        </div>

        <button 
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-3 px-8 py-3 bg-[var(--t-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--t-primary)]/20 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          Create Custom Template
        </button>
      </div>

      {/* Preferences Grid */}
      {loading ? (
        <div className="py-24 astral-glass border border-[var(--t-border)] rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black text-[var(--t-text-muted)] uppercase tracking-widest">Initialising Automation Core...</p>
        </div>
      ) : (
        <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 pb-20 px-4">
          {/* Daily/Weekly Reports */}
          <section className="space-y-6">
            <CategoryHeader icon={<Mail size={20} />} title="Automated Reporting" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SettingToggle 
                icon={<Clock size={18} />}
                title="Daily Summary"
                description="Leads, tasks, and revenue digest (8:00 AM)"
                enabled={prefs?.daily_summary_enabled ?? false}
                onToggle={() => updatePreference('daily_summary_enabled')}
              />
              <SettingToggle 
                icon={<Calendar size={18} />}
                title="Weekly Summary"
                description="Trends and conversion rates (Monday 9:00 AM)"
                enabled={prefs?.weekly_summary_enabled ?? false}
                onToggle={() => updatePreference('weekly_summary_enabled')}
              />
              <SettingToggle 
                icon={<Target size={18} />}
                title="Monthly Report"
                description="Full performance report (1st of month)"
                enabled={prefs?.monthly_performance_report_enabled ?? false}
                onToggle={() => updatePreference('monthly_performance_report_enabled')}
              />
            </div>
          </section>

          {/* Deal Alerts */}
          <section className="space-y-6">
            <CategoryHeader icon={<Zap size={20} />} title="Deal Momentum" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SettingToggle 
                icon={<CheckCircle2 size={18} />}
                title="Deal Closed"
                description="Alert when a deal is won"
                enabled={prefs?.deal_closed_alerts_enabled ?? false}
                onToggle={() => updatePreference('deal_closed_alerts_enabled')}
              />
              <SettingToggle 
                icon={<Send size={18} />}
                title="Offer Made"
                description="Notification for new offers"
                enabled={prefs?.offer_made_alert_enabled ?? false}
                onToggle={() => updatePreference('offer_made_alert_enabled')}
              />
              <SettingToggle 
                icon={<Zap size={18} />}
                title="Offer Accepted"
                description="Alert on accepted offers"
                enabled={prefs?.offer_accepted_alert_enabled ?? false}
                onToggle={() => updatePreference('offer_accepted_alert_enabled')}
              />
              <SettingToggle 
                icon={<CheckCircle2 size={18} />}
                title="Contract Signed"
                description="Final commitment alert"
                enabled={prefs?.contract_signed_alert_enabled ?? false}
                onToggle={() => updatePreference('contract_signed_alert_enabled')}
              />
            </div>
          </section>

          {/* Calendar & Tasks */}
          <section className="space-y-6">
            <CategoryHeader icon={<Calendar size={20} />} title="Schedule & Focus" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SettingToggle 
                icon={<Calendar size={18} />}
                title="Calendar Digest"
                description="Morning schedule brief (7:00 AM)"
                enabled={prefs?.calendar_digest_enabled ?? false}
                onToggle={() => updatePreference('calendar_digest_enabled')}
              />
              <SettingToggle 
                icon={<Clock size={18} />}
                title="Task Reminder"
                description="30 minutes before task due time"
                enabled={prefs?.task_reminders_enabled ?? false}
                onToggle={() => updatePreference('task_reminders_enabled')}
              />
              <SettingToggle 
                icon={<AlertCircle size={18} />}
                title="Task Overdue"
                description="Immediate alert for missed deadlines"
                enabled={prefs?.task_overdue_alert_enabled ?? false}
                onToggle={() => updatePreference('task_overdue_alert_enabled')}
              />
            </div>
          </section>

          {/* Lead Management */}
          <section className="space-y-6">
            <CategoryHeader icon={<Users size={20} />} title="Lead Intelligence" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SettingToggle 
                icon={<Plus size={18} />}
                title="New Lead Notif"
                description="Real-time alert for new captures"
                enabled={prefs?.new_lead_alerts_enabled ?? false}
                onToggle={() => updatePreference('new_lead_alerts_enabled')}
              />
              <SettingToggle 
                icon={<Clock size={18} />}
                title="Inactivity Alert"
                description="7 days with no outbound contact"
                enabled={prefs?.lead_inactivity_alert_enabled ?? false}
                onToggle={() => updatePreference('lead_inactivity_alert_enabled')}
              />
              <SettingToggle 
                icon={<Zap size={18} />}
                title="Lead Score High"
                description="Alert when lead score > 80"
                enabled={prefs?.lead_score_high_alert_enabled ?? false}
                onToggle={() => updatePreference('lead_score_high_alert_enabled')}
              />
            </div>
          </section>

          {/* Team & Engagement */}
          <section className="space-y-6">
            <CategoryHeader icon={<Bot size={20} />} title="Team & Engagement" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SettingToggle 
                icon={<Smartphone size={18} />}
                title="Goal Milestones"
                description="Team progress achievements"
                enabled={prefs?.goal_milestone_alert_enabled ?? false}
                onToggle={() => updatePreference('goal_milestone_alert_enabled')}
              />
              <SettingToggle 
                icon={<Users size={18} />}
                title="Activity Digest"
                description="Collaborative work summary"
                enabled={prefs?.team_activity_summary_enabled ?? false}
                onToggle={() => updatePreference('team_activity_summary_enabled')}
              />
              <SettingToggle 
                icon={<Mail size={18} />}
                title="Email Opens"
                description="Alert when lead opens email"
                enabled={prefs?.email_open_notification_enabled ?? false}
                onToggle={() => updatePreference('email_open_notification_enabled')}
              />
              <SettingToggle 
                icon={<Smartphone size={18} />}
                title="SMS Received"
                description="Real-time alert for incoming SMS"
                enabled={prefs?.sms_received_alert_enabled ?? false}
                onToggle={() => updatePreference('sms_received_alert_enabled')}
              />
            </div>
          </section>
        </div>
      )}

      {/* Custom Message Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--t-primary-dim)] text-[var(--t-primary)] rounded-xl">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--t-text)]">Create Custom Alert</h3>
                      <p className="text-xs text-[var(--t-text-muted)] font-bold uppercase tracking-widest">User-Defined Notification Engine</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCustomModal(false)} className="p-2 hover:bg-[var(--t-surface-subtle)] rounded-full transition-colors">
                    <X size={20} className="text-[var(--t-text-muted)]" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-1">Template Name</label>
                    <input 
                      value={customMsg.name}
                      onChange={e => setCustomMsg({ ...customMsg, name: e.target.value })}
                      placeholder="e.g. High Priority Follow-up"
                      className="w-full bg-[var(--t-surface-subtle)] border border-[var(--t-border)] rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-[var(--t-primary)] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-1">Trigger Event</label>
                    <select 
                      value={customMsg.trigger_type}
                      onChange={e => setCustomMsg({ ...customMsg, trigger_type: e.target.value })}
                      className="w-full bg-[var(--t-surface-subtle)] border border-[var(--t-border)] rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
                    >
                      <option value="manual">Manual Trigger</option>
                      <option value="lead_score">Lead Score Threshold</option>
                      <option value="status_change">Status Change</option>
                      <option value="task_overdue">Task Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-1">Message Content (HTML Allowed)</label>
                  <textarea 
                    value={customMsg.template_content}
                    onChange={e => setCustomMsg({ ...customMsg, template_content: e.target.value })}
                    placeholder="Hello {{lead_name}}, this is a custom follow-up regarding {{address}}..."
                    className="w-full h-40 bg-[var(--t-surface-subtle)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--t-primary)] transition-all resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setShowCustomModal(false)}
                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateCustom}
                    className="px-8 py-3 bg-[var(--t-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--t-primary)]/20"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--t-border)] pb-2 mb-4">
      <div className="text-[var(--t-primary)]">{icon}</div>
      <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[var(--t-text-muted)]">{title}</h2>
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
      className={`flex items-center justify-between p-5 rounded-[1.8rem] border transition-all cursor-pointer select-none group ${
        enabled ? 'border-[var(--t-primary-dim)] bg-[var(--t-primary-dim)]/5' : 'border-[var(--t-border)] hover:border-[var(--t-primary-dim)]/40 hover:bg-[var(--t-surface-subtle)]'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl transition-all ${enabled ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary)]/20' : 'bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)]'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-sm font-black transition-colors ${enabled ? 'text-[var(--t-text)]' : 'text-[var(--t-text-muted)] group-hover:text-[var(--t-text-secondary)]'}`}>{title}</p>
          <p className="text-[10px] text-[var(--t-text-muted)] font-medium leading-tight">{description}</p>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${enabled ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-border)]'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-7 shadow-lg shadow-black/20' : 'left-1'}`} />
      </div>
    </div>
  );
}
