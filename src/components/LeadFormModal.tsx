import React, { useState, useEffect } from 'react';
import { useStore, LeadStatus, calculateDealScore } from '../store/useStore';
import { geocodeAddress } from '../lib/geocoding';
import { X, Loader2, Save, BarChart3 } from 'lucide-react';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string | null;
}

export function LeadFormModal({ isOpen, onClose, leadId }: LeadFormModalProps) {
  const { leads, addLead, updateLead, team } = useStore();
  const [saving, setSaving] = useState(false);
  
  const editingLead = leadId ? leads.find(l => l.id === leadId) : null;
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', propertyAddress: '',
    propertyType: 'single-family', estimatedValue: '', offerAmount: '',
    status: 'new', notes: '',
    assignedTo: '',
    probability: '50', engagementLevel: '3', timelineUrgency: '3', competitionLevel: '3',
  });

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingLead) {
        setFormData({ 
          name: editingLead.name || '', 
          email: editingLead.email || '', 
          phone: editingLead.phone || '', 
          propertyAddress: editingLead.propertyAddress || '', 
          propertyType: editingLead.propertyType || 'single-family', 
          estimatedValue: (editingLead.estimatedValue || '').toString(), 
          offerAmount: (editingLead.offerAmount || '').toString(), 
          status: editingLead.status || 'new', 
          notes: editingLead.notes || '', 
          assignedTo: editingLead.assignedTo || '',
          probability: (editingLead.probability || 50).toString(), 
          engagementLevel: (editingLead.engagementLevel || 3).toString(), 
          timelineUrgency: (editingLead.timelineUrgency || 3).toString(), 
          competitionLevel: (editingLead.competitionLevel || 3).toString() 
        }); 
      } else {
        setFormData({ 
          name: '', email: '', phone: '', propertyAddress: '', 
          propertyType: 'single-family', estimatedValue: '', offerAmount: '', 
          status: 'new', notes: '', 
          assignedTo: '',
          probability: '50', engagementLevel: '3', timelineUrgency: '3', competitionLevel: '3' 
        }); 
      }
    }
  }, [isOpen, editingLead]);

  if (!isOpen) return null;

  const scoreBadge = (s: number) => {
    if (s >= 80) return { className: 'border-green-500/40', style: { backgroundColor: 'rgba(0, 128, 0, 0.2)', color: '#00FF00' } };
    if (s >= 60) return { className: 'border-yellow-500/40', style: { backgroundColor: 'rgba(154, 205, 50, 0.2)', color: '#ADFF2F' } };
    if (s >= 40) return { className: 'border-orange-500/40', style: { backgroundColor: 'rgba(255, 165, 0, 0.2)', color: '#FFA500' } };
    if (s >= 20) return { className: 'border-orange-600/40', style: { backgroundColor: 'rgba(255, 69, 0, 0.2)', color: '#FF4500' } };
    return { className: 'border-red-900/40', style: { backgroundColor: 'rgba(139, 0, 0, 0.2)', color: '#FF0000' } };
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
      source: 'other', 
      probability: parseInt(formData.probability), 
      engagementLevel: parseInt(formData.engagementLevel), 
      timelineUrgency: parseInt(formData.timelineUrgency), 
      competitionLevel: parseInt(formData.competitionLevel) 
    };
    if (editingLead) updateLead(editingLead.id, d); else addLead(d);
    setSaving(false); 
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9500] p-4" onClick={onClose}>
      <div className="rounded-xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto" 
        style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--t-border)' }}>
          <h2 className="text-lg font-semibold text-white">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors text-[var(--t-text-muted)] hover:text-[var(--t-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Name *</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                required 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({ ...formData, email: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Phone</label>
              <input 
                type="tel" 
                value={formData.phone} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-[var(--t-text)]"
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
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Assigned To</label>
              <select 
                value={formData.assignedTo} 
                onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-[var(--t-text)]"
              >
                <option value="">Unassigned</option>
                {team.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Property Address</label>
              <input 
                value={formData.propertyAddress} 
                onChange={e => setFormData({ ...formData, propertyAddress: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Property Type</label>
              <select 
                value={formData.propertyType} 
                onChange={e => setFormData({ ...formData, propertyType: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-[var(--t-text)]"
              >
                <option value="single-family">Single Family</option>
                <option value="multi-family">Multi Family</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="condo">Condo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Estimated Value</label>
              <input 
                type="number" 
                value={formData.estimatedValue} 
                onChange={e => setFormData({ ...formData, estimatedValue: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Offer Amount</label>
              <input 
                type="number" 
                value={formData.offerAmount} 
                onChange={e => setFormData({ ...formData, offerAmount: e.target.value })} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--t-text-muted)] mb-1">Notes</label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                rows={3} 
                className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white resize-none" 
              />
            </div>
          </div>
          
          <div className="border-t border-[var(--t-border)] pt-4">
            <h3 className="text-[var(--t-text)] font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Deal Score Parameters
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[var(--t-text-muted)] mb-1">Probability (0-100)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={formData.probability} 
                  onChange={e => setFormData({ ...formData, probability: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--t-text-muted)] mb-1">Engagement (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.engagementLevel} 
                  onChange={e => setFormData({ ...formData, engagementLevel: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--t-text-muted)] mb-1">Urgency (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.timelineUrgency} 
                  onChange={e => setFormData({ ...formData, timelineUrgency: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--t-text-muted)] mb-1">Competition (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.competitionLevel} 
                  onChange={e => setFormData({ ...formData, competitionLevel: e.target.value })} 
                  className="w-full px-3 py-2 bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-lg text-white" 
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-[var(--t-text-muted)]">Preview:</span>
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
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${sb.className}`} style={sb.style}>
                    ⚡ {previewScore}
                  </span>
                );
              })()}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--t-border)]">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-[var(--t-surface-subtle)] hover:bg-[var(--t-surface-hover)] rounded-lg text-[var(--t-text)]"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-4 py-2 text-white rounded-lg flex items-center gap-2 hover:opacity-90 font-bold"
              style={{ background: 'var(--t-primary)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              {editingLead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
