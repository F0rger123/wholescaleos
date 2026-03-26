import React, { useState } from 'react';
import { X, User, Phone, MapPin, Save, Loader2, AtSign } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SaveLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
}

export function SaveLeadModal({ isOpen, onClose, phone }: SaveLeadModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const { addLead, currentUser } = useStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await addLead({
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ''),
        propertyAddress: address.trim() || 'Unknown',
        status: 'new',
        source: 'other',
        notes: 'Saved from SMS conservation',
        assignedTo: currentUser?.id || '',
        propertyType: 'single-family',
        estimatedValue: 0,
        offerAmount: 0,
        lat: 0,
        lng: 0,
        sqft: 0,
        bedrooms: 0,
        bathrooms: 0,
        documents: [],
        probability: 50,
        engagementLevel: 1,
        timelineUrgency: 1,
        competitionLevel: 1
      });
      onClose();
    } catch (err) {
      console.error('Failed to save lead:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-hover)]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <User size={20} className="text-[var(--t-primary)]" />
            Save Contact
          </h3>
          <button onClick={onClose} type="button" className="p-1 hover:bg-black/10 rounded-lg transition-colors text-[var(--t-text-muted)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--t-text-muted)] uppercase tracking-wider mb-1.5">Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-text-muted)]" />
              <input
                required
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--t-background)] border border-[var(--t-border)] rounded-xl text-sm text-white focus:ring-1 focus:ring-[var(--t-primary)] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--t-text-muted)] uppercase tracking-wider mb-1.5">Phone</label>
              <div className="relative opacity-70">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-text-muted)]" />
                <input
                  disabled
                  type="text"
                  value={phone}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--t-text-muted)] uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--t-background)] border border-[var(--t-border)] rounded-xl text-sm text-white focus:ring-1 focus:ring-[var(--t-primary)] outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--t-text-muted)] uppercase tracking-wider mb-1.5">Property Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-text-muted)]" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St..."
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--t-background)] border border-[var(--t-border)] rounded-xl text-sm text-white focus:ring-1 focus:ring-[var(--t-primary)] outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-[var(--t-border)] hover:bg-[var(--t-surface-hover)] transition-all"
            >
              Skip
            </button>
            <button
              disabled={saving || !name.trim()}
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-lg"
              style={{ background: 'var(--t-primary)' }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


