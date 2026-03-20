import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogOut, Settings, ChevronDown, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: 'var(--t-surface)',
          color: 'var(--t-text)',
          border: '1px solid var(--t-border)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            background: `linear-gradient(135deg, var(--t-avatar-from), var(--t-avatar-to))`,
            color: 'var(--t-on-primary)',
          }}
        >
          {getInitials()}
        </div>
        <span className="text-sm font-medium hidden sm:block">{currentUser.name.split(' ')[0]}</span>
        <ChevronDown size={16} style={{ color: 'var(--t-text-muted)' }} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-[9999] border overflow-hidden"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
              boxShadow: 'var(--t-glow-shadow)',
            }}
          >
            {/* User info */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--t-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
                {currentUser.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                {currentUser.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="p-1">
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
                  navigate('/settings?tab=general');
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
                onClick={async () => {
                  if (supabase) await supabase.auth.signOut();
                  navigate('/login');
                  setIsOpen(false);
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