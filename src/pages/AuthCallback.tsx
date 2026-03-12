// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';  // Change back to useNavigate
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();  // Change back to navigate
  const { currentUser } = useStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Google Calendar...');

  useEffect(() => {
    async function handleCallback() {
      if (!currentUser?.id) {
        setStatus('error');
        setMessage('Please log in first');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Google auth failed: ${error}`);
        setTimeout(() => navigate('/calendar'), 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        setTimeout(() => navigate('/calendar'), 2000);
        return;
      }

      try {
        const service = GoogleCalendarService.getInstance();
        const success = await service.storeUserTokens(currentUser.id, code);

        if (success) {
          setStatus('success');
          setMessage('Google Calendar connected successfully!');
          setTimeout(() => navigate('/calendar'), 1500);
        } else {
          throw new Error('Failed to store tokens');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('Failed to connect Google Calendar');
        setTimeout(() => navigate('/calendar'), 2000);
      }
    }

    handleCallback();
  }, [currentUser, navigate]);

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