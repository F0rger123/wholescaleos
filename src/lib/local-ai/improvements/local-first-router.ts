import { callExternalAPI } from '../../ai/api-router';
import { logLocalAIFailure } from './usage-tracker';

/**
 * Smart router that prioritizes local AI and falls back to external APIs.
 * This can be called from recognizeIntent to handle the hierarchy of processing.
 */
export async function routeHybridIntent(
  input: string, 
  context: any,
  localMatches: {
    exact?: any;
    embedding?: any;
    regex?: any;
  }
) {
  // 1. Exact Match (Instant, Free)
  if (localMatches.exact) {
    return { ...localMatches.exact, matchedBy: 'local_exact' };
  }
  
  // 2. High-Confidence Embedding Match (Fast, Free)
  if (localMatches.embedding && localMatches.embedding.confidence > 0.8) {
    return { ...localMatches.embedding, matchedBy: 'local_embedding' };
  }
  
  // 3. Regex Match (Fast, Free)
  if (localMatches.regex) {
    return { ...localMatches.regex, matchedBy: 'local_regex' };
  }
  
  // 4. If all local fails AND user has API key → offer to use their API
  try {
    const apiResponse = await callExternalAPI(input, context);
    if (apiResponse) {
      return {
        intent: { name: 'external_ai_response' },
        params: {},
        confidence: 100,
        replyText: apiResponse,
        matchedBy: 'external_api'
      };
    }
  } catch (error) {
    console.error('[Hybrid Router] External API fallback failed:', error);
  }
  
  // 5. Otherwise → Graceful fallback
  await logLocalAIFailure(input, 'no_match');
  return null;
}
