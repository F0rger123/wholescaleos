import React, { useState, useEffect } from 'react';
import { 
  Keyboard, Save, RotateCcw, HelpCircle, Loader2, Check, AlertCircle, Info, Plus, Trash2, X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';

interface Shortcut {
  id: string;
  label: string;
  keys: string;
  description: string;
  enabled?: boolean;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'new_lead', label: 'New Lead', keys: 'n', description: 'Open the New Lead modal', enabled: true },
  { id: 'new_task', label: 'New Task', keys: 't', description: 'Open the New Task modal', enabled: true },
  { id: 'open_ai', label: 'Open AI Assistant', keys: 'j', description: 'Toggle the AI Bot bubble', enabled: true },
  { id: 'send_sms', label: 'Send SMS', keys: 's', description: 'Quick jump to SMS inbox', enabled: true },
  { id: 'view_calendar', label: 'View Calendar', keys: 'c', description: 'Go to Calendar page', enabled: true },
  { id: 'save', label: 'Save', keys: 'mod+s', description: 'Universal save action', enabled: true },
  { id: 'clear_chat', label: 'Clear Chat', keys: 'mod+l', description: 'Clear active chat history', enabled: true },
  { id: 'toggle_dark', label: 'Toggle Dark Mode', keys: 'd', description: 'Switch theme between light/dark', enabled: true },
  { id: 'settings', label: 'Open Settings', keys: ',', description: 'Go to Settings page', enabled: true },
  { id: 'dashboard', label: 'View Dashboard', keys: 'h', description: 'Back to home dashboard', enabled: true },
];

export default function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShortcut, setNewShortcut] = useState({ label: '', keys: '', description: '' });
  const { currentUser, shortcutsEnabled, setShortcutsEnabled } = useStore();

  useEffect(() => {
    async function loadShortcuts() {
      if (!currentUser?.id) return;
      
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (data?.settings?.shortcuts) {
          // Merge user shortcuts with defaults and include custom ones
          const userShortcuts = data.settings.shortcuts;
          const merged = DEFAULT_SHORTCUTS.map(def => {
            const userSet = userShortcuts.find((s: any) => s.id === def.id);
            return userSet ? { ...def, ...userSet } : def;
          });
          
          // Add custom shortcuts (those not in DEFAULT_SHORTCUTS)
          const custom = userShortcuts.filter((us: any) => !DEFAULT_SHORTCUTS.some(ds => ds.id === us.id));
          setShortcuts([...merged, ...custom]);
        }
      } else {
        const local = localStorage.getItem('user_shortcuts');
        if (local) setShortcuts(JSON.parse(local));
      }
    }
    loadShortcuts();
  }, [currentUser?.id]);

  const handleRecord = (id: string) => {
    setRecordingId(id);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.key === 'Escape') {
        setRecordingId(null);
        window.removeEventListener('keydown', handler);
        return;
      }

      let keys = [];
      if (e.ctrlKey || e.metaKey) keys.push('mod');
      if (e.altKey) keys.push('alt');
      if (e.shiftKey) keys.push('shift');
      
      const mainKey = e.key.toLowerCase();
      if (!['control', 'meta', 'alt', 'shift'].includes(mainKey)) {
        keys.push(mainKey);
      }

      if (keys.length > 0) {
        const newKeyStr = keys.join('+');
        setShortcuts(prev => prev.map(s => s.id === id ? { ...s, keys: newKeyStr } : s));
        setRecordingId(null);
        window.removeEventListener('keydown', handler);
      }
    };
    window.addEventListener('keydown', handler);
  };

  const handleToggle = (id: string) => {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleCreate = () => {
    if (!newShortcut.label || !newShortcut.keys) return;
    const s: Shortcut = {
      id: `custom_${Date.now()}`,
      label: newShortcut.label,
      keys: newShortcut.keys,
      description: newShortcut.description || 'Custom user shortcut',
      enabled: true
    };
    setShortcuts(prev => [...prev, s]);
    setShowCreateModal(false);
    setNewShortcut({ label: '', keys: '', description: '' });
  };

  const handleReset = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    setSaveResult(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle();
        const { error } = await supabase
          .from('profiles')
          .update({
            settings: {
              ...(profile?.settings || {}),
              shortcuts: shortcuts,
              shortcuts_enabled: shortcutsEnabled,
              updated_at: new Date().toISOString()
            }
          })
          .eq('id', currentUser.id);

        if (error) throw error;
      } else {
        localStorage.setItem('user_shortcuts', JSON.stringify(shortcuts));
        localStorage.setItem('wholescale-shortcuts-enabled', shortcutsEnabled ? 'true' : 'false');
      }
      setSaveResult({ success: true, message: 'Shortcuts saved successfully.' });
    } catch (err: any) {
      setSaveResult({ success: false, message: `Failed to save: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Keyboard className="w-6 h-6" style={{ color: 'var(--t-primary)' }} />
            Keyboard Shortcuts
          </h1>
        <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Customize how you interact with WholeScale OS using your keyboard.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2"
            style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface)'}
          >
            <RotateCcw size={14} />
            Reset to Defaults
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 group shadow-xl relative overflow-hidden"
            style={{ 
              background: 'var(--t-secondary)',
              color: 'var(--t-on-secondary)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant-glow" />
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            Create New
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 group shadow-xl relative overflow-hidden disabled:opacity-50"
            style={{
              background: 'var(--t-button-bg)',
              color: 'var(--t-button-text)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant-glow" />
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.3)', borderColor: 'rgba(var(--t-border-rgb), 0.5)' }}>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg shrink-0" style={{ background: 'var(--t-primary-dim)' }}>
            <Keyboard className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Enable Global Shortcuts</h3>
            <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Master toggle to turn all keyboard interactions on or off.</p>
          </div>
        </div>
        <div
          className="w-12 h-6 rounded-full relative transition-all duration-300 cursor-pointer shadow-inner"
          style={{ background: shortcutsEnabled ? 'var(--t-primary)' : '#334155' }}
          onClick={() => setShortcutsEnabled(!shortcutsEnabled)}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${shortcutsEnabled ? 'left-7' : 'left-1'}`} />
        </div>
      </div>

      {saveResult && (
        <div className="p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 border" style={{ 
          backgroundColor: saveResult.success ? 'var(--t-success-dim)' : 'var(--t-error-dim)',
          borderColor: saveResult.success ? 'var(--t-success-border)' : 'var(--t-error-border)',
          color: saveResult.success ? 'var(--t-success)' : 'var(--t-error)'
        }}>
          {saveResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{saveResult.message}</span>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--t-surface-dim)', borderColor: 'var(--t-border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {shortcuts.map((s, idx) => (
            <div
              key={s.id}
              className={`p-6 flex items-center justify-between group transition-all ${idx % 2 === 0 ? 'md:border-r' : ''} ${idx < shortcuts.length - 2 ? 'border-b' : ''}`}
              style={{ borderColor: 'var(--t-border)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--t-surface-rgb), 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">{s.label}</span>
                  <HelpCircle size={12} className="cursor-help" style={{ color: 'rgba(var(--t-text-rgb), 0.3)' }} />
                </div>
                <p className="text-xs line-clamp-1" style={{ color: 'var(--t-text-muted)' }}>{s.description}</p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`w-8 h-4 rounded-full relative transition-all duration-300 cursor-pointer ${s.enabled !== false ? 'bg-[var(--t-primary)]' : 'bg-slate-600'}`}
                  onClick={(e) => { e.stopPropagation(); handleToggle(s.id); }}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${s.enabled !== false ? 'left-4.5' : 'left-0.5'}`} />
                </div>

                <button
                  onClick={() => handleRecord(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all"
                  style={recordingId === s.id ? {
                    backgroundColor: 'var(--t-primary-dim)',
                    borderColor: 'var(--t-primary)',
                    boxShadow: '0 0 0 2px var(--t-primary-dim)'
                  } : {
                    backgroundColor: 'var(--t-surface)',
                    borderColor: 'var(--t-border)',
                    opacity: s.enabled === false ? 0.5 : 1
                  }}
                  disabled={s.enabled === false}
                >
                  {recordingId === s.id ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--t-primary)' }}>Press Keys...</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {s.keys.split('+').map((k, i) => (
                        <React.Fragment key={i}>
                          <kbd className="min-w-[20px] h-6 px-1.5 flex items-center justify-center rounded text-[10px] font-mono font-bold shadow-sm"
                            style={{ backgroundColor: 'var(--t-surface-dim)', border: '1px solid var(--t-border)', color: 'var(--t-text-muted)' }}
                          >
                            {k === 'mod' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : k.toUpperCase()}
                          </kbd>
                          {i < s.keys.split('+').length - 1 && <span className="text-[10px]" style={{ color: 'rgba(var(--t-text-rgb), 0.3)' }}>+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </button>
                {s.id.startsWith('custom_') && (
                  <button 
                    onClick={() => setShortcuts(prev => prev.filter(x => x.id !== s.id))}
                    className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
              <h3 className="text-white font-bold flex items-center gap-2">
                <Plus size={18} className="text-[var(--t-primary)]" />
                New Shortcut
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors text-[var(--t-text-muted)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--t-text-muted)] uppercase mb-1 ml-1">Label</label>
                <input 
                  type="text" 
                  value={newShortcut.label}
                  onChange={e => setNewShortcut({ ...newShortcut, label: e.target.value })}
                  placeholder="e.g. Open Maps"
                  className="w-full px-3 py-2 rounded-xl border outline-none text-sm transition-all"
                  style={{ background: 'var(--t-surface-dim)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--t-text-muted)] uppercase mb-1 ml-1">Key Combination</label>
                <input 
                  type="text" 
                  value={newShortcut.keys}
                  onChange={e => setNewShortcut({ ...newShortcut, keys: e.target.value })}
                  placeholder="e.g. m or mod+m"
                  className="w-full px-3 py-2 rounded-xl border outline-none text-sm transition-all font-mono"
                  style={{ background: 'var(--t-surface-dim)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                />
                <p className="text-[10px] mt-1 text-[var(--t-text-muted)]">Use '+' to combine keys (e.g. mod+shift+k)</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--t-text-muted)] uppercase mb-1 ml-1">Description</label>
                <input 
                  type="text" 
                  value={newShortcut.description}
                  onChange={e => setNewShortcut({ ...newShortcut, description: e.target.value })}
                  placeholder="What does this do?"
                  className="w-full px-3 py-2 rounded-xl border outline-none text-sm transition-all"
                  style={{ background: 'var(--t-surface-dim)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                />
              </div>
            </div>
            <div className="p-4 bg-[var(--t-surface-dim)] border-t flex gap-3" style={{ borderColor: 'var(--t-border)' }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 text-xs font-bold uppercase rounded-xl border transition-all"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newShortcut.label || !newShortcut.keys}
                className="flex-1 py-2 text-white text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'var(--t-primary)' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl border" style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}>
        <div className="flex gap-3">
          <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--t-primary)' }} />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--t-primary-text)' }}>AI Shortcut Assistant</h4>
            <p className="text-xs text-[var(--t-text-muted)] leading-relaxed">
              You can also ask the AI Bot to "Change my New Lead shortcut to Meta+L" or "Create a shortcut for View calendar" and it will handle it for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
