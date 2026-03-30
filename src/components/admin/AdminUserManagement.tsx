import { useState, useEffect } from 'react';
import { 
  Search, Edit2, UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: string;
  subscription_status: string;
  role: string;
  created_at: string;
  last_login: string;
  referral_code: string;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (u.subscription_status?.toLowerCase() || '') === statusFilter.toLowerCase();
    const matchesTier = tierFilter === 'all' || u.subscription_tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const handleUpdateUser = async (userId: string, updates: any) => {
    if (!supabase) return;
    setLoadingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
      toast.success('User updated successfully');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all outline-none"
            style={{ backgroundColor: 'var(--t-input-bg)', borderColor: 'var(--t-input-border)', color: 'var(--t-text)' }}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--t-input-bg)', borderColor: 'var(--t-input-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <select 
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--t-input-bg)', borderColor: 'var(--t-input-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
        >
          <option value="all">All Tiers</option>
          <option value="Free">Free</option>
          <option value="Solo">Solo</option>
          <option value="Pro">Pro</option>
          <option value="Team">Team</option>
          <option value="Agency">Agency</option>
        </select>
        <button 
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg active:scale-95"
          style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
        >
          <UserPlus size={18} />
          Add User
        </button>
      </div>

      <div className="rounded-3xl border bg-[var(--t-surface)] overflow-hidden" style={{ borderColor: 'var(--t-border)' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--t-surface-dim)] border-b" style={{ borderColor: 'var(--t-border)' }}>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">User</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Plan</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Role</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Status</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Signup Date</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-8 h-16 bg-[var(--t-surface-dim)]"></td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--t-text-muted)] italic">No users found.</td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-[var(--t-surface-dim)] transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] font-black">
                      {user.full_name?.[0] || user.email?.[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--t-text)]">{user.full_name || 'No Name'}</div>
                      <div className="text-xs text-[var(--t-text-muted)]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <select 
                      value={user.subscription_tier}
                      onChange={(e) => handleUpdateUser(user.id, { subscription_tier: e.target.value })}
                      disabled={loadingId === user.id}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border outline-none appearance-none cursor-pointer transition-all"
                      style={{ 
                        backgroundColor: 'var(--t-primary-dim)', 
                        color: 'var(--t-primary)', 
                        borderColor: 'var(--t-primary-dim)'
                      }}
                    >
                      {['Free', 'Solo', 'Pro', 'Team', 'Agency'].map(t => (
                        <option key={t} value={t} style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>{t}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-[var(--t-text-muted)] mt-1 uppercase tracking-tighter">Plan override</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <select 
                      value={user.role}
                      onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                      disabled={loadingId === user.id}
                      className={`text-xs font-bold px-2 py-1 rounded-full border-none outline-none appearance-none cursor-pointer transition-colors ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select 
                    value={user.subscription_status?.toLowerCase() || 'active'}
                    onChange={(e) => handleUpdateUser(user.id, { subscription_status: e.target.value })}
                    disabled={loadingId === user.id}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border outline-none appearance-none cursor-pointer transition-all"
                    style={{ 
                      backgroundColor: user.subscription_status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 
                                     user.subscription_status === 'suspended' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: user.subscription_status === 'active' ? '#22c55e' : 
                             user.subscription_status === 'suspended' ? '#ef4444' : '#eab308',
                      borderColor: 'transparent'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </td>
                <td className="px-6 py-5 text-xs text-[var(--t-text-muted)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                    <Edit2 size={16} className="text-[var(--t-text-muted)]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
