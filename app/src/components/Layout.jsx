import AppNav from './AppNav';
import VerificationPendingModal from './VerificationPendingModal';
import SubscriptionModal from './SubscriptionModal';
import FloatingHelpButton from './FloatingHelpButton';
import OnboardingChecklist, { reopenChecklist } from './OnboardingChecklist'; // self-positions via fixed CSS
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LAUNCH_DATE = new Date('2026-07-01');
const LAUNCH_BANNER_KEY = 'collabnb_launch_banner_dismissed';
const BANNER_H = '2.25rem';

function MaintenanceBanner() {
  const isMaintenance = useQuery(api.admin.getMaintenanceMode);
  if (!isMaintenance) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#92400E', color: '#FEF3C7',
      padding: '0.6rem 1.5rem', textAlign: 'center',
      fontSize: '0.82rem', fontWeight: 600,
      boxShadow: '0 2px 8px rgba(25,37,36,0.15)',
    }}>
      🔧 Collabnb is currently undergoing maintenance. Some features may be unavailable.
    </div>
  );
}

// ── Animated sand timer SVG ────────────────────────────────────────────────────
function SandTimer() {
  return (
    <svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <style>{`
        @keyframes sand-fall {
          0%   { transform: translateY(-6px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(6px); opacity: 0; }
        }
        @keyframes sand-pile-grow {
          0%,40%  { transform: scaleX(0.3); opacity: 0.4; }
          100% { transform: scaleX(1);   opacity: 1; }
        }
        @keyframes hourglass-flip {
          0%,45%  { transform: rotate(0deg);   }
          50%,95% { transform: rotate(180deg); }
          100%    { transform: rotate(180deg); }
        }
        .hg-root { animation: hourglass-flip 4s ease-in-out infinite; transform-origin: 14px 17px; }
        .sand-stream { animation: sand-fall 4s ease-in-out infinite; }
        .sand-pile   { animation: sand-pile-grow 4s ease-in-out infinite; transform-origin: center bottom; }
      `}</style>
      <g className="hg-root">
        {/* Frame */}
        <rect x="3" y="1" width="22" height="3" rx="1.5" fill="#B45309" opacity="0.9"/>
        <rect x="3" y="30" width="22" height="3" rx="1.5" fill="#B45309" opacity="0.9"/>
        <line x1="4.5" y1="2.5" x2="4.5" y2="31.5" stroke="#B45309" strokeWidth="1.8" opacity="0.6"/>
        <line x1="23.5" y1="2.5" x2="23.5" y2="31.5" stroke="#B45309" strokeWidth="1.8" opacity="0.6"/>
        {/* Upper bulb */}
        <path d="M5 4 Q5 15 14 17 Q5 19 5 30 L23 30 Q23 19 14 17 Q23 15 23 4 Z" fill="#FEF3C7" opacity="0.85"/>
        {/* Upper sand (draining) */}
        <path d="M6 4 Q6 13 14 17 Q22 13 22 4 Z" fill="#F59E0B" opacity="0.7" className="sand-pile"/>
        {/* Sand stream */}
        <line className="sand-stream" x1="14" y1="16" x2="14" y2="20" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.85"/>
        {/* Lower sand pile */}
        <path d="M8 30 Q14 24 20 30 Z" fill="#F59E0B" opacity="0.55" className="sand-pile"/>
      </g>
    </svg>
  );
}

function PendingVerificationBanner({ profile, onMinimize }) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const [minimized, setMinimized] = useState(false);
  const [shrinking, setShrinking] = useState(false);
  const bannerRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMinimized(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function handleMinimize() {
    setShrinking(true);
    setTimeout(() => {
      onMinimize?.();
      // Reset animation state for next time banner shows
      setTimeout(() => setShrinking(false), 100);
    }, 400);
  }

  // Expanded banner (shown when sentinel is visible)
  if (!minimized) {
    const collapsingStyle = shrinking ? {
      transform: 'scale(0.85) translateY(20px)',
      opacity: 0,
      marginBottom: 0,
      maxHeight: 0,
      padding: '0 1.25rem',
      overflow: 'hidden',
    } : {};

    return (
      <>
        <div ref={sentinelRef} style={{ height: 1 }} />
        <div ref={bannerRef} style={{
          background: shrinking
            ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF9EE 60%, #FFF7E0 100%)'
            : 'linear-gradient(135deg, #FFFBEB 0%, #FEF9EE 60%, #FFF7E0 100%)',
          border: '1.5px solid #D97706',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(217,119,6,0.08), 0 4px 16px rgba(217,119,6,0.12), 0 1px 4px rgba(217,119,6,0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1), opacity 350ms ease, margin-bottom 400ms ease, max-height 400ms ease, padding 400ms ease',
          pointerEvents: shrinking ? 'none' : 'auto',
          alignItems: 'center',
          ...collapsingStyle,
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '16px', pointerEvents: 'none', opacity: 0.04,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")',
          }} />
          <SandTimer />
          <div style={{ position: 'relative', flex: 1 }}>
            <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 0.25rem', fontSize: '0.9375rem', fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.01em' }}>
              Account under review, {firstName}!
            </p>
            <p style={{ color: '#78350F', margin: 0, fontSize: '0.8125rem', lineHeight: 1.55, opacity: 0.9 }}>
              We're reviewing your account — typically 24–48 hours. Browse listings freely below.
              Messaging and applying will unlock the moment you're approved.
            </p>
          </div>
          {/* Minimize button */}
          <button
            onClick={handleMinimize}
            style={{
              background: 'rgba(217,119,6,0.12)',
              border: 'none',
              borderRadius: '50%',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              color: '#92400E',
              transition: 'background 150ms',
              position: 'relative',
              zIndex: 2,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.12)'}
            title="Minimize to checklist"
            aria-label="Minimize verification banner"
          >
            <svg width="12" height="12" viewBox="0 0 12 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="2" x2="11" y2="2" />
            </svg>
          </button>
        </div>
      </>
    );
  }

  // Minimized floating sand timer pill (shown when scrolled past the banner)
  return (
    <>
      <div ref={sentinelRef} style={{ height: 1 }} />
      <div
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed',
          top: '5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.75rem 0.4rem 0.5rem',
          background: 'rgba(255,251,230,0.96)',
          border: '1.5px solid rgba(217,119,6,0.4)',
          borderRadius: '9999px',
          boxShadow: '0 4px 20px rgba(217,119,6,0.18), inset 0 1px 0 rgba(255,255,255,0.85)',
          cursor: 'pointer',
          animation: 'fadeDown 300ms cubic-bezier(0.16,1,0.3,1)',
          transition: 'transform 200ms ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
        title="Scroll up to see details"
      >
        <SandTimer />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>
          Under review
        </span>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const isPending = profile?.tier === 'waitlist' && !profile?.is_verified;
  const userCount = useQuery(api.profiles.countAll) ?? null;

  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(LAUNCH_BANNER_KEY) === '1'
  );
  const [verificationMinimized, setVerificationMinimized] = useState(false);

  function handleMinimizeVerification() {
    setVerificationMinimized(true);
    // Open the onboarding checklist
    reopenChecklist();
    // Re-show the banner after 30 seconds in case user wants it back
    setTimeout(() => setVerificationMinimized(false), 30000);
  }
  const bannerVisible = !bannerDismissed && new Date() < LAUNCH_DATE;
  const daysLeft = bannerVisible
    ? Math.ceil((LAUNCH_DATE - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Hide on contract page and all host pages
  const showContractBtn = location.pathname !== '/contract' && !location.pathname.startsWith('/host');

  // ── Welcome toast (shown once after Clerk/Google signup redirect) ──────────
  const [welcomeToast, setWelcomeToast] = useState(null);
  const welcomeHandledRef = useRef(false);
  useEffect(() => {
    if (welcomeHandledRef.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get('welcome') === 'true') {
      welcomeHandledRef.current = true;
      const name = profile?.full_name?.split(' ')[0] || 'there';
      setWelcomeToast({ name });
      // Clean URL without full page reload
      window.history.replaceState({}, '', location.pathname + location.hash);
      const timer = setTimeout(() => setWelcomeToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search, location.pathname, location.hash, profile?.full_name]);

  return (
    <div style={{ '--banner-h': bannerVisible ? BANNER_H : '0rem' }}>
      {/* ── Pre-launch countdown banner ─────────────────────────────────────── */}
      {bannerVisible && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
          background: 'linear-gradient(90deg, #192524, #2d4a3e)',
          color: '#fff',
          padding: '0.45rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          flexWrap: 'wrap',
          fontSize: '0.78rem', fontWeight: 500,
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(25,37,36,0.18)',
        }}>
          <span style={{ color: '#7ecfc4', fontWeight: 700, whiteSpace: 'nowrap' }}>🚀 {daysLeft}d to launch</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>·</span>
          <span style={{ whiteSpace: 'nowrap' }}>Live <strong>July 1st</strong></span>
          {userCount !== null && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>·</span>
              <span style={{ color: '#a8f0e8', fontWeight: 600, whiteSpace: 'nowrap' }}>👥 {userCount.toLocaleString()}</span>
            </>
          )}
          <button
            onClick={() => { localStorage.setItem(LAUNCH_BANNER_KEY, '1'); setBannerDismissed(true); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.15rem', flexShrink: 0 }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {/* ── Maintenance mode banner ─────────────────────────────────────────── */}
      <MaintenanceBanner />

      {/* ── HAZY background layers (exact match to website) ─────────────────── */}
      <div aria-hidden="true" className="bg-layers bg-base" />
      <div aria-hidden="true" className="bg-layers bg-gradient" />
      <div aria-hidden="true" className="bg-layers bg-clouds" />
      <div aria-hidden="true" className="bg-grain" />

      {/* ── Floating nav pill ───────────────────────────────────────────────── */}
      <AppNav />

      {/* ── Page content (padded below the floating nav + optional banner) ───── */}
      <main
        id="main"
        className="relative z-10"
        style={{ paddingTop: location.pathname === '/profile' ? '0' : (bannerVisible ? `calc(7rem + ${BANNER_H})` : '7rem') }}
      >
        {location.pathname !== '/profile' && isPending && !verificationMinimized && (
          <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 1.25rem' }}>
            <PendingVerificationBanner profile={profile} onMinimize={handleMinimizeVerification} />
          </div>
        )}
        {children}
      </main>

      {/* ── Verification gate modal ─────────────────────────────────────────── */}
      <VerificationPendingModal />

      {/* ── Subscription gate modal ─────────────────────────────────────────── */}
      <SubscriptionModal />

      {/* ── Welcome toast (post-Clerk-signup) ──────────────────────────────────── */}
      {welcomeToast && (
        <div style={{
          position: 'fixed', top: '5.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(74,155,127,0.3)',
          borderRadius: '16px',
          padding: '0.875rem 1.25rem',
          boxShadow: '0 8px 32px rgba(25,37,36,0.15)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          animation: 'fadeUp 300ms cubic-bezier(0.16,1,0.3,1) forwards',
          maxWidth: 'calc(100vw - 2rem)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(209,235,219,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>
              Welcome, {welcomeToast.name}! 🎉
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>
              Your account is under review — you'll hear from us within 24–48 hours.
            </p>
          </div>
          <button
            onClick={() => setWelcomeToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)', fontSize: '1rem', lineHeight: 1, padding: '0.25rem', flexShrink: 0 }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}

      {/* ── Floating onboarding checklist (bottom-right, above AppNav) ────────── */}
      <OnboardingChecklist />

      {/* ── Floating help button (bottom-left) ─────────────────────────────── */}
      <FloatingHelpButton />

      {/* ── Floating contract button (bottom-left) ──────────────────────────── */}
      {showContractBtn && (
        <button
          onClick={() => navigate('/contract')}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl
                     bg-white/80 backdrop-blur-xl border border-white/70
                     shadow-lg hover:shadow-xl hover:bg-white/95
                     transition-all duration-200 text-ink text-sm font-semibold
                     active:scale-95"
          aria-label="Open contract builder"
          title="Contract Builder"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span className="hidden sm:inline">Contract</span>
        </button>
      )}
    </div>
  );
}
