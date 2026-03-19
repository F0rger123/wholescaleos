// @ts-nocheck
import { useEffect, useState } from 'react';
import { AuthCallback } from './pages/AuthCallback';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SupabaseSync } from './lib/supabase-sync';
import { Dashboard } from './pages/Dashboard';
import Leads from './pages/Leads';
import { MapView } from './pages/MapView';
import { Team } from './pages/Team';
import { Tasks } from './pages/Tasks';
import { Chat } from './pages/Chat';
import { Imports } from './pages/Imports';
import { Calculators } from './pages/Calculators';
import SettingsPage from './pages/SettingsPage';
import { Login } from './pages/Login';
import { EmailConfirmed } from './pages/EmailConfirmed';
import { TeamSelection } from './pages/TeamSelection';
import { useStore } from './store/useStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Building2, Loader2 } from 'lucide-react';
import Calendar from './pages/Calendar';
import { AITest } from './pages/AITest';
import { AISettings } from './pages/AISettings';
import { SMSSettings } from './pages/SMSSettings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // If Supabase is configured but no team selected, redirect to team selection
  if (isSupabaseConfigured) {
    const hasTeam = localStorage.getItem('wholescale-preferred-team');
    if (!hasTeam) return <Navigate to="/team-selection" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    // If authenticated with Supabase, check if team is selected
    if (isSupabaseConfigured && !localStorage.getItem('wholescale-preferred-team')) {
      return <Navigate to="/team-selection" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Loading screen while checking session
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-brand-600 flex items-center justify-center">
        <Building2 size={28} className="text-white" />
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading WholeScale OS...</span>
      </div>
    </div>
  );
}

export function App() {
  const [checking, setChecking] = useState(true);
  const { login, updateProfile, incrementLoginStreak } = useStore();

  // On mount: check for existing Supabase session
  useEffect(() => {
    async function checkSession() {
      if (isSupabaseConfigured && supabase) {
        try {
          // Check for Supabase auth callback in URL (for email confirmations)
          const hash = window.location.hash;
          if (hash.includes('access_token') && (hash.includes('type=signup') || hash.includes('type=magiclink') || hash.includes('type=recovery'))) {
            if (!hash.includes('/email-confirmed')) {
              const tokenHash = hash.startsWith('#/') ? hash : hash;
              sessionStorage.setItem('supabase-auth-callback', tokenHash);
              setChecking(false);
              return;
            }
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const user = session.user;
            login(user.email || '', '');
            updateProfile({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatar: (user.user_metadata?.full_name || user.email?.split('@')[0] || 'U')
                .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            });
            incrementLoginStreak();
          }
        } catch {
          // Session check failed — stay logged out
        }
      }
      setChecking(false);
    }
    checkSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          useStore.getState().logout();
        } else if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user;
          const store = useStore.getState();
          if (!store.isAuthenticated) {
            store.login(user.email || '', '');
            store.updateProfile({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatar: (user.user_metadata?.full_name || user.email?.split('@')[0] || 'U')
                .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            });
            store.incrementLoginStreak();
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Email confirmation — accessible with or without auth */}
        <Route path="/email-confirmed" element={<EmailConfirmed />} />

        {/* Team selection — after login, before main app */}
        <Route path="/team-selection" element={<TeamSelection />} />

        {/* Google OAuth callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><SupabaseSync><Layout /></SupabaseSync></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/team" element={<Team />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/imports" element={<Imports />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/ai" element={<AISettings />} />
          <Route path="/settings/sms" element={<SMSSettings />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/ai-test" element={<AITest />} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}