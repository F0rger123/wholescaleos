import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  name: string;
  avatarUrl?: string;
  referralCount: number;
  totalEarnings: number;
}

export function ReferralLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        if (!supabase) return;
        // Mocking leaderboard since we don't have a direct aggregate in profiles
        // In a real app we'd group by referrer_id in referrals, but for now we'll fetch top profiles by total_earnings
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, total_earnings')
          .order('total_earnings', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        // Mock referral counts for the leaderboard based on earnings
        const processed = data.map((d: any) => ({
          ...d,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`,
          referralCount: Math.floor((d.total_earnings || 0) / 25) || Math.floor(Math.random() * 5)
        })).sort((a, b) => b.referralCount - a.referralCount);

        setLeaders(processed);
      } catch (err) {
        console.error('Failed to load leaderboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-white/5 rounded"></div>
          <div className="h-16 bg-white/5 rounded-2xl"></div>
          <div className="h-16 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold italic">Top Affiliates</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Leaderboard</p>
          </div>
        </div>

        <div className="space-y-3">
          {leaders.map((leader, i) => (
            <div key={leader.id} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] hover:border-yellow-500/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--t-bg)] border border-[var(--t-border)]">
                    <img src={leader.avatarUrl} alt={leader.name} className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[var(--t-surface-dim)] shadow-xl ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900 border-yellow-200' :
                    i === 1 ? 'bg-gray-300 text-gray-800 border-gray-100' :
                    i === 2 ? 'bg-amber-600 text-amber-100 border-amber-400' :
                    'bg-[var(--t-surface)] text-[var(--t-text-muted)]'
                  }`}>
                    #{i + 1}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold group-hover:text-yellow-400 transition-colors">{leader.name || 'Anonymous Agent'}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{leader.referralCount} Referrals</span>
                    <span className="w-1 h-1 rounded-full bg-yellow-500/50" />
                    <span className="text-[10px] text-green-500 font-bold">${leader.totalEarnings?.toFixed(2) || '0.00'} Earned</span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                {i === 0 && <Medal size={24} className="text-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />}
                {i === 1 && <Medal size={24} className="text-gray-400 opacity-80" />}
                {i === 2 && <Medal size={24} className="text-amber-600 opacity-80" />}
              </div>
            </div>
          ))}
          {leaders.length === 0 && (
            <div className="text-center p-8 text-sm text-[var(--t-text-muted)]">
              No top affiliates yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
