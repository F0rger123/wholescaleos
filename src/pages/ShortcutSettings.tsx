import React, { useState, useEffect } from 'react';
import { 
  Keyboard, Save, RotateCcw, HelpCircle, Loader2, Check, AlertCircle, Info 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';

interface Shortcut {
  id: string;
  label: string;
  keys: string;
  description: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'new_lead', label: 'New Lead', keys: 'n', description: 'Open the New Lead modal' },
  { id: 'new_task', label: 'New Task', keys: 't', description: 'Open the New Task modal' },
  { id: 'open_ai', label: 'Open AI Assistant', keys: 'j', description: 'Toggle the AI Bot bubble' },
  { id: 'send_sms', label: 'Send SMS', keys: 's', description: 'Quick jump to SMS inbox' },
  { id: 'view_calendar', label: 'View Calendar', keys: 'c', description: 'Go to Calendar page' },
  { id: 'save', label: 'Save', keys: 'mod+s', description: 'Universal save action' },
  { id: 'clear_chat', label: 'Clear Chat', keys: 'mod+l', description: 'Clear active chat history' },
  { id: 'toggle_dark', label: 'Toggle Dark Mode', keys: 'd', description: 'Switch theme between light/dark' },
  { id: 'settings', label: 'Open Settings', keys: ',', description: 'Go to Settings page' },
  { id: 'dashboard', label: 'View Dashboard', keys: 'h', description: 'Back to home dashboard' },
];

export function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const { currentUser } = useStore();

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
          // Merge user shortcuts with defaults to ensure new actions are always visible
          const merged = DEFAULT_SHORTCUTS.map(def => {
            const userSet = data.settings.shortcuts.find((s: any) => s.id === def.id);
            return userSet ? { ...def, keys: userSet.keys } : def;
          });
          setShortcuts(merged);
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
              updated_at: new Date().toISOString()
            }
          })
          .eq('id', currentUser.id);

        if (error) throw error;
      } else {
        localStorage.setItem('user_shortcuts', JSON.stringify(shortcuts));
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
            <Keyboard className="w-6 h-6 text-brand-400" />
            Keyboard Shortcuts
          </h1>
          <p className="text-slate-400 text-sm">Customize how you interact with WholeScale OS using your keyboard.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Reset to Defaults
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      {saveResult && (
        <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${saveResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
          {saveResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{saveResult.message}</span>
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {shortcuts.map((s, idx) => (
            <div 
              key={s.id} 
              className={`p-6 flex items-center justify-between group hover:bg-slate-800/30 transition-all border-slate-800 ${idx % 2 === 0 ? 'md:border-r' : ''} ${idx < shortcuts.length - 2 ? 'border-b' : ''}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">{s.label}</span>
                  <HelpCircle size={12} className="text-slate-600 cursor-help" />
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{s.description}</p>
              </div>

              <button
                onClick={() => handleRecord(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  recordingId === s.id 
                    ? 'bg-brand-500/20 border-brand-500 ring-2 ring-brand-500/50 animate-pulse' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                {recordingId === s.id ? (
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Press Keys...</span>
                ) : (
                  <div className="flex items-center gap-1">
                    {s.keys.split('+').map((k, i) => (
                      <React.Fragment key={i}>
                        <kbd className="min-w-[20px] h-6 px-1.5 flex items-center justify-center bg-slate-900 border border-slate-700 rounded text-[10px] font-mono font-bold text-slate-400 shadow-sm">
                          {k === 'mod' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : k.toUpperCase()}
                        </kbd>
                        {i < s.keys.split('+').length - 1 && <span className="text-slate-600 text-[10px]">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-xl">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-brand-300">AI Shortcut Assistant</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can also ask the AI Bot to "Change my New Lead shortcut to Meta+L" or "Create a shortcut for View calendar" and it will handle it for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
