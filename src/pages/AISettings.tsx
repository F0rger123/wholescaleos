import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleCalendarService } from '../lib/google-calendar';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { Key, Loader2, Check, Save, Sparkles, Bot, Shield, Zap } from 'lucide-react';
import { AIProviderSettings } from '../components/settings/AIProviderSettings';

export default function AISettings({ hideHeader = false }: { hideHeader?: boolean }) {
  const [provider, setProvider] = useState<'gemini' | 'local'>('local');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434/v1');
  const [model, setModel] = useState('os-bot');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiName, setAiName] = useState('OS Bot');
  const [aiPersonality, setAiPersonalityState] = useState('Professional');
  const [aiCustomPrompt, setAiCustomPromptState] = useState('');
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
    aiCustomPrompt: storeAiCustomPrompt,
    setAiCustomPrompt: setStoreAiCustomPrompt,
    setAiTone,
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
              if (conn.provider === 'local') {
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
          if (profile?.settings?.ai_custom_prompt) setAiCustomPromptState(profile.settings.ai_custom_prompt);
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
        setLocalEndpoint(localStorage.getItem('user_local_ai_endpoint') || 'http://localhost:11434/v1');
        
        const localProvider = localStorage.getItem('user_ai_provider') as any;
        if (localProvider) setProvider(localProvider);
        
        const localModel = localStorage.getItem('user_ai_model');
        if (localModel) setModel(localModel);
        
        const localAiName = localStorage.getItem('wholescale-ai-name');
        if (localAiName) setAiName(localAiName);
        else setAiName(storeAiName);

        const localAiPersonality = localStorage.getItem('wholescale-ai-personality');
        if (localAiPersonality) setAiPersonalityState(localAiPersonality);
        else setAiPersonalityState(storeAiPersonality);

        const localAiCustomPrompt = localStorage.getItem('wholescale-ai-custom-prompt');
        if (localAiCustomPrompt) setAiCustomPromptState(localAiCustomPrompt);
        else setAiCustomPromptState(storeAiCustomPrompt);

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


  const handleSavePersona = async () => {
    if (!currentUser?.id) return;
    setSaving(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle();
        await supabase.from('profiles').update({
          settings: {
            ...(profile?.settings || {}),
            ai_name: aiName, 
            ai_personality: aiPersonality, 
            ai_custom_prompt: aiCustomPrompt,
            show_floating_widget: showWidget,
            google_integrations: googleIntegrations,
            updated_at: new Date().toISOString()
          }
        }).eq('id', currentUser.id);

        localStorage.setItem('wholescale-ai-name', aiName);
        setStoreAiName(aiName);
        localStorage.setItem('wholescale-ai-personality', aiPersonality);
        setStoreAiPersonality(aiPersonality);
        localStorage.setItem('wholescale-ai-custom-prompt', aiCustomPrompt);
        setStoreAiCustomPrompt(aiCustomPrompt);
        
        if (aiPersonality !== 'Custom') {
           setAiTone(aiPersonality);
           localStorage.setItem('wholescale-ai-tone', aiPersonality);
        }

        window.dispatchEvent(new CustomEvent('ai-settings-updated'));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err: any) {
        console.error('Failed to save settings:', err);
        toast.error('Failed to save settings.');
      }
    } else {
      localStorage.setItem('wholescale-ai-name', aiName);
      setStoreAiName(aiName);
      localStorage.setItem('wholescale-ai-personality', aiPersonality);
      setStoreAiPersonality(aiPersonality);
      localStorage.setItem('wholescale-ai-custom-prompt', aiCustomPrompt);
      setStoreAiCustomPrompt(aiCustomPrompt);
      if (aiPersonality !== 'Custom') {
         setAiTone(aiPersonality);
         localStorage.setItem('wholescale-ai-tone', aiPersonality);
      }
      localStorage.setItem('user_show_floating_widget', showWidget.toString());
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

      {/* New Hybrid AI Provider Settings */}
      <AIProviderSettings />

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
                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Bot Personality</label>
              <select
                value={aiPersonality}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Cursing') {
                    const confirmed = window.confirm("Cursing mode will use mild profanity (hell, damn, s***) in responses. Are you sure you want to enable this?");
                    if (!confirmed) return;
                  }
                  setAiPersonalityState(val);
                }}
                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all appearance-none"
              >
                <option value="Professional">Professional</option>
                <option value="Casual">Casual</option>
                <option value="Sassy">Sassy</option>
                <option value="Funny">Funny</option>
                <option value="Cursing">Crushing It (Adult Mode)</option>
                <option value="Custom">Custom Prompt</option>
              </select>
            </div>
          </div>
          {aiPersonality === 'Custom' && (
            <div>
              <label className="block text-sm font-medium text-[var(--t-text-muted)] mb-2">Custom Personality Prompt</label>
              <textarea
                value={aiCustomPrompt}
                onChange={(e) => setAiCustomPromptState(e.target.value)}
                rows={3}
                placeholder="e.g. Call me Commander. Sassy and witty. Emoji overload."
                className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 transition-all resize-none text-sm"
              />
            </div>
          )}
          <div className="flex items-center justify-between p-4 bg-[var(--t-bg)] rounded-xl border border-[var(--t-border)]">
            <div>
              <p className="text-white font-medium">Floating AI Widget</p>
              <p className="text-xs text-[var(--t-text-muted)]">Show a draggable AI bubble available on all pages</p>
            </div>
            <button
              onClick={() => handleToggleWidget(!showWidget)}
              className={`w-12 h-6 rounded-full transition-colors relative ${showWidget ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-border)]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showWidget ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSavePersona}
          disabled={saving}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
            saveSuccess 
              ? 'bg-[var(--t-success)] text-white' 
              : 'bg-[var(--t-primary)] text-white'
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
              Save Persona Settings
            </>
          )}
        </button>
      </div>

      {/* Legacy/Testing section removed - handled by AIProviderSettings */}

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
