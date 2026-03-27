import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Loader2, XCircle, ArrowRight, PartyPopper, Shield, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';

type VerificationState = 'verifying' | 'success' | 'error' | 'already-verified';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const { login, updateProfile, incrementLoginStreak } = useStore();
  const [state, setState] = useState<VerificationState>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [userName, setUserName] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    async function handleVerification() {
      if (!isSupabaseConfigured || !supabase) {
        setState('success');
        setUserName('Demo User');
        return;
      }

      try {
        // The URL contains hash fragments from Supabase email confirmation
        // e.g., #access_token=xxx&type=signup&...
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && refreshToken) {
          // Set the session from the URL tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            if (error.message.includes('already confirmed') || error.message.includes('expired')) {
              setState('already-verified');
            } else {
              setErrorMsg(error.message);
              setState('error');
            }
            return;
          }

          if (data.user) {
            const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';
            setUserName(name);
            login(data.user.email || '', '');
            const avatar = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            updateProfile({
              id: data.user.id,
              email: data.user.email || '',
              name,
              avatar,
            });
            incrementLoginStreak();
            setState(type === 'recovery' ? 'success' : 'success');
          } else {
            setState('success');
          }
        } else {
          // No tokens in URL — check if user is already logged in
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
            setUserName(name);
            setState('already-verified');
          } else {
            setState('success');
          }
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
        setState('error');
      }
    }

    handleVerification();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-redirect countdown for success states
  useEffect(() => {
    if (state === 'success' || state === 'already-verified') {
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state, navigate]);

  return (
    <div className="min-h-screen bg-[var(--t-background)] flex items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(59,130,246,0.08),_transparent_50%),_radial-gradient(circle_at_70%_50%,_rgba(16,185,129,0.06),_transparent_50%)]" />
      
      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{ 
              background: 'var(--t-primary)',
              // @ts-expect-error custom prop
              '--tw-shadow-color': 'var(--t-primary-dim)'
            }}
          >
            <Building2 size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">WholeScale</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--t-primary)' }}>OS</p>
          </div>
        </div>

        {/* ═══ VERIFYING STATE ═══ */}
        {state === 'verifying' && (
          <div className="bg-[var(--t-surface)]/80 backdrop-blur-sm border border-[var(--t-border)] rounded-3xl p-10 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--t-primary-dim)' }}
            >
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--t-primary)' }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verifying your email...</h2>
            <p className="text-sm text-[var(--t-text-muted)]">This will only take a moment</p>
          </div>
        )}

        {/* ═══ SUCCESS STATE ═══ */}
        {state === 'success' && (
          <div className="bg-[var(--t-surface)]/80 backdrop-blur-sm border border-[var(--t-success-dim)] rounded-3xl p-10 text-center relative overflow-hidden">
            {/* Celebration gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--t-success)]/5 to-transparent pointer-events-none" />
            
            <div className="relative">
              {/* Animated checkmark */}
              <div className="w-24 h-24 rounded-full bg-[var(--t-success-dim)] border-2 border-[var(--t-success)]/30 flex items-center justify-center mx-auto mb-6 animate-bounce" style={{ animationDuration: '2s' }}>
                <CheckCircle2 size={48} className="text-[var(--t-success)]" />
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                <PartyPopper size={20} className="text-[var(--t-warning)]" />
                <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
                <PartyPopper size={20} className="text-[var(--t-warning)]" style={{ transform: 'scaleX(-1)' }} />
              </div>

              {userName && (
                <p className="text-lg text-[var(--t-success)] font-semibold mb-2">
                  Welcome, {userName}! 🎉
                </p>
              )}

              <p className="text-sm text-[var(--t-text-muted)] mb-8">
                Your account is confirmed and ready to go. You're now logged in.
              </p>

              {/* Features unlocked */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="p-3 bg-[var(--t-surface-subtle)]/50 rounded-xl border border-[var(--t-border)]/50">
                  <Sparkles size={18} className="mx-auto mb-1.5" style={{ color: 'var(--t-primary)' }} />
                  <p className="text-[10px] text-[var(--t-text-muted)]">AI Lead Scoring</p>
                </div>
                <div className="p-3 bg-[var(--t-surface-subtle)]/50 rounded-xl border border-[var(--t-border)]/50">
                  <Shield size={18} className="text-[var(--t-accent)] mx-auto mb-1.5" />
                  <p className="text-[10px] text-[var(--t-text-muted)]">Team Access</p>
                </div>
                <div className="p-3 bg-[var(--t-surface-subtle)]/50 rounded-xl border border-[var(--t-border)]/50">
                  <CheckCircle2 size={18} className="text-[var(--t-success)] mx-auto mb-1.5" />
                  <p className="text-[10px] text-[var(--t-text-muted)]">Cloud Sync</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--t-success)] hover:bg-[var(--t-error-hover)] hover:shadow-[var(--t-success)]/20"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>

              <p className="text-xs text-[var(--t-text-muted)] mt-4">
                Auto-redirecting in {countdown}s...
              </p>
            </div>
          </div>
        )}

        {/* ═══ ALREADY VERIFIED STATE ═══ */}
        {state === 'already-verified' && (
          <div className="bg-[var(--t-surface)]/80 backdrop-blur-sm border border-[var(--t-border)] rounded-3xl p-10 text-center"
            style={{ 
              // @ts-expect-error custom prop
              '--tw-border-opacity': '0.2',
              borderColor: 'var(--t-primary)' 
            }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--t-primary-dim)' }}
            >
              <CheckCircle2 size={40} style={{ color: 'var(--t-primary)' }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Already Verified</h2>
            {userName && (
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--t-primary)' }}>Hey {userName}!</p>
            )}
            <p className="text-sm text-[var(--t-text-muted)] mb-8">
              Your email has already been confirmed. You're good to go!
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-white text-sm font-semibold rounded-xl transition-all"
              style={{ background: 'var(--t-primary)' }}
            >
              Continue to Dashboard <ArrowRight size={16} />
            </button>
            <p className="text-xs text-[var(--t-text-muted)] mt-4">
              Auto-redirecting in {countdown}s...
            </p>
          </div>
        )}

        {/* ═══ ERROR STATE ═══ */}
        {state === 'error' && (
          <div className="bg-[var(--t-surface)]/80 backdrop-blur-sm border border-[var(--t-error)]/20 rounded-3xl p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--t-error)]/10 flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-[var(--t-error)]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-sm text-[var(--t-error)] mb-2">{errorMsg || 'Something went wrong'}</p>
            <p className="text-sm text-[var(--t-text-muted)] mb-8">
              The verification link may have expired. Please request a new one.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-white text-sm font-semibold rounded-xl transition-all"
                style={{ background: 'var(--t-primary)' }}
              >
                Back to Login <ArrowRight size={16} />
              </button>
              <button
                onClick={() => {
                  setState('verifying');
                  setErrorMsg('');
                  window.location.reload();
                }}
                className="w-full py-2.5 text-sm text-[var(--t-text-muted)] hover:text-white border border-[var(--t-border)]/50 hover:bg-[var(--t-surface-subtle)] rounded-xl transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[var(--t-text-muted)] mt-8">
          © 2026 WholeScale OS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
