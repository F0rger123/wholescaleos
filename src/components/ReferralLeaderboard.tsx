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

export function RevenueShareLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        if (!supabase) return;
        // In a real app we'd group by referrer_id in referrals, but for now we'll fetch top profiles by total_earnings
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, total_earnings')
          .order('total_earnings', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Mock referral counts for the leaderboard based on earnings
        const processed = (data || []).map((d: any) => ({
          ...d,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`,
          referralCount: Math.floor((d.total_earnings || 0) / 25) || 0
        })).filter((h: any) => h.total_earnings > 0 || h.referralCount > 0)
        .sort((a: any, b: any) => b.referralCount - a.referralCount);

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
      <div className="p-8 rounded-[2.5rem] bg-black border border-white/5 shadow-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-white/5 rounded"></div>
          <div className="h-16 bg-white/5 rounded-2xl"></div>
          <div className="h-16 bg-white/5 rounded-2xl"></div>
          <div className="h-16 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-[3rem] bg-black border border-white/5 relative overflow-hidden shadow-2xl">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold italic text-white">Elite Partners</h3>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Global Top 10 Revenue Share</p>
          </div>
        </div>

        {leaders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaders.map((leader, i) => (
              <div key={leader.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 p-0.5">
                      <img src={leader.avatarUrl} alt={leader.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-[#121a2d] shadow-xl ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900' :
                      i === 1 ? 'bg-gray-300 text-gray-800' :
                      i === 2 ? 'bg-amber-600 text-white' :
                      'bg-black text-gray-400'
                    }`}>
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{leader.name || 'Agent Pulse'}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[9px] text-[#6d758c] font-bold uppercase">{leader.referralCount} Partners</span>
                      <span className="w-1 h-1 rounded-full bg-indigo-500/30" />
                      <span className="text-[9px] text-green-500 font-bold">${leader.totalEarnings?.toFixed(0) || '0'}</span>
                    </div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {i < 3 && <Medal size={20} className={i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-amber-600'} />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-8 rounded-3xl bg-white/[0.02] border border-dashed border-white/10">
            <div className="w-16 h-16 rounded-full bg-indigo-500/5 flex items-center justify-center text-indigo-500/30 mx-auto mb-4">
              <Trophy size={32} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">No revenue share partners yet</h4>
            <p className="text-sm text-[#6d758c] max-w-sm mx-auto">Be the first to build your network and dominate the leaderboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
