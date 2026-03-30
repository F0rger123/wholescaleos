import { useState } from 'react';
import { 
  Send, Mail, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminEmailCampaigns() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetSegment, setTargetSegment] = useState<'all' | 'premium' | 'free' | 'admins'>('all');
  const [sending, setSending] = useState(false);
  const [stats] = useState({ sent: 1240, opens: 856, clicks: 312 });
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!subject || !body || !supabase) return;
    setSending(true);
    try {
      // Logic for sending mass email would go here. 
      // For now, we mock the success.
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessage('Campaign sent successfully to ' + targetSegment + ' users!');
      setSubject('');
      setBody('');
    } catch (err) {
      console.error('Failed to send campaign:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold italic uppercase tracking-tighter flex items-center gap-2">
            <Mail className="text-purple-500" size={20} /> Create New Campaign
          </h3>
          <div className="flex gap-2">
            {(['all', 'premium', 'free', 'admins'] as const).map(s => (
              <button
                key={s}
                onClick={() => setTargetSegment(s)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                  targetSegment === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-[var(--t-text-muted)] hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">Subject Line</label>
            <input 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Important: New WholeScale OS Features Available..."
              className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">Campaign Content (HTML Allowed)</label>
            <textarea 
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Hi {{name}}, we've just launched new AI automation tools..."
              className="w-full h-64 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2 text-xs text-[var(--t-text-muted)]">
            <AlertTriangle size={14} className="text-yellow-500" /> Use <code>{"{{name}}"}</code> for personalization.
          </div>
          <button 
            onClick={handleSend}
            disabled={sending || !subject || !body}
            className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Launch Campaign
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
          <h3 className="text-xl font-bold italic uppercase tracking-tighter text-[var(--t-text)]">Recent Campaigns</h3>
          <div className="space-y-4">
             {[
               { name: 'March Product Update', date: 'Mar 15', status: 'Sent', rate: '68%' },
               { name: 'Annual Billing Special', date: 'Mar 08', status: 'Sent', rate: '42%' },
               { name: 'Onboarding Flow v2', date: 'Feb 28', status: 'Completed', rate: '75%' }
             ].map((c, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer">
                   <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-bold text-[var(--t-text)]">{c.name}</div>
                      <div className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">{c.status}</div>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-[var(--t-text-muted)] uppercase">
                      <span>{c.date}, 2024</span>
                      <span>{c.rate} Open Rate</span>
                   </div>
                </div>
             ))}
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-900/40 to-blue-600/20 border border-blue-500/30 space-y-4">
          <div className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Global Stats</div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <div className="text-2xl font-black text-white">{stats.sent}</div>
                <div className="text-[8px] font-bold uppercase text-white/50">Total Emails</div>
             </div>
             <div className="space-y-1">
                <div className="text-2xl font-black text-white">{stats.opens}</div>
                <div className="text-[8px] font-bold uppercase text-white/50">Opens</div>
             </div>
          </div>
          <div className="pt-2">
             <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '69%' }} />
             </div>
             <div className="mt-2 text-[10px] font-black text-blue-400 uppercase">69% Average Open Rate</div>
          </div>
        </div>
      </div>

      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-green-600 text-white font-black text-sm flex items-center gap-3 shadow-2xl animate-bounce z-[100]">
          <CheckCircle size={18} /> {message}
        </div>
      )}
    </div>
  );
}
