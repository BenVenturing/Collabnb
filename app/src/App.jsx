import { Component, useRef, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Analytics } from '@vercel/analytics/react';
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
import ContractBuilder from './components/ContractBuilder';
import Explore       from './pages/Explore';
import Collabs       from './pages/Collabs';
import Saved         from './pages/Saved';
import Inbox         from './pages/Inbox';
import Founders      from './pages/Founders';
import Profile       from './pages/Profile';
import Settings      from './pages/Settings';
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
import Step5Payment         from './pages/host/Step5Payment';
import AdminDashboard       from './pages/AdminDashboard';
import Blog                 from './pages/Blog';
import BlogPost             from './pages/BlogPost';

// One-click "send this crash to the dev team" button shown in the crash
// screen below. Lives outside the class ErrorBoundary since hooks need a
// function component, but it's rendered from inside that boundary's fallback.
function CrashReportButton({ error, componentStack }) {
  const submitCrashReport = useMutation(api.crashReports.submitCrashReport);
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
    return <p style={{ marginTop: '1.25rem', color: '#2a7', fontWeight: 'bold' }}>Sent to the dev team — thanks!</p>;
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
        {status === 'sending' ? 'Sending…' : 'Send crash report to dev team'}
      </button>
      {status === 'error' && <p style={{ color: '#c00', marginTop: '0.5rem' }}>Send failed — copy the details below instead.</p>}
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
          <strong>App crash — copy this and send to dev:</strong>
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
          <Route path="/host/listings/create/payment"      element={hostOnly(<Step5Payment />)} />

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
                <Route path="/settings"          element={<Settings />} />
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

// ── Blob loader — two speckled art-glass orbs that merge, swell, and float ────
function BlobLoader({ size = 'md' }) {
  const sm  = size === 'sm';
  const key = sm ? 's' : 'm';   // per-size ids/keyframes so both can coexist
  // sm: stays tiny for inline use; md: full liquid-glass scale
  const r   = sm ? 5   : 26;
  const w   = sm ? 42  : 172;
  const pad = sm ? 2   : 6;
  const h   = r * 2 + pad * 2;
  const cy  = h / 2;
  const x1  = r + pad;
  const x2  = w - r - pad;
  const travel = ((x2 - x1) / 2).toFixed(2);
  const sd    = sm ? 2.6  : 11;    // goo blur
  const speck = sm ? 0.30 : 0.085; // turbulence frequency → blotch size
  const bob   = sm ? 0.8  : 5;
  const dur   = sm ? '2.2s' : '2.9s';
  const half  = (parseFloat(dur) / 2).toFixed(2);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: 'visible', display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Goo / metaball filter — tighter edges read as coalescing liquid */}
        <filter id={`cnb-goo-${key}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={sd} result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
          />
        </filter>
        {/* Speckled art-glass texture — mottled teal blotches inside the shape */}
        <filter id={`cnb-speck-${key}`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency={speck} numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.29
                    0 0 0 0 0.37
                    0 0 0 0 0.25
                    0 0 0 2.8 -1.05" result="tint" />
          <feComposite in="tint" in2="SourceAlpha" operator="in" result="blotch" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="blotch" />
          </feMerge>
        </filter>
        {/* Near-clear glass body with a faint sage cast toward the edge */}
        <radialGradient id="cnb-glass" cx="40%" cy="30%" r="74%" fx="36%" fy="26%">
          <stop offset="0%"   stopColor="#FAFCF9" />
          <stop offset="36%"  stopColor="#E9EFE6" />
          <stop offset="72%"  stopColor="#C2D0BA" />
          <stop offset="100%" stopColor="#8CA083" />
        </radialGradient>
        {/* Big soft specular highlight — the glossy top hotspot */}
        <radialGradient id="cnb-spec" cx="42%" cy="24%" r="54%" fx="40%" fy="20%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.9)" />
          <stop offset="42%"  stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Soft ambient glow behind the orbs */}
        <radialGradient id="cnb-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor="rgba(108,128,94,0.26)" />
          <stop offset="100%" stopColor="rgba(108,128,94,0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes cnb-l-${key} {
          0%,14%   { transform:translateX(0); }
          46%,56%  { transform:translateX(${travel}px); }
          88%,100% { transform:translateX(0); }
        }
        @keyframes cnb-r-${key} {
          0%,14%   { transform:translateX(0); }
          46%,56%  { transform:translateX(-${travel}px); }
          88%,100% { transform:translateX(0); }
        }
        @keyframes cnb-swell-${key} {
          0%,18%   { transform:scale(1); }
          46%,56%  { transform:scale(1.2); }
          86%,100% { transform:scale(1); }
        }
        @keyframes cnb-float-${key} {
          0%,100%  { transform:translateY(0); }
          50%      { transform:translateY(-${bob}px); }
        }
      `}</style>

      {/* Vertical float wrapper — gentle lava-lamp drift */}
      <g style={{ animation: `cnb-float-${key} ${dur} ease-in-out infinite` }}>
        {/* Ambient glow (md only) — subtle halo on the canvas */}
        {!sm && (
          <ellipse cx={w / 2} cy={cy + r * 0.7} rx={r * 2.2} ry={r * 0.8}
            fill="url(#cnb-glow)"
            style={{ animation: `cnb-l-${key} ${dur} ease-in-out infinite`, animationDelay: `-${half}s` }}
          />
        )}

        {/* Swell wrapper — merged glass ball grows larger at the meeting point */}
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `cnb-swell-${key} ${dur} ease-in-out infinite` }}>
          {/* Speckled glass body over the goo-merged silhouette */}
          <g filter={`url(#cnb-speck-${key})`}>
            <g filter={`url(#cnb-goo-${key})`}>
              <circle cx={x1} cy={cy} r={r} fill="url(#cnb-glass)"
                style={{ animation: `cnb-l-${key} ${dur} ease-in-out infinite` }} />
              <circle cx={x2} cy={cy} r={r} fill="url(#cnb-glass)"
                style={{ animation: `cnb-r-${key} ${dur} ease-in-out infinite` }} />
            </g>
          </g>

          {/* Specular highlight — one per orb, merges into a single hotspot */}
          <circle cx={x1} cy={cy} r={r} fill="url(#cnb-spec)"
            style={{ animation: `cnb-l-${key} ${dur} ease-in-out infinite` }} />
          <circle cx={x2} cy={cy} r={r} fill="url(#cnb-spec)"
            style={{ animation: `cnb-r-${key} ${dur} ease-in-out infinite` }} />

          {/* Bright glint hotspot — sells the glossy glass surface */}
          <circle cx={x1 - r * 0.28} cy={cy - r * 0.4} r={r * 0.11} fill="rgba(255,255,255,0.92)"
            style={{ animation: `cnb-l-${key} ${dur} ease-in-out infinite` }} />
          <circle cx={x2 - r * 0.28} cy={cy - r * 0.4} r={r * 0.11} fill="rgba(255,255,255,0.92)"
            style={{ animation: `cnb-r-${key} ${dur} ease-in-out infinite` }} />
        </g>
      </g>
    </svg>
  );
}

function LoadingScreen() {
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
        <BlobLoader size="md" />
        <p className="cnb-loading" style={{ fontFamily: 'var(--font-body, sans-serif)', fontWeight: 600, color: '#6E7F7A', fontSize: '1rem', letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase', animation: 'cnb-flicker 2.4s ease-in-out infinite' }}>
          Loading
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
