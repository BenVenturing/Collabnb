import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import collabnbLogo from '../../../assets/collabnb-logo.png';
import { useAuth } from '../contexts/AuthContext';
import { useAppBar } from '../contexts/AppBarContext';
import { useCollabs } from '../contexts/CollabContext';
import { reopenChecklist, getChecklistProgress, onChecklistProgress } from './OnboardingChecklist';
import { SAMPLE_LISTINGS } from '../lib/mockData';
import { WhereSearchContent, WhatSearchContent, WhenSearchContent, useAnimatedPlaceholder } from './SearchDropdowns';
import { formatDate } from '../lib/dateUtils';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

function fmtNavWhen(val) {
  if (!val) return 'Any time';
  if (val.startsWith('Flexible:')) return val.replace('Flexible: ', '');
  const parts = val.split(' → ');
  if (parts.length === 2) return `${formatDate(parts[0])} → ${formatDate(parts[1])}`;
  return formatDate(parts[0]);
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const CREATOR_NAV = [
  { to: '/explore', label: 'Explore' },
  { to: '/collabs', label: 'Collabs' },
  { to: '/saved',   label: 'Saved'   },
  { to: '/inbox',   label: 'Inbox'   },
];

const HOST_NAV = [
  { to: '/host',           label: 'Dashboard', end: true },
  { to: '/host/proposals', label: 'Proposals' },
  { to: '/inbox',          label: 'Inbox'     },
  { to: '/host/creators',  label: 'Creators'  },
  { to: '/profile',        label: 'Profile'   },
];

// ─── Dropdown panel (appears below nav pill) ──────────────────────────────────
function NavDropdown({ children, align = 'left', width }) {
  return (
    <div
      className="glass-card"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        [align === 'right' ? 'right' : 'left']: 0,
        width: width || 'auto',
        minWidth: '260px',
        zIndex: 50,
        padding: '1rem',
        animation: 'fadeUp 180ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}
    >
      {children}
    </div>
  );
}

const BOTTOM_NAV_ITEMS = [
  {
    to: '/explore',
    label: 'Explore',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? 'white' : 'none'} stroke={active ? 'currentColor' : 'currentColor'}/>
      </svg>
    ),
  },
  {
    to: '/saved',
    label: 'Saved',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    to: '/collabs',
    label: 'Collabs',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4" fill={active ? 'currentColor' : 'none'}/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeOpacity={active ? 1 : 0.5}/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeOpacity={active ? 1 : 0.5}/>
      </svg>
    ),
  },
  {
    to: '/inbox',
    label: 'Inbox',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'}/>
      </svg>
    ),
  },
];

export default function AppNav() {
  const { profile, signOut, updateProfile } = useAuth();
  const isPending = profile?.tier === 'waitlist' && !profile?.is_verified;
  const [checklistTick, setChecklistTick] = useState(0);
  useEffect(() => onChecklistProgress(() => setChecklistTick(t => t + 1)), []);
  const checklistProgress = getChecklistProgress(profile, checklistTick);
  const checklistAllDone = checklistProgress.completed >= checklistProgress.total;
  const { compactSearch } = useAppBar();
  const { savedIds } = useCollabs();
  const navigate = useNavigate();
  const savedCount = savedIds.size;

  // Transient badge: appears briefly when saved count changes, fades away after 2s
  const prevSavedRef = useRef(savedCount);
  const [showBadge, setShowBadge] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const hideTimerRef = useRef(null);
  useEffect(() => {
    if (savedCount !== prevSavedRef.current) {
      setShowBadge(true);
      setBadgeBounce(true);
      setTimeout(() => setBadgeBounce(false), 700);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowBadge(false), 2000);
      prevSavedRef.current = savedCount;
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [savedCount]);

  // Nav state
  const [scrolled,    setScrolled]   = useState(false);
  const [menuOpen,    setMenuOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // In-nav search state
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const [navField,      setNavField]      = useState(null); // 'where'|'what'|'when'
  const [navWhere,      setNavWhere]      = useState('');
  const [navWhat,       setNavWhat]       = useState('');
  const [navWhatQuery,  setNavWhatQuery]  = useState('');
  const [navWhen,       setNavWhen]       = useState('');

  const profileRef   = useRef(null);
  const navSearchRef = useRef(null);
  const bellRef      = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const userId = profile?._id || profile?.id;
  const unreadCount = useQuery(api.notifications.getUnreadCount, userId ? { userId } : 'skip') ?? 0;
  const notifications = useQuery(api.notifications.getForUser, notifOpen && userId ? { userId } : 'skip') ?? [];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const hostListings = useQuery(
    api.listings.getByHost,
    userId && userId !== 'mock-user-001' ? { host_id: String(userId) } : 'skip'
  );
  const isHostVerified = (profile?.is_verified === true || profile?.is_founder === true) && (hostListings?.length ?? 0) > 0;

  // Scroll detection
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 80) setMenuOpen(false);
      setScrolled(y > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close profile dropdown and nav menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close nav search field dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (navSearchRef.current && !navSearchRef.current.contains(e.target)) {
        setNavField(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close notification sheet on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Lock body scroll for full-screen overlay only
  useEffect(() => {
    const lock = menuOpen && !compactSearch && !scrolled;
    document.body.style.overflow = lock ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, compactSearch]);

  // Reset nav search when compact mode ends (scrolled back to top)
  useEffect(() => {
    if (!compactSearch) {
      setNavSearchOpen(false);
      setNavField(null);
      setMenuOpen(false);
    }
  }, [compactSearch]);

  const openNavSearch = () => {
    setNavSearchOpen(true);
    setMenuOpen(false);
  };

  const closeNavSearch = () => {
    setNavSearchOpen(false);
    setNavField(null);
  };

  const whatPlaceholder = useAnimatedPlaceholder();

  const location = useLocation();
  const isHost = profile?.role === 'host' || location.pathname.startsWith('/host');
  const NAV_LINKS = isHost ? HOST_NAV : CREATOR_NAV;
  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '?';
  const { session } = useAuth();
  const userEmail = (session?.user?.email || profile?.email || '').toLowerCase();
  const isAdmin = profile?.is_admin === true
    || userEmail === 'benventuring@gmail.com'
    || (!!ADMIN_EMAIL && userEmail === ADMIN_EMAIL.toLowerCase());

  // Whether the "Search stays" pill is visible
  const showSearchPill = compactSearch && !menuOpen && !navSearchOpen;

  return (
    <>
      {/* ── Full-screen overlay — mobile / non-compact mode only ─────────────── */}
      <div
        className={`nav-overlay glass ${!scrolled && !compactSearch && menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMenuOpen(false)}
            className="font-display font-bold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}
          >
            {label}
          </NavLink>
        ))}
        <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="btn-primary mt-2">
          My Profile
        </NavLink>
      </div>

      {/* ── Mobile bottom nav (creator-only, hidden on /host/* routes) ─────── */}
      <style>{`
        .bottom-nav-bar { display: none; }
        @media (max-width: 768px) {
          .bottom-nav-bar { display: flex; }
        }
      `}</style>
      {!isHost && !location.pathname.startsWith('/listing/') && (
        <nav
          className="bottom-nav-bar"
          aria-label="Mobile bottom navigation"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: 55,
            background: 'rgba(239,236,233,0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(25,37,36,0.1)',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingTop: '0.5rem',
            paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          {BOTTOM_NAV_ITEMS.map(({ to, label, icon }) => {
            const active = location.pathname === to || (to !== '/explore' && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: '0.875rem',
                  background: active ? 'rgba(25,37,36,0.1)' : 'transparent',
                  color: active ? 'var(--ink)' : 'rgba(25,37,36,0.4)',
                  transition: 'background 150ms, color 150ms',
                  textDecoration: 'none', flexShrink: 0,
                  position: 'relative',
                }}
              >
                {icon(active)}
                {label === 'Saved' && showBadge && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 14, height: 14,
                    background: 'var(--ink)', color: 'var(--bone)',
                    borderRadius: 9999, fontSize: '0.55rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1,
                  }}>
                    {savedCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* ── Floating pill nav ─────────────────────────────────────────────────── */}
      <nav
        className={`nav-pill glass ${scrolled ? 'scrolled' : ''}`}
        aria-label="Main navigation"
        style={{ top: isPending ? 'calc(var(--banner-h, 0rem) + 1.8rem + 0.5rem)' : 'calc(var(--banner-h, 0rem) + 1rem)' }}
      >
        {/* Logo */}
        <NavLink to="/explore" className="nav-logo" style={{ flexShrink: 0 }}>
          <img src={collabnbLogo} alt="" role="presentation" width="28" height="28" />
          <span>Collabnb</span>
        </NavLink>

        {/* ── Middle section: nav links | inline menu | expanded search ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0,
          overflow: navSearchOpen ? 'visible' : 'hidden',
          position: 'relative',
        }}>

          {/* Desktop nav links (hidden when scrolled via CSS) */}
          <ul className="nav-links" role="list">
            {NAV_LINKS.map(({ to, label, end }) => (
              <li key={to} style={{ position: 'relative' }}>
                <NavLink to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
                  {label}
                </NavLink>
                {label === 'Saved' && showBadge && (
                  <span style={{
                    position: 'absolute', top: -6, right: -8,
                    minWidth: 16, height: 16,
                    background: 'var(--ink)', color: 'var(--bone)',
                    borderRadius: 9999, fontSize: '0.58rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', lineHeight: 1,
                    animation: badgeBounce ? 'badge-bounce 700ms var(--ease-out-expo)' : 'badge-fade-out 300ms var(--ease-out-expo) forwards',
                    border: '1.5px solid rgba(255,255,255,0.7)',
                  }}>
                    {savedCount}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Inline compact nav links (hamburger tapped while scrolled) */}
          {!navSearchOpen && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.125rem',
              overflow: 'hidden',
              maxWidth: (compactSearch && menuOpen) ? '480px' : '0px',
              opacity: (compactSearch && menuOpen) ? 1 : 0,
              transition: 'max-width 360ms cubic-bezier(0.16,1,0.3,1), opacity 240ms cubic-bezier(0.16,1,0.3,1)',
              pointerEvents: (compactSearch && menuOpen) ? 'auto' : 'none',
            }}>
              {NAV_LINKS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  style={{
                    position: 'relative', fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 500,
                    color: 'var(--ink)', whiteSpace: 'nowrap', padding: '0.4rem 0.875rem',
                    borderRadius: '9999px', textDecoration: 'none', transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {label}
                  {label === 'Saved' && showBadge && (
                    <span style={{
                      position: 'absolute', top: 0, right: 2,
                      minWidth: 14, height: 14,
                      background: 'var(--ink)', color: 'var(--bone)',
                      borderRadius: 9999, fontSize: '0.55rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px', lineHeight: 1,
                      animation: badgeBounce ? 'badge-bounce 700ms var(--ease-out-expo)' : 'badge-fade-out 300ms var(--ease-out-expo) forwards',
                    }}>
                      {savedCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )}

          {/* Expanded in-nav search */}
          {compactSearch && navSearchOpen && (
            <div
              ref={navSearchRef}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'stretch',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255,255,255,0.85)',
                borderRadius: '0.875rem',
                overflow: 'visible',
                margin: '0 0.625rem',
                boxShadow: '0 4px 20px rgba(25,37,36,0.08)',
                position: 'relative',
                animation: 'fadeUp 200ms cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            >
              {/* WHERE — typeable */}
              <div
                className="search-field"
                style={{
                  borderRadius: '0.875rem 0 0 0.875rem',
                  background: navField === 'where' ? 'rgba(255,255,255,0.7)' : undefined,
                  position: 'relative',
                  cursor: 'text',
                }}
                onClick={() => { if (navField !== 'where') setNavField('where'); }}
              >
                <label>Where</label>
                <input
                  type="text"
                  value={navWhere}
                  onChange={(e) => { setNavWhere(e.target.value); if (navField !== 'where') setNavField('where'); }}
                  onFocus={() => setNavField('where')}
                  placeholder="Destination"
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    width: '100%', fontFamily: 'var(--font-body)',
                    color: navWhere ? 'var(--ink)' : 'var(--sage)',
                    fontSize: '0.82rem', fontWeight: navWhere ? 600 : 400,
                    padding: 0, minWidth: 0,
                  }}
                />

                {navField === 'where' && (
                  <NavDropdown width="440px">
                    <WhereSearchContent
                      whereVal={navWhere}
                      setWhereVal={setNavWhere}
                      onClose={() => setNavField(null)}
                      listings={SAMPLE_LISTINGS}
                    />
                  </NavDropdown>
                )}
              </div>

              {/* WHAT — typeable with animated placeholder */}
              <div
                className="search-field"
                style={{
                  background: navField === 'what' ? 'rgba(255,255,255,0.7)' : undefined,
                  position: 'relative', cursor: 'text',
                }}
                onClick={() => { if (navField !== 'what') setNavField('what'); }}
              >
                <label>What</label>
                <input
                  type="text"
                  value={navWhatQuery}
                  onChange={(e) => { setNavWhatQuery(e.target.value); if (navField !== 'what') setNavField('what'); }}
                  onFocus={() => setNavField('what')}
                  placeholder={whatPlaceholder}
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    width: '100%', fontFamily: 'var(--font-body)',
                    color: navWhat ? 'var(--ink)' : 'var(--sage)',
                    fontSize: '0.82rem', fontWeight: navWhat ? 600 : 400,
                    padding: 0, minWidth: 0,
                  }}
                />

                {navField === 'what' && (
                  <NavDropdown width="400px">
                    <WhatSearchContent
                      whatVal={navWhat}
                      setWhatVal={setNavWhat}
                      onClose={() => setNavField(null)}
                      typeQuery={navWhatQuery}
                    />
                  </NavDropdown>
                )}
              </div>

              {/* WHEN — date range picker */}
              <div
                className="search-field"
                style={{
                  flex: '0.75',
                  borderRight: 'none',
                  background: navField === 'when' ? 'rgba(255,255,255,0.7)' : undefined,
                  position: 'relative',
                }}
                onClick={() => setNavField(navField === 'when' ? null : 'when')}
              >
                <label>When</label>
                <span className="search-value" style={{ color: navWhen ? 'var(--ink)' : undefined }}>
                  {fmtNavWhen(navWhen)}
                </span>

                {navField === 'when' && (
                  <NavDropdown align="right" width="460px">
                    <WhenSearchContent
                      whenVal={navWhen}
                      setWhenVal={setNavWhen}
                      onClose={() => setNavField(null)}
                    />
                  </NavDropdown>
                )}
              </div>

              {/* Search / close button */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0.375rem', flexShrink: 0 }}>
                <button
                  className="btn-primary"
                  style={{ padding: 0, width: '2.25rem', height: '2.25rem', borderRadius: '9999px' }}
                  onClick={closeNavSearch}
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                    <circle cx="8.5" cy="8.5" r="5.25"/>
                    <line x1="13.25" y1="13.25" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>

          {/* "Search stays" compact pill — collapses width when hidden so hamburger stays flush */}
          <div style={{
            maxWidth: showSearchPill ? '200px' : '0px',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'max-width 300ms var(--ease-out-quart)',
          }}>
            <button
              onClick={openNavSearch}
              aria-label="Open search"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.375rem 0.875rem 0.375rem 0.5rem',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(25,37,36,0.12)',
                boxShadow: '0 2px 8px rgba(25,37,36,0.08)',
                cursor: 'pointer',
                opacity: showSearchPill ? 1 : 0,
                transform: showSearchPill ? 'scale(1)' : 'scale(0.88)',
                pointerEvents: showSearchPill ? 'auto' : 'none',
                transition: 'opacity 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.25" strokeLinecap="round" style={{ width: 11, height: 11 }}>
                  <circle cx="8.5" cy="8.5" r="5.25"/>
                  <line x1="13.25" y1="13.25" x2="18" y2="18"/>
                </svg>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                Search stays
              </span>
            </button>
          </div>

          {/* Bell notification icon — hidden when scrolled */}
          {userId && !scrolled && (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen && userId) markAllRead({ userId }); }}
                style={{
                  position: 'relative', width: 38, height: 38, borderRadius: '50%',
                  background: notifOpen ? 'rgba(25,37,36,0.08)' : 'transparent',
                  border: '1px solid rgba(25,37,36,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'background 180ms',
                }}
                aria-label="Notifications"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ef4444', border: '1.5px solid white',
                    flexShrink: 0,
                  }} />
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 320, maxHeight: 420,
                  background: 'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(24px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  borderRadius: '1.25rem',
                  boxShadow: '0 12px 40px rgba(25,37,36,0.18)',
                  overflow: 'hidden',
                  zIndex: 100,
                  animation: 'fadeUp 180ms cubic-bezier(0.16,1,0.3,1) forwards',
                }}>
                  <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(25,37,36,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Notifications</span>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 360 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--sage)', fontSize: 13 }}>
                        No notifications yet
                      </div>
                    ) : notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => {
                          markRead({ id: n._id });
                          if (n.link) { setNotifOpen(false); navigate(n.link.replace('#', '')); }
                        }}
                        style={{
                          padding: '12px 18px',
                          borderBottom: '1px solid rgba(25,37,36,0.05)',
                          cursor: n.link ? 'pointer' : 'default',
                          background: n.read ? 'transparent' : 'rgba(60,87,89,0.04)',
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: '0.5rem', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: n.type === 'pitch_approved' ? 'rgba(74,155,127,0.14)'
                            : n.type === 'pitch_declined' ? 'rgba(200,104,104,0.14)'
                            : n.type === 'host_reply' || n.type === 'new_message' ? 'rgba(60,87,89,0.1)'
                            : n.type === 'new_application' ? 'rgba(212,168,67,0.14)'
                            : n.type === 'contract_reminder' ? 'rgba(60,87,89,0.12)'
                            : 'rgba(25,37,36,0.07)',
                        }}>
                          {n.type === 'pitch_approved' && (
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#4A9B7F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg>
                          )}
                          {n.type === 'pitch_declined' && (
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#C86868" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
                          )}
                          {(n.type === 'host_reply' || n.type === 'new_message') && (
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#3C5759" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a2 2 0 01-2 2H5l-3 2V4a2 2 0 012-2h8a2 2 0 012 2z"/></svg>
                          )}
                          {n.type === 'new_application' && (
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5.5" r="2.5"/><path d="M2.5 13c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5"/></svg>
                          )}
                          {n.type === 'contract_reminder' && (
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#3C5759" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5h5l3 3V14a.5.5 0 01-.5.5h-7A.5.5 0 014 14z"/><path d="M9 1.5V4.5h3"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="10.5" x2="10" y2="10.5"/></svg>
                          )}
                          {!['pitch_approved','pitch_declined','host_reply','new_message','new_application','contract_reminder'].includes(n.type) && (
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#959D90" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><polyline points="2 5 8 9.5 14 5"/></svg>
                          )}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>{n.title}</div>
                          {n.body && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                          <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 4 }}>
                            {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3C5759', flexShrink: 0, marginTop: 6 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Combined hamburger + profile pill */}
          <div className="relative" ref={profileRef}>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: '9999px',
              border: '1px solid rgba(25,37,36,0.14)',
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              overflow: 'hidden',
              minHeight: '40px',
            }}>
              {/* Hamburger zone */}
              {!navSearchOpen && (
                <>
                  <button
                    className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    onClick={() => { setMenuOpen(!menuOpen); setProfileOpen(false); }}
                    data-compact={compactSearch ? 'true' : undefined}
                  >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line className="line line-1" x1="3" y1="5" x2="17" y2="5"/>
                      <line className="line line-2" x1="3" y1="10" x2="17" y2="10"/>
                      <line className="line line-3" x1="3" y1="15" x2="17" y2="15"/>
                    </svg>
                  </button>
                  <div className="nav-pill-divider" />
                </>
              )}

              {/* Profile zone */}
              <button
                onClick={() => { setProfileOpen(!profileOpen); setMenuOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.25rem 0.25rem 0.25rem 0.75rem',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  minHeight: '40px', transition: 'background 180ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.04)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span className="font-body text-sm font-medium text-ink hidden sm:block">
                  {profile?.full_name ?? 'Profile'}
                </span>
                <div className="w-8 h-8 rounded-full bg-mint flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ margin: '0 2px 0 0' }}>
                  <span className="font-display font-bold text-slate text-sm">{initials}</span>
                  {profile?.avatar_url && (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
              </button>
            </div>

            {/* Profile dropdown */}
            {profileOpen && (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] w-52 rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'rgba(255,255,255,0.94)',
                  backdropFilter: 'blur(24px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  boxShadow: '0 12px 40px rgba(25,37,36,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
                  animation: 'fadeUp 180ms cubic-bezier(0.16,1,0.3,1) forwards',
                }}
              >
                <div className="px-4 py-3 border-b border-stone/30">
                  <p className="font-display font-bold text-ink text-sm">{profile?.full_name}</p>
                  <p className="text-sage text-xs mt-0.5">@{profile?.username}</p>
                </div>
                <NavLink to="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-3 text-sm text-ink hover:bg-mint/30 transition-colors">
                  View Profile
                </NavLink>
                <NavLink to="/profile?settings=true" onClick={() => setProfileOpen(false)} className="block px-4 py-3 text-sm text-ink hover:bg-mint/30 transition-colors">
                  Settings
                </NavLink>
                {!isAdmin && !checklistAllDone && (
                  <button onClick={() => { setProfileOpen(false); reopenChecklist(); }} className="w-full text-left px-4 py-3 text-sm text-ink hover:bg-mint/30 transition-colors" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ flex: 1 }}>Setup Checklist</span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      background: '#3C5759',
                      color: '#fff',
                      borderRadius: '9999px', padding: '0.1rem 0.45rem',
                      lineHeight: 1.6,
                    }}>
                      {checklistProgress.completed}/{checklistProgress.total}
                    </span>
                  </button>
                )}
                {!isAdmin && (
                  <div className="border-t border-stone/20" />
                )}
                {!isAdmin && (
                  <button
                    onClick={async () => {
                      setProfileOpen(false);
                      if (isHost) {
                        await updateProfile?.({ role: 'creator' });
                        navigate('/explore');
                      } else if (isHostVerified) {
                        await updateProfile?.({ role: 'host' });
                        navigate('/host');
                      } else {
                        navigate('/profile?settings=true');
                      }
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-mint/30 transition-colors"
                    style={{ color: 'var(--slate)', fontWeight: 500 }}
                  >
                    {isHost ? 'Switch to Creator View' : (isHostVerified ? 'Switch to Host View' : 'Sign up as Host')}
                  </button>
                )}
                {isAdmin && (
                  <>
                    <div className="border-t border-stone/30" />
                    <NavLink
                      to="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-3 text-sm font-medium hover:bg-mint/30 transition-colors"
                      style={{ color: '#3C5759' }}
                    >
                      Admin Panel
                    </NavLink>
                  </>
                )}
                <div className="border-t border-stone/30" />
                <button onClick={signOut} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50/50 transition-colors">
                  Log Out
                </button>
              </div>
            )}

            {/* Scrolled compact nav dropdown */}
            {scrolled && menuOpen && !compactSearch && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 0.625rem)',
                  minWidth: '190px',
                  background: 'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(24px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  borderRadius: '1.25rem',
                  boxShadow: '0 12px 40px rgba(25,37,36,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
                  overflow: 'hidden',
                  zIndex: 50,
                  animation: 'fadeUp 200ms cubic-bezier(0.16,1,0.3,1) forwards',
                }}
              >
                {NAV_LINKS.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-ink hover:bg-mint/30 transition-colors"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
