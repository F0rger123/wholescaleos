import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { Bot, Key, Shield, Zap, ExternalLink, Moon, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { encryptKey, decryptKey } from '../../lib/ai/crypto';

interface APIKeys {
  gemini?: string | string[];
  openai?: string | string[];
  claude?: string | string[];
  minimax?: string | string[];
  [key: string]: string | string[] | undefined;
}

export const AIProviderSettings: React.FC = () => {
  const { currentUser, updateProfile } = useStore();
  const [keys, setKeys] = useState<APIKeys>({});
  const [provider, setProvider] = useState<string>('local');
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [smartRotateEnabled, setSmartRotateEnabled] = useState(false);
  const [premiumCredits, setPremiumCredits] = useState<number>(0);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [_migrating, setMigrating] = useState(false);
  const [_loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      // Decrypt keys for local state
      const decryptedKeys: APIKeys = {};
      const encryptedKeys = currentUser.user_api_keys || {};
      
      
      Object.entries(encryptedKeys).forEach(([provider, keyData]) => {
        if (Array.isArray(keyData)) {
          decryptedKeys[provider] = keyData.map(k => decryptKey(k, currentUser.id));
        } else {
          decryptedKeys[provider] = decryptKey(keyData as string, currentUser.id);
        }
      });
      
      setKeys(decryptedKeys);
      setProvider(currentUser.preferred_api_provider || 'local');
      setFallbackEnabled(currentUser.api_fallback_enabled ?? true);
      setSmartRotateEnabled(currentUser.smart_rotate_enabled ?? false);
      setPremiumCredits(currentUser.credits_remaining ?? 0);
      
      // Trigger migration check once on load
      checkLegacyMigration();
    }
  }, [currentUser?.id]);

  const checkLegacyMigration = async () => {
    if (!currentUser?.id || localStorage.getItem('ai_keys_migrated')) return;
    
    try {
      const { data: connections } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('provider', 'gemini')
        .maybeSingle();

      if (connections?.refresh_token && !currentUser.user_api_keys?.gemini) {
        setMigrating(true);
        const legacyKey = connections.refresh_token;
        const newKeys = { ...keys, gemini: legacyKey };
        
        // Save using current logic (which will encrypt)
        await saveSettings({ newKeys });
        localStorage.setItem('ai_keys_migrated', 'true');
        toast.success('Legacy Gemini key migrated successfully');
      }
    } catch (err) {
      console.error('Migration failed:', err);
    } finally {
      setMigrating(false);
    }
  };

  const saveSettings = async (params: { 
    newKeys?: APIKeys, 
    newProvider?: string, 
    newFallback?: boolean,
    newRotate?: boolean 
  }) => {
    const { newKeys, newProvider, newFallback, newRotate } = params;
    if (!currentUser) return;
    setLoading(true);
    
    try {
      // Encrypt keys before storing
      const keysToEncrypt = newKeys || keys;
      const encryptedKeys: Record<string, string | string[]> = {};
      
      Object.entries(keysToEncrypt).forEach(([prov, val]) => {
        if (Array.isArray(val)) {
          encryptedKeys[prov] = val.map(v => v ? encryptKey(v, currentUser.id) : '').filter(Boolean);
        } else if (val) {
          encryptedKeys[prov] = encryptKey(val, currentUser.id);
        }
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          user_api_keys: encryptedKeys,
          preferred_api_provider: newProvider || provider,
          api_fallback_enabled: newFallback ?? fallbackEnabled,
          smart_rotate_enabled: newRotate ?? smartRotateEnabled
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      
      // Update local store - filter out undefined values
      const keysToUpdate = newKeys || keys;
      const cleanKeys: Record<string, string | string[]> = {};
      Object.entries(keysToUpdate).forEach(([k, v]) => {
        if (v) cleanKeys[k] = v;
      });

      updateProfile({
        user_api_keys: cleanKeys,
        preferred_api_provider: newProvider || provider,
        api_fallback_enabled: newFallback ?? fallbackEnabled,
        smart_rotate_enabled: newRotate ?? smartRotateEnabled
      });
      
      toast.success('AI settings updated');
    } catch (err) {
      console.error('Failed to save AI settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const providers = [
    { id: 'local', name: 'Local Brain', icon: Bot, desc: 'Privacy-first, free, and fast. Running locally on this device.', color: 'var(--t-primary)' },
    { id: 'gemini', name: 'Google Gemini', icon: Sparkles, desc: 'High-performance multimodal model. Requires Gemini API Key.', color: '#4285F4' },
    { id: 'openai', name: 'OpenAI GPT-4o', icon: Zap, desc: 'Industry-leading intelligence. Requires OpenAI API Key.', color: '#10a37f' },
    { id: 'claude', name: 'Anthropic Claude', icon: Shield, desc: 'Advanced reasoning and safety. Requires Claude API Key.', color: '#d97757' },
    { id: 'minimax', name: 'MiniMax', icon: Moon, desc: 'Elite Chinese LLM optimized for speed.', color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Credits Display */}
      <section className="p-4 rounded-2xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-purple-500 shadow-lg shadow-purple-500/20">
                <Zap className="w-6 h-6 text-white" />
             </div>
             <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>Premium Credits</h3>
                <p className="text-sm opacity-70" style={{ color: 'var(--t-text-muted)' }}>Required for non-local AI models</p>
             </div>
          </div>
          <div className="text-right">
             <div className="text-3xl font-black text-purple-500">{premiumCredits}</div>
             <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Remaining</div>
          </div>
        </div>
      </section>

      {/* Provider Selection */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
          <Bot className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
          Primary Intelligence Layer
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProvider(p.id);
                saveSettings({ newProvider: p.id });
              }}
              className={`p-4 rounded-xl border text-left transition-all duration-300 group relative overflow-hidden ${
                provider === p.id 
                  ? 'border-[var(--t-primary)] ring-2 ring-[var(--t-primary)] ring-opacity-20' 
                  : 'border-[var(--t-border)] hover:border-[var(--t-text-muted)] bg-[var(--t-surface)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${provider === p.id ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-bg)]'}`}>
                  <p.icon className={`w-5 h-5 ${provider === p.id ? 'text-white' : ''}`} style={{ color: provider === p.id ? 'white' : p.color }} />
                </div>
                {provider === p.id && (
                  <div className="bg-[var(--t-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</div>
                )}
              </div>
              <h4 className="font-bold mb-1" style={{ color: 'var(--t-text)' }}>{p.name}</h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{p.desc}</p>
              
              {provider === p.id && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--t-primary)] animate-in slide-in-from-left duration-500" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* API Key Management */}
      <section className="p-6 rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              <Key className="w-5 h-5 text-yellow-500" />
              BYO API Keys
            </h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
              Enable premium cloud models by adding your own keys.
            </p>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <span className="text-xs font-medium" style={{ color: 'var(--t-text-muted)' }}>Smart Rotate</span>
               <button
                 onClick={() => {
                   setSmartRotateEnabled(!smartRotateEnabled);
                   saveSettings({ newRotate: !smartRotateEnabled });
                 }}
                 className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${smartRotateEnabled ? 'bg-purple-500' : 'bg-[var(--t-border)]'}`}
               >
                 <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${smartRotateEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-xs font-medium" style={{ color: 'var(--t-text-muted)' }}>API Fallback</span>
               <button
                 onClick={() => {
                   setFallbackEnabled(!fallbackEnabled);
                   saveSettings({ newFallback: !fallbackEnabled });
                 }}
                 className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${fallbackEnabled ? 'bg-[var(--t-success)]' : 'bg-[var(--t-border)]'}`}
               >
                 <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${fallbackEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          {providers.filter(p => p.id !== 'local').map((p) => (
            <div key={p.id} className="group">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                  {p.name} Key
                </label>
                <div className="flex items-center gap-4">
                  <a 
                    href={
                      p.id === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 
                      p.id === 'openai' ? 'https://platform.openai.com/api-keys' : 
                      p.id === 'claude' ? 'https://console.anthropic.com/settings/keys' :
                      p.id === 'minimax' ? 'https://platform.minimax.io/api-keys' : '#'
                    } 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-1 hover:underline font-medium"
                    style={{ color: 'var(--t-primary)' }}
                  >
                    Get Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <button 
                    onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className="text-[10px] text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
                  >
                    {showKeys[p.id] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {(() => {
                  const currentKeys = Array.isArray(keys[p.id]) ? (keys[p.id] as string[]) : [keys[p.id] as string || ''];
                  return (
                    <>
                      {currentKeys.map((keyVal, idx) => (
                        <div key={idx} className="relative group/key">
                          <input
                            type={showKeys[p.id] ? 'text' : 'password'}
                            value={keyVal}
                            onChange={(e) => {
                              const updated = [...currentKeys];
                              updated[idx] = e.target.value;
                              const newKeys = { ...keys, [p.id]: updated };
                              setKeys(newKeys);
                            }}
                            onBlur={() => saveSettings({ newKeys: keys })}
                            placeholder={`API Key ${idx + 1}...`}
                            className="w-full h-10 px-4 pr-10 rounded-lg border border-[var(--t-border)] bg-[var(--t-bg)] focus:ring-2 focus:ring-[var(--t-primary)] focus:border-transparent transition-all outline-none font-mono text-xs"
                            style={{ color: 'var(--t-text)' }}
                          />
                          {currentKeys.length > 1 && (
                            <button 
                              onClick={() => {
                                const updated = currentKeys.filter((_, i) => i !== idx);
                                const newKeys = { ...keys, [p.id]: updated };
                                setKeys(newKeys);
                                saveSettings({ newKeys });
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500 p-1 opacity-0 group-hover/key:opacity-100 transition-opacity"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const updated = [...currentKeys, ''];
                          const newKeys = { ...keys, [p.id]: updated };
                          setKeys(newKeys);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-colors flex items-center gap-1"
                      >
                        + Add Failover Key
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] flex items-start gap-4">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--t-text)' }}>Security & Privacy</h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
              Your API keys are stored in your private encrypted profile on Supabase. 
              External AI providers do not receive your personal data unless you explicitly trigger them 
              via a fallback or by setting them as your primary intelligence layer.
            </p>
          </div>
        </div>
      </section>

      {/* Local AI Stats / Info */}
      {provider === 'local' && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="p-4 rounded-xl border border-[var(--t-primary)] border-opacity-30 bg-blue-500/5 flex items-center gap-4">
             <Bot className="w-10 h-10 text-[var(--t-primary)] animate-pulse" />
             <div>
               <h4 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>OS Local Brain is Active</h4>
               <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>
                 Processing all intents on-device. No data leaving this environment.
               </p>
             </div>
           </div>
        </section>
      )}
    </div>
  );
};
