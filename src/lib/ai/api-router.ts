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
    
    // ── PREMIUM CREDIT ENFORCEMENT ────────────────────────────────────
    if (profile.credits_remaining <= 0) {
      console.warn(`[API Router] User ${user.id} has no premium credits remaining.`);
      // Returning null instead of a message forces it to fall back to Local AI
      return null;
    }

    const provider = profile.preferred_api_provider;
    if (!provider || provider === 'local') return null;

    const apiKeysData = profile.user_api_keys || {};
    const providerKeys = apiKeysData[provider];
    
    if (!providerKeys) {
      console.warn(`[API Router] Provider ${provider} selected but no API key found.`);
      return null;
    }

    // Support for both single key (string) and multiple keys (array)
    const keysArray = Array.isArray(providerKeys) ? providerKeys : [providerKeys];
    const smartRotate = profile.smart_rotate_enabled && keysArray.length > 1;

    let lastError: any = null;
    
    // ── SMART ROTATE / FAILOVER LOOP ──────────────────────────────────
    for (let i = 0; i < keysArray.length; i++) {
        try {
            const encryptedKey = keysArray[i];
            const apiKey = decryptKey(encryptedKey, user.id);
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
                // ── SUCCESS: DEDUCT CREDIT ──────────────────────────────
                await supabase.rpc('deduct_premium_credit', { 
                  user_id: user.id,
                  p_provider: provider 
                });
                return response;
            }
        } catch (error: any) {
            lastError = error;
            const isRateLimit = error.message?.toLowerCase().includes('429') || 
                               error.message?.toLowerCase().includes('rate limit') ||
                               error.message?.toLowerCase().includes('too many requests');

            if (smartRotate && isRateLimit && i < keysArray.length - 1) {
                console.log(`[API Router] Key ${i+1} rate limited. Rotating to next key...`);
                continue; // Try next key
            }
            
            // If not rotating or it's a non-rate-limit error, or it's the last key
            throw error; 
        }
    }

    return null;
  } catch (error: any) {
    console.error(`[API Router] Error:`, error);
    return null;
  }
}
