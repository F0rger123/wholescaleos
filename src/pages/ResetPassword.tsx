import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { toast } from 'react-hot-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we actually have a session (recovery flow sets it)
    async function checkSession() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active security session found. Please request a new password reset link.');
      }
    }
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--t-background)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <Logo size={64} className="mx-auto mb-6" />
          <h1 className="text-3xl font-black text-white tracking-tight uppercase italic mb-2">
            Secure Reset
          </h1>
          <p className="text-[var(--t-text-muted)] text-sm tracking-widest uppercase font-bold">
            Update your credentials
          </p>
        </div>

        <div className="astral-glass border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
          {success ? (
            <div className="text-center py-8 animate-astral-fade-up">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                <CheckCircle2 size={40} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Updated</h2>
              <p className="text-[var(--t-text-muted)] text-sm mb-8">
                Your security credentials have been successfully updated. Redirecting you to sign in...
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                Go to Sign In <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-astral-shake">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <label className="block text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">New Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] group-focus-within:text-indigo-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] mb-2 ml-1">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] group-focus-within:text-indigo-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating Securely...
                    </>
                  ) : (
                    <>
                      Update Password <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/login')}
            className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] hover:text-white transition-colors"
          >
            Cancel and Return to Sign In
          </button>
        </div>
      </div>

      {/* Brand Footer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] italic mb-1 text-white">WholeScale OS</p>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-indigo-400">Secure Authentication Protocol</p>
      </div>
    </div>
  );
}
