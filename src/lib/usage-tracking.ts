import { supabase } from './supabase';

export const TIER_LIMITS = {
  Free: 10,
  Solo: 500,
  Pro: 5000,
  Team: 50000,
  Agency: 500000
} as const;

export type MembershipTier = keyof typeof TIER_LIMITS;

export interface UsageData {
  count: number;
  limit: number;
  remaining: number;
  tier: MembershipTier;
  hasExceeded: boolean;
}

export class UsageTracker {
  private static instance: UsageTracker;

  private constructor() {}

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  async getUsage(): Promise<UsageData> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user tier from profile (assuming 'tier' column in 'profiles' table)
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .maybeSingle();

      const tier = (profile?.tier as MembershipTier) || 'Free';
      const limit = TIER_LIMITS[tier];

      // Get or create usage record
      const { data: usage, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!usage) {
        await supabase
          .from('user_usage')
          .insert([{ user_id: user.id, message_count: 0 }])
          .select()
          .single();
        
        return {
          count: 0,
          limit,
          remaining: limit,
          tier,
          hasExceeded: false
        };
      }

      // Reset logic: if last_reset_at is not today (UTC), reset message_count
      const lastReset = new Date(usage.last_reset_at);
      const now = new Date();
      
      const isSameDay = 
        lastReset.getUTCFullYear() === now.getUTCFullYear() &&
        lastReset.getUTCMonth() === now.getUTCMonth() &&
        lastReset.getUTCDate() === now.getUTCDate();

      if (!isSameDay) {
        await supabase
          .from('user_usage')
          .update({ message_count: 0, last_reset_at: now.toISOString() })
          .eq('id', usage.id);
        
        return {
          count: 0,
          limit,
          remaining: limit,
          tier,
          hasExceeded: false
        };
      }

      return {
        count: usage.message_count,
        limit,
        remaining: Math.max(0, limit - usage.message_count),
        tier,
        hasExceeded: usage.message_count >= limit
      };
    } catch (error) {
      console.error('Error fetching usage:', error);
      return { count: 0, limit: 10, remaining: 10, tier: 'Free', hasExceeded: false };
    }
  }

  async incrementUsage(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: usage } = await supabase
        .from('user_usage')
        .select('id, message_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!usage) return false;

      const { error } = await supabase
        .from('user_usage')
        .update({ message_count: usage.message_count + 1 })
        .eq('id', usage.id);

      return !error;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }
}

export const usageTracker = UsageTracker.getInstance();
