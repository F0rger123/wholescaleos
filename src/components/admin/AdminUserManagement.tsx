import { useState, useEffect } from 'react';
import { 
  Search, Edit2, UserPlus, X, Mail, User, 
  Activity, Loader2, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

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
  
  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    full_name: '',
    role: 'member',
    subscription_tier: 'Solo',
    subscription_status: 'active'
  });
  const [addingUser, setAddingUser] = useState(false);

  // User Activity Modal
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

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

  const handleAddUser = async () => {
    if (!supabase || !newUserData.email) return;
    setAddingUser(true);
    try {
      // Create a profile record (we can't create Auth user directly from frontend easily)
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          ...newUserData,
          id: crypto.randomUUID(), // Temporarily use a random UUID for placeholder
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      setUsers([data, ...users]);
      toast.success('User placeholder created!');
      setShowAddUserModal(false);
      setNewUserData({
        email: '',
        full_name: '',
        role: 'member',
        subscription_tier: 'Solo',
        subscription_status: 'active'
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingUser(false);
    }
  };

  const fetchUserLogs = async (userId: string) => {
    if (!supabase) return;
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setSelectedUserLogs(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to fetch activity');
    } finally {
      setLogsLoading(false);
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
            style={{ 
              backgroundColor: 'var(--t-surface)', 
              borderColor: 'var(--t-border)', 
              color: 'var(--t-text)' 
            }}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
          style={{ 
            backgroundColor: 'var(--t-surface)', 
            borderColor: 'var(--t-border)', 
            color: 'var(--t-text)', 
            '--tw-ring-color': 'var(--t-primary-dim)' 
          } as any}
        >
          <option value="all" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>All Status</option>
          <option value="active" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Active</option>
          <option value="suspended" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Suspended</option>
          <option value="pending" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Pending</option>
        </select>
        <select 
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
          style={{ 
            backgroundColor: 'var(--t-surface)', 
            borderColor: 'var(--t-border)', 
            color: 'var(--t-text)', 
            '--tw-ring-color': 'var(--t-primary-dim)' 
          } as any}
        >
          <option value="all" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>All Tiers</option>
          <option value="Free" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Free</option>
          <option value="Solo" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Solo</option>
          <option value="Pro" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Pro</option>
          <option value="Team" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Team</option>
          <option value="Agency" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Agency</option>
        </select>
        <button 
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-purple-600/20 active:scale-95 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <UserPlus size={16} />
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
                      className={`text-xs font-bold px-3 py-1 rounded-full border-none outline-none appearance-none cursor-pointer transition-colors ${
                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-[var(--t-surface-dim)] text-[var(--t-text-muted)]'
                      }`}
                      style={{ 
                        backgroundColor: user.role === 'admin' ? 'rgba(168, 85, 247, 0.1)' : 'var(--t-surface-dim)',
                        color: user.role === 'admin' ? '#a855f7' : 'var(--t-text-muted)'
                      }}
                    >
                      <option value="admin" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Admin</option>
                      <option value="member" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Member</option>
                      <option value="viewer" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Viewer</option>
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
                    <option value="active" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Active</option>
                    <option value="suspended" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Suspended</option>
                    <option value="pending" style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>Pending</option>
                  </select>
                </td>
                <td className="px-6 py-5 text-xs text-[var(--t-text-muted)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => fetchUserLogs(user.id)}
                      className="p-2 rounded-lg hover:bg-purple-500/10 text-[var(--t-text-muted)] hover:text-purple-500 transition-colors"
                      title="View Activity"
                    >
                      <Activity size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <Edit2 size={16} className="text-[var(--t-text-muted)]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Add New User</h3>
                <p className="text-[10px] text-[var(--t-text-muted)] uppercase font-black tracking-widest mt-1">Platform administration</p>
              </div>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="p-2 rounded-xl hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
                  <input
                    type="text"
                    value={newUserData.full_name}
                    onChange={e => setNewUserData({ ...newUserData, full_name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border bg-[var(--t-bg)] outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border bg-[var(--t-bg)] outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Initial Role</label>
                  <select
                    value={newUserData.role}
                    onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border bg-[var(--t-bg)] outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Initial Tier</label>
                  <select
                    value={newUserData.subscription_tier}
                    onChange={e => setNewUserData({ ...newUserData, subscription_tier: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border bg-[var(--t-bg)] outline-none"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Pro">Pro</option>
                    <option value="Team">Team</option>
                    <option value="Agency">Agency</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddUser}
              disabled={addingUser || !newUserData.email}
              className="w-full py-4 rounded-xl bg-purple-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {addingUser ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Create Profile
            </button>
          </div>
        </div>
      )}

      {/* User Activity Side-over/Modal */}
      {selectedUserLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="h-full w-full max-w-md bg-[var(--t-surface)] border-l border-[var(--t-border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-dim)]">
              <div>
                <h3 className="text-xl font-bold text-[var(--t-text)]">Recent Activity</h3>
                <p className="text-xs text-[var(--t-text-muted)]">Last 10 system interactions</p>
              </div>
              <button 
                onClick={() => setSelectedUserLogs(null)}
                className="p-2 rounded-xl hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--t-text-muted)]">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Fetching Logs...</span>
                </div>
              ) : selectedUserLogs.length === 0 ? (
                <div className="text-center py-20">
                  <Activity size={48} className="mx-auto opacity-10 mb-4" />
                  <p className="text-sm text-[var(--t-text-muted)] italic">No recent activity found for this user.</p>
                </div>
              ) : (
                selectedUserLogs.map((log: any) => (
                  <div key={log.id} className="p-4 rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] space-y-2 group hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        log.level === 'error' ? 'bg-red-500/10 text-red-500' : 
                        log.level === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-[9px] text-[var(--t-text-muted)] font-mono">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--t-text)]">{log.action}</p>
                      <p className="text-[10px] text-[var(--t-text-muted)] italic">{log.component}</p>
                    </div>
                    <pre className="text-[8px] bg-black/20 p-2 rounded-lg text-[var(--t-text-muted)] overflow-hidden">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
