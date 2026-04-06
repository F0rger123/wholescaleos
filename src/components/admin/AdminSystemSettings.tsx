import { useState, useEffect } from 'react';
import { 
  Save, BarChart2, Users, 
  Flag, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminSystemSettings() {
  const [benchmarks, setBenchmarks] = useState({ dealsPerYear: 12, avgRevenue: 150000, nationalAvgRevenue: 48000 });
  const [referralRates, setReferralRates] = useState({ bronze: 10, silver: 15, gold: 20, platinum: 25, diamond: 35 });
  const [flags, setFlags] = useState({ ai_automation: true, sms_marketing: true, team_calendar: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data } = await supabase.from('system_settings').select('key, value');
      if (data) {
        data.forEach((item: any) => {
          if (item.key === 'benchmarks') setBenchmarks(item.value);
          if (item.key === 'referral_rates') setReferralRates(item.value);
          if (item.key === 'feature_flags') setFlags(item.value);
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    setMessage('');
    try {
       const { error } = await supabase
         .from('system_settings')
         .upsert({ key, value, updated_at: new Date().toISOString() });
       
       if (error) throw error;
       setMessage(`${key.replace('_', ' ')} saved!`);
       setTimeout(() => setMessage(''), 3000);
    } catch (err) {
       console.error('Error saving:', err);
       alert('Failed to save settings');
    } finally {
       setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse">Loading settings...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Benchmarks */}
      <section className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold italic uppercase tracking-tighter flex items-center gap-2">
            <BarChart2 className="text-blue-500" size={20} /> National Benchmarks
          </h3>
          <button 
            onClick={() => handleSave('benchmarks', benchmarks)}
            disabled={saving}
            className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
          >
            <Save size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">Deals Per Year (NAR Avg)</label>
            <input 
              type="number" 
              value={benchmarks.dealsPerYear}
              onChange={e => setBenchmarks({ ...benchmarks, dealsPerYear: parseInt(e.target.value) })}
              className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">Target Average Revenue ($)</label>
            <input 
              type="number" 
              value={benchmarks.avgRevenue}
              onChange={e => setBenchmarks({ ...benchmarks, avgRevenue: parseInt(e.target.value) })}
              className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
            />
          </div>
           <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">National Median Revenue ($)</label>
            <input 
              type="number" 
              value={benchmarks.nationalAvgRevenue}
              onChange={e => setBenchmarks({ ...benchmarks, nationalAvgRevenue: parseInt(e.target.value) })}
              className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Referral Rates */}
      <section className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold italic uppercase tracking-tighter flex items-center gap-2">
            <Users className="text-green-500" size={20} /> Referral Commission (%)
          </h3>
          <button 
            onClick={() => handleSave('referral_rates', referralRates)}
            disabled={saving}
            className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
          >
            <Save size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(referralRates).map(([tier, rate]: [string, number]) => (
            <div key={tier} className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[var(--t-text-muted)]">{tier}</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={rate}
                  onChange={e => setReferralRates({ ...referralRates, [tier]: parseInt(e.target.value) })}
                  className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none"
                />
                <span className="text-sm font-bold opacity-50">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Flags */}
      <section className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] space-y-6">
        <h3 className="text-xl font-bold italic uppercase tracking-tighter flex items-center gap-2">
          <Flag className="text-orange-500" size={20} /> Feature Toggles
        </h3>
        <div className="space-y-4">
          {Object.entries(flags).map(([flag, enabled]: [string, boolean]) => (
            <div key={flag} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
              <div className="text-sm font-bold capitalize">{flag.replace('_', ' ')}</div>
              <button 
                onClick={() => {
                  const newFlags = { ...flags, [flag]: !enabled };
                  setFlags(newFlags);
                  handleSave('feature_flags', newFlags);
                }}
                className={`w-12 h-6 rounded-full p-1 transition-all ${enabled ? 'bg-orange-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Global Action Banner */}
      {message && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-blue-600 text-white font-black text-sm flex items-center gap-3 shadow-2xl animate-bounce">
          <Check size={18} /> {message}
        </div>
      )}
    </div>
  );
}
