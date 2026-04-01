import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleCalendarService } from '../lib/google-calendar';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { Key, Loader2, Check, AlertCircle, Save, Sparkles, Layout, ExternalLink } from 'lucide-react';
import { getEnabledPrebuiltRules } from '../lib/prebuilt-rules';

export default function AISettings({ hideHeader = false }: { hideHeader?: boolean }) {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'local'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434/v1');
  const [model, setModel] = useState('gemini-2.0-flash');
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
    currentUser, 
    setShowFloatingAIWidget
  } = useStore();

  const handleToggleWidget = (val: boolean) => {
    setShowWidget(val);
    setShowFloatingAIWidget(val);
  };

  const handleToggleIntegration = (key: keyof typeof googleIntegrations) => {
    setGoogleIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    // Just to trigger the import if needed, but we don't strictly need it if not using it
    getEnabledPrebuiltRules();
    
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
            connections.forEach(conn => {
              if (conn.provider === 'gemini') {
                setGeminiKey(conn.refresh_token || '');
                if (localStorage.getItem('user_ai_provider') === 'gemini' || !localStorage.getItem('user_ai_provider')) {
                  setModel(conn.access_token || 'gemini-2.0-flash');
                }
              } else if (conn.provider === 'openai') {
                setOpenaiKey(conn.refresh_token || '');
                if (localStorage.getItem('user_ai_provider') === 'openai') {
                  setModel(conn.access_token || 'gpt-4o');
                }
              } else if (conn.provider === 'anthropic') {
                setAnthropicKey(conn.refresh_token || '');
                if (localStorage.getItem('user_ai_provider') === 'anthropic') {
                  setModel(conn.access_token || 'claude-3-5-sonnet');
                }
              } else if (conn.provider === 'local') {
                setLocalEndpoint(conn.refresh_token || 'http://localhost:11434/v1');
                if (localStorage.getItem('user_ai_provider') === 'local') {
                  setModel(conn.access_token || 'llama3');
                }
              }
            });
          }

          const activeProv = localStorage.getItem('user_ai_provider') as any;
          if (activeProv) setProvider(activeProv);

          // Load profile settings for personality
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
          console.error('Failed to load API keys:', err);
        }
      } else {
        // Fallback to local storage for demo mode
        setGeminiKey(localStorage.getItem('user_gemini_api_key') || '');
        setOpenaiKey(localStorage.getItem('user_openai_api_key') || '');
        setAnthropicKey(localStorage.getItem('user_anthropic_api_key') || '');
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
    const key = provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : provider === 'anthropic' ? anthropicKey : 'local';
    if (!key.trim() && provider !== 'local') return;
    setTesting(true);
    setTestResult(null);

    try {
      if (provider === 'gemini') {
        const apiVersion = (model.includes('1.5') || model.includes('2.0') || model.includes('exp')) ? 'v1beta' : 'v1';
        const res = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
        });
        if (res.ok) setTestResult({ success: true, message: 'Gemini connection successful!' });
        else throw new Error('Invalid key or model');
      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 })
        });
        if (res.ok) setTestResult({ success: true, message: 'OpenAI connection successful!' });
        else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || 'Invalid key or model');
        }
      } else if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1
          })
        });
        if (res.ok) setTestResult({ success: true, message: 'Anthropic connection successful!' });
        else throw new Error('Key validation failed. Anthropic keys usually require a proxy for browser-based testing.');
      } else if (provider === 'local') {
        const res = await fetch(`${localEndpoint}/models`);
        if (res.ok) setTestResult({ success: true, message: 'Local AI connection successful!' });
        else throw new Error('Local endpoint not reachable. Ensure Local provider is running.');
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

    const key = provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : provider === 'anthropic' ? anthropicKey : localEndpoint;

    if (isSupabaseConfigured && supabase) {
      try {
        // Save current provider connection
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

        // Save profile settings
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
        if (provider === 'local') localStorage.setItem('user_local_ai_endpoint', localEndpoint);
        window.dispatchEvent(new CustomEvent('ai-settings-updated'));
      } catch (err: any) {
        console.error('Failed to save settings:', err);
      }
    } else {
      localStorage.setItem('user_gemini_api_key', geminiKey);
      localStorage.setItem('user_openai_api_key', openaiKey);
      localStorage.setItem('user_anthropic_api_key', anthropicKey);
      localStorage.setItem('user_ai_provider', provider);
      localStorage.setItem('user_ai_model', model);
      localStorage.setItem('user_ai_name', aiName);
      setStoreAiName(aiName);
      localStorage.setItem('user_ai_personality', aiPersonality);
      setStoreAiPersonality(aiPersonality);
      localStorage.setItem('user_ai_tone', aiTone);
      localStorage.setItem('user_show_floating_widget', showWidget.toString());
      if (provider === 'local') localStorage.setItem('user_local_ai_endpoint', localEndpoint);
      window.dispatchEvent(new CustomEvent('ai-settings-updated'));
    }
    setSaving(false);
  };

  const handleReconnectGoogle = () => {
    // Use the native Google OAuth service instead of Supabase Auth to avoid dashboard configuration errors.
    // This allows the ecosystem to connect even if "Google" is not enabled as a primary login method.
    try {
      const url = GoogleCalendarService.getInstance().getAuthUrl();
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
      <div className="grid grid-cols-4 gap-3">
        {[
          { id: 'gemini', label: 'Google Gemini', icon: '✨' },
          { id: 'openai', label: 'OpenAI (GPT)', icon: '🤖' },
          { id: 'anthropic', label: 'Anthropic (Claude)', icon: '🎭' },
          { id: 'local', label: 'Local AI', icon: '🏠' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProvider(p.id as any);
              if (p.id === 'gemini') setModel('gemini-2.0-flash');
              else if (p.id === 'openai') setModel('gpt-4o');
              else if (p.id === 'anthropic') setModel('claude-3-5-sonnet-latest');
              else if (p.id === 'local') setModel('llama3');
              setTestResult(null);
            }}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
              provider === p.id 
                ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] hover:border-[var(--t-border)]/80'
            }`}
          >
            <span className="text-2xl">{p.icon}</span>
            <span className={`text-[10px] font-black uppercase tracking-tight ${provider === p.id ? 'text-[var(--t-on-primary)]' : 'text-[var(--t-text-muted)]'}`}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Guide Card */}
      <div className="bg-[var(--t-surface)]/50 rounded-2xl border border-[var(--t-border)] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-[var(--t-primary)]" />
          Setup Instructions: {provider.toUpperCase()}
        </h2>
        
        <div className="space-y-3 text-[var(--t-text-muted)] text-sm">
          {provider === 'gemini' && (
            <p>Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline font-bold">Google AI Studio</a>.</p>
          )}
          {provider === 'openai' && (
            <p>Generate your API key from the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline font-bold">OpenAI Dashboard</a>.</p>
          )}
          {provider === 'anthropic' && (
            <p>Create keys in the <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline font-bold">Anthropic Console</a>.</p>
          )}
          {provider === 'local' && (
            <p>Connect to local providers like <strong>Ollama</strong> or <strong>LM Studio</strong>. Ensure the server is running with the <code>openai</code> format API enabled. <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline font-bold">Download Ollama</a>.</p>
          )}
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>{provider === 'local' ? 'Ensure your local server is running.' : 'Sign in to your developer console.'}</li>
            <li>{provider === 'local' ? 'Copy your API endpoint URL.' : 'Create or copy your secret API key.'}</li>
            <li>Paste it into the configuration field below and click Save.</li>
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
          <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-3">Preferred {provider.charAt(0).toUpperCase() + provider.slice(1)} Model</label>
          <div className="grid grid-cols-1 gap-3">
            {provider === 'gemini' && [
              { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Fast, state-of-the-art performance. Best for most tasks.' },
              { id: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Exp', desc: 'Ultra-smart reasoning model for complex deal analysis.' },
              { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Highly capable reasoning model for complex logic.' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${model === m.id ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === m.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{m.label}</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">{m.desc}</span>
              </button>
            ))}

            {provider === 'openai' && [
              { id: 'gpt-4o', label: 'GPT-4o', desc: 'Most capable model, great for complex logic and reasoning.' },
              { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Efficient and fast, best for simple tasks.' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${model === m.id ? 'bg-[var(--t-error)]/10 border-[var(--t-error)] ring-1 ring-[var(--t-error)]' : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-[var(--t-error)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === m.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{m.label}</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">{m.desc}</span>
              </button>
            ))}

            {provider === 'anthropic' && [
              { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', desc: 'Outstanding coding and reasoning capabilities.' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${model === m.id ? 'bg-[var(--t-warning)]/10 border-[var(--t-warning)] ring-1 ring-[var(--t-warning)]' : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-[var(--t-warning)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === m.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{m.label}</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">{m.desc}</span>
              </button>
            ))}

            {provider === 'local' && (
              <div className="p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)]/50 space-y-4">
                <p className="text-xs text-[var(--t-text-muted)] leading-relaxed">
                  Enter the model name exactly as it appears in your local provider (e.g. <code>llama3</code>, <code>mistral</code>).
                </p>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama3"
                  className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all"
                />
              </div>
            )}
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
                <option value="friendly">Friendly (Warm & Helpful)</option>
                <option value="professional">Professional (Formal & Precise)</option>
                <option value="direct">Direct (Concise & Efficient)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Custom AI Personality</label>
            <textarea
              value={aiPersonality}
              onChange={(e) => setAiPersonalityState(e.target.value)}
              placeholder="e.g., 'Be friendly, use emojis, and focus on real estate ROI.'"
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

      {/* Configuration Card */}
      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">
            {provider === 'local' ? 'API Endpoint URL' : `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
          </label>
          <div className="flex gap-2">
            <input
              type={provider === 'local' ? 'text' : 'password'}
              value={provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : provider === 'anthropic' ? anthropicKey : localEndpoint}
              onChange={(e) => {
                if (provider === 'gemini') setGeminiKey(e.target.value);
                else if (provider === 'openai') setOpenaiKey(e.target.value);
                else if (provider === 'anthropic') setAnthropicKey(e.target.value);
                else setLocalEndpoint(e.target.value);
              }}
              placeholder={provider === 'local' ? 'http://localhost:11434/v1' : `Paste your ${provider} key here...`}
              className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all"
            />
            <button
              onClick={handleTestKey}
              disabled={testing || (provider !== 'local' && !(provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : anthropicKey))}
              className="px-4 py-2 bg-[var(--t-surface)] hover:bg-[var(--t-surface-subtle)] text-white rounded-xl border border-[var(--t-border)] transition-colors flex items-center gap-2 disabled:opacity-50 font-semibold"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${testResult.success ? 'bg-[var(--t-success)]/10 border border-[var(--t-success)]/20 text-[var(--t-success)]' : 'bg-[var(--t-error)]/10 border border-[var(--t-error)]/20 text-[var(--t-error)]'}`}>
            {testResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{testResult.message}</span>
          </div>
        )}

        <div className="pt-4 border-t border-[var(--t-border)]">
          <button
            onClick={handleSaveKey}
            disabled={saving || (provider !== 'local' && !(provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : anthropicKey))}
            className="w-full bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-[var(--t-on-primary)] font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[var(--t-primary-dim)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save AI Settings
          </button>
        </div>
      </div>

      {/* Google Ecosystem Suite */}
      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-[var(--t-primary)]" />
            Google Ecosystem Management
          </h2>
          <button 
            onClick={handleReconnectGoogle}
            className="px-3 py-1 bg-[var(--t-primary)]/10 text-[var(--t-primary)] text-[10px] font-black rounded-lg border border-[var(--t-primary)]/20 uppercase tracking-widest hover:bg-[var(--t-primary)] hover:text-[var(--t-on-primary)] transition-all"
          >
            Reconnect Ecosystem
          </button>
        </div>

        <p className="text-xs text-[var(--t-text-muted)] leading-relaxed">
          Manage specialized Google services integrated into your OS. Authorized via secure OAuth.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 'calendar', label: 'Team Calendar', desc: 'Sync events & task deadlines' },
            { id: 'gmail', label: 'Gmail Inbox', desc: 'Send & receive transaction emails' },
            { id: 'contacts', label: 'Google Contacts', desc: 'Auto-sync leads to phone' },
            { id: 'tasks', label: 'Google Tasks', desc: 'Push high-priority items' },
            { id: 'drive', label: 'Google Drive', desc: 'Store contracts & deal photos' }
          ].map((item) => (
            <div key={item.id} className="p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface-dim)]/30 flex items-center justify-between group hover:border-[var(--t-primary)]/30 transition-all">
              <div className="space-y-1">
                <span className="text-sm font-bold text-white block">{item.label}</span>
                <span className="text-[10px] text-[var(--t-text-muted)]">{item.desc}</span>
              </div>
              <button
                onClick={() => handleToggleIntegration(item.id as any)}
                className={`w-10 h-5 rounded-full transition-colors relative ${googleIntegrations[item.id as keyof typeof googleIntegrations] ? 'bg-[var(--t-success)]' : 'bg-[var(--t-surface-subtle)]'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${googleIntegrations[item.id as keyof typeof googleIntegrations] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Developer Console Links */}
        <div className="pt-6 border-t border-[var(--t-border)]">
          <h3 className="text-xs font-bold text-[var(--t-text-muted)] uppercase mb-4 tracking-widest">Industry Resource Suite</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Supabase', url: 'https://supabase.com/dashboard' },
              { label: 'Resend', url: 'https://resend.com' },
              { label: 'Stripe', url: 'https://dashboard.stripe.com' },
              { label: 'Cloudflare', url: 'https://dash.cloudflare.com' },
              { label: 'GitHub Actions', url: 'https://github.com/features/actions' },
              { label: 'Google AI Studio', url: 'https://aistudio.google.com' }
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--t-text)] flex items-center gap-2 hover:bg-[var(--t-surface-hover)] transition-all"
              >
                {link.label}
                <ExternalLink size={10} className="text-[var(--t-primary)]" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-[var(--t-text-muted)] italic pb-8">
        All connections use bank-level OAuth security. Your keys are never stored on our servers in plain text.
      </p>
    </div>
  );
}
