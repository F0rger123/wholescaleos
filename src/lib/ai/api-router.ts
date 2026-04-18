import { supabase } from '../supabase';
import { callGemini } from './providers/gemini';
import { callOpenAI } from './providers/openai';
import { callClaude } from './providers/claude';
import { callMiniMax } from './providers/minimax';
import { decryptKey } from './crypto';

export async function callExternalAPI(
  input: string, 
  context: any,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_api_keys, preferred_api_provider, api_fallback_enabled, credits_remaining, smart_rotate_enabled')
      .eq('id', user.id)
      .single();
    
    if (!profile || !profile.api_fallback_enabled) return null;
    
    const provider = profile.preferred_api_provider;
    if (!provider || provider === 'local') return null;

    const apiKeysData = profile.user_api_keys || {};

    // ── PREMIUM CREDIT ENFORCEMENT ────────────────────────────────────
    // Only block if we KNOW we will need a platform key (no BYO key available)
    const hasBYOKey = !!apiKeysData[provider];

    if (!hasBYOKey && (profile.credits_remaining || 0) <= 0) {
      console.warn(`[API Router] User ${user.id} has no premium credits remaining and no BYO key for ${provider}.`);
      return null;
    }

    let providerKeys = apiKeysData[provider];
    let isPremium = false;
    
    // ── PREMIUM / PLATFORM FALLBACK ───────────────────────────────────
    if (!providerKeys) {
      // If no user key, check if we have a platform key for this provider
      const platformKey = (import.meta as any).env[`VITE_${provider.toUpperCase()}_API_KEY`];
      if (platformKey && profile.credits_remaining > 0) {
        console.log(`[API Router] Using platform key for ${provider}. Credits remaining: ${profile.credits_remaining}`);
        providerKeys = platformKey;
        isPremium = true;
      } else {
        console.warn(`[API Router] Provider ${provider} selected but no key (BYO or Platform) is available.`);
        return null;
      }
    }

    // Support for both single key (string) and multiple keys (array)
    const keysArray = Array.isArray(providerKeys) ? providerKeys : [providerKeys];
    const smartRotate = profile.smart_rotate_enabled && keysArray.length > 1;


    
    // ── SMART ROTATE / FAILOVER LOOP ──────────────────────────────────
    for (let i = 0; i < keysArray.length; i++) {
        try {
            const currentKey = keysArray[i];
            // Only decrypt if it's a user-provided (encrypted) key, not the platform env key
            const apiKey = isPremium ? currentKey : decryptKey(currentKey, user.id);
            let response: string | null = null;

            switch (provider) {
                case 'gemini':
                    response = await callGemini(input, context, apiKey, signal);
                    break;
                case 'openai':
                    response = await callOpenAI(input, context, apiKey, signal);
                    break;
                case 'claude':
                    response = await callClaude(input, context, apiKey, signal);
                    break;
                case 'minimax':
                    response = await callMiniMax(input, context, apiKey, signal);
                    break;
                default:
                    console.warn(`[API Router] Unsupported provider: ${provider}`);
                    return null;
            }

            if (response) {
                // ── SUCCESS: DEDUCT CREDIT ONLY IF PREMIUM ────────────────
                if (isPremium) {
                    await supabase.rpc('deduct_premium_credit', { 
                      user_id: user.id,
                      p_provider: provider 
                    });
                }
                return response;
            }
        } catch (error: any) {

            const errorMsg = error.message?.toLowerCase() || '';
            const isRetryable = errorMsg.includes('429') || 
                               errorMsg.includes('rate limit') ||
                               errorMsg.includes('too many requests') ||
                               errorMsg.includes('quota') ||
                               errorMsg.includes('exhausted') ||
                               errorMsg.includes('500') ||
                               errorMsg.includes('503');

            if (smartRotate && isRetryable && i < keysArray.length - 1) {
                console.warn(`[API Router] Key ${i+1} failed (${errorMsg}). Rotating to key ${i+2}...`);
                continue; // Try next key
            }
            
            // If we've exhausted all keys OR it's not a retryable error
            if (i === keysArray.length - 1 || !isRetryable) {
              console.error(`[API Router] Error for ${provider}: ${errorMsg}`);
              break; // Exit loop and return null (which triggers local fallback)
            }
        }
    }

    return null;
  } catch (error: any) {
    console.error(`[API Router] Error:`, error);
    return null;
  }
}
