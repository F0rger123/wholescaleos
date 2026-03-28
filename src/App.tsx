// @ts-nocheck
import { useEffect, useState } from 'react';
import { AuthCallback } from './pages/AuthCallback';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SupabaseSync } from './lib/supabase-sync';
import Dashboard from './pages/Dashboard';
import BillingProfile from './pages/BillingProfile';
import Leads from './pages/Leads';
import MapView from './pages/MapView';
import Team from './pages/Team';
import Tasks from './pages/Tasks';
import Chat from './pages/Chat';
import Imports from './pages/Imports';
import Contracts from './pages/Contracts';
import Analytics from './pages/Analytics';
import Calculators from './pages/Calculators';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import EmailConfirmed from './pages/EmailConfirmed';
import TeamSelection from './pages/TeamSelection';
import { useStore } from './store/useStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Building2, Loader2 } from 'lucide-react';
import Calendar from './pages/Calendar';
import AITest from './pages/AITest';
import AISettings from './pages/AISettings';
import SMSSettings from './pages/SMSSettings';
import SMSInbox from './pages/SMSInbox';
import NotificationInbox from './pages/NotificationInbox';
import EmailInbox from './pages/EmailInbox';
import AgentProfile from './pages/AgentProfile';
import LeadManagement from './pages/LeadManagement';
import { startSMSPolling, stopSMSPolling } from './lib/sms-polling';
import { CursorEffects } from './components/CursorEffects';
import { MarketingLayout } from './components/MarketingLayout';
import { DeepSpaceLoader } from './components/DeepSpaceLoader';
import Home from './pages/marketing/Home';
import Features from './pages/marketing/Features';
import Pricing from './pages/marketing/Pricing';
import About from './pages/marketing/About';
import Privacy from './pages/marketing/Privacy';
import Terms from './pages/marketing/Terms';
import Contact from './pages/marketing/Contact';
import LeadShare from './pages/marketing/LeadShare';
import LeadShareEditor from './pages/LeadShareEditor';
import CRMCompare from './pages/marketing/CRMCompare';
import Integrations from './pages/marketing/Integrations';
import ScrollToTop from './components/ScrollToTop';

function ProtectedRoute({ children, checking }: { children: React.ReactNode, checking?: boolean }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  
  if (checking) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If Supabase is configured but no team selected, redirect to team selection
  if (isSupabaseConfigured) {
    const hasTeam = localStorage.getItem('wholescale-preferred-team');
    if (!hasTeam) return <Navigate to="/team-selection" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children, checking }: { children: React.ReactNode, checking?: boolean }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (checking) return null;
  if (isAuthenticated) {
    // If authenticated with Supabase, check if team is selected
    if (isSupabaseConfigured && !localStorage.getItem('wholescale-preferred-team')) {
      return <Navigate to="/team-selection" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Wrapper to share SupabaseSync across routes without remounting
function DataSyncWrapper() {
  return (
    <SupabaseSync>
      <Outlet />
    </SupabaseSync>
  );
}

// Loading screen while checking session is no longer needed in App.tsx
// SupabaseSync will handle the branded loading experience.

export function App() {
  const [checking, setChecking] = useState(true);
  const { login, updateProfile, incrementLoginStreak, loadLeads } = useStore();

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
            const userId = session.user.id;
            console.log('[App] Session found for user:', userId, '. Initializing profile...');
            
            // Set authenticated first so ProtectedRoute allows us through
            useStore.getState().setAuthenticated(true);
            
            // fetchProfile will get the full user data AND the correct teamId
            await useStore.getState().fetchProfile(userId);
            
            // incrementLoginStreak is internal to the store
            useStore.getState().incrementLoginStreak();
            
            // IMPORTANT: Do NOT call loadLeads here. 
            // SupabaseSync will handle loading all data once it mounts.
            // Calling it here sets dataLoaded: true prematurely, which 
            // causes SupabaseSync to skip team configuration loading.
            console.log('[App] Profile initialized. teamId:', useStore.getState().teamId);
          }
        } catch (err) {
          console.error('[App] Session check failed:', err);
        }
      }
      setChecking(false);
    }
    checkSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[App] Auth state change:', event, session?.user?.id);
        if (event === 'SIGNED_OUT' || !session) {
          const store = useStore.getState();
          if (store.isAuthenticated || store.currentUser) {
            console.log('[App] SIGNED_OUT event. Clearing store...');
            store.logout();
          }
        } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const userId = session.user.id;
          const store = useStore.getState();
          
          if (!store.isAuthenticated || !store.teamId) {
            console.log('[App] SIGNED_IN/INITIAL_SESSION event. Initializing profile...');
            store.setAuthenticated(true);
            
            (async () => {
              try {
                await store.fetchProfile(userId);
                store.incrementLoginStreak();
                console.log('[App] Profile fetched via auth change. teamId:', store.teamId);
              } catch (err) {
                console.error('[App] Auth change initialization failed:', err);
              }
            })();
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/Stop SMS Polling based on auth status
  const isAuthenticated = useStore(s => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      startSMSPolling();
    } else {
      stopSMSPolling();
    }
    return () => stopSMSPolling();
  }, [isAuthenticated]);

  if (checking) {
    return <DeepSpaceLoader />;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <CursorEffects />
      <Routes>
        {/* Marketing Site */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/compare" element={<CRMCompare />} />
        </Route>

        <Route path="/share/:id" element={<LeadShare />} />
        <Route path="/agent/:name" element={<AgentProfile />} />


        {/* Public routes */}
        <Route path="/login" element={<PublicRoute checking={checking}><Login /></PublicRoute>} />

        {/* Email confirmation — accessible with or without auth */}
        <Route path="/email-confirmed" element={<EmailConfirmed />} />

        {/* Team selection — after login, before main app */}
        <Route path="/team-selection" element={<TeamSelection />} />

        {/* Protected routes wrapped in a single SupabaseSync to prevent flicker on navigation */}
        <Route element={<ProtectedRoute checking={checking}><DataSyncWrapper /></ProtectedRoute>}>
          {/* Full-page routes (No Sidebar) */}
          <Route path="/leads/:id/manage" element={<LeadManagement />} />
          
          {/* Main App routes (With Sidebar) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/billing" element={<BillingProfile />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<Leads />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/team" element={<Team />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/imports" element={<Imports />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/leads/:id/share-edit" element={<LeadShareEditor />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/ai" element={<AISettings />} />
            <Route path="/settings/sms" element={<SMSSettings />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-test" element={<AITest />} />
            <Route path="/sms" element={<SMSInbox />} />
            <Route path="/email" element={<EmailInbox />} />
            <Route path="/notifications" element={<NotificationInbox />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}