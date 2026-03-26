import React, { useState, useEffect, useMemo } from 'react';
import { useStore, LeadStatus, calculateDealScore, LeadSource } from '../store/useStore';
import { geocodeAddress } from '../lib/geocoding';
import { detectCarrier } from '../lib/carrier-service';
import { Loader2, Save, BarChart3 } from 'lucide-react';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string | null;
}

export function LeadFormModal({ isOpen, onClose, leadId }: LeadFormModalProps) {
  const { leads, addLead, updateLead, team } = useStore();
  const [saving, setSaving] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  
  const editingLead = leadId ? leads.find(l => l.id === leadId) : null;
  
  const defaultData = useMemo(() => ({
    name: '', email: '', phone: '', propertyAddress: '',
    propertyType: 'single-family', estimatedValue: '', offerAmount: '',
    status: 'new', notes: '', source: 'other' as LeadSource,
    assignedTo: '',
    probability: '50', engagementLevel: '3', timelineUrgency: '3', competitionLevel: '3',
  }), []);

  const [formData, setFormData] = useState(defaultData);
  const [initialData, setInitialData] = useState(defaultData);

  useEffect(() => {
    if (isOpen) {
      let data;
      if (editingLead) {
        data = { 
          name: editingLead.name || '', 
          email: editingLead.email || '', 
          phone: editingLead.phone || '', 
          propertyAddress: editingLead.propertyAddress || '', 
          propertyType: editingLead.propertyType || 'single-family', 
          estimatedValue: (editingLead.estimatedValue || '').toString(), 
          offerAmount: (editingLead.offerAmount || '').toString(), 
          status: editingLead.status || 'new', 
          notes: editingLead.notes || '', 
          source: (editingLead.source || 'other') as LeadSource,
          assignedTo: editingLead.assignedTo || '',
          probability: (editingLead.probability || 50).toString(), 
          engagementLevel: (editingLead.engagementLevel || 3).toString(), 
          timelineUrgency: (editingLead.timelineUrgency || 3).toString(), 
          competitionLevel: (editingLead.competitionLevel || 3).toString() 
        };
      } else {
        data = defaultData;
      }
      setFormData(data);
      setInitialData(data);
    }
  }, [isOpen, editingLead, defaultData]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    let lat = 30.2672, lng = -97.7431;
    if (formData.propertyAddress) { 
      try {
        const c = await geocodeAddress(formData.propertyAddress); 
        if (c) { lat = c.lat; lng = c.lng; } 
      } catch (err) {}
    }
    const d: any = { 
      name: formData.name, 
      email: formData.email, 
      phone: formData.phone, 
      propertyAddress: formData.propertyAddress, 
      propertyType: formData.propertyType, 
      estimatedValue: parseFloat(formData.estimatedValue) || 0, 
      offerAmount: parseFloat(formData.offerAmount) || 0, 
      status: formData.status as LeadStatus, 
      notes: formData.notes, 
      assignedTo: formData.assignedTo,
      lat, lng, 
      source: formData.source || 'other', 
      probability: parseInt(formData.probability), 
      engagementLevel: parseInt(formData.engagementLevel), 
      timelineUrgency: parseInt(formData.timelineUrgency), 
      competitionLevel: parseInt(formData.competitionLevel) 
    };

    try {
      if (editingLead) {
        updateLead(editingLead.id, d);
        if (d.phone && d.phone !== editingLead.phone) {
          detectCarrier(d.phone).then(res => {
            if (res.carrier) updateLead(editingLead.id, { carrier: res.carrier });
          });
        }
      } else {
        const res = await detectCarrier(d.phone);
        addLead({ ...d, carrier: res.carrier });
      }
    } catch (err) {
      console.error('Error saving lead:', err);
      if (!editingLead) addLead(d); // Fallback if carrier detection fails
    }

    setSaving(false); 
    onClose();
  };


  const scoreBadge = (s: number) => {
    if (s >= 80) return { className: 'border-green-500/40', style: { backgroundColor: 'rgba(0, 128, 0, 0.2)', color: '#00FF00' } };
    if (s >= 60) return { className: 'border-yellow-500/40', style: { backgroundColor: 'rgba(154, 205, 50, 0.2)', color: '#ADFF2F' } };
    if (s >= 40) return { className: 'border-orange-500/40', style: { backgroundColor: 'rgba(255, 165, 0, 0.2)', color: '#FFA500' } };
    if (s >= 20) return { className: 'border-orange-600/40', style: { backgroundColor: 'rgba(255, 69, 0, 0.2)', color: '#FF4500' } };
    return { className: 'border-red-900/40', style: { backgroundColor: 'rgba(139, 0, 0, 0.2)', color: '#FF0000' } };
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleCloseAttempt}
        title={editingLead ? 'Edit Lead' : 'Add New Lead'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Name *</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                required 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({ ...formData, email: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Phone</label>
              <input 
                type="tel" 
                value={formData.phone} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-[var(--t-text)] focus:outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="negotiating">Negotiating</option>
                <option value="closed-won">Closed Won</option>
                <option value="closed-lost">Closed Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Assigned To</label>
              <select 
                value={formData.assignedTo} 
                onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-[var(--t-text)] focus:outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
              >
                <option value="">Unassigned</option>
                {team.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Property Address</label>
              <input 
                value={formData.propertyAddress} 
                onChange={e => setFormData({ ...formData, propertyAddress: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Property Type</label>
              <select 
                value={formData.propertyType} 
                onChange={e => setFormData({ ...formData, propertyType: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-[var(--t-text)] focus:outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
              >
                <option value="single-family">Single Family</option>
                <option value="multi-family">Multi Family</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="condo">Condo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Lead Source</label>
              <select 
                value={formData.source} 
                onChange={e => setFormData({ ...formData, source: e.target.value as LeadSource })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-[var(--t-text)] focus:outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
              >
                <option value="bandit-signs">Bandit Signs</option>
                <option value="personal-relations">Personal Relations</option>
                <option value="pay-per-lead">Pay Per Lead</option>
                <option value="doorknocking">Doorknocking</option>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="social-media">Social Media</option>
                <option value="open-house">Open House</option>
                <option value="fsbo">FSBO</option>
                <option value="cold-call">Cold Call</option>
                <option value="email-campaign">Email Campaign</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Estimated Value</label>
              <input 
                type="number" 
                value={formData.estimatedValue} 
                onChange={e => setFormData({ ...formData, estimatedValue: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Offer Amount</label>
              <input 
                type="number" 
                value={formData.offerAmount} 
                onChange={e => setFormData({ ...formData, offerAmount: e.target.value })} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Notes</label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                rows={4} 
                className="w-full px-4 py-3 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-2xl text-white focus:outline-none focus:border-[var(--t-primary)] transition-all resize-none" 
              />
            </div>
          </div>
          
          <div className="bg-[var(--t-surface-dim)] p-6 rounded-[24px] border border-[var(--t-border)]">
            <h3 className="text-[var(--t-text)] font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
              <BarChart3 className="w-4 h-4 text-[var(--t-primary)]" /> Deal Score Parameters
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Probability %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={formData.probability} 
                  onChange={e => setFormData({ ...formData, probability: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-white focus:outline-none focus:border-[var(--t-primary)]" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Engagement (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.engagementLevel} 
                  onChange={e => setFormData({ ...formData, engagementLevel: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-white focus:outline-none focus:border-[var(--t-primary)]" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Urgency (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.timelineUrgency} 
                  onChange={e => setFormData({ ...formData, timelineUrgency: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-white focus:outline-none focus:border-[var(--t-primary)]" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--t-text-muted)] mb-2 uppercase tracking-widest">Competition (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.competitionLevel} 
                  onChange={e => setFormData({ ...formData, competitionLevel: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-white focus:outline-none focus:border-[var(--t-primary)]" 
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between bg-[var(--t-background)] p-4 rounded-2xl border border-[var(--t-border)]">
              <span className="text-sm font-bold text-[var(--t-text-muted)] uppercase tracking-widest">Calculated Score Preview</span>
              {(() => {
                const previewScore = calculateDealScore({
                  estimatedValue: parseFloat(formData.estimatedValue) || 0,
                  probability: parseInt(formData.probability) || 50,
                  engagementLevel: parseInt(formData.engagementLevel) || 3,
                  timelineUrgency: parseInt(formData.timelineUrgency) || 3,
                  competitionLevel: parseInt(formData.competitionLevel) || 3
                } as any);
                const sb = scoreBadge(previewScore);
                return (
                  <span className={`px-4 py-1.5 rounded-xl text-sm font-black border transition-all ${sb.className}`} style={sb.style}>
                    ⚡ {previewScore}
                  </span>
                );
              })()}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--t-border)]">
            <button 
              type="button" 
              onClick={handleCloseAttempt} 
              className="px-6 py-3 bg-[var(--t-surface-subtle)] hover:bg-[var(--t-surface-hover)] rounded-2xl text-[var(--t-text)] font-bold transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-8 py-3 text-white rounded-2xl flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all font-bold shadow-lg shadow-[var(--t-primary)]/20"
              style={{ background: 'var(--t-primary)' }}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
              {editingLead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmDiscard}
        onClose={() => setShowConfirmDiscard(false)}
        onConfirm={() => {
          setShowConfirmDiscard(false);
          onClose();
        }}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to discard them? This action cannot be undone."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        variant="danger"
      />
    </>
  );
}

