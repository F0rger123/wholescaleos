// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { currentUser } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Google Calendar...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (msg: string) => {
    console.log('🔍 DEBUG:', msg);
    setDebugInfo(prev => [...prev, msg]);
  };

  useEffect(() => {
    async function handleCallback() {
      addDebug('AuthCallback mounted');
      addDebug(`Current user: ${currentUser?.id || 'none'}`);
      addDebug(`URL: ${window.location.href}`);
      
      if (!currentUser?.id) {
        addDebug('❌ No user logged in');
        setStatus('error');
        setMessage('Please log in first');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      addDebug(`Code received: ${code ? 'yes' : 'no'}`);
      addDebug(`Error: ${error || 'none'}`);

      if (error) {
        addDebug(`❌ Google error: ${error}`);
        setStatus('error');
        setMessage(`Google auth failed: ${error}`);
        setTimeout(() => navigate('/calendar'), 3000);
        return;
      }

      if (!code) {
        addDebug('❌ No code in URL');
        setStatus('error');
        setMessage('No authorization code received');
        setTimeout(() => navigate('/calendar'), 3000);
        return;
      }

      try {
        addDebug('📡 Getting GoogleCalendarService instance...');
        const service = GoogleCalendarService.getInstance();
        
        addDebug('🧪 Testing Supabase connection...');
        await service.testConnection();
        
        addDebug('📝 Storing tokens...');
        const success = await service.storeUserTokens(currentUser.id, code);

        if (success) {
          addDebug('✅ Tokens stored successfully!');
          setStatus('success');
          setMessage('Google Calendar connected successfully!');
          setTimeout(() => navigate('/calendar'), 2000);
        } else {
          addDebug('❌ Failed to store tokens');
          throw new Error('Failed to store tokens');
        }
      } catch (err) {
        addDebug(`❌ Error: ${err.message}`);
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage(`Failed to connect: ${err.message}`);
        setTimeout(() => navigate('/calendar'), 5000);
      }
    }

    handleCallback();
  }, [currentUser, navigate]);

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
            <div className="mt-4 p-3 bg-slate-900 rounded-lg text-left">
              <p className="text-xs font-mono text-slate-400">Debug info:</p>
              {debugInfo.map((line, i) => (
                <p key={i} className="text-xs font-mono text-slate-500 mt-1">{line}</p>
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
            <div className="mt-4 p-3 bg-slate-900 rounded-lg text-left">
              <p className="text-xs font-mono text-slate-400">Debug info:</p>
              {debugInfo.map((line, i) => (
                <p key={i} className="text-xs font-mono text-slate-500 mt-1">{line}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}