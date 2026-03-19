import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Smartphone, Send, Loader2, Check, AlertCircle, Save, ExternalLink, RefreshCw } from 'lucide-react';
import { sendEmail } from '../lib/email';
import { GoogleCalendarService } from '../lib/google-calendar';

export const SMS_GATEWAYS: Record<string, string> = {
  'AT&T': 'txt.att.net',
  'Verizon': 'vtext.com',
  'T-Mobile': 'tmomail.net',
  'Sprint': 'messaging.sprintpcs.com',
  'Boost Mobile': 'myboostmobile.com',
  'Cricket Wireless': 'sms.cricketwireless.net',
  'Google Fi': 'msg.fi.google.com',
  'Republic Wireless': 'text.republicwireless.com',
  'U.S. Cellular': 'email.uscc.net',
  'Virgin Mobile': 'vmobl.com'
};

export function SMSSettings() {
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('');
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
      const hasPerm = await googleService.hasGmailPermission(currentUser.id);
      setHasGmailPerm(hasPerm);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('agent_preferences')
            .select('phone_number, carrier, sms_gateway')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (data) {
            setPhone(data.phone_number || '');
            setCarrier(data.carrier || '');
          }
        } catch (err) {
          console.error('Failed to load SMS preferences:', err);
        }
      } else {
        const localPhone = localStorage.getItem('user_sms_phone');
        const localCarrier = localStorage.getItem('user_sms_carrier');
        if (localPhone) setPhone(localPhone);
        if (localCarrier) setCarrier(localCarrier);
      }
      setLoading(false);
    }

    loadPreferences();
  }, [currentUser]);

  const handleReconnectGoogle = () => {
    const googleService = GoogleCalendarService.getInstance();
    window.location.href = googleService.getAuthUrl();
  };

  const handleTestSMS = async () => {
    if (!phone || !carrier) return;
    setTesting(true);
    setTestResult(null);

    const gateway = SMS_GATEWAYS[carrier];
    if (!gateway) {
      setTestResult({ success: false, message: 'Invalid carrier selection.' });
      setTesting(false);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const toAddress = `${cleanPhone}@${gateway}`;

    try {
      const res = await sendEmail({
        to: toAddress,
        subject: 'WholeScale OS: Test SMS',
        html: `<p>Your SMS connection for WholeScale OS is working! Phone: ${phone}, Carrier: ${carrier}</p>`,
        from: 'WholeScale OS <alerts@wholescale.work>'
      });

      if (res.success) {
        setTestResult({ success: true, message: `Test message sent to ${toAddress}. Check your phone!` });
      } else {
        setTestResult({ success: false, message: `Failed to send: ${res.error}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to send test SMS. Check your connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    setSaveResult(null);

    const gateway = SMS_GATEWAYS[carrier] || '';

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('agent_preferences')
          .upsert({
            user_id: currentUser.id,
            phone_number: phone,
            carrier: carrier,
            sms_gateway: gateway,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        setSaveResult({ success: true, message: 'SMS settings saved successfully.' });
      } catch (err: any) {
        setSaveResult({ success: false, message: `Failed to save: ${err.message}` });
      }
    } else {
      localStorage.setItem('user_sms_phone', phone);
      localStorage.setItem('user_sms_carrier', carrier);
      setSaveResult({ success: true, message: 'SMS settings saved locally to browser storage.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">SMS & Notifications</h1>
        <p className="text-slate-400">Configure how the AI Assistant sends text messages and alerts.</p>
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
            <Smartphone className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">SMS Gateway Setup</h2>
            <p className="text-xs text-slate-500">Uses email-to-SMS to send messages free of charge.</p>
          </div>
        </div>

        {hasGmailPerm === false && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-start gap-3 text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Gmail Send Permission Required</p>
                <p className="text-xs opacity-80">You need to grant permission to send emails to use the SMS gateway.</p>
              </div>
            </div>
            <button
              onClick={handleReconnectGoogle}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconnect Google Account
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Mobile Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-brand-500/50 transition-all appearance-none"
            >
              <option value="">Select Carrier</option>
              {Object.keys(SMS_GATEWAYS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
            {testResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        {saveResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${saveResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
            {saveResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{saveResult.message}</span>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={handleTestSMS}
            disabled={testing || !phone || !carrier}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test SMS
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !phone || !carrier}
            className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 border-dashed">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-brand-400" />
          How it works
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          Most mobile carriers provide a free email address that forwards to your phone as an SMS. 
          For example, 555-123-4567 on Verizon becomes <code>5551234567@vtext.com</code>.
        </p>
        <a 
          href="https://ai.google.dev/gemini-api/docs/rate-limits" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
        >
          View supported gateways <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
