import { supabase } from './supabase';

export interface ReferralData {
  code: string;
  referrerId?: string;
  referredId: string;
  status: 'pending' | 'active' | 'applied';
}

export const referralService = {
  /**
   * Generates a unique referral code for a user
   */
  generateCode: (name: string): string => {
    const prefix = 'WHOLESCALE';
    const cleanName = name.split(' ')[0].toUpperCase().replace(/[^A-Z0-0]/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${cleanName || 'AGENT'}-${random}`;
  },

  /**
   * Validates a referral code and returns the referrer's user ID
   */
  validateCode: async (code: string): Promise<string | null> => {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code.trim().toUpperCase())
        .single();

      if (error || !data) return null;
      return data.id;
    } catch (err) {
      console.error('Error validating referral code:', err);
      return null;
    }
  },

  /**
   * Records a new referral
   */
  recordReferral: async (referrerId: string, referredId: string, codeUsed: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: referredId,
          code_used: codeUsed.trim().toUpperCase(),
          status: 'active'
        });

      if (error) throw error;
      
      // Also increment usage count on the code
      await supabase.rpc('increment_referral_usage', { p_code: codeUsed.trim().toUpperCase() });
      
    } catch (err) {
      console.error('Error recording referral:', err);
    }
  },

  /**
   * Calculates earnings based on a payment
   */
  calculateEarnings: (paymentAmount: number): number => {
    return paymentAmount * 0.10; // 10% recurring commission
  },

  /**
   * Gets a user's referral stats
   */
  getStats: async (userId: string) => {
    if (!supabase) return { total: 0, active: 0, pending: 0 };

    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('id, status')
        .eq('referrer_id', userId);

      if (error) throw error;

      const { data: earnings, error: earningsErr } = await supabase
        .from('profiles')
        .select('total_earnings, available_earnings')
        .eq('id', userId)
        .single();

      if (earningsErr) throw earningsErr;

      return {
        referralCount: referrals.length,
        activeReferrals: referrals.filter(r => r.status === 'active').length,
        totalEarned: earnings.total_earnings || 0,
        availableBalance: earnings.available_earnings || 0
      };
    } catch (err) {
      console.error('Error getting referral stats:', err);
      return { referralCount: 0, activeReferrals: 0, totalEarned: 0, availableBalance: 0 };
    }
  }
};
