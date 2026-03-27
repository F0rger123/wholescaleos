import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogOut, Settings, ChevronDown, User, Home, Globe, CreditCard, Users } from 'lucide-react';


export function UserMenu() {
  const { currentUser } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-300 hover-lift astral-glass border border-white/10 group"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white italic bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform"
        >
          {getInitials()}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[10px] font-black uppercase text-white tracking-widest leading-none mb-1 italic">{currentUser.name.split(' ')[0]}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6d758c] leading-none">System Operator</p>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-[#6d758c]`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[2001]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-4 w-64 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] border border-white/10 overflow-hidden astral-glass backdrop-blur-3xl p-1 animate-astral-fade-up"
          >
            {/* User info */}
            <div className="p-5 border-b border-white/5 mb-1">
              <p className="text-xs font-black uppercase tracking-widest text-white italic">
                {currentUser.name}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6d758c] mt-1">
                {currentUser.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                onClick={() => {
                  navigate('/');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{ color: 'var(--t-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-secondary)';
                }}
              >
                <Home size={16} />
                Go Home
              </button>

              <button
                onClick={() => {
                  navigate('/settings');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-secondary)';
                }}
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onClick={() => {
                  navigate('/dashboard/billing');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-secondary)';
                }}
              >
                <CreditCard size={16} />
                Billing
              </button>

              <button
                onClick={() => {
                  navigate('/dashboard/billing?tab=referral');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-secondary)';
                }}
              >
                <Users size={16} />
                Referrals
              </button>

              <button
                onClick={() => {
                  navigate('/dashboard/billing?tab=profile');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--t-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-secondary)';
                }}
              >
                <User size={16} />
                Profile
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--t-border)' }} />

              <button
                onClick={() => {
                  window.open('/', '_self');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  e.currentTarget.style.color = 'var(--t-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--t-text-muted)';
                }}
              >
                <Globe size={12} />
                Back to wholescaleos.com
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--t-border)' }} />

              <button
                onClick={async () => {
                  await useStore.getState().logout();
                  setIsOpen(false);
                  navigate('/login');
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