import { supabase } from '../supabase';

export interface AgentResponse {
  handled: boolean;
  toolCalls?: Array<{
    toolName: string;
    params: any;
  }>;
  reasoning?: string;
  context?: any;
  error?: string;
}

/**
 * Calls the Supabase Edge Function 'agent-loop' to process complex queries.
 */
export async function callAgentLoop(userId: string, message: string, conversationId?: string): Promise<AgentResponse> {
  if (!supabase) {
    return { handled: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('agent-loop', {
      body: { userId, message, conversationId }
    });

    if (error) {
      console.error('❌ Agent Loop Invoke Error:', error);
      return { handled: false, error: error.message };
    }

    return data as AgentResponse;
  } catch (err: any) {
    console.error('❌ Exception in callAgentLoop:', err);
    return { handled: false, error: err.message };
  }
}
