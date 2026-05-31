import AppNav from './AppNav';
import VerificationPendingModal from './VerificationPendingModal';
import SubscriptionModal from './SubscriptionModal';
import FloatingHelpButton from './FloatingHelpButton';
import OnboardingChecklist from './OnboardingChecklist';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
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

function PendingVerificationBanner({ profile }) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  return (
    <div style={{
      background: '#FFFBEB',
      border: '1.5px solid #D97706',
      borderRadius: '14px',
      padding: '0.875rem 1.125rem',
      marginBottom: '1.5rem',
      display: 'flex',
      gap: '0.875rem',
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, marginTop: '0.05rem' }}>⏳</span>
      <div>
        <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 0.2rem', fontSize: '0.9375rem', fontFamily: 'var(--font-display, sans-serif)' }}>
          Account under review, {firstName}!
        </p>
        <p style={{ color: '#78350F', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
          We're reviewing your account — typically 24–48 hours. Browse listings freely below.
          Messaging and applying will unlock the moment you're approved.
        </p>
      </div>
    </div>
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
  const bannerVisible = !bannerDismissed && new Date() < LAUNCH_DATE;
  const daysLeft = bannerVisible
    ? Math.ceil((LAUNCH_DATE - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Hide on contract page and all host pages
  const showContractBtn = location.pathname !== '/contract' && !location.pathname.startsWith('/host');

  return (
    <div style={{ '--banner-h': bannerVisible ? BANNER_H : '0rem' }}>
      {/* ── Pre-launch countdown banner ─────────────────────────────────────── */}
      {bannerVisible && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
          background: 'linear-gradient(90deg, #192524, #2d4a3e)',
          color: '#fff',
          padding: '0.55rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          fontSize: '0.82rem', fontWeight: 500,
          boxShadow: '0 2px 8px rgba(25,37,36,0.18)',
        }}>
          <span style={{ color: '#7ecfc4', fontWeight: 700 }}>🚀 {daysLeft} days to launch</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>·</span>
          <span>Full listings go live <strong>July 1st</strong></span>
          {userCount !== null && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>·</span>
              <span style={{ color: '#a8f0e8', fontWeight: 600 }}>👥 {userCount.toLocaleString()} {userCount === 1 ? 'member' : 'members'} joined</span>
            </>
          )}
          <button
            onClick={() => { localStorage.setItem(LAUNCH_BANNER_KEY, '1'); setBannerDismissed(true); }}
            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.25rem', flexShrink: 0 }}
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
        {location.pathname !== '/profile' && (
          <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 1.25rem' }}>
            {isPending && <PendingVerificationBanner profile={profile} />}
            <OnboardingChecklist />
          </div>
        )}
        {children}
      </main>

      {/* ── Verification gate modal ─────────────────────────────────────────── */}
      <VerificationPendingModal />

      {/* ── Subscription gate modal ─────────────────────────────────────────── */}
      <SubscriptionModal />

      {/* ── Floating help button (bottom-right) ────────────────────────────── */}
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
