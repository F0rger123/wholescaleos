import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import {
  Smartphone, Save, RefreshCw,
  Loader2, AlertCircle, Send,
  Check
} from 'lucide-react';
import { SettingsSkeleton } from '../components/Skeleton';
import { sendSMS } from '../lib/sms-service';
import { GoogleCalendarService } from '../lib/google-calendar';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';

export default function SMSSettings() {
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('Auto-Detect');
  const [autoReply, setAutoReply] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState('Thanks for your message! I will get back to you soon.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasGmailPerm, setHasGmailPerm] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const { currentUser } = useStore();

  useEffect(() => {
    async function loadPreferences() {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      // Check Gmail Permission
      const googleService = GoogleCalendarService.getInstance();
      const hasPerm = await googleService.hasRequiredPermissions(currentUser.id);
      setHasGmailPerm(hasPerm);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('agent_preferences')
            .select('phone_number, carrier, sms_auto_reply_enabled, sms_auto_reply_message')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (data) {
            setPhone(data.phone_number || '');
            setCarrier(data.carrier || 'Auto-Detect');
            setAutoReply(!!data.sms_auto_reply_enabled);
            if (data.sms_auto_reply_message) setAutoReplyMessage(data.sms_auto_reply_message);
          }
        } catch (err) {
          console.error('Failed to load SMS preferences:', err);
        }
      } else {
        const localPhone = localStorage.getItem('user_sms_phone');
        const localAutoReply = localStorage.getItem('user_sms_auto_reply');
        const localAutoReplyMsg = localStorage.getItem('user_sms_auto_reply_message');
        if (localPhone) setPhone(localPhone);
        if (localAutoReply) setAutoReply(localAutoReply === 'true');
        if (localAutoReplyMsg) setAutoReplyMessage(localAutoReplyMsg);
      }
      setLoading(false);
    }

    loadPreferences();
  }, [currentUser]);

  const handleTestSMS = async () => {
    if (!phone) return;
    setTesting(true);
    setTestResult(null);

    // Read carrier from DB so we only target the correct gateway
    let carrier = '';
    if (isSupabaseConfigured && supabase && currentUser?.id) {
      try {
        const { data } = await supabase
          .from('agent_preferences')
          .select('carrier')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        carrier = data?.carrier || '';
      } catch (_) {}
    } else {
      carrier = localStorage.getItem('user_sms_carrier') || '';
    }

    const testMessage = `WholeScale OS: Your SMS connection is working! Phone: ${phone}${carrier ? ` (${carrier})` : ''}`;
    
    try {
      const res = await sendSMS(phone, testMessage, carrier || 'Unknown');

      if (res.success) {
        setTestResult({ success: true, message: res.message });
      } else {
        setTestResult({ success: false, message: `Failed: ${res.message}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to send test SMS. Check your Google connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (overrideAutoReply?: boolean) => {
    if (!currentUser?.id) return;
    setSaving(true);
    setSaveResult(null);

    const finalAutoReply = overrideAutoReply !== undefined ? overrideAutoReply : autoReply;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('agent_preferences')
          .upsert(
            {
              user_id: currentUser.id,
              phone_number: phone,
              carrier: carrier,
              sms_auto_reply_enabled: finalAutoReply,
              sms_auto_reply_message: autoReplyMessage,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;
        setSaveResult({ success: true, message: 'SMS settings saved successfully.' });
      } catch (err: any) {
        setSaveResult({ success: false, message: `Failed to save: ${err.message}` });
      }
    } else {
      localStorage.setItem('user_sms_phone', phone);
      localStorage.setItem('user_sms_carrier', 'auto');
      localStorage.setItem('user_sms_auto_reply', finalAutoReply.toString());
      localStorage.setItem('user_sms_auto_reply_message', autoReplyMessage);
      setSaveResult({ success: true, message: 'SMS settings saved locally to browser storage.' });
    }
    setSaving(false);
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">SMS & Notifications</h1>
        <p className="text-[var(--t-text-muted)]">Configure how the AI Assistant sends text messages and alerts.</p>
      </div>

      <div className="bg-[var(--t-surface-hover)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}
          >
            <Smartphone className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text-primary)' }}>SMS Gateway Setup</h2>
            <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Uses email-to-SMS to send messages free of charge.</p>
          </div>
        </div>

        {hasGmailPerm === false && (
          <div className="p-4 rounded-xl space-y-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--t-warning) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--t-warning) 20%, transparent)',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            <div className="flex items-start gap-3" style={{ color: 'var(--t-warning)' }}>
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Gmail Connection Missing</p>
                <p className="text-xs opacity-80 mb-3">You need to connect Google and grant permission to send emails to use the SMS gateway.</p>
                <GoogleCalendarConnect />
              </div>
            </div>
          </div>
        )}
        
        {hasGmailPerm === true && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--t-success-dim)] border border-[var(--t-success-border)]">
             <div className="flex items-center gap-2 text-[var(--t-success)]">
               <Check className="w-5 h-5" />
               <span className="text-sm font-medium">Google Connection Active</span>
             </div>
             <GoogleCalendarConnect />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t-text-muted)' }}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-xl px-4 py-2.5 outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: 'var(--t-background)', 
                border: '1px solid var(--t-border)', 
                color: 'var(--t-text)',
                '--tw-ring-color': 'var(--t-primary-dim)' 
              } as any}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t-text-muted)' }}>Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all cursor-pointer"
              style={{ 
                backgroundColor: 'var(--t-background)', 
                border: '1px solid var(--t-border)', 
                color: 'var(--t-text)',
                '--tw-ring-color': 'var(--t-primary-dim)' 
              } as any}
            >
              <option value="Auto-Detect">Auto-Detect (Blast)</option>
              <option value="T-Mobile">T-Mobile / Boost / Metro</option>
              <option value="Verizon">Verizon / Visible</option>
              <option value="Google Fi">Google Fi</option>
            </select>
          </div>
          <div className="col-span-2">
            <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>Note: Choosing a specific carrier provides faster, more reliable delivery.</p>
          </div>
        </div>

        {testResult && (
          <div className="p-4 rounded-xl flex items-start gap-3 border" style={{
            backgroundColor: testResult.success ? 'var(--t-success-dim)' : 'var(--t-error-dim)',
            borderColor: testResult.success ? 'var(--t-success-border)' : 'var(--t-error-border)',
            color: testResult.success ? 'var(--t-success)' : 'var(--t-error)'
          }}>
            {testResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        {saveResult && (
          <div className="p-4 rounded-xl flex items-start gap-3 border" style={{
            backgroundColor: saveResult.success ? 'var(--t-success-dim)' : 'var(--t-error-dim)',
            borderColor: saveResult.success ? 'var(--t-success-border)' : 'var(--t-error-border)',
            color: saveResult.success ? 'var(--t-success)' : 'var(--t-error)'
          }}>
            {saveResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{saveResult.message}</span>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t" style={{ borderColor: 'var(--t-border)' }}>
          <button
            onClick={handleTestSMS}
            disabled={testing || !phone}
            style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface)'}
            className="flex-1 px-4 py-2.5 rounded-xl border transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test SMS
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving || !phone}
            className="flex-1 px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group shadow-xl relative overflow-hidden disabled:opacity-50 font-black uppercase tracking-[0.15em]"
            style={{ 
              background: 'var(--t-button-bg)',
              color: 'var(--t-button-text)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant-glow" />
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Auto-Reply Settings */}
      <div className="bg-[var(--t-surface-hover)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ background: 'color-mix(in srgb, var(--t-info) 15%, transparent)', borderColor: 'var(--t-info-dim)' }}
            >
              <RefreshCw className="w-5 h-5" style={{ color: 'var(--t-info)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text-primary)' }}>Master AI Auto-Reply</h2>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Completely enable or disable the AI from automatically responding to texts from leads.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const newValue = !autoReply;
              setAutoReply(newValue);
              // Auto-save toggle changes immediately for better UX
              handleSave(newValue);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative`}
            style={{ backgroundColor: autoReply ? 'var(--t-primary)' : 'var(--t-surface-subtle)' }}
          >
            <div 
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoReply ? 'left-7' : 'left-1'}`}
            />
          </button>
        </div>

        {autoReply && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t-text-muted)' }}>Auto-Reply Message</label>
              <textarea
                value={autoReplyMessage}
                onChange={(e) => setAutoReplyMessage(e.target.value)}
                rows={3}
                placeholder="Type your auto-reply message..."
                className="w-full rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all resize-none"
                style={{ 
                  backgroundColor: 'var(--t-background)', 
                  border: '1px solid var(--t-border)', 
                  color: 'var(--t-text)',
                  '--tw-ring-color': 'var(--t-primary-dim)' 
                } as any}
              />
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--t-text-muted)' }}>
                This message will be sent to anyone who contacts you while auto-reply is active.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 border border-dashed" style={{ backgroundColor: 'rgba(var(--t-background-rgb), 0.5)', borderColor: 'var(--t-border)' }}>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Check className="w-4 h-4" style={{ color: 'var(--t-success)' }} />
          Free & Reliable Mode Active
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
          The system is now using a hardened sequential gateway with anti-spam randomization. 
        </p>
      </div>
    </div>
  );
}
