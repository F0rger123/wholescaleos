import { supabase } from '../../supabase';

/**
 * Logs a local AI failure to Supabase for pattern analysis.
 */
export async function logLocalAIFailure(input: string, reason: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deduplication check: Has something similar been logged by this user in the last hour?
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentFailures } = await supabase
      .from('local_ai_failures')
      .select('input')
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo);

    if (recentFailures) {
      const isDuplicate = recentFailures.some(f => calculateSimilarity(f.input, input) > 0.85);
      if (isDuplicate) {
        console.log(`[Local AI Tracker] Skipping duplicate failure log for: "${input.substring(0, 30)}..."`);
        return;
      }
    }
    
    await supabase.from('local_ai_failures').insert({
      user_id: user.id,
      input,
      reason,
      metadata: { timestamp: new Date().toISOString() }
    });
    
    console.log(`[Local AI Tracker] Logged failure for: "${input.substring(0, 30)}..."`);
  } catch (err) {
    console.error('[Local AI Tracker] Failed to log failure:', err);
  }
}

/**
 * Simple string clustering based on Levenshtein distance.
 */
export function clusterSimilarInputs(inputs: string[]): Record<string, string[]> {
  const clusters: Record<string, string[]> = {};
  
  inputs.forEach(input => {
    let foundCluster = false;
    for (const root of Object.keys(clusters)) {
      if (calculateSimilarity(input, root) > 0.7) {
        clusters[root].push(input);
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      clusters[input] = [input];
    }
  });
  
  return clusters;
}

function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshtein(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

export async function getFailureClusters() {
  try {
    const { data } = await supabase
      .from('local_ai_failures')
      .select('input')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (!data) return {};
    
    const inputs = data.map(d => d.input);
    return clusterSimilarInputs(inputs);
  } catch (err) {
    console.error('[Local AI Tracker] Failed to get clusters:', err);
    return {};
  }
}
