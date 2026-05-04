import { Component } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppBarProvider } from './contexts/AppBarContext';
import { CollabProvider } from './contexts/CollabContext';
import Layout        from './components/Layout';
import Explore       from './pages/Explore';
import Collabs       from './pages/Collabs';
import Saved         from './pages/Saved';
import Inbox         from './pages/Inbox';
import Profile       from './pages/Profile';
import ListingDetail from './pages/ListingDetail';

// Catch any render crash and show it instead of a blank page
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'monospace', padding: '2rem', background: '#fff', color: '#c00' }}>
          <strong>App crash — copy this and send to dev:</strong>
          <pre style={{ marginTop: '1rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      window.location.href = '../index.html';
    }
    return <LoadingScreen />;
  }

  return (
    <CollabProvider>
      <Layout>
        <Routes>
          <Route path="/"               element={<Navigate to="/explore" replace />} />
          <Route path="/explore"        element={<Explore />} />
          <Route path="/listing/:id"    element={<ListingDetail />} />
          <Route path="/collabs"        element={<Collabs />} />
          <Route path="/saved"          element={<Saved />} />
          <Route path="/inbox"          element={<Inbox />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="*"               element={<Navigate to="/explore" replace />} />
        </Routes>
      </Layout>
    </CollabProvider>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: '#EFECE9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <p style={{ fontFamily: 'sans-serif', color: '#3C5759', fontSize: '1rem' }}>Loading Collabnb…</p>
      <div style={{ width: 24, height: 24, border: '3px solid #D1EBDB', borderTopColor: '#3C5759', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppBarProvider>
        <AuthProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </AppBarProvider>
    </ErrorBoundary>
  );
}
