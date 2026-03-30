// @ts-nocheck
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import {
  Ticket, Plus, Trash2, Copy, Check, Loader2,
  ToggleLeft, ToggleRight, AlertTriangle, Shield,
  Users, DollarSign, Calendar, Hash
} from 'lucide-react';

// Admin user ID — only this user can access the promo panel
const ADMIN_USER_ID = '9e5845b7-b4af-4a12-9d9e-5eb2f9b88f3d';

interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  duration_months: number | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminPromos() {
  const { currentUser } = useStore();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  // New code form
  const [form, setForm] = useState({
    code: '',
    type: 'percent_off' as string,
    value: 0,
    duration_months: null as number | null,
    max_uses: null as number | null,
    expires_at: '',
  });

  const isAdmin = currentUser?.id === ADMIN_USER_ID;

  useEffect(() => {
    if (isAdmin) loadCodes();
    else setLoading(false);
  }, [isAdmin]);

  const loadCodes = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCodes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const prefix = 'WOS';
    let code = prefix + '-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleCreate = async () => {
    if (!supabase || !form.code.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('promo_codes').insert({
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: form.value,
        duration_months: form.type === 'free_limited' ? form.duration_months : null,
        max_uses: form.max_uses,
        expires_at: form.expires_at || null,
        created_by: user?.id,
      });
      if (error) throw error;
      setForm({ code: '', type: 'percent_off', value: 0, duration_months: null, max_uses: null, expires_at: '' });
      loadCodes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    if (!supabase) return;
    try {
      await supabase.from('promo_codes').update({ is_active: !currentlyActive }).eq('id', id);
      setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentlyActive } : c));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteCode = async (id: string) => {
    if (!supabase || !confirm('Delete this promo code permanently?')) return;
    try {
      await supabase.from('promo_codes').delete().eq('id', id);
      setCodes(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const typeLabels: Record<string, string> = {
    free_forever: 'Free Forever',
    free_limited: 'Free (Limited)',
    percent_off: '% Discount',
    fixed_off: '$ Off',
    one_time: 'One-Time Credit',
  };

  const typeColors: Record<string, string> = {
    free_forever: 'text-green-500 bg-green-500/10',
    free_limited: 'text-blue-500 bg-blue-500/10',
    percent_off: 'text-purple-500 bg-purple-500/10',
    fixed_off: 'text-orange-500 bg-orange-500/10',
    one_time: 'text-cyan-500 bg-cyan-500/10',
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Shield size={48} className="mx-auto opacity-20" style={{ color: 'var(--t-text-muted)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--t-text)' }}>Access Restricted</h2>
          <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black italic tracking-tight uppercase flex items-center gap-3" style={{ color: 'var(--t-text)' }}>
          <Ticket size={28} className="text-purple-500" /> Promo Code Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-text-secondary)' }}>
          Create, manage, and track promotional codes
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'var(--t-error-dim)', border: '1px solid var(--t-error)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--t-error)' }} />
          <span className="text-sm" style={{ color: 'var(--t-error)' }}>{error}</span>
        </div>
      )}

      {/* Create New Code */}
      <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
          <Plus size={18} /> Create Promo Code
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="WOS-LAUNCH50"
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
              />
              <button
                onClick={generateCode}
                className="px-3 py-2 rounded-lg text-xs font-bold"
                style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                title="Auto-generate"
              >
                <Hash size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="percent_off">Percentage Discount</option>
              <option value="fixed_off">Fixed Dollar Off</option>
              <option value="free_limited">Free (Limited Time)</option>
              <option value="free_forever">Free Forever</option>
              <option value="one_time">One-Time Credit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>
              {form.type === 'percent_off' ? 'Discount %' : form.type === 'fixed_off' ? 'Dollar Amount' : form.type === 'one_time' ? 'Credit $' : 'Value'}
            </label>
            <input
              type="number"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>

          {form.type === 'free_limited' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Duration (months)</label>
              <input
                type="number"
                value={form.duration_months || ''}
                onChange={e => setForm(f => ({ ...f, duration_months: Number(e.target.value) || null }))}
                placeholder="3"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Max Uses</label>
            <input
              type="number"
              value={form.max_uses || ''}
              onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) || null }))}
              placeholder="Unlimited"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Expires</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !form.code.trim()}
          className="mt-4 px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all"
          style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {creating ? 'Creating...' : 'Create Code'}
        </button>
      </div>

      {/* Codes List */}
      <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
            All Promo Codes
          </h3>
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
            {codes.length} codes
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--t-text-muted)' }} />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12">
            <Ticket size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--t-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No promo codes yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map(code => (
              <div
                key={code.id}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${code.is_active ? '' : 'opacity-50'}`}
                style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}
              >
                <div className="flex items-center gap-4">
                  {/* Code */}
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold" style={{ color: 'var(--t-text)' }}>{code.code}</code>
                    <button onClick={() => copyCode(code.code)} className="p-1 rounded hover:bg-white/5 transition-all">
                      {copied === code.code ? <Check size={12} className="text-green-500" /> : <Copy size={12} style={{ color: 'var(--t-text-muted)' }} />}
                    </button>
                  </div>

                  {/* Type badge */}
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${typeColors[code.type] || 'text-gray-500 bg-gray-500/10'}`}>
                    {typeLabels[code.type] || code.type}
                  </span>

                  {/* Value */}
                  {code.type === 'percent_off' && <span className="text-xs font-bold" style={{ color: 'var(--t-text-muted)' }}>{code.value}% off</span>}
                  {code.type === 'fixed_off' && <span className="text-xs font-bold" style={{ color: 'var(--t-text-muted)' }}>${code.value} off</span>}
                  {code.type === 'free_limited' && <span className="text-xs font-bold" style={{ color: 'var(--t-text-muted)' }}>{code.duration_months}mo free</span>}
                  {code.type === 'one_time' && <span className="text-xs font-bold" style={{ color: 'var(--t-text-muted)' }}>${code.value} credit</span>}

                  {/* Usage */}
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--t-text-muted)' }}>
                    <Users size={12} />
                    <span className="font-bold">{code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''}</span>
                  </div>

                  {/* Expiry */}
                  {code.expires_at && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: new Date(code.expires_at) < new Date() ? 'var(--t-error)' : 'var(--t-text-muted)' }}>
                      <Calendar size={12} />
                      <span className="font-bold">{new Date(code.expires_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(code.id, code.is_active)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                    title={code.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {code.is_active
                      ? <ToggleRight size={20} className="text-green-500" />
                      : <ToggleLeft size={20} style={{ color: 'var(--t-text-muted)' }} />
                    }
                  </button>
                  <button
                    onClick={() => deleteCode(code.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                    style={{ color: 'var(--t-error)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
