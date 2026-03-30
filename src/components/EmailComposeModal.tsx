import { useState } from 'react';
import { X, Send, Paperclip, Plus, Mail } from 'lucide-react';
import { Lead, useStore } from '../store/useStore';
import { sendEmail } from '../lib/email';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead;
  initialSubject?: string;
  initialBody?: string;
  attachment?: {
    filename: string;
    content: string; // base64
    contentType: string;
  };
}

export default function EmailComposeModal({ 
  isOpen, 
  onClose, 
  lead, 
  initialSubject = '', 
  initialBody = '',
  attachment 
}: EmailComposeModalProps) {
  const { currentUser, updateLead } = useStore();
  const [to, setTo] = useState(lead?.email || '');
  const [subject, setSubject] = useState(initialSubject || (lead ? `Contract for ${lead.propertyAddress}` : ''));
  const [body, setBody] = useState(initialBody);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to) {
      alert('Please enter a recipient email.');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmail({
        to,
        subject,
        html: body.replace(/\n/g, '<br>'),
        attachments: attachment ? [attachment] : []
      });

      if (result.success) {
        // Log to timeline if lead exists
        if (lead) {
          const timelineEntry = {
            id: crypto.randomUUID(),
            type: 'email' as const,
            content: `Sent email: "${subject}"${attachment ? ` with attachment "${attachment.filename}"` : ''}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'System',
            metadata: {
              subject,
              recipient: to,
              hasAttachment: attachment ? 'true' : 'false'
            }
          };
          
          await updateLead(lead.id, {
            timeline: [timelineEntry, ...(lead.timeline || [])]
          });
        }
        
        alert('Email sent successfully!');
        onClose();
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--t-surface)] w-full max-w-2xl rounded-2xl border border-[var(--t-border)] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--t-border)] bg-[var(--t-primary-dim)]/20 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--t-primary-dim)] rounded-lg text-[var(--t-primary)]">
              <Mail size={20} />
            </div>
            <h3 className="text-lg font-bold text-[var(--t-text)]">New Message</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2 focus-within:border-[var(--t-primary)] transition-colors">
              <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">To:</span>
              <input 
                type="text" 
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)]"
              />
              <div className="flex gap-2">
                {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-[var(--t-primary)] hover:underline">Cc</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-[var(--t-primary)] hover:underline">Bcc</button>}
              </div>
            </div>

            {showCc && (
              <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2">
                <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">Cc:</span>
                <input 
                  type="text" 
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)]"
                />
              </div>
            )}

            {showBcc && (
              <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2">
                <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">Bcc:</span>
                <input 
                  type="text" 
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)]"
                />
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2 focus-within:border-[var(--t-primary)] transition-colors">
              <span className="text-sm font-medium text-[var(--t-text-muted)] w-12">Subject:</span>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="No subject"
                className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--t-text)] font-medium"
              />
            </div>
          </div>

          <textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here..."
            className="w-full h-64 bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl p-4 text-sm text-[var(--t-text)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none resize-none transition-all"
          />

          {attachment && (
            <div className="flex items-center justify-between p-3 bg-[var(--t-primary-dim)]/30 border border-[var(--t-primary-dim)] rounded-xl">
              <div className="flex items-center gap-3">
                <Paperclip size={18} className="text-[var(--t-primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--t-text)]">{attachment.filename}</p>
                  <p className="text-xs text-[var(--t-text-muted)]">PDF Document</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-hover)]/30 rounded-b-2xl">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-colors">
              <Paperclip size={20} />
            </button>
            <div className="h-6 w-px bg-[var(--t-border)]" />
            <button className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] transition-colors">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-[var(--t-primary-dim)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
