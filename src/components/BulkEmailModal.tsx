import { useState } from 'react';
import { X, Send, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Lead, useStore } from '../store/useStore';
import { sendEmail } from '../lib/email';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: Lead[];
}

export function BulkEmailModal({ isOpen, onClose, selectedLeads }: BulkEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!hasConsent || !subject || !body) return;
    setSending(true);
    let success = 0;
    let failed = 0;

    for (const lead of selectedLeads) {
      if (!lead.email) {
        failed++;
        continue;
      }

      try {
        // Simple 1x1 tracking pixel mock
        const trackingPixel = `<img src="https://wholescaleos.com/api/track/open?leadId=${lead.id}&campaign=bulk-${Date.now()}" width="1" height="1" style="display:none;" />`;
        const fullBody = body + '\n\n' + trackingPixel;

        await sendEmail({
          to: lead.email,
          subject: subject,
          html: fullBody
        });
        success++;
        
        // Add timeline entry
        useStore.getState().addTimelineEntry(lead.id, {
          type: 'email',
          content: `Bulk Email Sent: ${subject}`,
          timestamp: new Date().toISOString(),
          user: 'System (Bulk)'
        });
      } catch (err) {
        console.error(`Failed to send email to ${lead.email}:`, err);
        failed++;
      }
    }

    setResults({ success, failed });
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Send size={20} className="text-blue-400" />
              Bulk Marketing Email
            </h2>
            <p className="text-xs text-gray-400 mt-1">Sending to {selectedLeads.length} selected recipients</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {results ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Campaign Complete</h3>
                <p className="text-sm text-gray-400">
                  {results.success} sent successfully, {results.failed} failed.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500">Subject Line</label>
                  <input 
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Exclusive Property Opportunity..."
                    className="w-full px-4 py-3 bg-[#1e293b] border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500">Email Content (HTML Supported)</label>
                  <textarea 
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Hi {name}, I have a new property that fits your criteria..."
                    className="w-full h-48 px-4 py-3 bg-[#1e293b] border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white transition-all resize-none"
                  />
                  <p className="text-[10px] text-gray-500">Personalization tags coming soon: {'{name}'}, {'{address}'}</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-yellow-500">Marketing Compliance Warning</p>
                    <p className="text-[10px] text-yellow-500/70 mt-0.5">
                      Ensure you have explicit marketing consent (CASL/CAN-SPAM) before sending. Bulk emails to non-consented leads may result in account suspension.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={hasConsent}
                    onChange={e => setHasConsent(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-black/20 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">
                    I confirm I have marketing consent to email these leads.
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleSend}
                  disabled={sending || !hasConsent || !subject || !body}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Send to {selectedLeads.length} Leads
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
