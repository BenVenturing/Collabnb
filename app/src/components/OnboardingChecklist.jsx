import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'collabnb_onboarding_v1_dismissed';

function creatorSteps(profile) {
  return [
    {
      id: 'photo',
      label: 'Add a profile photo',
      done: !!profile?.avatar_url,
      action: { label: 'Add photo', path: '/profile?edit=true' },
    },
    {
      id: 'bio',
      label: 'Write your bio',
      done: !!profile?.bio && profile.bio.length > 10,
      action: { label: 'Edit profile', path: '/profile?edit=true' },
    },
    {
      id: 'social',
      label: 'Connect at least one social account',
      done: !!(profile?.instagram_handle || profile?.tiktok_handle || profile?.youtube_handle),
      action: { label: 'Add socials', path: '/profile?edit=true' },
    },
    {
      id: 'explore',
      label: 'Browse listings and find a match',
      done: false,
      action: { label: 'Explore listings', path: '/explore' },
    },
  ];
}

function hostSteps(profile) {
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
      done: !!profile?.bio && profile.bio.length > 10,
      action: { label: 'Edit profile', path: '/profile?edit=true' },
    },
    {
      id: 'creators',
      label: 'Browse creators who match your vibe',
      done: false,
      action: { label: 'Discover creators', path: '/host/creators' },
    },
  ];
}

export default function OnboardingChecklist() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );

  if (dismissed) return null;
  if (!profile || !profile.email) return null;

  const isHost = profile.role === 'host';
  const steps = isHost ? hostSteps(profile) : creatorSteps(profile);
  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      border: '1px solid rgba(255,255,255,0.6)',
      borderRadius: '20px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.75rem',
      boxShadow: '0 4px 24px rgba(25,37,36,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontWeight: 700,
            fontSize: '0.9375rem',
            color: 'var(--ink, #192524)',
            margin: 0,
          }}>
            {allDone ? '🎉 You\'re all set!' : `Get started — ${completedCount}/${steps.length} done`}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--slate, #3C5759)', margin: '0.15rem 0 0' }}>
            {isHost ? 'Set up your host presence before July 1st.' : 'Build your creator profile before launch.'}
          </p>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sage, #959D90)', fontSize: '1.1rem', padding: '0.25rem', lineHeight: 1,
          }}
          aria-label="Dismiss"
        >×</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--stone, #D0D5CE)', borderRadius: '2px', marginBottom: '1rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(completedCount / steps.length) * 100}%`,
          background: 'linear-gradient(90deg, #3C5759, #7ecfc4)',
          borderRadius: '2px',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steps.map(step => (
          <div
            key={step.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.875rem',
              borderRadius: '12px',
              background: step.done ? 'rgba(209,235,219,0.4)' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${step.done ? 'rgba(152,202,169,0.4)' : 'rgba(208,213,206,0.6)'}`,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${step.done ? '#3C5759' : 'var(--stone, #D0D5CE)'}`,
              background: step.done ? '#3C5759' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {step.done && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{
              flex: 1,
              fontSize: '0.875rem',
              color: step.done ? 'var(--slate, #3C5759)' : 'var(--ink, #192524)',
              textDecoration: step.done ? 'line-through' : 'none',
              opacity: step.done ? 0.7 : 1,
            }}>
              {step.label}
            </span>
            {!step.done && (
              <button
                onClick={() => navigate(step.action.path)}
                style={{
                  background: 'none', border: '1px solid var(--slate, #3C5759)',
                  borderRadius: '8px', padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate, #3C5759)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {step.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {allDone && (
        <button
          onClick={dismiss}
          style={{
            marginTop: '0.875rem', width: '100%',
            background: 'var(--ink, #192524)', color: '#fff',
            border: 'none', borderRadius: '12px', padding: '0.625rem',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
