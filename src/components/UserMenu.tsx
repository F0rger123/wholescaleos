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
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--t-surface-hover)] transition-colors"
        >
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-[var(--t-glow-shadow)]"
              style={{ background: 'var(--t-gradient)' }}
            >
              {currentUser.avatar}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusIndicator status={status} size="sm" />
            </span>
          </div>
          <div className="hidden md:block text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-[var(--t-on-background)] leading-none">{currentUser.name}</p>
              <StreakBadge streak={useStore.getState().loginStreak} size="sm" />
            </div>
            <p className="text-[10px] text-[var(--t-text-muted)] leading-none mt-0.5">{PRESENCE_LABELS[status]}</p>
          </div>
          <ChevronDown size={14} className={`text-[var(--t-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--t-surface)] border border-[var(--t-border-strong)] rounded-2xl shadow-[var(--t-glow-shadow)] z-50 overflow-hidden theme-transition">
            {/* User header */}
            <div className="p-4 border-b border-[var(--t-border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-[var(--t-on-primary)] shadow-sm"
                    style={{ background: 'var(--t-gradient)' }}
                  >
                    {currentUser.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <StatusIndicator status={status} size="md" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--t-on-surface)] truncate">{currentUser.name}</p>
                  <p className="text-xs text-[var(--t-text-secondary)] truncate">{currentUser.email}</p>
                  {!currentUser.emailVerified && (
                    <span className="text-[10px] text-[var(--t-warning)] font-medium">⚠ Email not verified</span>
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
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--t-input-bg)] border border-[var(--t-input-border)] text-[var(--t-text)] focus:outline-none focus:ring-1 focus:ring-[var(--t-input-focus)]"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') setEditingMsg(false); }}
                    />
                    <button onClick={() => setEditingMsg(false)} className="p-1 text-[var(--t-success)] hover:bg-[var(--t-surface-hover)] rounded">
                      <Check size={14} />
                    </button>
                    <button onClick={() => { setCustomMsg(''); setEditingMsg(false); }} className="p-1 text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingMsg(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--t-text-secondary)] bg-[var(--t-surface-hover)] hover:bg-[var(--t-surface-active)] rounded-lg transition-colors"
                  >
                    <Edit3 size={12} />
                    {customMsg || 'Set a status message...'}
                  </button>
                )}
              </div>
            </div>

            {/* Presence status options */}
            <div className="p-2 border-b border-[var(--t-border-subtle)]">
              <p className="px-2 py-1 text-[10px] text-[var(--t-text-muted)] uppercase tracking-wider font-semibold">Status</p>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    status === opt.value 
                      ? 'bg-[var(--t-primary-dim)] text-[var(--t-primary-text)]' 
                      : 'text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-on-surface)]'
                  }`}
                >
                  <StatusIndicator status={opt.value} size="sm" pulse={false} />
                  <span className="flex-1 text-left">{opt.label}</span>
                  {status === opt.value && <Check size={14} className="text-[var(--t-primary)]" />}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="p-2">
              <button
                onClick={() => { setOpen(false); setShowProfile(true); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-on-surface)] transition-colors"
              >
                <User size={16} />
                Edit Profile
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-on-surface)] transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--t-error)] hover:bg-[var(--t-error)]/10 transition-colors"
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
          <div className="bg-[var(--t-surface)] border border-[var(--t-border-strong)] rounded-2xl w-full max-w-md p-6 shadow-2xl theme-transition" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Edit Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-[var(--t-text-muted)] hover:text-[var(--t-on-surface)]"><X size={18} /></button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-[var(--t-on-primary)] shadow-sm"
                style={{ background: 'var(--t-gradient)' }}
              >
                {profileForm.name ? profileForm.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : currentUser.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--t-on-surface)]">{currentUser.teamRole.charAt(0).toUpperCase() + currentUser.teamRole.slice(1)}</p>
                <p className="text-xs text-[var(--t-text-secondary)]">Member since {new Date(currentUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--t-text-secondary)] mb-1 block">Full Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[var(--t-input-focus)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--t-text-secondary)] mb-1 block">Email</label>
                <input
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[var(--t-input-focus)]"
                />
                {!currentUser.emailVerified && (
                  <button className="mt-1 text-xs text-[var(--t-primary)] hover:underline">Resend verification email</button>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--t-text-secondary)] mb-1 block">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[var(--t-input-focus)]"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2.5 bg-[var(--t-primary)] text-[var(--t-on-primary)] hover:opacity-90 text-sm font-semibold rounded-xl transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowProfile(false)}
                className="px-4 py-2.5 bg-[var(--t-surface-hover)] hover:bg-[var(--t-surface-active)] text-[var(--t-text-secondary)] text-sm rounded-xl transition-colors"
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