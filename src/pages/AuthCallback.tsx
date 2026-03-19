// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { supabase } from '../lib/supabase';
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

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

      // Check hash first (for HashRouter)
      if (window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        code = hashParams.get('code');
        error = hashParams.get('error');
        addDebug(`📦 From hash - code: ${code ? 'yes' : 'no'}, error: ${error || 'none'}`);
      }

      // Fallback to search params
      if (!code && !error) {
        const searchParams = new URLSearchParams(window.location.search);
        code = searchParams.get('code');
        error = searchParams.get('error');
        addDebug(`📦 From search - code: ${code ? 'yes' : 'no'}, error: ${error || 'none'}`);
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
          setMessage('Google Calendar connected successfully!');
          setTimeout(() => navigate('/calendar'), 2000);
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-4">
      <div className="w-16 h-16 rounded-xl bg-brand-600 flex items-center justify-center">
        <Building2 size={32} className="text-white" />
      </div>
      
      <div className="text-center space-y-3 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-brand-500 mx-auto" />
            <p className="text-slate-300">{message}</p>
            <div className="mt-4 p-3 bg-slate-900 rounded-lg text-left max-h-96 overflow-y-auto">
              <p className="text-xs font-mono text-slate-400 mb-2">🔍 Debug Info:</p>
              {debugInfo.map((line, i) => (
                <p key={i} className="text-xs font-mono text-slate-500 mt-1 border-l-2 border-slate-700 pl-2">{line}</p>
              ))}
            </div>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 size={48} className="text-green-500 mx-auto" />
            <p className="text-green-500 font-medium">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto" />
            <p className="text-red-500 font-medium">{message}</p>
            <div className="mt-4 p-3 bg-slate-900 rounded-lg text-left max-h-96 overflow-y-auto">
              <p className="text-xs font-mono text-slate-400 mb-2">🔍 Debug Info:</p>
              {debugInfo.map((line, i) => (
                <p key={i} className="text-xs font-mono text-slate-500 mt-1 border-l-2 border-slate-700 pl-2">{line}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}