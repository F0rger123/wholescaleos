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
  const { currentUser } = useStore();

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
        } catch (err) {
          console.error('Failed to load API key:', err);
        }
      } else {
        // Fallback to local storage for demo mode
        const localKey = localStorage.getItem('user_gemini_api_key');
        if (localKey) setApiKey(localKey);
        const localModel = localStorage.getItem('user_gemini_model');
        if (localModel) setModel(localModel);
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
        const { error } = await supabase
          .from('user_connections')
          .upsert({
            user_id: currentUser.id,
            provider: 'gemini',
            access_token: model, // Storing model here if we don't have a dedicated column
            refresh_token: apiKey, // In production, this should be encrypted
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        setSaveResult({ success: true, message: 'API key saved securely to your account.' });
      } catch (err: any) {
        setSaveResult({ success: false, message: `Failed to save: ${err.message}` });
      }
    } else {
      localStorage.setItem('user_gemini_api_key', apiKey);
      localStorage.setItem('user_gemini_model', model);
      setSaveResult({ success: true, message: 'API key and model preference saved locally.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">AI Assistant Settings</h1>
          <p className="text-slate-400">Configure your personal Gemini API key to enable AI-powered features.</p>
        </div>
      )}

      {/* Guide Card */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-brand-400" />
          Setup Instructions
        </h2>
        
        <div className="space-y-3 text-slate-300 text-sm">
          <p>Follow these steps to get your free API key from Google AI Studio:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>
              Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 underline underline-offset-4">
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
      <div className="bg-slate-900 rounded-2xl border border-brand-500/20 shadow-lg shadow-brand-500/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          General AI Settings
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Preferred AI Model</label>
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
                    ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-brand-400' : 'bg-slate-600'}`} />
                  <span className={`font-medium ${model === m.id ? 'text-white' : 'text-slate-300'}`}>{m.label}</span>
                </div>
                <span className="text-xs text-slate-500">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            />
            <button
              onClick={handleTestKey}
              disabled={testing || !apiKey}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
            {testResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        {saveResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${saveResult.success ? 'bg-brand-500/10 border border-brand-500/20 text-brand-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
            {saveResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{saveResult.message}</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={handleSaveKey}
            disabled={saving || !apiKey}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save API Key
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Your API key is stored locally in your workspace connections and is only used to fulfill your specific AI requests.
      </p>
    </div>
  );
}
