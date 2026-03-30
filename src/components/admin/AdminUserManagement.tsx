import { useState, useEffect } from 'react';
import { 
  Search, Shield, Edit2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

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
    const matchesSearch = 
      (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'admin') return matchesSearch && u.role === 'admin';
    if (filter === 'premium') return matchesSearch && u.subscription_tier !== 'Free';
    return matchesSearch;
  });

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleUpdateTier = async (userId: string, newTier: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: newTier })
        .eq('id', userId);
      
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
    } catch (err) {
      alert('Failed to update tier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border bg-[var(--t-bg)] text-sm focus:border-purple-500 outline-none transition-all"
            style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {['all', 'admin', 'premium'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === f ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border bg-[var(--t-surface)] overflow-hidden" style={{ borderColor: 'var(--t-border)' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--t-surface-dim)] border-b" style={{ borderColor: 'var(--t-border)' }}>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">User</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Plan</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Role</th>
              <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Signup Date</th>
              <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-8 h-16 bg-white/5"></td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--t-text-muted)] italic">No users found.</td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-black">
                      {user.full_name?.[0] || user.email?.[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--t-text)]">{user.full_name || 'No Name'}</div>
                      <div className="text-xs text-[var(--t-text-muted)]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <select 
                    value={user.subscription_tier}
                    onChange={(e) => handleUpdateTier(user.id, e.target.value)}
                    className="bg-transparent border-none text-xs font-bold outline-none focus:ring-0 cursor-pointer text-blue-500"
                  >
                    <option value="Free">Free</option>
                    <option value="Solo">Solo</option>
                    <option value="Pro">Pro</option>
                    <option value="Team">Team</option>
                    <option value="Agency">Agency</option>
                  </select>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                     <Shield size={14} className={user.role === 'admin' ? 'text-purple-500' : 'text-gray-500'} />
                     <select 
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        className="bg-transparent border-none text-xs font-bold outline-none focus:ring-0 cursor-pointer"
                        style={{ color: user.role === 'admin' ? 'var(--t-primary)' : 'var(--t-text)' }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                   </div>
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
