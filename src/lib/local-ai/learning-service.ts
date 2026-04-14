import { supabase } from '../supabase';

// Types
export interface LearnedIntent {
  id?: string;
  user_id: string;
  phrase: string;
  mapped_intent: string;
  params?: Record<string, any>;
  confidence?: number;
  usage_count?: number;
  last_used?: string;
}

export interface ConversationMemory {
  id?: string;
  user_id: string;
  session_id: string;
  messages: Array<{role: 'user' | 'assistant', content: string, timestamp: string}>;
  active_topic?: string;
  mentioned_leads?: string[];
  mentioned_tasks?: string[];
}

export interface BotUserPreferences {
  user_id: string;
  preferred_name?: string;
  communication_style?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  favorite_phrases?: string[];
  custom_responses?: Record<string, string>;
  remembered_facts?: Record<string, any>;
}

// Learned Intents
export async function saveLearnedIntent(
  userId: string,
  phrase: string,
  mappedIntent: string,
  params: Record<string, any> = {}
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('learned_intents')
      .upsert({
        user_id: userId,
        phrase: phrase.toLowerCase().trim(),
        mapped_intent: mappedIntent,
        params,
        usage_count: 1,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'user_id, phrase'
      });
    return !error;
  } catch (e) { return false; }
}

export async function getLearnedIntent(userId: string, phrase: string) {
  try {
    const { data } = await supabase
      .from('learned_intents')
      .select('mapped_intent, params, confidence, usage_count')
      .eq('user_id', userId)
      .eq('phrase', phrase.toLowerCase().trim())
      .single();
    if (!data) return null;
    return { mapped_intent: data.mapped_intent, params: data.params || {}, confidence: data.confidence || 100 };
  } catch (e) { return null; }
}

export async function getAllLearnedIntents(userId: string): Promise<LearnedIntent[]> {
  const { data } = await supabase.from('learned_intents').select('*').eq('user_id', userId);
  return data || [];
}

export async function deleteLearnedIntent(userId: string, phrase: string): Promise<boolean> {
  const { error } = await supabase.from('learned_intents').delete().eq('user_id', userId).eq('phrase', phrase.toLowerCase().trim());
  return !error;
}

// Conversation Memory
export async function saveConversationTurn(userId: string, sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  try {
    const { data: existing } = await supabase.from('conversation_memory').select('messages').eq('user_id', userId).eq('session_id', sessionId).single();
    const messages = existing?.messages || [];
    messages.push({ role, content, timestamp: new Date().toISOString() });
    await supabase.from('conversation_memory').upsert({ user_id: userId, session_id: sessionId, messages, updated_at: new Date().toISOString() }, { onConflict: 'user_id, session_id' });
  } catch (e) { console.error(e); }
}

export async function getConversationContext(userId: string, sessionId: string, limit: number = 5): Promise<any[]> {
  try {
    const { data } = await supabase.from('conversation_memory').select('messages').eq('user_id', userId).eq('session_id', sessionId).single();
    if (!data?.messages) return [];
    return data.messages.slice(-limit);
  } catch (e) { return []; }
}

export async function getRecentMemorySummary(userId: string): Promise<string> {
  try {
    const { data } = await supabase.from('conversation_memory').select('messages').eq('user_id', userId).order('updated_at', { ascending: false }).limit(2);
    if (!data || data.length === 0) return "No recent history.";
    const msgs = data.flatMap((d: any) => d.messages || []);
    if (msgs.length === 0) return "No recent history.";
    const topics = msgs.slice(-10).filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' | ');
    return `Recent focus: ${topics.substring(0, 100)}...`;
  } catch(e) { return "Memory fetch failed."; }
}

export async function updateConversationTopic(userId: string, sessionId: string, topic: string): Promise<void> {
  await supabase.from('conversation_memory').update({ active_topic: topic, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('session_id', sessionId);
}

export async function addMentionedLead(userId: string, sessionId: string, leadName: string): Promise<void> {
  try {
    const { data } = await supabase.from('conversation_memory').select('mentioned_leads').eq('user_id', userId).eq('session_id', sessionId).single();
    const leads = data?.mentioned_leads || [];
    if (!leads.includes(leadName)) {
      leads.push(leadName);
      await supabase.from('conversation_memory').update({ mentioned_leads: leads.slice(-10), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('session_id', sessionId);
    }
  } catch (e) { console.error(e); }
}

// User Preferences
export async function getUserPreferences(userId: string): Promise<BotUserPreferences | null> {
  const { data } = await supabase.from('bot_user_preferences').select('*').eq('user_id', userId).single();
  return data;
}

export async function saveUserPreference(userId: string, key: keyof BotUserPreferences, value: any): Promise<boolean> {
  const { error } = await supabase.from('bot_user_preferences').upsert({ user_id: userId, [key]: value, updated_at: new Date().toISOString() });
  return !error;
}

export async function rememberFact(userId: string, key: string, value: any): Promise<boolean> {
  const { data } = await supabase.from('bot_user_preferences').select('remembered_facts').eq('user_id', userId).single();
  const facts = data?.remembered_facts || {};
  facts[key] = value;
  const { error } = await supabase.from('bot_user_preferences').upsert({ user_id: userId, remembered_facts: facts, updated_at: new Date().toISOString() });
  return !error;
}

export async function getRememberedFact(userId: string, key: string): Promise<any | null> {
  const { data } = await supabase.from('bot_user_preferences').select('remembered_facts').eq('user_id', userId).single();
  return data?.remembered_facts?.[key] || null;
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function findSimilarLearnedPhrase(phrase: string, learnedIntents: LearnedIntent[]): LearnedIntent | null {
  const normalized = phrase.toLowerCase().trim();
  for (const intent of learnedIntents) {
    if (intent.phrase.toLowerCase() === normalized) return intent;
    if (intent.phrase.toLowerCase().includes(normalized) || normalized.includes(intent.phrase.toLowerCase())) return intent;
  }
  return null;
}
