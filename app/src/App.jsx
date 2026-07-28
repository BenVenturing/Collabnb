import { Component, useRef, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import collabnbLogo from './assets/collabnb-logo.png';
import AnalyticsTracker from './components/AnalyticsTracker';
import CookieBanner from './components/CookieBanner';
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
import Founders      from './pages/Founders';
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
import Blog                 from './pages/Blog';
import BlogPost             from './pages/BlogPost';

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

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// ── Post-signup celebration overlay ──────────────────────────────────────────
function NewSignupCelebration({ onDone }) {
  const canvasRef = useRef(null);
  const [quote, setQuote] = useState('');
  const [showSpinner, setShowSpinner] = useState(false);
  const QUOTE = 'Where creators and boutique stays collab.';

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
        <BlobLoader size="sm" />
        <span>Building your profile…</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, loading, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.is_admin === true
    || profile?.email?.toLowerCase() === 'benventuring@gmail.com'
    || (!!ADMIN_EMAIL && profile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

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
    const isPublicRoute = path === '/blog' || path.startsWith('/blog/');
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
        <Routes>
            {/* Host wizard — full-screen, no nav chrome */}
          <Route path="/host/listings/create"              element={hostOnly(<CreateListingIntro />)} />
          <Route path="/host/listings/create/basics"       element={hostOnly(<Step1Basics />)} />
          <Route path="/host/listings/create/offer"        element={hostOnly(<Step2Offer />)} />
          <Route path="/host/listings/create/deliverables" element={hostOnly(<Step3Deliverables />)} />
          <Route path="/host/listings/create/review"       element={hostOnly(<Step4Review />)} />

          {/* Admin panel — full-screen, no nav chrome */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Public Journal — no nav chrome, no auth, no launch banner */}
          <Route path="/blog"       element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

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

// ── Blob loader — two orbs that liquid-merge and separate ────────────────────
function BlobLoader({ size = 'md' }) {
  const sm = size === 'sm';
  // sm: stays tiny for inline use; md: lava-lamp scale
  const r   = sm ? 3.5 : 11;
  const w   = sm ? 30  : 88;
  const pad = sm ? 1   : 2;
  const h   = r * 2 + pad * 2;
  const cy  = h / 2;
  const x1  = r + pad;
  const x2  = w - r - pad;
  const travel = ((x2 - x1) / 2).toFixed(2);
  const sd  = sm ? 1.8 : 5.5;
  const dur = sm ? '2.2s' : '2.7s';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: 'visible', display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Goo / metaball filter */}
        <filter id="cnb-goo" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={sd} result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
          />
        </filter>
        {/* 3-D sphere gradient — off-centre highlight gives the lava-lamp depth */}
        <radialGradient id="cnb-sphere" cx="37%" cy="30%" r="68%" fx="37%" fy="30%">
          <stop offset="0%"   stopColor="#7DD4C8" />
          <stop offset="38%"  stopColor="#4A9B7F" />
          <stop offset="72%"  stopColor="#2E6B68" />
          <stop offset="100%" stopColor="#152F2F" />
        </radialGradient>
        {/* Specular highlight — painted on top of the goo layer, no filter */}
        <radialGradient id="cnb-spec" cx="33%" cy="25%" r="50%" fx="33%" fy="25%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.62)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Soft ambient glow behind the orbs */}
        <radialGradient id="cnb-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor="rgba(74,155,127,0.28)" />
          <stop offset="100%" stopColor="rgba(74,155,127,0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes cnb-l {
          0%,16%   { transform:translateX(0); }
          46%,57%  { transform:translateX(${travel}px); }
          87%,100% { transform:translateX(0); }
        }
        @keyframes cnb-r {
          0%,16%   { transform:translateX(0); }
          46%,57%  { transform:translateX(-${travel}px); }
          87%,100% { transform:translateX(0); }
        }
      `}</style>

      {/* Ambient glow (md only) — subtle halo on the canvas */}
      {!sm && (
        <ellipse cx={w / 2} cy={cy + r * 0.6} rx={r * 2.4} ry={r * 0.9}
          fill="url(#cnb-glow)"
          style={{ animation: `cnb-l 2.7s ease-in-out infinite`, animationDelay: '-1.35s' }}
        />
      )}

      {/* Goo merge layer — gradient-filled so colour survives the filter */}
      <g filter="url(#cnb-goo)">
        <circle cx={x1} cy={cy} r={r} fill="url(#cnb-sphere)"
          style={{ animation: `cnb-l ${dur} ease-in-out infinite` }} />
        <circle cx={x2} cy={cy} r={r} fill="url(#cnb-sphere)"
          style={{ animation: `cnb-r ${dur} ease-in-out infinite` }} />
      </g>

      {/* Specular highlight layer — crisp, no filter */}
      <circle cx={x1} cy={cy} r={r} fill="url(#cnb-spec)"
        style={{ animation: `cnb-l ${dur} ease-in-out infinite` }} />
      <circle cx={x2} cy={cy} r={r} fill="url(#cnb-spec)"
        style={{ animation: `cnb-r ${dur} ease-in-out infinite` }} />
    </svg>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #D1EBDB 0%, #EFECE9 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem',
    }}>
      <BlobLoader size="md" />
      <p style={{ fontFamily: 'var(--font-body, sans-serif)', color: '#7A8A85', fontSize: '0.8rem', letterSpacing: '0.06em', margin: 0, textTransform: 'uppercase' }}>
        Loading
      </p>
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
