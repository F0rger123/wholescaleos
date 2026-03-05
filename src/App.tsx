import React from 'react';
import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { Layout } from './components/Layout';
import { SupabaseSync } from './lib/supabase-sync';
import { Dashboard } from './pages/Dashboard';
import Leads from './pages/Leads';
import { MapView } from './pages/MapView';
import { Team } from './pages/Team';
import { Tasks } from './pages/Tasks';
import { Chat } from './pages/Chat';
import { Imports } from './pages/Imports';
import SettingsPage from './pages/SettingsPage';
import { Login } from './pages/Login';
import { EmailConfirmed } from './pages/EmailConfirmed';
import { TeamSelection } from './pages/TeamSelection';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Building2, Loader2 } from 'lucide-react';
// Import Jotai atoms
import { 
  userAtom, 
  isLoadingAtom, 
  isAuthenticatedAtom, 
  teamIdAtom,
  setTeamIdAtom 
} from './store/atoms';

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🔴 GLOBAL ERROR:', event.error);
  console.error('Error stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 UNHANDLED PROMISE REJECTION:', event.reason);
});

console.log('📱 App.tsx loaded');

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#0f172a', color: 'white', minHeight: '100vh' }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <pre style={{ background: '#1e293b', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated] = useAtom(isAuthenticatedAtom);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (isSupabaseConfigured) {
    const hasTeam = localStorage.getItem('wholescale-preferred-team');
    if (!hasTeam) return <Navigate to="/team-selection" replace />;
  }
  
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated] = useAtom(isAuthenticatedAtom);
  if (isAuthenticated) {
    if (isSupabaseConfigured && !localStorage.getItem('wholescale-preferred-team')) {
      return <Navigate to="/team-selection" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

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
  const [, setUser] = useAtom(userAtom);
  const [, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
  const [, setTeamId] = useAtom(setTeamIdAtom);

  useEffect(() => {
    async function checkSession() {
      if (isSupabaseConfigured && supabase) {
        try {
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
            setUser(session.user);
            const teamId = localStorage.getItem('wholescale-preferred-team');
            if (teamId) {
              setTeamId(teamId);
            }
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Session check error:', error);
        }
      }
      setChecking(false);
    }
    checkSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsAuthenticated(false);
          setTeamId(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  if (checking) return <LoadingScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />
        <Route path="/team-selection" element={<TeamSelection />} />
        
        {/* 🔴 PROTECTED ROUTES COMMENTED OUT FOR DEBUGGING 🔴 */}
        {/* 
        <Route element={<ProtectedRoute><SupabaseSync><Layout /></SupabaseSync></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/team" element={<Team />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/imports" element={<Imports />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        */}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}