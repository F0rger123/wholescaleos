import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Key, ExternalLink, Loader2, Check, AlertCircle, Save, Sparkles } from 'lucide-react';

export function AISettings({ hideHeader = false }: { hideHeader?: boolean }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiName, setAiName] = useState('AI Assistant');
  const [aiTone, setAiTone] = useState('friendly');
  const [showWidget, setShowWidget] = useState(false);
  const { currentUser, setShowFloatingAIWidget } = useStore();

  const handleToggleWidget = (val: boolean) => {
    setShowWidget(val);
    setShowFloatingAIWidget(val);
  };

  useEffect(() => {
    async function loadKey() {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('user_connections')
            .select('refresh_token, access_token')
            .eq('user_id', currentUser.id)
            .eq('provider', 'gemini')
            .maybeSingle();

          if (data?.refresh_token) {
            setApiKey(data.refresh_token);
          }
          if (data?.access_token && data.access_token !== 'active') {
            setModel(data.access_token);
          }

          // Load profile settings for personality
          const { data: profile } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', currentUser.id)
            .maybeSingle();
          
          if (profile?.settings?.ai_name) setAiName(profile.settings.ai_name);
          if (profile?.settings?.ai_tone) setAiTone(profile.settings.ai_tone);
          if (profile?.settings?.show_floating_widget !== undefined) {
            setShowWidget(profile.settings.show_floating_widget);
            setShowFloatingAIWidget(profile.settings.show_floating_widget);
          }
        } catch (err) {
          console.error('Failed to load API key:', err);
        }
      } else {
        // Fallback to local storage for demo mode
        const localKey = localStorage.getItem('user_gemini_api_key');
        if (localKey) setApiKey(localKey);
        const localModel = localStorage.getItem('user_gemini_model');
        if (localModel) setModel(localModel);
        
        const localAiName = localStorage.getItem('user_ai_name');
        if (localAiName) setAiName(localAiName);
        const localAiTone = localStorage.getItem('user_ai_tone');
        if (localAiTone) setAiTone(localAiTone);
        const localShowWidget = localStorage.getItem('user_show_floating_widget');
        if (localShowWidget) {
          const val = localShowWidget === 'true';
          setShowWidget(val);
          setShowFloatingAIWidget(val);
        }
      }
      setLoading(false);
    }

    loadKey();
  }, [currentUser]);

  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      const apiVersion = (model.includes('2.0') || model.includes('exp')) ? 'v1beta' : 'v1';
      const res = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
        })
      });

      if (res.ok) {
        setTestResult({ success: true, message: 'Connection successful! Your API key is valid.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: `Connection failed: ${err.error?.message || res.statusText}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Connection failed: Network error or invalid endpoint.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    setSaveResult(null);

    if (isSupabaseConfigured && supabase) {
      try {
        // Manual check-and-save to bypass flaky upsert issues
        const { data: existing } = await supabase
          .from('user_connections')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('provider', 'gemini')
          .maybeSingle();

        let error;
        if (existing) {
          const { error: updateError } = await supabase
            .from('user_connections')
            .update({
              access_token: model,
              refresh_token: apiKey,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('user_connections')
            .insert({
              user_id: currentUser.id,
              provider: 'gemini',
              access_token: model, 
              refresh_token: apiKey, 
              updated_at: new Date().toISOString(),
            });
          error = insertError;
        }

        if (error) throw error;

        // Save profile settings
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            settings: {
              ...(await supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle()).data?.settings,
              ai_name: aiName,
              ai_tone: aiTone,
              show_floating_widget: showWidget,
              updated_at: new Date().toISOString()
            }
          })
          .eq('id', currentUser.id);

        if (profileError) throw profileError;

        setSaveResult({ success: true, message: 'API key and AI personality saved successfully.' });
        window.dispatchEvent(new CustomEvent('ai-settings-updated'));
      } catch (err: any) {
        setSaveResult({ success: false, message: `Failed to save: ${err.message}` });
      }
    } else {
      localStorage.setItem('user_gemini_api_key', apiKey);
      localStorage.setItem('user_gemini_model', model);
      localStorage.setItem('user_ai_name', aiName);
      localStorage.setItem('user_ai_tone', aiTone);
      localStorage.setItem('user_show_floating_widget', showWidget.toString());
      setSaveResult({ success: true, message: 'API key and AI personality saved locally.' });
      window.dispatchEvent(new CustomEvent('ai-settings-updated'));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--t-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">AI Assistant Settings</h1>
          <p className="text-[var(--t-text-muted)]">Configure your personal Gemini API key to enable AI-powered features.</p>
        </div>
      )}

      {/* Guide Card */}
      <div className="bg-[var(--t-surface)]/50 rounded-2xl border border-[var(--t-border)] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-[var(--t-primary)]" />
          Setup Instructions
        </h2>
        
        <div className="space-y-3 text-[var(--t-text-muted)] text-sm">
          <p>Follow these steps to get your free API key from Google AI Studio:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>
              Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] hover:text-[var(--t-error)]/80 inline-flex items-center gap-1 underline underline-offset-4">
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Sign in with your Google Account.</li>
            <li>Click "Create API key in new project".</li>
            <li>Copy the generated key and paste it below.</li>
          </ol>
        </div>
      </div>

      {/* Model Selection Card */}
      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-primary)]/20 shadow-lg shadow-[var(--t-primary)]/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--t-primary)]" />
          General AI Settings
        </h2>
        <div>
          <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-3">Preferred AI Model</label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', desc: 'Higher daily limits, best for continuous testing.' },
              { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast performance, but very low daily limits (20 RPD).' },
              { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Powerful advanced reasoning model identified in your project.' },
              { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', desc: 'Balanced performance with better availability.' },
              { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Experimental next-gen performance.' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  model === m.id 
                    ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' 
                    : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === m.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{m.label}</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Personality Section */}
        <div className="pt-6 border-t border-[var(--t-border)] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Assistant Name</label>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="e.g., WholeScale Buddy"
                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Response Tone</label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all appearance-none"
              >
                <option value="friendly">Friendly (Warm & Helpful)</option>
                <option value="professional">Professional (Formal & Precise)</option>
                <option value="direct">Direct (Concise & Efficient)</option>
                <option value="custom">Custom (Follow Guidelines)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--t-surface)]/50 rounded-xl border border-[var(--t-border)]">
            <div>
              <p className="text-white font-medium">Floating AI Widget</p>
              <p className="text-xs text-[var(--t-text-muted)]">Show a draggable AI bubble available on all pages</p>
            </div>
            <button
              onClick={() => handleToggleWidget(!showWidget)}
              className={`w-12 h-6 rounded-full transition-colors relative ${showWidget ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-subtle)]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showWidget ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">

        <div>
          <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all"
            />
            <button
              onClick={handleTestKey}
              disabled={testing || !apiKey}
              className="px-4 py-2 bg-[var(--t-surface)] hover:bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)] rounded-xl border border-[var(--t-border)] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${testResult.success ? 'bg-[var(--t-success)]/10 border border-[var(--t-success)]/20 text-[var(--t-success)]' : 'bg-[var(--t-error)]/10 border border-[var(--t-error)]/20 text-[var(--t-error)]'}`}>
            {testResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        {saveResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${saveResult.success ? 'bg-[var(--t-primary)]/10 border border-[var(--t-primary)]/20 text-[var(--t-primary)]' : 'bg-[var(--t-error)]/10 border border-[var(--t-error)]/20 text-[var(--t-error)]'}`}>
            {saveResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{saveResult.message}</span>
          </div>
        )}

        <div className="pt-4 border-t border-[var(--t-border)]">
          <button
            onClick={handleSaveKey}
            disabled={saving || !apiKey}
            className="w-full bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[var(--t-primary-dim)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save AI Settings
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--t-text-muted)]">
        Your API key is stored locally in your workspace connections and is only used to fulfill your specific AI requests.
      </p>
    </div>
  );
}
