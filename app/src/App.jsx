import { Component, useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../convex/_generated/api';
import { Analytics } from '@vercel/analytics/react';
import i18nInstance, { SUPPORTED_LANGUAGES } from './i18n';
import collabnbLogo from './assets/collabnb-logo.png';
import bgClouds from './assets/bg-clouds-hazy.png';
import AnalyticsTracker from './components/AnalyticsTracker';
import CookieBanner from './components/CookieBanner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppBarProvider } from './contexts/AppBarContext';
import { CollabProvider } from './contexts/CollabContext';
import { ListingDraftProvider } from './contexts/ListingDraftContext';
import { VerificationProvider } from './contexts/VerificationContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Layout        from './components/Layout';
import { ThinkingOrb } from 'thinking-orbs';
// Route pages are lazy-loaded so any single route (e.g. a blog post landed
// on from search) only downloads its own code, not every other route's —
// previously everything shipped as one ~5.5MB bundle regardless of entry point.
const ContractBuilder = lazy(() => import('./components/ContractBuilder'));
const Explore       = lazy(() => import('./pages/Explore'));
const Collabs       = lazy(() => import('./pages/Collabs'));
const Saved         = lazy(() => import('./pages/Saved'));
const Inbox         = lazy(() => import('./pages/Inbox'));
const Founders      = lazy(() => import('./pages/Founders'));
const Profile       = lazy(() => import('./pages/Profile'));
const Settings      = lazy(() => import('./pages/Settings'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const HostDashboard        = lazy(() => import('./pages/HostDashboard'));
const HostListingDetail    = lazy(() => import('./pages/host/HostListingDetail'));
const HostProposals        = lazy(() => import('./pages/host/HostProposals'));
const HostCreators         = lazy(() => import('./pages/host/HostCreators'));
const CreateListingIntro   = lazy(() => import('./pages/host/CreateListingIntro'));
const Step1Basics          = lazy(() => import('./pages/host/Step1Basics'));
const Step2Offer           = lazy(() => import('./pages/host/Step2Offer'));
const Step3Deliverables    = lazy(() => import('./pages/host/Step3Deliverables'));
const Step4Review          = lazy(() => import('./pages/host/Step4Review'));
const Step5Payment         = lazy(() => import('./pages/host/Step5Payment'));
const AdminDashboard       = lazy(() => import('./pages/AdminDashboard'));
const Blog                 = lazy(() => import('./pages/Blog'));
const BlogPost             = lazy(() => import('./pages/BlogPost'));
const ReceiptPreview       = lazy(() => import('./pages/dev/ReceiptPreview'));
const OrbPreview           = lazy(() => import('./pages/dev/OrbPreview'));
const WaitlistPreview      = lazy(() => import('./pages/WaitlistPreview'));

// One-click "send this crash to the dev team" button shown in the crash
// screen below. Lives outside the class ErrorBoundary since hooks need a
// function component, but it's rendered from inside that boundary's fallback.
function CrashReportButton({ error, componentStack }) {
  const submitCrashReport = useMutation(api.crashReports.submitCrashReport);
  const { t } = useTranslation('app');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const send = async () => {
    setStatus('sending');
    try {
      await submitCrashReport({
        message: error?.message || String(error),
        stack: error?.stack,
        componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return <p style={{ marginTop: '1.25rem', color: '#2a7', fontWeight: 'bold' }}>{t('crash.sent')}</p>;
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <button
        onClick={send}
        disabled={status === 'sending'}
        style={{
          fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 'bold',
          padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: 'none',
          background: '#c00', color: '#fff', cursor: status === 'sending' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'sending' ? t('crash.sending') : t('crash.sendButton')}
      </button>
      {status === 'error' && <p style={{ color: '#c00', marginTop: '0.5rem' }}>{t('crash.sendFailed')}</p>}
    </div>
  );
}

// Catch any render crash and show it instead of a blank page
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, componentStack: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(error, info) { this.setState({ componentStack: info?.componentStack }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'monospace', padding: '2rem', background: '#fff', color: '#c00' }}>
          <strong>{i18nInstance.t('app:crash.title')}</strong>
          <pre style={{ marginTop: '1rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <CrashReportButton error={this.state.error} componentStack={this.state.componentStack} />
        </div>
      );
    }
    return this.props.children;
  }
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// ── Post-signup celebration overlay ──────────────────────────────────────────
function NewSignupCelebration({ onDone }) {
  const { t } = useTranslation('app');
  const canvasRef = useRef(null);
  const [quote, setQuote] = useState('');
  const [showSpinner, setShowSpinner] = useState(false);
  const QUOTE = t('celebration.quote');

  // Confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const COLORS = ['#4ecdc4','#a8e6cf','#ffd93d','#ff8c94','#c8b8ff','#ffffff','#7ee8a2'];
    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
      r: 5 + Math.random() * 6, dx: (Math.random() - 0.5) * 2.5,
      dy: 3 + Math.random() * 5, angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.18,
      color: COLORS[Math.floor(Math.random() * COLORS.length)], rect: Math.random() > 0.4,
    }));
    let frame, start = null;
    const draw = (ts) => {
      if (!start) start = ts;
      const prog = (ts - start) / 4000;
      const alpha = prog > 0.6 ? Math.max(0, 1 - (prog - 0.6) / 0.4) : 1;
      ctx.clearRect(0, 0, W, H); ctx.globalAlpha = alpha;
      pieces.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.color;
        if (p.rect) ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        else { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        p.x += p.dx; p.y += p.dy; p.angle += p.spin;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      });
      if ((ts - start) < 4000) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Typewriter
  useEffect(() => {
    let i = 0;
    let timer;
    const tick = () => {
      if (i < QUOTE.length) {
        setQuote(QUOTE.slice(0, i + 1));
        i++;
        timer = setTimeout(tick, 44 + Math.random() * 20);
      } else {
        setShowSpinner(true);
        timer = setTimeout(onDone, 1800);
      }
    };
    timer = setTimeout(tick, 350);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#F7F5F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.75rem', padding: '2rem' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 10001 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
        <img src={collabnbLogo} width="32" height="32" alt="" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)' }}>Collabnb</span>
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 700, color: 'var(--ink)', textAlign: 'center', maxWidth: 520, lineHeight: 1.3, margin: 0, minHeight: '2em', position: 'relative' }}>
        {quote}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--slate)', fontSize: '0.82rem', opacity: showSpinner ? 1 : 0, transition: 'opacity 600ms', marginTop: '0.5rem', position: 'relative' }}>
        <ThinkingOrb state="connecting" size={20} theme="light" color="var(--slate)" />
        <span>{t('celebration.buildingProfile')}</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, loading, profile } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAdmin = profile?.is_admin === true
    || profile?.email?.toLowerCase() === 'benventuring@gmail.com'
    || (!!ADMIN_EMAIL && profile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  // Drives the whole app's language from the user's saved preference — the
  // Settings page just writes preferred_language, this is the only place
  // that reacts to it.
  useEffect(() => {
    const lang = profile?.preferred_language;
    if (lang && SUPPORTED_LANGUAGES.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    document.documentElement.lang = (lang && SUPPORTED_LANGUAGES.includes(lang)) ? lang : 'en';
  }, [profile?.preferred_language, i18n]);

  const [showCelebration, setShowCelebration] = useState(() => {
    const flag = localStorage.getItem('collabnb_new_signup') === '1';
    if (flag) localStorage.removeItem('collabnb_new_signup');
    return flag;
  });

  const handleCelebrationDone = useCallback(() => {
    setShowCelebration(false);
    navigate('/profile', { replace: true });
  }, [navigate]);

  if (showCelebration) return <NewSignupCelebration onDone={handleCelebrationDone} />;

  if (loading) return <LoadingScreen />;

  if (!session) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const path = window.location.pathname;
    const isPublicRoute = path === '/blog' || path.startsWith('/blog/') || path === '/dev/receipt-preview';
    if (!isLocalhost && !isPublicRoute) {
      window.location.href = '/login.html';
      return null;
    }
    // Public routes (the Journal/blog) and localhost dev fall through.
  }

  // Host routes require the host role — a pending role switch or a creator
  // deep-linking to /host is sent back to their own experience
  const isLocalhostDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hostOnly = (el) => (isAdmin || isLocalhostDev || profile?.role === 'host') ? el : <Navigate to="/explore" replace />;
  // Founders space is founder-only (dev/admin always allowed for preview)
  const founderOnly = (el) => (isAdmin || isLocalhostDev || profile?.is_founder === true) ? el : <Navigate to="/explore" replace />;

  return (
    <CollabProvider>
      <VerificationProvider>
      <SubscriptionProvider>
      <ListingDraftProvider>
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
            {/* Host wizard — full-screen, no nav chrome */}
          <Route path="/host/listings/create"              element={hostOnly(<CreateListingIntro />)} />
          <Route path="/host/listings/create/basics"       element={hostOnly(<Step1Basics />)} />
          <Route path="/host/listings/create/offer"        element={hostOnly(<Step2Offer />)} />
          <Route path="/host/listings/create/deliverables" element={hostOnly(<Step3Deliverables />)} />
          <Route path="/host/listings/create/review"       element={hostOnly(<Step4Review />)} />
          <Route path="/host/listings/create/payment"      element={hostOnly(<Step5Payment />)} />

          {/* Admin panel — full-screen, no nav chrome */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Public Journal — no nav chrome, no auth, no launch banner */}
          <Route path="/blog"       element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Internal preview — no nav chrome, no auth. Not linked anywhere. */}
          <Route path="/dev/receipt-preview" element={<ReceiptPreview />} />
          <Route path="/dev/orb-preview" element={<OrbPreview />} />

          {/* Pending-approval waitlist screen — full-screen, no nav chrome */}
          <Route path="/welcome" element={<WaitlistPreview />} />

          {/* All other routes — wrapped in Layout (nav + HAZY bg) */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/"                  element={<Navigate to={isAdmin ? '/admin' : profile?.role === 'host' ? '/host' : '/explore'} replace />} />
                {/* Host dashboard pages */}
                <Route path="/host"              element={hostOnly(<HostDashboard />)} />
                <Route path="/host/listing/:id"  element={hostOnly(<HostListingDetail />)} />
                <Route path="/host/proposals"    element={hostOnly(<HostProposals />)} />
                <Route path="/host/creators"     element={hostOnly(<HostCreators />)} />
                {/* Creator pages */}
                <Route path="/explore"           element={<Explore />} />
                <Route path="/listing/:id"       element={<ListingDetail />} />
                <Route path="/collabs"           element={<Collabs />} />
                <Route path="/saved"             element={<Saved />} />
                <Route path="/inbox"             element={<Inbox />} />
                <Route path="/founders"          element={founderOnly(<Founders />)} />
                <Route path="/profile"           element={<Profile />} />
                <Route path="/settings"          element={<Settings />} />
                <Route path="/contract"          element={<ContractBuilder />} />
                <Route path="*"                  element={<Navigate to="/explore" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
        </Suspense>
      </ListingDraftProvider>
      </SubscriptionProvider>
      </VerificationProvider>
    </CollabProvider>
  );
}

function LoadingScreen() {
  const { t } = useTranslation('app');
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #D1EBDB 0%, #EFECE9 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem',
    }}>
      <style>{`
        @keyframes cnb-cloud-a {
          0%,100% { transform:translate3d(-4%, 0, 0) scale(1.14); }
          50%     { transform:translate3d(4%, -2.5%, 0) scale(1.18); }
        }
        @keyframes cnb-cloud-b {
          0%,100% { transform:translate3d(3.5%, 1.5%, 0) scale(1.22); }
          50%     { transform:translate3d(-4%, -1.5%, 0) scale(1.17); }
        }
        @keyframes cnb-flicker {
          0%,100% { opacity:0.55; }
          45%     { opacity:1; }
          70%     { opacity:0.7; }
        }
        @keyframes cnb-ellipsis {
          0%,20%  { content:''; }
          40%     { content:'.'; }
          60%     { content:'..'; }
          80%,100%{ content:'...'; }
        }
        .cnb-loading::after { content:''; animation:cnb-ellipsis 1.8s steps(1) infinite; }
      `}</style>

      {/* Drifting cloud layers — two speeds for a parallax shift */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '-10%',
        backgroundImage: `url(${bgClouds})`, backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.38, mixBlendMode: 'multiply', filter: 'saturate(0.6) brightness(1.05)',
        animation: 'cnb-cloud-a 16s ease-in-out infinite', willChange: 'transform',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '-12%',
        backgroundImage: `url(${bgClouds})`, backgroundSize: 'cover', backgroundPosition: '40% 60%',
        opacity: 0.24, mixBlendMode: 'multiply', filter: 'saturate(0.5) brightness(1.1)',
        animation: 'cnb-cloud-b 22s ease-in-out infinite', willChange: 'transform',
      }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <ThinkingOrb state="connecting" size={64} theme="light" color="var(--slate)" style={{ transform: 'scale(1.25)' }} />
        <p className="cnb-loading" style={{ fontFamily: 'var(--font-body, sans-serif)', fontWeight: 600, color: '#6E7F7A', fontSize: '1rem', letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase', animation: 'cnb-flicker 2.4s ease-in-out infinite' }}>
          {t('loading')}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppBarProvider>
        <AuthProvider>
          <BrowserRouter>
            <AnalyticsTracker />
            <AppRoutes />
            <CookieBanner />
            <Analytics />
          </BrowserRouter>
        </AuthProvider>
      </AppBarProvider>
    </ErrorBoundary>
  );
}
