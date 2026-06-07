import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY       = 'collabnb_onboarding_v2_dismissed';
const COLLAPSED_KEY     = 'collabnb_onboarding_v2_collapsed';
const FIRST_VISIT_KEY   = 'collabnb_onboarding_v2_seen';
const SHARED_REFERRAL_KEY = 'collabnb_onboarding_v2_shared';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

function creatorSteps(profile, isFirstVisit) {
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
      done: false,
      action: { label: 'Browse listings', path: '/explore' },
    },
    {
      id: 'share',
      label: 'Share with a friend',
      done: localStorage.getItem(SHARED_REFERRAL_KEY) === '1',
      optional: true,
      action: { label: 'Share code', path: null, type: 'share' },
    },
  ];
}

function hostSteps(profile, isFirstVisit) {
  return [
    {
      id: 'listing',
      label: 'Create your first listing',
      done: false,
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
      done: false,
      action: { label: 'Discover creators', path: '/host/creators' },
    },
    {
      id: 'share',
      label: 'Share with a friend',
      done: localStorage.getItem(SHARED_REFERRAL_KEY) === '1',
      optional: true,
      action: { label: 'Share code', path: null, type: 'share' },
    },
  ];
}

// Shared signal so AppNav can re-open the checklist
let _reopenListener = null;
export function reopenChecklist() {
  if (_reopenListener) _reopenListener();
}

export default function OnboardingChecklist() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1'
  );
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  // Steps that have been manually unchecked (shown as reopened even if profile says done)
  const [unchecked, setUnchecked] = useState({});
  // Track whether this is the very first time the checklist has loaded
  const [isFirstVisit, setIsFirstVisit] = useState(
    () => localStorage.getItem(FIRST_VISIT_KEY) !== '1'
  );

  // Register reopen listener
  useEffect(() => {
    _reopenListener = () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COLLAPSED_KEY);
      setDismissed(false);
      setCollapsed(false);
      setVisible(true);
      setEntered(true);
    };
    return () => { _reopenListener = null; };
  }, []);

  // Determine if this user should see the checklist
  const userEmail = (profile?.email || '').toLowerCase();
  const isAdmin = ADMIN_EMAIL
    ? userEmail === ADMIN_EMAIL.toLowerCase()
    : userEmail === 'benventuring@gmail.com';

  const isHost = profile?.role === 'host';
  const rawSteps = isHost ? hostSteps(profile, isFirstVisit) : creatorSteps(profile, isFirstVisit);
  // Apply manual unchecked overrides: a done step can be toggled back to open
  const steps = rawSteps.map(s => ({
    ...s,
    done: s.done && !unchecked[s.id],
  }));
  // Count only non-optional steps for "required" progress
  const requiredSteps = steps.filter(s => !s.optional);
  const requiredCompleted = requiredSteps.filter(s => s.done).length;
  const requiredTotal = requiredSteps.length;
  const optionalCompleted = steps.filter(s => s.optional && s.done).length;
  const allDone = requiredCompleted === requiredTotal;

  // Decide whether to show at all
  // Show for new non-admin users: created within 14 days OR checklist not yet complete
  const isNewUser = !profile?._creationTime || Date.now() - (profile._creationTime) < 14 * 24 * 60 * 60 * 1000;
  const notFullyComplete = requiredCompleted < requiredTotal;
  const shouldShow = !isAdmin && !!profile?.email && !dismissed && (isNewUser || notFullyComplete);

  useEffect(() => {
    if (!shouldShow) return;
    // Show it
    setVisible(true);
    // On first-ever visit, auto-expand with entrance animation
    const hasSeenBefore = localStorage.getItem(FIRST_VISIT_KEY) === '1';
    if (!hasSeenBefore) {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      setCollapsed(false);
      localStorage.removeItem(COLLAPSED_KEY);
    }
    // After first render, mark first visit as done so profile-based checks kick in on next load
    setIsFirstVisit(false);
    // Trigger entrance animation after mount
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, [shouldShow]);

  if (!visible || !shouldShow) return null;

  function dismiss() {
    setEntered(false);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      setDismissed(true);
    }, 280);
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
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
          {/* Progress ring icon */}
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
            {allDone ? '🎉 All done!' : 'Account setup'}
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
              {allDone ? '🎉 You\'re all set!' : 'Complete your setup'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--slate, #3C5759)', margin: '0.125rem 0 0' }}>
              {requiredCompleted}/{requiredTotal} steps complete
              {optionalCompleted > 0 && ` + ${optionalCompleted} bonus`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginLeft: '0.5rem' }}>
            {/* Collapse button */}
            <button
              onClick={toggleCollapse}
              aria-label="Collapse"
              title="Minimize"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sage, #959D90)', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', fontSize: '1rem', lineHeight: 1,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(25,37,36,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="12" height="12" viewBox="0 0 12 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="2" x2="11" y2="2" />
              </svg>
            </button>
            {/* Close / dismiss button */}
            <button
              onClick={dismiss}
              aria-label="Dismiss checklist"
              title="Dismiss"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sage, #959D90)', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', fontSize: '1rem', lineHeight: 1,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" />
                <line x1="11" y1="1" x2="1" y2="11" />
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
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '12px',
                background: step.done ? 'rgba(209,235,219,0.4)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${step.done ? 'rgba(152,202,169,0.4)' : 'rgba(208,213,206,0.6)'}`,
                transition: 'background 200ms',
              }}
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
                  onClick={() => {
                    if (step.action.type === 'share') {
                      const code = profile?.referral_code || '';
                      const shareUrl = code
                        ? `${window.location.origin}/join?ref=${code}`
                        : `${window.location.origin}/join`;
                      if (navigator.share) {
                        navigator.share({ title: 'Join me on Collabnb', url: shareUrl }).catch(() => {});
                      } else {
                        navigator.clipboard?.writeText(shareUrl).then(() => {
                          localStorage.setItem(SHARED_REFERRAL_KEY, '1');
                          setUnchecked(prev => ({ ...prev, [step.id]: false }));
                        }).catch(() => {});
                      }
                      localStorage.setItem(SHARED_REFERRAL_KEY, '1');
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
              onClick={dismiss}
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
