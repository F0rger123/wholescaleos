import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';

// Super simple component to test
function TestDashboard() {
  return (
    <div style={{ padding: '20px', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <h1>✅ Dashboard Loaded!</h1>
      <p>If you see this, the app is working.</p>
    </div>
  );
}

function TestLogin() {
  const { login } = useStore();
  const [email, setEmail] = useState('drummerforger@gmail.com');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <h1>Login Test</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  const [checking, setChecking] = useState(true);
  const { isAuthenticated } = useStore();

  useEffect(() => {
    console.log('App mounted, isAuthenticated:', isAuthenticated);
    setChecking(false);
  }, [isAuthenticated]);

  if (checking) {
    return <div style={{ padding: '20px', color: 'white', background: '#0f172a' }}>Loading...</div>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<TestLogin />} />
        <Route path="/" element={
          <ProtectedRoute>
            <TestDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </HashRouter>
  );
}