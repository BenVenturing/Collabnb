import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

const KEY_PREFIX = 'collabnb_onboarding_v3';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// Build per-user localStorage keys (scoped by Convex user _id)
function userKeys(userId) {
  if (!userId) return null;
  return {
    dismissed:       `${KEY_PREFIX}_dismissed_${userId}`,
    collapsed:       `${KEY_PREFIX}_collapsed_${userId}`,
    seen:            `${KEY_PREFIX}_seen_${userId}`,
    shared:          `${KEY_PREFIX}_shared_${userId}`,
    explored:        `${KEY_PREFIX}_explored_${userId}`,
    browsedCreators: `${KEY_PREFIX}_browsedcreators_${userId}`,
  };
}

function creatorSteps(profile, isFirstVisit, hasShared, hasExplored) {
  return [
    {
      id: 'photo',
      label: 'Add a profile photo',
      done: !isFirstVisit && !!profile?.avatar_url,
      action: { label: 'Add photo', path: '/profile?edit=true' },
    },
    {
      id: 'bio',
      label: 'Write your bio',
      done: !isFirstVisit && !!profile?.bio && profile.bio.length > 10,
      action: { label: 'Edit profile', path: '/profile?edit=true' },
    },
    {
      id: 'social',
      label: 'Connect a social account',
      done: !isFirstVisit && !!(profile?.instagram_handle || profile?.tiktok_handle || profile?.youtube_handle),
      action: { label: 'Add socials', path: '/profile?edit=true' },
    },
    {
      id: 'explore',
      label: 'Browse sample listings',
      done: hasExplored,
      action: { label: 'Browse listings', path: '/explore' },
    },
    {
      id: 'share',
      label: 'Share your sign-up with a friend',
      done: hasShared,
      optional: true,
      action: { label: 'Share link', path: null, type: 'share' },
    },
  ];
}

function hostSteps(profile, isFirstVisit, hasShared, hasListing, hasBrowsedCreators) {
  return [
    {
      id: 'listing',
      label: 'Create your first listing',
      done: hasListing,
      action: { label: 'Create listing', path: '/host/listings/create' },
    },
    {
      id: 'profile',
      label: 'Complete your host profile',
      done: !isFirstVisit && !!profile?.bio && profile.bio.length > 10,
      action: { label: 'Edit profile', path: '/profile?edit=true' },
    },
    {
      id: 'creators',
      label: 'Browse creators who match your vibe',
      done: hasBrowsedCreators,
      action: { label: 'Discover creators', path: '/host/creators' },
    },
    {
      id: 'share',
      label: 'Share your sign-up with a friend',
      done: hasShared,
      optional: true,
      action: { label: 'Share link', path: null, type: 'share' },
    },
  ];
}

/**
 * Compute checklist progress from profile for use in the nav dropdown badge.
 */
export function getChecklistProgress(profile) {
  const isHost = profile?.role === 'host';
  const raw = isHost ? hostSteps(profile, false, false, false, false) : creatorSteps(profile, false, false, false);
  const required = raw.filter(s => !s.optional);
  return { completed: required.filter(s => s.done).length, total: required.length };
}

// Shared signal so AppNav can re-open the checklist
let _reopenListener = null;
export function reopenChecklist() {
  if (_reopenListener) _reopenListener();
}

export default function OnboardingChecklist() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive stable user ID — String() so Convex Id object becomes a plain string
  const userId = profile?._id ? String(profile._id) : null;

  // All checklist state starts fresh (blank slate for every new user context).
  // A useEffect below syncs from per-user localStorage once userId is known.
  const [dismissed,          setDismissed]          = useState(false);
  const [collapsed,          setCollapsed]          = useState(false);
  const [visible,            setVisible]            = useState(false);
  const [entered,            setEntered]            = useState(false);
  const [unchecked,          setUnchecked]          = useState({});
  const [isFirstVisit,       setIsFirstVisit]       = useState(true);
  const [hasShared,          setHasShared]          = useState(false);
  const [hasExplored,        setHasExplored]        = useState(false);
  const [hasBrowsedCreators, setHasBrowsedCreators] = useState(false);

  const isHost = profile?.role === 'host';
  // Query whether this host has created any listings yet
  const hostListings = useQuery(
    api.listings.getByHost,
    isHost && userId ? { host_id: String(userId) } : 'skip'
  );
  const hasListing = isHost && (hostListings?.length ?? 0) > 0;

  // Track the last userId we loaded so we reset state on account switch
  const loadedForUser = useRef(null);

  // Load per-user state whenever the logged-in user changes
  useEffect(() => {
    if (!userId) return;
    if (loadedForUser.current === userId) return; // already loaded for this user
    loadedForUser.current = userId;

    const k = userKeys(userId);
    setDismissed(localStorage.getItem(k.dismissed) === '1');
    setCollapsed(localStorage.getItem(k.collapsed) === '1');
    setIsFirstVisit(localStorage.getItem(k.seen) !== '1');
    setHasShared(localStorage.getItem(k.shared) === '1');
    setHasExplored(localStorage.getItem(k.explored) === '1');
    setHasBrowsedCreators(localStorage.getItem(k.browsedCreators) === '1');
    // Always clear unchecked overrides on account switch
    setUnchecked({});
    setVisible(false);
    setEntered(false);
  }, [userId]);

  // Auto-complete page-visit steps when user navigates to those routes
  useEffect(() => {
    if (!userId) return;
    const k = userKeys(userId);
    if (location.pathname === '/explore' && localStorage.getItem(k.explored) !== '1') {
      localStorage.setItem(k.explored, '1');
      setHasExplored(true);
    }
    if (location.pathname === '/host/creators' && localStorage.getItem(k.browsedCreators) !== '1') {
      localStorage.setItem(k.browsedCreators, '1');
      setHasBrowsedCreators(true);
    }
  }, [location.pathname, userId]);

  // Register reopen listener (uses current userId closure)
  useEffect(() => {
    _reopenListener = () => {
      if (!userId) return;
      const k = userKeys(userId);
      localStorage.removeItem(k.dismissed);
      localStorage.removeItem(k.collapsed);
      setDismissed(false);
      setCollapsed(false);
      setVisible(true);
      setEntered(true);
    };
    return () => { _reopenListener = null; };
  }, [userId]);

  const userEmail = (profile?.email || '').toLowerCase();
  const isAdmin = ADMIN_EMAIL
    ? userEmail === ADMIN_EMAIL.toLowerCase()
    : userEmail === 'benventuring@gmail.com';

  const rawSteps = isHost
    ? hostSteps(profile, isFirstVisit, hasShared, hasListing, hasBrowsedCreators)
    : creatorSteps(profile, isFirstVisit, hasShared, hasExplored);

  const steps = rawSteps.map(s => ({ ...s, done: s.done && !unchecked[s.id] }));
  const requiredSteps     = steps.filter(s => !s.optional);
  const requiredCompleted = requiredSteps.filter(s => s.done).length;
  const requiredTotal     = requiredSteps.length;
  const optionalCompleted = steps.filter(s => s.optional && s.done).length;
  const allDone = requiredCompleted === requiredTotal;

  const isNewUser = !profile?._creationTime || Date.now() - profile._creationTime < 14 * 24 * 60 * 60 * 1000;
  const notFullyComplete = requiredCompleted < requiredTotal;
  const shouldShow = !isAdmin && !!profile?.email && !dismissed && (isNewUser || notFullyComplete);

  useEffect(() => {
    if (!shouldShow || !userId) return;
    setVisible(true);
    const k = userKeys(userId);
    const hasSeenBefore = localStorage.getItem(k.seen) === '1';
    if (!hasSeenBefore) {
      localStorage.setItem(k.seen, '1');
      setCollapsed(false);
      localStorage.removeItem(k.collapsed);
    }
    setIsFirstVisit(false);
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, [shouldShow, userId]);

  if (!visible || !shouldShow) return null;

  function handleClose() {
    if (!userId) return;
    const k = userKeys(userId);
    if (allDone) {
      setEntered(false);
      setTimeout(() => {
        localStorage.setItem(k.dismissed, '1');
        setDismissed(true);
      }, 280);
    } else {
      setCollapsed(true);
      localStorage.setItem(k.collapsed, '1');
    }
  }

  function toggleCollapse() {
    if (!userId) return;
    const k = userKeys(userId);
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(k.collapsed, next ? '1' : '0');
  }

  function handleShare() {
    if (!userId) return;
    const k = userKeys(userId);
    const code = profile?.referral_code || '';
    const shareUrl = code
      ? `${window.location.origin}/join?ref=${code}`
      : `${window.location.origin}/join`;
    if (navigator.share) {
      navigator.share({ title: 'Join me on Collabnb', url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
    }
    localStorage.setItem(k.shared, '1');
    setHasShared(true);
  }

  const widgetStyle = {
    position: 'fixed',
    bottom: '7rem',
    right: '1.5rem',
    zIndex: 200,
    width: collapsed ? 'auto' : '300px',
    maxWidth: 'calc(100vw - 3rem)',
    transform: entered ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
    opacity: entered ? 1 : 0,
    transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1), opacity 300ms cubic-bezier(0.16,1,0.3,1), width 300ms cubic-bezier(0.16,1,0.3,1)',
    transformOrigin: 'bottom right',
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.75)',
    borderRadius: '20px',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 32px rgba(25,37,36,0.14), 0 2px 8px rgba(25,37,36,0.06)',
    overflow: 'hidden',
  };

  // ── Collapsed pill ──────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div style={widgetStyle}>
        <button
          onClick={toggleCollapse}
          aria-label="Open setup checklist"
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            cursor: 'pointer',
            border: 'none',
            fontFamily: 'var(--font-body)',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" fill="none" stroke="var(--stone, #D0D5CE)" strokeWidth="2.5" />
            <circle
              cx="11" cy="11" r="8"
              fill="none"
              stroke="#3C5759"
              strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 8}`}
              strokeDashoffset={`${2 * Math.PI * 8 * (1 - requiredCompleted / requiredTotal)}`}
              strokeLinecap="round"
              transform="rotate(-90 11 11)"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
            <text x="11" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--ink, #192524)" fontFamily="sans-serif">
              {requiredCompleted}/{requiredTotal}
            </text>
          </svg>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink, #192524)' }}>
            {allDone ? 'All done!' : 'Account setup'}
          </span>
          {!allDone && (
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700,
              background: '#3C5759', color: '#fff',
              borderRadius: '9999px', padding: '0.125rem 0.5rem',
              lineHeight: 1.5,
            }}>
              {requiredTotal - requiredCompleted} left
            </span>
          )}
        </button>
      </div>
    );
  }

  // ── Expanded card ────────────────────────────────────────────────────────────
  return (
    <div style={widgetStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1rem 0',
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-display, sans-serif)',
              fontWeight: 700, fontSize: '0.9rem',
              color: 'var(--ink, #192524)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {allDone ? 'You\'re all set!' : 'Complete your setup'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--slate, #3C5759)', margin: '0.125rem 0 0' }}>
              {requiredCompleted}/{requiredTotal} steps complete
              {optionalCompleted > 0 && ` + ${optionalCompleted} bonus`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginLeft: '0.5rem' }}>
            <button
              onClick={toggleCollapse}
              aria-label="Collapse"
              title="Minimize"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sage, #959D90)', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(25,37,36,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="12" height="2" viewBox="0 0 12 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="1" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (!userId) return;
                const k = userKeys(userId);
                setEntered(false);
                setTimeout(() => {
                  localStorage.setItem(k.dismissed, '1');
                  setDismissed(true);
                }, 280);
              }}
              aria-label="Close checklist"
              title="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sage, #959D90)', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', transition: 'background 150ms, color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(200,104,104,0.1)';
                e.currentTarget.style.color = '#C86868';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--sage, #959D90)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                <line x1="2" y1="2" x2="12" y2="12" />
                <line x1="12" y1="2" x2="2" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0.625rem 1rem 0' }}>
          <div style={{
            height: '4px', background: 'var(--stone, #D0D5CE)',
            borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(requiredCompleted / requiredTotal) * 100}%`,
              background: 'linear-gradient(90deg, #3C5759, #7ecfc4)',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Steps */}
        <div style={{ padding: '0.625rem 0.75rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {steps.map(step => {
            const rawDone = rawSteps.find(s => s.id === step.id)?.done ?? false;
            const isUnchecked = unchecked[step.id];
            return (
              <div
                key={step.id}
                onClick={() => {
                  if (step.done) return;
                  if (step.action.type === 'share') { handleShare(); return; }
                  if (step.action.path) navigate(step.action.path);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.5rem 0.625rem',
                  borderRadius: '12px',
                  background: step.done ? 'rgba(209,235,219,0.4)' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${step.done ? 'rgba(152,202,169,0.4)' : 'rgba(208,213,206,0.6)'}`,
                  transition: 'background 200ms',
                  cursor: step.done ? 'default' : 'pointer',
                }}
                onMouseEnter={e => { if (!step.done) e.currentTarget.style.background = 'rgba(60,87,89,0.06)'; }}
                onMouseLeave={e => { if (!step.done) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
              >
                {/* Check circle — clickable to toggle completed steps */}
                <button
                  onClick={() => {
                    if (rawDone) {
                      setUnchecked(prev => ({ ...prev, [step.id]: !isUnchecked }));
                    }
                  }}
                  title={rawDone ? (isUnchecked ? 'Mark as done' : 'Uncheck to revisit') : undefined}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${step.done ? '#3C5759' : 'var(--stone, #D0D5CE)'}`,
                    background: step.done ? '#3C5759' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 200ms, border-color 200ms',
                    cursor: rawDone ? 'pointer' : 'default',
                    padding: 0,
                  }}>
                  {step.done && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <span style={{
                  flex: 1,
                  fontSize: '0.8125rem',
                  color: step.done ? 'var(--slate, #3C5759)' : 'var(--ink, #192524)',
                  textDecoration: step.done ? 'line-through' : 'none',
                  opacity: step.done ? 0.65 : 1,
                  lineHeight: 1.35,
                }}>
                  {step.label}
                  {step.optional && !step.done && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 600, color: 'var(--sage, #959D90)',
                      marginLeft: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      optional
                    </span>
                  )}
                </span>

                {!step.done && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (step.action.type === 'share') {
                        handleShare();
                        return;
                      }
                      navigate(step.action.path);
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(60,87,89,0.35)',
                      borderRadius: '7px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--slate, #3C5759)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      fontFamily: 'var(--font-body)',
                      transition: 'background 150ms, border-color 150ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(60,87,89,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(60,87,89,0.6)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.borderColor = 'rgba(60,87,89,0.35)';
                    }}
                  >
                    {step.action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* All done CTA */}
        {allDone && (
          <div style={{ padding: '0 0.75rem 0.875rem' }}>
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                background: 'var(--ink, #192524)', color: '#fff',
                border: 'none', borderRadius: '12px', padding: '0.5rem',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Got it — dismiss ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
