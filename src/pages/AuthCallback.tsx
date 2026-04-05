// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

console.log('🚀 AuthCallback component mounted!');

export function AuthCallback() {
  const navigate = useNavigate();
  const { currentUser, login } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Google Calendar...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (msg: string) => {
    console.log('🔍 DEBUG:', msg);
    setDebugInfo(prev => [...prev, msg]);
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      addDebug('🚀 AuthCallback mounted');
      addDebug(`📍 Full URL: ${window.location.href}`);
      addDebug(`📍 Hash: ${window.location.hash}`);
      addDebug(`📍 Search: ${window.location.search}`);

      // 1. Wait for Supabase session to be ready (up to 5 seconds)
      addDebug('🔄 Waiting for Supabase session...');
      let session = null;
      let userId = null;
      let retries = 0;
      const MAX_RETRIES = 5;

      while (retries < MAX_RETRIES && mounted) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          session = data.session;
          userId = data.session.user.id;
          addDebug(`✅ Session found after ${retries} retries: ${userId}`);
          break;
        }
        addDebug(`⏳ Retry ${retries + 1}/${MAX_RETRIES}: No session yet...`);
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }

      // Sync store if we found a user
      if (userId && session && !useStore.getState().currentUser?.id) {
        addDebug('🔄 Synchronizing user store...');
        login(session.user.email || '', '');
        // Small delay for store propagation
        await new Promise(r => setTimeout(r, 100));
      }

      // 2. Fallback: Redirect to login with return_to parameter if still no user
      if (!userId && mounted) {
        addDebug('❌ No authenticated session found after 5 seconds');
        setStatus('error');
        setMessage('Your session could not be restored. Redirecting to login...');
        
        // Clear tokens/state if any
        localStorage.removeItem('supabase.auth.token');
        
        const currentUrl = new URL(window.location.href);
        const returnUrl = encodeURIComponent('/settings/sms' + currentUrl.search + currentUrl.hash);
        
        setTimeout(() => {
          navigate(`/login?return_to=${returnUrl}`);
        }, 2000);
        return;
      }

      // Extract code from hash or search params
      let code = null;
      let error = null;
      let state = null;

      // Check hash first (for HashRouter)
      if (window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        code = hashParams.get('code');
        error = hashParams.get('error');
        state = hashParams.get('state');
        addDebug(`📦 From hash - code: ${code ? 'yes' : 'no'}, error: ${error || 'none'}, state: ${state || 'none'}`);
      }

      // Fallback to search params
      if (!code && !error) {
        const searchParams = new URLSearchParams(window.location.search);
        code = searchParams.get('code');
        error = searchParams.get('error');
        state = searchParams.get('state');
        addDebug(`📦 From search - code: ${code ? 'yes' : 'no'}, error: ${error || 'none'}, state: ${state || 'none'}`);
      }

      if (error) {
        addDebug(`❌ Google returned error: ${error}`);
        setStatus('error');
        setMessage(`Google authentication failed: ${error}`);
        setTimeout(() => navigate('/calendar'), 3000);
        return;
      }

      if (!code) {
        addDebug('❌ No authorization code found in URL');
        setStatus('error');
        setMessage('No authorization code received from Google');
        setTimeout(() => navigate('/calendar'), 3000);
        return;
      }

      addDebug(`✅ Authorization code received (length: ${code.length})`);

      // 1.5 NEW: Handle Password Reset (Supabase Auth Recovery)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const isRecovery = hashParams.get('type') === 'recovery' || 
                         new URLSearchParams(window.location.search).get('type') === 'recovery';

      if (isRecovery) {
        addDebug('🔑 Password recovery detected, redirecting to reset page...');
        setStatus('success');
        setMessage('Security session confirmed. Redirecting to password reset...');
        setTimeout(() => navigate('/reset-password'), 1500);
        return;
      }

      try {
        addDebug('📡 Initializing Google Calendar service...');
        const service = GoogleCalendarService.getInstance();
        
        addDebug('🧪 Testing Supabase connection...');
        await service.testConnection();
        
        addDebug('💾 Storing authentication tokens...');
        const success = await service.storeUserTokens(userId, code);

          if (success && mounted) {
            addDebug('✅ Tokens stored successfully!');
            setStatus('success');
            setMessage('Google Workspace successfully connected. Calendar, Gmail, and Tasks are ready.');
            
            let redirectPath = '/calendar';
            if (state && state !== 'calendar-sync') {
              try {
                // Handle our custom state format 'calendar-sync:/path'
                if (state.startsWith('calendar-sync:')) {
                  redirectPath = state.split(':')[1] || '/calendar';
                }
                // Handle standard URL or straight path redirects
                else if (state.startsWith('http')) {
                  redirectPath = new URL(state).pathname + new URL(state).search + new URL(state).hash;
                } else {
                  redirectPath = decodeURIComponent(state);
                }
                if (!redirectPath.startsWith('/')) redirectPath = '/' + redirectPath;
              } catch (e) {
                console.error('State decode error:', e);
              }
            }
            
            addDebug(`🚀 Navigating back to: ${redirectPath}`);
            setTimeout(() => navigate(redirectPath), 1200);
          } else {
          throw new Error('Failed to store tokens');
        }
      } catch (err) {
        addDebug(`❌ Error during token storage: ${err.message}`);
        console.error('Auth callback error:', err);
        if (mounted) {
          setStatus('error');
          setMessage(`Connection failed: ${err.message}`);
          setTimeout(() => navigate('/calendar'), 5000);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [navigate, login, currentUser?.id]);

  return (
    <div className="min-h-screen bg-[var(--t-background)] flex flex-col items-center justify-center gap-6 p-4">
      <Logo size={64} />
      
      <div className="text-center space-y-3 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-[var(--t-primary)] mx-auto" />
            <p className="text-[var(--t-text-muted)]">{message}</p>
            <div className="mt-4 p-3 bg-[var(--t-surface)] rounded-lg text-left max-h-96 overflow-y-auto">
              <p className="text-xs font-mono text-[var(--t-text-muted)] mb-2">🔍 Debug Info:</p>
              {debugInfo.map((line, i) => (
                <p key={i} className="text-xs font-mono text-[var(--t-text-muted)] mt-1 border-l-2 border-[var(--t-border)] pl-2">{line}</p>
              ))}
            </div>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 size={48} className="text-[var(--t-success)] mx-auto" />
            <p className="text-[var(--t-success)] font-medium">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-[var(--t-error)] mx-auto" />
            <p className="text-[var(--t-error)] font-medium">{message}</p>
            <div className="mt-4 p-3 bg-[var(--t-surface)] rounded-lg text-left max-h-96 overflow-y-auto">
              <p className="text-xs font-mono text-[var(--t-text-muted)] mb-2">🔍 Debug Info:</p>
              {debugInfo.map((line, i) => (
                <p key={i} className="text-xs font-mono text-[var(--t-text-muted)] mt-1 border-l-2 border-[var(--t-border)] pl-2">{line}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}