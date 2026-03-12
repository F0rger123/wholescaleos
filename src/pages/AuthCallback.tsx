// @ts-nocheck
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';  // Change this line
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function AuthCallback() {
  const history = useHistory();  // Change this line
  const { currentUser } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Google Calendar...');

  useEffect(() => {
    async function handleCallback() {
      if (!currentUser?.id) {
        setStatus('error');
        setMessage('Please log in first');
        setTimeout(() => history.push('/login'), 2000);  // Change this
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Google auth failed: ${error}`);
        setTimeout(() => history.push('/calendar'), 2000);  // Change this
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        setTimeout(() => history.push('/calendar'), 2000);  // Change this
        return;
      }

      try {
        const service = GoogleCalendarService.getInstance();
        const success = await service.storeUserTokens(currentUser.id, code);

        if (success) {
          setStatus('success');
          setMessage('Google Calendar connected successfully!');
          setTimeout(() => history.push('/calendar'), 1500);  // Change this
        } else {
          throw new Error('Failed to store tokens');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('Failed to connect Google Calendar');
        setTimeout(() => history.push('/calendar'), 2000);  // Change this
      }
    }

    handleCallback();
  }, [currentUser, history]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 rounded-xl bg-brand-600 flex items-center justify-center">
        <Building2 size={32} className="text-white" />
      </div>
      
      <div className="text-center space-y-3">
        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-brand-500 mx-auto" />
            <p className="text-slate-300">{message}</p>
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
          </>
        )}
      </div>
    </div>
  );
}