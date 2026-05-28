import { Component } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppBarProvider } from './contexts/AppBarContext';
import { CollabProvider } from './contexts/CollabContext';
import { ListingDraftProvider } from './contexts/ListingDraftContext';
import { VerificationProvider } from './contexts/VerificationContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Layout        from './components/Layout';
import ContractBuilder from './components/ContractBuilder';
import Explore       from './pages/Explore';
import Collabs       from './pages/Collabs';
import Saved         from './pages/Saved';
import Inbox         from './pages/Inbox';
import Profile       from './pages/Profile';
import ListingDetail from './pages/ListingDetail';
import HostDashboard        from './pages/HostDashboard';
import HostListingDetail    from './pages/host/HostListingDetail';
import HostProposals        from './pages/host/HostProposals';
import HostCreators         from './pages/host/HostCreators';
import CreateListingIntro   from './pages/host/CreateListingIntro';
import Step1Basics          from './pages/host/Step1Basics';
import Step2Offer           from './pages/host/Step2Offer';
import Step3Deliverables    from './pages/host/Step3Deliverables';
import Step4Review          from './pages/host/Step4Review';
import AdminDashboard       from './pages/AdminDashboard';
import WaitlistPreview      from './pages/WaitlistPreview';

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
  const { session, loading, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      window.location.href = '/login.html';
      return null;
    }
    // On localhost — fall through to app with mock session (dev mode)
  }

  // Waitlist gate — unverified waitlist-tier users see locked preview only
  const isWaitlisted = profile && profile.tier === 'waitlist' && !profile.is_verified;
  if (isWaitlisted) {
    return (
      <Routes>
        <Route path="*" element={<WaitlistPreview />} />
      </Routes>
    );
  }

  return (
    <CollabProvider>
      <VerificationProvider>
      <SubscriptionProvider>
      <ListingDraftProvider>
        <Routes>
            {/* Host wizard — full-screen, no nav chrome */}
          <Route path="/host/listings/create"              element={<CreateListingIntro />} />
          <Route path="/host/listings/create/basics"       element={<Step1Basics />} />
          <Route path="/host/listings/create/offer"        element={<Step2Offer />} />
          <Route path="/host/listings/create/deliverables" element={<Step3Deliverables />} />
          <Route path="/host/listings/create/review"       element={<Step4Review />} />

          {/* Admin panel — full-screen, no nav chrome */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* All other routes — wrapped in Layout (nav + HAZY bg) */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/"                  element={<Navigate to="/explore" replace />} />
                {/* Host dashboard pages */}
                <Route path="/host"              element={<HostDashboard />} />
                <Route path="/host/listing/:id"  element={<HostListingDetail />} />
                <Route path="/host/proposals"    element={<HostProposals />} />
                <Route path="/host/creators"     element={<HostCreators />} />
                {/* Creator pages */}
                <Route path="/explore"           element={<Explore />} />
                <Route path="/listing/:id"       element={<ListingDetail />} />
                <Route path="/collabs"           element={<Collabs />} />
                <Route path="/saved"             element={<Saved />} />
                <Route path="/inbox"             element={<Inbox />} />
                <Route path="/profile"           element={<Profile />} />
                <Route path="/contract"          element={<ContractBuilder />} />
                <Route path="*"                  element={<Navigate to="/explore" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </ListingDraftProvider>
      </SubscriptionProvider>
      </VerificationProvider>
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
