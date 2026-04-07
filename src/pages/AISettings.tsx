import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleCalendarService } from '../lib/google-calendar';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { Key, Loader2, Check, Save, Sparkles } from 'lucide-react';

export default function AISettings({ hideHeader = false }: { hideHeader?: boolean }) {
  const [provider, setProvider] = useState<'gemini' | 'local'>('local');
  const [geminiKey, setGeminiKey] = useState('');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434/v1');
  const [model, setModel] = useState('os-bot');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiName, setAiName] = useState('OS Bot');
  const [aiPersonality, setAiPersonalityState] = useState('');
  const [aiTone, setAiTone] = useState('friendly');
  const [showWidget, setShowWidget] = useState(false);
  
  // Google Ecosystem Toggles
  const [googleIntegrations, setGoogleIntegrations] = useState({
    calendar: true,
    gmail: true,
    contacts: true,
    tasks: true,
    drive: false
  });

  const { 
    aiName: storeAiName, 
    setAiName: setStoreAiName,
    aiPersonality: storeAiPersonality, 
    setAiPersonality: setStoreAiPersonality,
    aiTone: storeAiTone,
    setAiTone: setStoreAiTone,
    currentUser, 
    setShowFloatingAIWidget
  } = useStore();

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
          const { data: connections } = await supabase
            .from('user_connections')
            .select('provider, refresh_token, access_token')
            .eq('user_id', currentUser.id);

          if (connections) {
            connections.forEach((conn: any) => {
              if (conn.provider === 'gemini') {
                setGeminiKey(conn.refresh_token || '');
                if (localStorage.getItem('user_ai_provider') === 'gemini' || !localStorage.getItem('user_ai_provider')) {
                  setModel(conn.access_token || 'gemini-3.1-flash-lite');
                }
              } else if (conn.provider === 'local') {
                setLocalEndpoint(conn.refresh_token || 'http://localhost:11434/v1');
                if (localStorage.getItem('user_ai_provider') === 'local') {
                  setModel(conn.access_token || 'os-bot');
                }
              }
            });
          }

          const activeProv = localStorage.getItem('user_ai_provider') as any;
          if (activeProv) setProvider(activeProv);

          const { data: profile } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', currentUser.id)
            .maybeSingle();
          
          if (profile?.settings?.ai_name) setAiName(profile.settings.ai_name);
          if (profile?.settings?.ai_personality) setAiPersonalityState(profile.settings.ai_personality);
          if (profile?.settings?.ai_tone) setAiTone(profile.settings.ai_tone);
          if (profile?.settings?.show_floating_widget !== undefined) {
            setShowWidget(profile.settings.show_floating_widget);
            setShowFloatingAIWidget(profile.settings.show_floating_widget);
          }
          if (profile?.settings?.google_integrations) {
            setGoogleIntegrations(profile.settings.google_integrations);
          }
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      } else {
        setGeminiKey(localStorage.getItem('user_gemini_api_key') || '');
        setLocalEndpoint(localStorage.getItem('user_local_ai_endpoint') || 'http://localhost:11434/v1');
        
        const localProvider = localStorage.getItem('user_ai_provider') as any;
        if (localProvider) setProvider(localProvider);
        
        const localModel = localStorage.getItem('user_ai_model');
        if (localModel) setModel(localModel);
        
        const localAiName = localStorage.getItem('user_ai_name');
        if (localAiName) setAiName(localAiName);
        else setAiName(storeAiName);

        const localAiPersonality = localStorage.getItem('user_ai_personality');
        if (localAiPersonality) setAiPersonalityState(localAiPersonality);
        else setAiPersonalityState(storeAiPersonality);

        const localAiTone = localStorage.getItem('wholescale-ai-tone') || localStorage.getItem('user_ai_tone');
        if (localAiTone) setAiTone(localAiTone);
        else setAiTone(storeAiTone);

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
    if (provider === 'gemini' && !geminiKey.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      if (provider === 'gemini') {
        const apiVersion = (model.includes('1.5') || model.includes('2.0') || model.includes('exp')) ? 'v1beta' : 'v1';
        const res = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
        });
        if (res.ok) setTestResult({ success: true, message: 'Gemini connection successful!' });
        else throw new Error('Invalid key or model');
      } else if (provider === 'local') {
        if (model === 'os-bot') {
          setTestResult({ success: true, message: 'OS Bot is always ready! No connection test needed.' });
        } else {
          const res = await fetch(`${localEndpoint}/models`);
          if (res.ok) setTestResult({ success: true, message: 'Local AI connection successful!' });
          else throw new Error('Local endpoint not reachable.');
        }
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Connection failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!currentUser?.id) return;
    setSaving(true);

    const key = provider === 'gemini' ? geminiKey : localEndpoint;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: existing } = await supabase
          .from('user_connections')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('provider', provider)
          .maybeSingle();

        if (existing) {
          await supabase.from('user_connections').update({
            access_token: model, refresh_token: key, updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('user_connections').insert({
            user_id: currentUser.id, provider, access_token: model, refresh_token: key, updated_at: new Date().toISOString(),
          });
        }

        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle();
        await supabase.from('profiles').update({
          settings: {
            ...(profile?.settings || {}),
            ai_name: aiName, ai_personality: aiPersonality, ai_tone: aiTone, show_floating_widget: showWidget,
            active_ai_provider: provider, active_ai_model: model,
            google_integrations: googleIntegrations,
            updated_at: new Date().toISOString()
          }
        }).eq('id', currentUser.id);

        localStorage.setItem('user_ai_provider', provider);
        localStorage.setItem('user_ai_model', model);
        localStorage.setItem('user_ai_name', aiName);
        setStoreAiName(aiName);
        localStorage.setItem('user_ai_personality', aiPersonality);
        setStoreAiPersonality(aiPersonality);
        localStorage.setItem('wholescale-ai-tone', aiTone);
        setStoreAiTone(aiTone);
        if (provider === 'local') localStorage.setItem('user_local_ai_endpoint', localEndpoint);
        window.dispatchEvent(new CustomEvent('ai-settings-updated'));
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err: any) {
        console.error('Failed to save settings:', err);
        toast.error('Failed to save settings.');
      }
    } else {
      localStorage.setItem('user_gemini_api_key', geminiKey);
      localStorage.setItem('user_ai_provider', provider);
      localStorage.setItem('user_ai_model', model);
      localStorage.setItem('user_ai_name', aiName);
      setStoreAiName(aiName);
      localStorage.setItem('user_ai_personality', aiPersonality);
      setStoreAiPersonality(aiPersonality);
      localStorage.setItem('wholescale-ai-tone', aiTone);
      setStoreAiTone(aiTone);
      localStorage.setItem('user_ai_tone', aiTone);
      localStorage.setItem('user_show_floating_widget', showWidget.toString());
      if (provider === 'local') localStorage.setItem('user_local_ai_endpoint', localEndpoint);
      window.dispatchEvent(new CustomEvent('ai-settings-updated'));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setSaving(false);
  };

  const handleReconnectGoogle = () => {
    try {
      const state = `calendar-sync:${window.location.pathname}`;
      const url = GoogleCalendarService.getInstance().getAuthUrl(state);
      if (!url) throw new Error('Could not generate Google Auth URL');
      window.location.assign(url);
    } catch (err) {
      console.error('[AISettings] Reconnect failed:', err);
      toast.error('Could not initiate Google connection.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--t-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">AI & Ecosystem Settings</h1>
          <p className="text-[var(--t-text-muted)]">Configure your AI providers, Google integrations, and developer toolset.</p>
        </div>
      )}

      {/* Provider Selection */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'local', label: 'OS Bot (Built-in AI)', icon: '🤖', desc: 'Free, unlimited, zero-latency' },
          { id: 'gemini', label: 'Google Gemini', icon: '✨', desc: 'Requires API key' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProvider(p.id as any);
              setModel(p.id === 'gemini' ? 'gemini-3.1-flash-lite' : 'os-bot');
              setTestResult(null);
            }}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
              provider === p.id 
                ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] hover:border-[var(--t-border)]/80'
            }`}
          >
            <span className="text-2xl">{p.icon}</span>
            <span className={`text-[10px] font-black uppercase tracking-tight ${provider === p.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{p.label}</span>
            <span className="text-[9px] text-[var(--t-text-muted)]">{p.desc}</span>
          </button>
        ))}
      </div>

      <div className="bg-[var(--t-surface)]/50 rounded-2xl border border-[var(--t-border)] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-[var(--t-primary)]" />
          {provider === 'local' ? 'OS Bot — Ready to Go' : 'Setup Instructions: GEMINI'}
        </h2>
        
        <div className="space-y-3 text-[var(--t-text-muted)] text-sm">
          {provider === 'gemini' ? (
            <>
              <p>Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline font-bold">Google AI Studio</a>.</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Sign in to your developer console.</li>
                <li>Create or copy your secret API key.</li>
                <li>Paste it into the configuration field below and click Save.</li>
              </ol>
            </>
          ) : (
            <div className="bg-[var(--t-success)]/5 border border-[var(--t-success)]/20 rounded-xl p-4">
              <p className="text-[var(--t-success)] font-bold text-sm mb-1">✅ No setup needed!</p>
              <p>OS Bot is powered by our custom-built AI. Zero cost, unlimited messages, runs entirely in your browser.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-primary)]/20 shadow-lg shadow-[var(--t-primary)]/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--t-primary)]" />
          General AI Settings
        </h2>
        <div>
          <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-3">Preferred Model</label>
          <div className="grid grid-cols-1 gap-3">
            {provider === 'local' && (
              <button
                onClick={() => setModel('os-bot')}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${model === 'os-bot' ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === 'os-bot' ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === 'os-bot' ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>🤖 OS Bot (Built-in AI)</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">Zero cost, unlimited messages, runs entirely in your browser.</span>
              </button>
            )}

            {provider === 'gemini' && (
              <button
                onClick={() => setModel('gemini-3.1-flash-lite')}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${model === 'gemini-3.1-flash-lite' ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === 'gemini-3.1-flash-lite' ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === 'gemini-3.1-flash-lite' ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>Gemini 3.1 Flash-Lite</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">High-performance cloud intelligence (mapped to 2.0 Flash).</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--t-border)] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Assistant Name</label>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Response Tone</label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all appearance-none"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="direct">Direct</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Custom AI Personality</label>
            <textarea
              value={aiPersonality}
              onChange={(e) => setAiPersonalityState(e.target.value)}
              rows={3}
              className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all resize-none text-sm"
            />
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

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSaveKey}
          disabled={saving}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
            saveSuccess 
              ? 'bg-[var(--t-success)] text-white shadow-[var(--t-success-dim)]' 
              : 'bg-[var(--t-primary)] text-[var(--t-on-primary)] shadow-[var(--t-primary-dim)]'
          }`}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saveSuccess ? (
            <>
              <Check className="w-5 h-5" />
              Saved ✓
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save AI Settings
            </>
          )}
        </button>
      </div>

      {!(provider === 'local' && model === 'os-bot') && (
        <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">
              {provider === 'local' ? 'API Endpoint URL' : 'Gemini API Key'}
            </label>
            <div className="flex gap-2">
              <input
                type={provider === 'local' ? 'text' : 'password'}
                value={provider === 'gemini' ? geminiKey : localEndpoint}
                onChange={(e) => {
                  if (provider === 'gemini') setGeminiKey(e.target.value);
                  else setLocalEndpoint(e.target.value);
                }}
                className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all"
              />
              <button
                onClick={handleTestKey}
                disabled={testing || (provider === 'gemini' && !geminiKey)}
                className="px-4 py-2 bg-[var(--t-surface)] hover:bg-[var(--t-surface-subtle)] text-white rounded-xl border border-[var(--t-border)] transition-colors flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${testResult.success ? 'bg-[var(--t-success)]/10 text-[var(--t-success)]' : 'bg-[var(--t-error)]/10 text-[var(--t-error)]'}`}>
              <Check className="w-5 h-5 mt-0.5" />
              <p className="text-sm">{testResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Google Ecosystem Connection */}
      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-4">
        <button
          onClick={handleReconnectGoogle}
          className="w-full flex items-center justify-between p-4 bg-[var(--t-primary)]/10 border border-[var(--t-primary)]/20 rounded-xl hover:bg-[var(--t-primary)]/20 transition-all"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-white">Google Workforce Connection</p>
            <p className="text-xs text-[var(--t-text-muted)]">Force refresh Google Tasks & Calendar permissions</p>
          </div>
          <div className="px-4 py-1.5 bg-[var(--t-primary)] text-white text-xs font-black uppercase rounded-lg">Reconnect</div>
        </button>
      </div>
    </div>
  );
}
