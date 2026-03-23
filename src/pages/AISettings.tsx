import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Key, Loader2, Check, AlertCircle, Save, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { PREBUILT_RULES, getEnabledPrebuiltRules, setEnabledPrebuiltRules } from '../lib/prebuilt-rules';

export function AISettings({ hideHeader = false }: { hideHeader?: boolean }) {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash-lite');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiName, setAiName] = useState('OS Bot');
  const [aiTone, setAiTone] = useState('friendly');
  const [showWidget, setShowWidget] = useState(false);
  const [aiRules, setAiRules] = useState<any[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [newAction, setNewAction] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [enabledPrebuilt, setEnabledPrebuilt] = useState<string[]>([]);
  const { currentUser, setShowFloatingAIWidget } = useStore();

  const handleToggleWidget = (val: boolean) => {
    setShowWidget(val);
    setShowFloatingAIWidget(val);
  };

  useEffect(() => {
    setEnabledPrebuilt(getEnabledPrebuiltRules());
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
                // Only set model if it's the active provider
                if (localStorage.getItem('user_ai_provider') === 'gemini' || !localStorage.getItem('user_ai_provider')) {
                  setModel(conn.access_token || 'gemini-2.5-flash-lite');
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
          if (profile?.settings?.ai_tone) setAiTone(profile.settings.ai_tone);
          if (profile?.settings?.show_floating_widget !== undefined) {
            setShowWidget(profile.settings.show_floating_widget);
            setShowFloatingAIWidget(profile.settings.show_floating_widget);
          }
        } catch (err) {
          console.error('Failed to load API keys:', err);
        }
      } else {
        // Fallback to local storage for demo mode
        setGeminiKey(localStorage.getItem('user_gemini_api_key') || '');
        setOpenaiKey(localStorage.getItem('user_openai_api_key') || '');
        setAnthropicKey(localStorage.getItem('user_anthropic_api_key') || '');
        
        const localProvider = localStorage.getItem('user_ai_provider') as any;
        if (localProvider) setProvider(localProvider);
        
        const localModel = localStorage.getItem('user_ai_model');
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
      
      try {
        const localRules = localStorage.getItem('ai_training_rules');
        if (localRules) setAiRules(JSON.parse(localRules));
      } catch (err) {}

      setLoading(false);
    }

    loadKey();
  }, [currentUser]);

  const handleTestKey = async () => {
    const key = provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : anthropicKey;
    if (!key.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      if (provider === 'gemini') {
        const apiVersion = (model.includes('2.0') || model.includes('exp')) ? 'v1beta' : 'v1';
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
        // Anthropic testing via browser fetch often hits CORS or protocol errors without a backend proxy,
        // but we'll try a minimal request with required headers.
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
    setSaveResult(null);

    const key = provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : anthropicKey;

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
            ai_name: aiName, ai_tone: aiTone, show_floating_widget: showWidget,
            active_ai_provider: provider, active_ai_model: model,
            updated_at: new Date().toISOString()
          }
        }).eq('id', currentUser.id);

        localStorage.setItem('user_ai_provider', provider);
        localStorage.setItem('user_ai_model', model);
        setSaveResult({ success: true, message: 'AI settings saved successfully.' });
        window.dispatchEvent(new CustomEvent('ai-settings-updated'));
      } catch (err: any) {
        setSaveResult({ success: false, message: `Failed to save: ${err.message}` });
      }
    } else {
      localStorage.setItem('user_gemini_api_key', geminiKey);
      localStorage.setItem('user_openai_api_key', openaiKey);
      localStorage.setItem('user_anthropic_api_key', anthropicKey);
      localStorage.setItem('user_ai_provider', provider);
      localStorage.setItem('user_ai_model', model);
      localStorage.setItem('user_ai_name', aiName);
      localStorage.setItem('user_ai_tone', aiTone);
      localStorage.setItem('user_show_floating_widget', showWidget.toString());
      setSaveResult({ success: true, message: 'AI settings saved locally.' });
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
          <p className="text-[var(--t-text-muted)]">Configure your personal AI provider and API keys to enable Intelligent features.</p>
        </div>
      )}

      {/* Provider Selection */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'gemini', label: 'Google Gemini', icon: '✨' },
          { id: 'openai', label: 'OpenAI (GPT)', icon: '🤖' },
          { id: 'anthropic', label: 'Anthropic (Claude)', icon: '🎭' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProvider(p.id as any);
              if (p.id === 'gemini') setModel('gemini-2.5-flash-lite');
              else if (p.id === 'openai') setModel('gpt-4o');
              else if (p.id === 'anthropic') setModel('claude-3-5-sonnet');
              setTestResult(null);
            }}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
              provider === p.id 
                ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] hover:border-[var(--t-border)]/80'
            }`}
          >
            <span className="text-2xl">{p.icon}</span>
            <span className={`text-sm font-bold ${provider === p.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{p.label}</span>
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
            <p>Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline">Google AI Studio</a>.</p>
          )}
          {provider === 'openai' && (
            <p>Generate your API key from the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline">OpenAI Dashboard</a>.</p>
          )}
          {provider === 'anthropic' && (
            <p>Created keys in the <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--t-primary)] underline">Anthropic Console</a>.</p>
          )}
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Sign in to your provider's developer console.</li>
            <li>Create or copy your secret API key.</li>
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
              { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', desc: 'Higher daily limits, best for continuous testing.' },
              { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast performance, but very low daily limits (20 RPD).' },
              { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Powerful advanced reasoning model.' },
              { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', desc: 'Balanced performance with better availability.' }
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

            {provider === 'openai' && [
              { id: 'gpt-4o', label: 'GPT-4o', desc: 'Most capable model, great for complex logic and reasoning.' },
              { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Efficient and fast, best for simple tasks.' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  model === m.id 
                    ? 'bg-[var(--t-error)]/10 border-[var(--t-error)] ring-1 ring-[var(--t-error)]' 
                    : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-[var(--t-error)]' : 'bg-[var(--t-surface-dim)]'}`} />
                  <span className={`font-medium ${model === m.id ? 'text-white' : 'text-[var(--t-text-muted)]'}`}>{m.label}</span>
                </div>
                <span className="text-xs text-[var(--t-text-muted)]">{m.desc}</span>
              </button>
            ))}

            {provider === 'anthropic' && [
              { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', desc: 'Outstanding coding and reasoning capabilities.' },
              { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku', desc: 'Fastest Claude model for quick interactions.' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  model === m.id 
                    ? 'bg-[var(--t-warning)]/10 border-[var(--t-warning)] ring-1 ring-[var(--t-warning)]' 
                    : 'bg-[var(--t-surface)]/50 border-[var(--t-border)] hover:border-[var(--t-border)]/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${model === m.id ? 'bg-[var(--t-warning)]' : 'bg-[var(--t-surface-dim)]'}`} />
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
          <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">
            {provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : anthropicKey}
              onChange={(e) => {
                if (provider === 'gemini') setGeminiKey(e.target.value);
                else if (provider === 'openai') setOpenaiKey(e.target.value);
                else setAnthropicKey(e.target.value);
              }}
              placeholder={`Paste your ${provider} key here...`}
              className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all"
            />
            <button
              onClick={handleTestKey}
              disabled={testing || (provider === 'gemini' ? !geminiKey : provider === 'openai' ? !openaiKey : !anthropicKey)}
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
            disabled={saving || (provider === 'gemini' ? !geminiKey : provider === 'openai' ? !openaiKey : !anthropicKey)}
            className="w-full bg-[var(--t-primary)] hover:bg-[var(--t-primary)] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[var(--t-primary-dim)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save AI Settings
          </button>
        </div>
      </div>

      {/* Local AI Task Engine Configuration */}
      <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--t-success)]" />
          Local AI Training Rules
        </h2>
        <p className="text-sm text-[var(--t-text-muted)] leading-relaxed">
          Create rules to instantly execute actions when you say specific keywords. 
          These commands bypass the LLM and execute instantly with zero API credits used.
        </p>

        {/* Categories Accordion */}
        <div className="space-y-3 mb-8">
          {Array.from(new Set(PREBUILT_RULES.map(r => r.category))).map(category => {
            const categoryRules = PREBUILT_RULES.filter(r => r.category === category);
            const enabledCount = categoryRules.filter(r => enabledPrebuilt.includes(r.id)).length;
            const isExpanded = expandedCategory === category;

            return (
              <div key={category} className="border border-[var(--t-border)] rounded-xl overflow-hidden bg-[var(--t-surface-hover)]">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full flex items-center justify-between p-4 bg-transparent outline-none"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={18} className="text-[var(--t-text-muted)]"/> : <ChevronRight size={18} className="text-[var(--t-text-muted)]"/>}
                    <span className="font-semibold text-white">{category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--t-primary)]/20 text-[var(--t-primary)] border border-[var(--t-primary)]/30">
                      {enabledCount} / {categoryRules.length} Active
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[var(--t-border)] grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {categoryRules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)]">
                        <div>
                          <p className="text-sm font-medium text-white">"{rule.trigger}"</p>
                          <p className="text-xs text-[var(--t-text-muted)]">→ {rule.action.replace('_', ' ')}</p>
                        </div>
                        <button
                          onClick={() => {
                            const active = enabledPrebuilt.includes(rule.id);
                            const updated = active 
                              ? enabledPrebuilt.filter(id => id !== rule.id)
                              : [...enabledPrebuilt, rule.id];
                            setEnabledPrebuilt(updated);
                            setEnabledPrebuiltRules(updated);
                          }}
                          className={`w-10 h-5 rounded-full transition-colors relative ${enabledPrebuilt.includes(rule.id) ? 'bg-[var(--t-success)]' : 'bg-[var(--t-surface-subtle)]'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabledPrebuilt.includes(rule.id) ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-6 border-t border-[var(--t-border)]">
          <h3 className="text-md font-bold text-white mb-4">Custom Defined Triggers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--t-text-muted)] uppercase mb-2">When I say (Keyword):</label>
            <input
              type="text"
              placeholder="e.g. 'hot leads'"
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-success)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--t-text-muted)] uppercase mb-2">Execute Action:</label>
            <select
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              className="w-full bg-[var(--t-surface-dim)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--t-success)] appearance-none"
            >
              <option value="">Select Action Type...</option>
              <option value="navigate_tasks">Open Pending Tasks</option>
              <option value="navigate_settings">Open Settings</option>
              <option value="show_hot_leads">List Hot Deals</option>
              <option value="navigate_calendar">Open Calendar</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            if (!newTrigger || !newAction) return;
            const updated = [...aiRules, { trigger: newTrigger.toLowerCase(), action: newAction }];
            setAiRules(updated);
            localStorage.setItem('ai_training_rules', JSON.stringify(updated));
            setNewTrigger('');
            setNewAction('');
          }}
          disabled={!newTrigger || !newAction}
          className="px-6 py-2 bg-[var(--t-success)]/10 text-[var(--t-success)] hover:bg-[var(--t-success)] hover:text-white font-bold rounded-xl border border-[var(--t-success)]/20 transition-all text-sm disabled:opacity-50"
        >
          Add Training Rule
        </button>

        {aiRules.length > 0 && (
          <div className="mt-4 border border-[var(--t-border)] rounded-xl overflow-hidden bg-[var(--t-surface-hover)] p-4 space-y-2">
            <h3 className="text-xs font-bold text-[var(--t-text-muted)] uppercase mb-3">Active Offline Directives</h3>
            {aiRules.map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">"{rule.trigger}"</span>
                  <span className="text-[var(--t-text-muted)] text-xs">→</span>
                  <span className="text-xs font-bold text-[var(--t-success)] uppercase">{rule.action.replace('_', ' ')}</span>
                </div>
                <button
                  onClick={() => {
                    const updated = aiRules.filter((_, i) => i !== idx);
                    setAiRules(updated);
                    localStorage.setItem('ai_training_rules', JSON.stringify(updated));
                  }}
                  className="p-1.5 text-[var(--t-error)] hover:bg-[var(--t-error)]/20 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      <p className="text-center text-xs text-[var(--t-text-muted)]">
        Your API key is stored locally in your workspace connections and is only used to fulfill your specific AI requests.
      </p>
    </div>
  );
}
