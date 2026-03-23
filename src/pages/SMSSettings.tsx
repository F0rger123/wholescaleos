import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Smartphone, Send, Loader2, Check, AlertCircle, Save, ExternalLink, RefreshCw } from 'lucide-react';
import { sendEmail } from '../lib/email';
import { GoogleCalendarService } from '../lib/google-calendar';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';

export const UNIVERSAL_GATEWAYS = [
  'tmomail.net',   // T-Mobile / Boost
  'vtext.com',     // Verizon
  'txt.att.net',   // AT&T 1
  'mms.att.net',   // AT&T 2
  'pm.sprint.com'  // Sprint
];

export function SMSSettings() {
  const [phone, setPhone] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState("I'm sorry, I'm currently with a client or away from my desk. I'll get back to you as soon as possible!");
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
            .select('phone_number, carrier, sms_gateway, sms_auto_reply, sms_auto_reply_message')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (data) {
            setPhone(data.phone_number || '');
            setAutoReply(!!data.sms_auto_reply);
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

    const cleanPhone = phone.replace(/\D/g, '');

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

    // Build gateway list for this carrier
    const CARRIER_GW: Record<string, string[]> = {
      'AT&T':              ['txt.att.net', 'mms.att.net'],
      'Verizon':           ['vtext.com', 'vzwpix.com'],
      'T-Mobile':          ['tmomail.net'],
      'Sprint':            ['messaging.sprintpcs.com', 'pm.sprint.com'],
      'Boost Mobile':      ['tmomail.net'],
      'Cricket Wireless':  ['sms.cricketwireless.net'],
      'Metro by T-Mobile': ['tmomail.net'],
      'Google Fi':         ['msg.fi.google.com'],
    };
    const gateways = CARRIER_GW[carrier] || ['tmomail.net', 'vtext.com', 'txt.att.net'];
    const toAddresses = gateways.map(gw => `${cleanPhone}@${gw}`).join(', ');

    try {
      const res = await sendEmail({
        to: toAddresses,
        subject: 'WholeScale OS: Test SMS',
        html: `<p>Your SMS connection for WholeScale OS is working! Phone: ${phone}${carrier ? ` (${carrier})` : ''}</p>`,
        from: 'WholeScale OS <alerts@wholescale.work>'
      });

      if (res.success) {
        setTestResult({ success: true, message: `Test message sent to ${phone} via ${carrier || 'universal gateway'}. Check your phone!` });
      } else {
        setTestResult({ success: false, message: `Failed to send: ${res.error}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to send test SMS. Check your Google connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    setSaveResult(null);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('agent_preferences')
          .upsert(
            {
              user_id: currentUser.id,
              phone_number: phone,
              carrier: 'Auto-Detect',
              sms_gateway: 'auto',
              sms_auto_reply: autoReply,
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
      localStorage.setItem('user_sms_auto_reply', autoReply.toString());
      localStorage.setItem('user_sms_auto_reply_message', autoReplyMessage);
      setSaveResult({ success: true, message: 'SMS settings saved locally to browser storage.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--t-primary)' }} />
      </div>
    );
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
          <div className="col-span-1 md:col-span-2">
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
            <p className="text-xs mt-2" style={{ color: 'var(--t-text-muted)' }}>Note: The system automatically detects your carrier routing in the background.</p>
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

        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--t-border)' }}>
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
            onClick={handleSave}
            disabled={saving || !phone}
            className="flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--t-primary)' }}
          >
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
              <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text-primary)' }}>SMS Auto-Reply</h2>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Automatically respond to missed calls or texts.</p>
            </div>
          </div>
          <button
            onClick={() => setAutoReply(!autoReply)}
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
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--t-primary)' }} />
          How it works
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--t-text-muted)' }}>
          Most mobile carriers provide a free email address that forwards to your phone as an SMS. 
          For example, 555-123-4567 on Verizon becomes <code>5551234567@vtext.com</code>.
        </p>
        <a 
          href="https://ai.google.dev/gemini-api/docs/rate-limits" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs hover:opacity-80 inline-flex items-center gap-1"
          style={{ color: 'var(--t-primary)' }}
        >
          View supported gateways <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
