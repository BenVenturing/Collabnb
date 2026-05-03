import { useState, useEffect, useRef } from 'react';
import logo from '../../../assets/collabnb-logo.webp';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppBar } from '../contexts/AppBarContext';
import { DESTINATIONS, COLLAB_TYPES, AVAIL_OPTIONS } from '../lib/searchData';

const NAV_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/collabs', label: 'Collabs' },
  { to: '/saved',   label: 'Saved'   },
  { to: '/inbox',   label: 'Inbox'   },
];

// ─── Dropdown panel (appears below nav pill) ──────────────────────────────────
function NavDropdown({ children, align = 'left', width }) {
  return (
    <div
      className="glass-card"
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

export default function AppNav() {
  const { profile, signOut } = useAuth();
  const { compactSearch } = useAppBar();
  const navigate = useNavigate();

  // Nav state
  const [scrolled,    setScrolled]   = useState(false);
  const [menuOpen,    setMenuOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // In-nav search state
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const [navField,      setNavField]      = useState(null); // 'where'|'what'|'when'
  const [navWhere,      setNavWhere]      = useState('');
  const [navWhat,       setNavWhat]       = useState('');
  const [navWhen,       setNavWhen]       = useState('');

  const profileRef   = useRef(null);
  const navSearchRef = useRef(null);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
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

  // Lock body scroll for full-screen overlay only
  useEffect(() => {
    const lock = menuOpen && !compactSearch;
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

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '?';

  // Whether the "Search stays" pill is visible
  const showSearchPill = compactSearch && !menuOpen && !navSearchOpen;
  // Whether the hamburger is visible (in compact mode, hidden when nav search open)
  const showHamburger  = compactSearch && !navSearchOpen;

  return (
    <>
      {/* ── Full-screen overlay — mobile / non-compact mode only ─────────────── */}
      <div
        className={`nav-overlay glass ${!compactSearch && menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
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

      {/* ── Floating pill nav ─────────────────────────────────────────────────── */}
      <nav
        className={`nav-pill glass ${scrolled ? 'scrolled' : ''}`}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <NavLink to="/explore" className="nav-logo" style={{ flexShrink: 0 }}>
          <img src={logo} alt="Collabnb" role="presentation" width="28" height="28" />
          <span>Collabnb</span>
        </NavLink>

        {/* Desktop links (hidden when scrolled via CSS) */}
        <ul className="nav-links" role="list">
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* ── Middle section: inline menu links OR expanded nav search ───────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0,
          overflow: navSearchOpen ? 'visible' : 'hidden',
          position: 'relative',
        }}>

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
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  style={{
                    fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 500,
                    color: 'var(--ink)', whiteSpace: 'nowrap', padding: '0.4rem 0.875rem',
                    borderRadius: '9999px', textDecoration: 'none', transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {label}
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
              {/* WHERE */}
              <div
                className="search-field"
                style={{
                  borderRadius: '0.875rem 0 0 0.875rem',
                  background: navField === 'where' ? 'rgba(255,255,255,0.7)' : undefined,
                  position: 'relative',
                }}
                onClick={() => setNavField(navField === 'where' ? null : 'where')}
              >
                <label>Where</label>
                <span className="search-value" style={{ color: navWhere ? 'var(--ink)' : undefined }}>
                  {navWhere || 'Destination'}
                </span>

                {navField === 'where' && (
                  <NavDropdown width="440px">
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.75rem' }}>
                      Trending Destinations
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.375rem' }}>
                      {DESTINATIONS.map((d) => (
                        <button
                          key={d.label}
                          onClick={(e) => { e.stopPropagation(); setNavWhere(d.label); setNavField(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.625rem 0.75rem', borderRadius: '0.875rem',
                            background: navWhere === d.label ? 'rgba(209,235,219,0.55)' : 'transparent',
                            border: '1px solid', borderColor: navWhere === d.label ? 'rgba(25,37,36,0.1)' : 'transparent',
                            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
                            transition: 'background 130ms',
                          }}
                          onMouseEnter={(e) => { if (navWhere !== d.label) e.currentTarget.style.background = 'rgba(209,235,219,0.35)'; }}
                          onMouseLeave={(e) => { if (navWhere !== d.label) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(209,235,219,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                            {d.emoji}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{d.label}</p>
                            <p style={{ fontSize: '0.68rem', color: 'var(--sage)', marginTop: '0.1rem' }}>{d.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </NavDropdown>
                )}
              </div>

              {/* WHAT */}
              <div
                className="search-field"
                style={{
                  background: navField === 'what' ? 'rgba(255,255,255,0.7)' : undefined,
                  position: 'relative',
                }}
                onClick={() => setNavField(navField === 'what' ? null : 'what')}
              >
                <label>What</label>
                <span className="search-value" style={{ color: navWhat ? 'var(--ink)' : undefined }}>
                  {navWhat || 'Collab type'}
                </span>

                {navField === 'what' && (
                  <NavDropdown width="360px">
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.75rem' }}>
                      Collab Type
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {COLLAB_TYPES.map((ct) => {
                        const active = navWhat === ct.label;
                        return (
                          <button
                            key={ct.label}
                            onClick={(e) => { e.stopPropagation(); setNavWhat(active ? '' : ct.label); setNavField(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.5rem 1rem', borderRadius: '9999px',
                              border: '1px solid', cursor: 'pointer',
                              borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                              background: active ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                              color: active ? 'var(--bone)' : 'var(--slate)',
                              fontSize: '0.825rem', fontWeight: 500,
                              transition: 'all 140ms', fontFamily: 'var(--font-body)',
                            }}
                          >
                            <span>{ct.emoji}</span>
                            {ct.label}
                          </button>
                        );
                      })}
                    </div>
                  </NavDropdown>
                )}
              </div>

              {/* WHEN */}
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
                  {navWhen || 'Any time'}
                </span>

                {navField === 'when' && (
                  <NavDropdown align="right" width="220px">
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.625rem' }}>
                      Availability
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {AVAIL_OPTIONS.map((opt) => {
                        const active = navWhen === opt || (!navWhen && opt === 'Any time');
                        return (
                          <button
                            key={opt}
                            onClick={(e) => { e.stopPropagation(); setNavWhen(opt === 'Any time' ? '' : opt); setNavField(null); }}
                            style={{
                              padding: '0.6rem 0.875rem', borderRadius: '0.75rem',
                              background: active ? 'rgba(209,235,219,0.55)' : 'transparent',
                              border: '1px solid', borderColor: active ? 'rgba(25,37,36,0.1)' : 'transparent',
                              color: 'var(--ink)', fontSize: '0.85rem', fontWeight: active ? 600 : 400,
                              textAlign: 'left', cursor: 'pointer', transition: 'background 130ms',
                              fontFamily: 'var(--font-body)',
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(209,235,219,0.3)'; }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
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

          {/* Hamburger — mobile always; desktop when compact & search not open */}
          <button
            className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            style={showHamburger ? { display: 'flex' } : compactSearch ? { display: 'none' } : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line className="line line-1" x1="3" y1="5" x2="17" y2="5"/>
              <line className="line line-2" x1="3" y1="10" x2="17" y2="10"/>
              <line className="line line-3" x1="3" y1="15" x2="17" y2="15"/>
            </svg>
          </button>

          {/* "Search stays" compact pill */}
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

          {/* Profile avatar pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-stone/60 bg-white/60 hover:bg-white/90 transition-colors"
              style={{ minHeight: '40px' }}
            >
              <span className="font-body text-sm font-medium text-ink hidden sm:block">
                {profile?.full_name ?? 'Profile'}
              </span>
              <div className="w-8 h-8 rounded-full bg-mint flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-slate text-sm">{initials}</span>
                )}
              </div>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] w-52 glass-sm rounded-2xl overflow-hidden z-50"
                style={{ boxShadow: '0 8px 32px rgba(25,37,36,0.12)' }}
              >
                <div className="px-4 py-3 border-b border-stone/30">
                  <p className="font-display font-bold text-ink text-sm">{profile?.full_name}</p>
                  <p className="text-sage text-xs mt-0.5">@{profile?.username}</p>
                </div>
                <NavLink to="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-3 text-sm text-ink hover:bg-mint/30 transition-colors">
                  View Profile
                </NavLink>
                <button onClick={() => { setProfileOpen(false); navigate('/explore'); }} className="w-full text-left px-4 py-3 text-sm text-ink hover:bg-mint/30 transition-colors">
                  Explore Stays
                </button>
                <div className="border-t border-stone/30" />
                <button onClick={signOut} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50/50 transition-colors">
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
