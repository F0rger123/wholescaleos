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
      console.error('❌ Agent Loop Invoke Error (Handled):', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return { 
        handled: false, 
        error: `Edge Function error: ${error.message}` 
      };
    }

    // Ensure we log the raw data for debugging
    console.log('🤖 Agent Loop Response:', data);

    return (data || { handled: false }) as AgentResponse;
  } catch (err: any) {
    console.error('❌ Exception in callAgentLoop (Fatal):', {
      message: err.message,
      stack: err.stack
    });
    return { 
      handled: false, 
      error: `Network or internal error: ${err.message}` 
    };
  }
}
