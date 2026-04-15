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
      .select('user_api_keys, preferred_api_provider, api_fallback_enabled')
      .eq('id', user.id)
      .single();
    
    if (!profile || !profile.api_fallback_enabled) return null;
    
    const provider = profile.preferred_api_provider;
    if (!provider || provider === 'local') return null;

    const apiKeys = profile.user_api_keys || {};
    const encryptedKey = apiKeys[provider];
    
    if (!encryptedKey) {
      console.warn(`[API Router] Provider ${provider} selected but no API key found.`);
      return null;
    }

    const apiKey = decryptKey(encryptedKey, user.id);
    
    switch (provider) {
      case 'gemini':
        return await callGemini(input, context, apiKey, signal);
      case 'openai':
        return await callOpenAI(input, context, apiKey, signal);
      case 'claude':
        return await callClaude(input, context, apiKey, signal);
      case 'minimax':
        return await callMiniMax(input, context, apiKey, signal);
      default:
        console.warn(`[API Router] Unsupported provider: ${provider}`);
        return null;
    }
  } catch (error) {
    console.error(`[API Router] Error:`, error);
    return null;
  }
}
