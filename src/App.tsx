import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { useStore } from './store/useStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Building2, Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  console.log('🔒 ProtectedRoute rendering');
  const isAuthenticated = useStore((s) => {
    console.log('📊 isAuthenticated value:', s.isAuthenticated);
    return s.isAuthenticated;
  });
  
  if (!isAuthenticated) {
    console.log('➡️ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // If Supabase is configured but no team selected, redirect to team selection
  if (isSupabaseConfigured) {
    const hasTeam = localStorage.getItem('wholescale-preferred-team');
    console.log('🏠 hasTeam:', hasTeam);
    if (!hasTeam) {
      console.log('➡️ No team, redirecting to team-selection');
      return <Navigate to="/team-selection" replace />;
    }
  }
  
  console.log('✅ ProtectedRoute rendering children');
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  console.log('🌍 PublicRoute rendering');
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  
  if (isAuthenticated) {
    console.log('➡️ Already authenticated, redirecting');
    if (isSupabaseConfigured && !localStorage.getItem('wholescale-preferred-team')) {
      return <Navigate to="/team-selection" replace />;
    }
    return <Navigate to="/" replace />;
  }
  console.log('✅ PublicRoute rendering children');
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
  console.log('🚀 App component rendering');
  const [checking, setChecking] = useState(true);
  const { login, updateProfile, incrementLoginStreak, isAuthenticated } = useStore();
  
  console.log('📊 Store state:', { isAuthenticated, checking });

  // On mount: check for existing Supabase session
  useEffect(() => {
    console.log('📞 checkSession useEffect running');
    
    async function checkSession() {
      console.log('🔍 checkSession started');
      
      if (isSupabaseConfigured && supabase) {
        console.log('✅ Supabase configured, checking session');
        
        try {
          // First, check if there's an auth callback in the URL hash
          const hash = window.location.hash;
          console.log('📍 Current hash:', hash);
          
          if (hash.includes('access_token') && (hash.includes('type=signup') || hash.includes('type=magiclink') || hash.includes('type=recovery'))) {
            console.log('📧 Auth callback detected');
            if (!hash.includes('/email-confirmed')) {
              const tokenHash = hash.startsWith('#/') ? hash : hash;
              sessionStorage.setItem('supabase-auth-callback', tokenHash);
              console.log('💾 Stored auth callback in sessionStorage');
              setChecking(false);
              return;
            }
          }

          console.log('🔐 Getting session from Supabase');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Session error:', error);
          }
          
          console.log('📦 Session data:', session ? 'Session exists' : 'No session');
          
          if (session?.user) {
            console.log('👤 User found:', session.user.email);
            
            try {
              // Login with empty password (we're just restoring session)
              console.log('🔑 Logging in...');
              await login(session.user.email || '', '');
              console.log('✅ Login successful');
              
              // Update profile with correct format
              console.log('📝 Updating profile...');
              await updateProfile({
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                avatar_url: null,
                phone: null,
              });
              console.log('✅ Profile updated');
              
              console.log('🔥 Incrementing streak...');
              await incrementLoginStreak();
              console.log('✅ Streak incremented');
              
            } catch (loginError) {
              console.error('❌ Error during login flow:', loginError);
            }
          }
        } catch (error) {
          console.error('❌ Session check error:', error);
        }
      } else {
        console.log('⚠️ Supabase not configured');
      }
      
      console.log('✅ checkSession complete, setting checking to false');
      setChecking(false);
    }
    
    checkSession();

    // Listen for auth state changes
    if (isSupabaseConfigured && supabase) {
      console.log('👂 Setting up auth state listener');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('🚪 User signed out');
          useStore.getState().logout();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in');
          const user = session.user;
          const store = useStore.getState();
          
          if (!store.isAuthenticated) {
            console.log('🔄 Auto-login triggered');
            try {
              await store.login(user.email || '', '');
              await store.updateProfile({
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                avatar_url: null,
                phone: null,
              });
              await store.incrementLoginStreak();
              console.log('✅ Auto-login complete');
            } catch (error) {
              console.error('❌ Auto-login error:', error);
            }
          }
        }
      });
      
      return () => {
        console.log('🧹 Cleaning up auth listener');
        subscription.unsubscribe();
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  console.log('🎨 Rendering with checking:', checking);
  
  if (checking) {
    console.log('⏳ Showing loading screen');
    return <LoadingScreen />;
  }

  console.log('🗺️ Rendering router');
  return (
    <HashRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Email confirmation — accessible with or without auth */}
        <Route path="/email-confirmed" element={<EmailConfirmed />} />

        {/* Team selection — after login, before main app */}
        <Route path="/team-selection" element={<TeamSelection />} />

        {/* Protected routes */}
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
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}