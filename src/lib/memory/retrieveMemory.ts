import { supabase } from '../supabase';

interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Retrieves recent relevant conversation history for a user from the conversation_memory table.
 * 
 * @param userId - The ID of the user whose memory to retrieve.
 * @param limit - The maximum number of messages to retrieve (default: 10).
 * @returns A promise of an array of messages ordered chronologically (oldest first).
 */
export async function retrieveMemory(
  userId: string,
  limit: number = 10
): Promise<MemoryMessage[]> {
  if (!supabase) {
    console.warn('Supabase is not configured. Returning empty memory.');
    return [];
  }

  // Calculate the timestamp for 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error retrieving conversation memory:', error);
      throw error;
    }

    // Reverse to get chronological order (oldest first)
    return (data || []).reverse() as MemoryMessage[];
  } catch (err) {
    console.error('Unexpected error in retrieveMemory:', err);
    return [];
  }
}
