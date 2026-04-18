import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogOut, Settings, ChevronDown, User, CreditCard, Users } from 'lucide-react';


interface UserMenuProps {
  onOpenChange?: (open: boolean) => void;
}

export function UserMenu({ onOpenChange }: UserMenuProps) {
  const { currentUser } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  if (!currentUser) return null;

  const getInitials = () => {
    if (currentUser.avatar && currentUser.avatar.length <= 2) return currentUser.avatar;
    return currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleOpen(); }}
        className="flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-300 hover-lift astral-glass border border-white/10 group"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black italic shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform overflow-hidden"
          style={{ background: 'var(--t-gradient)', color: 'var(--t-on-primary)' }}
        >
          {currentUser.avatarUrl || (currentUser.avatar && currentUser.avatar.includes('http')) ? (
            <img 
              src={currentUser.avatarUrl || currentUser.avatar} 
              alt={currentUser.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials()
          )}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 italic" style={{ color: 'var(--t-text)' }}>{currentUser.name.split(' ')[0]}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest leading-none" style={{ color: 'var(--t-text-muted)' }}>System Operator</p>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--t-text-muted)' }} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--z-popover)]"
            onClick={() => {
              setIsOpen(false);
              onOpenChange?.(false);
            }}
          />
          <div
            className="absolute right-0 mt-4 w-64 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[var(--z-toast)] border border-white/10 overflow-hidden astral-glass backdrop-blur-3xl p-1 animate-astral-fade-up"
          >
            <div className="p-5 border-b mb-1" style={{ borderColor: 'var(--t-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest italic" style={{ color: 'var(--t-text)' }}>
                {currentUser.name}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--t-text-muted)' }}>
                {currentUser.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                onMouseDown={() => {
                  navigate('/settings');
                  setIsOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-muted)';
                }}
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onMouseDown={() => {
                  navigate('/dashboard/billing');
                  setIsOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-muted)';
                }}
              >
                <CreditCard size={16} />
                Billing
              </button>

              <button
                onMouseDown={() => {
                  navigate('/dashboard/billing?tab=referral');
                  setIsOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-muted)';
                }}
              >
                <Users size={16} />
                Referrals
              </button>

              <button
                onMouseDown={() => {
                  navigate('/dashboard/billing?tab=profile');
                  setIsOpen(false);
                  onOpenChange?.(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-muted)';
                }}
              >
                <User size={16} />
                Profile
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--t-border)' }} />

              <button
                onMouseDown={async () => {
                  setIsOpen(false);
                  onOpenChange?.(false);
                  await useStore.getState().logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-error)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-error-dim)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}