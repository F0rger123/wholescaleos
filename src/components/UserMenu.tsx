import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, User, Settings, ChevronDown, Edit3, X, Check,
  Wifi, WifiOff, Ban, Moon,
} from 'lucide-react';
import { useStore, PRESENCE_LABELS, type PresenceStatus } from '../store/useStore';
import { StatusIndicator } from './StatusIndicator';
import { StreakBadge } from './StreakBadge';

const statusOptions: { value: PresenceStatus; icon: React.ElementType; label: string }[] = [
  { value: 'online', icon: Wifi, label: 'Online' },
  { value: 'busy', icon: Ban, label: 'Busy' },
  { value: 'dnd', icon: Moon, label: 'Do Not Disturb' },
  { value: 'offline', icon: WifiOff, label: 'Appear Offline' },
];

export function UserMenu() {
  const navigate = useNavigate();
  const { currentUser, logout, updateProfile } = useStore();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [status, setLocalStatus] = useState<PresenceStatus>('online');
  const [customMsg, setCustomMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });

  const handleStatusChange = (s: PresenceStatus) => {
    setLocalStatus(s);
  };

  const handleSaveProfile = () => {
    updateProfile(profileForm);
    setShowProfile(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) return null;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {currentUser.avatar}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusIndicator status={status} size="sm" />
            </span>
          </div>
          <div className="hidden md:block text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-white leading-none">{currentUser.name}</p>
              <StreakBadge streak={useStore.getState().loginStreak} size="sm" />
            </div>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{PRESENCE_LABELS[status]}</p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
            {/* User header */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {currentUser.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <StatusIndicator status={status} size="md" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  {!currentUser.emailVerified && (
                    <span className="text-[10px] text-amber-400 font-medium">⚠ Email not verified</span>
                  )}
                </div>
              </div>

              {/* Custom status message */}
              <div className="mt-3">
                {editingMsg ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      placeholder="What's your status?"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') setEditingMsg(false); }}
                    />
                    <button onClick={() => setEditingMsg(false)} className="p-1 text-emerald-400 hover:bg-slate-800 rounded">
                      <Check size={14} />
                    </button>
                    <button onClick={() => { setCustomMsg(''); setEditingMsg(false); }} className="p-1 text-slate-400 hover:bg-slate-800 rounded">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingMsg(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 bg-slate-800 hover:bg-slate-750 rounded-lg transition-colors"
                  >
                    <Edit3 size={12} />
                    {customMsg || 'Set a status message...'}
                  </button>
                )}
              </div>
            </div>

            {/* Presence status options */}
            <div className="p-2 border-b border-slate-800">
              <p className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Status</p>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    status === opt.value ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <StatusIndicator status={opt.value} size="sm" pulse={false} />
                  <span className="flex-1 text-left">{opt.label}</span>
                  {status === opt.value && <Check size={14} className="text-brand-400" />}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="p-2">
              <button
                onClick={() => { setOpen(false); setShowProfile(true); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <User size={16} />
                Edit Profile
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
                {profileForm.name ? profileForm.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : currentUser.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{currentUser.teamRole.charAt(0).toUpperCase() + currentUser.teamRole.slice(1)}</p>
                <p className="text-xs text-slate-400">Member since {new Date(currentUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email</label>
                <input
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                {!currentUser.emailVerified && (
                  <button className="mt-1 text-xs text-brand-400 hover:underline">Resend verification email</button>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowProfile(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
