import { useState, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

export default function LifetimeAccessModal({ isOpen, onClose, role = 'creator' }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createLifetimeSession = useAction(api.stripe.createLifetimeSession);
  const lifetimeCount = useQuery(api.profiles.countLifetimeMembers) ?? 0;

  if (!isOpen) return null;

  // Mirror the tier ladder from stripe.js
  function getTier(count) {
    if (count < 50)  return { price: 100, label: 'Early Adopter',    spotsLeft: 50 - count };
    if (count < 100) return { price: 125, label: 'Community',         spotsLeft: 100 - count };
    if (count < 150) return { price: 150, label: 'Community',         spotsLeft: 150 - count };
    if (count < 200) return { price: 200, label: 'Standard Lifetime', spotsLeft: 200 - count };
    return null;
  }

  const tier = getTier(lifetimeCount);
  const profileId = profile?._id ?? profile?.id ?? '';

  const handleClaim = async () => {
    if (!profileId) { setError('Please log in to continue.'); return; }
    setLoading(true);
    setError(null);
    try {
      const base = `${window.location.origin}/#/profile`;
      const result = await createLifetimeSession({
        profileId,
        role,
        successUrl: `${base}?lifetime=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl:  `${base}?lifetime=cancelled`,
      });
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      setError(err?.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  const spin = { animation: 'collabnb-lt-spin 0.7s linear infinite' };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 260,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(25,37,36,0.52)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <style>{`@keyframes collabnb-lt-spin { to { transform: rotate(360deg); } }`}</style>

      <div
        style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px) saturate(140%)',
          borderRadius: '1.75rem',
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: '0 24px 64px rgba(25,37,36,0.22)',
          padding: '2rem',
          fontFamily: 'var(--font-body)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(209,235,219,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
          </svg>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1.25rem', color: 'var(--ink)',
          textAlign: 'center', margin: '0 0 0.5rem',
        }}>
          {tier ? 'Lifetime Access Available' : 'Lifetime Spots Sold Out'}
        </h3>

        <p style={{
          color: 'var(--sage)', fontSize: '0.875rem',
          textAlign: 'center', lineHeight: 1.6,
          margin: '0 0 1.5rem',
        }}>
          {tier
            ? `The free founding round is full. You can still get permanent access with a one-time payment.`
            : `All lifetime spots are gone. Choose a monthly or annual plan to get started.`}
        </p>

        {tier && (
          <>
            {/* Price + tier */}
            <div style={{
              background: 'rgba(209,235,219,0.25)',
              border: '1px solid rgba(209,235,219,0.5)',
              borderRadius: '1rem',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem', margin: 0 }}>
                  {tier.label}
                </p>
                <p style={{ color: 'var(--sage)', fontSize: '0.73rem', margin: '0.15rem 0 0' }}>
                  {tier.spotsLeft} spot{tier.spotsLeft !== 1 ? 's' : ''} at this price — then it goes up
                </p>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '1.3rem' }}>
                ${tier.price}
              </span>
            </div>

            {error && (
              <p style={{
                color: '#b91c1c', fontSize: '0.78rem',
                marginBottom: '1rem',
                padding: '0.625rem 0.875rem',
                background: 'rgba(185,28,28,0.06)',
                borderRadius: '0.75rem',
                lineHeight: 1.4,
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleClaim}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '1rem',
                background: loading ? 'rgba(25,37,36,0.45)' : 'var(--ink)',
                color: '#fff',
                fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: '0.95rem', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                marginBottom: '0.625rem',
                transition: 'all 0.15s',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', ...spin }} />
                  Redirecting…
                </>
              ) : `Get Lifetime Access — $${tier.price}`}
            </button>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            display: 'block', margin: '0.5rem auto 0',
            background: 'none', border: 'none',
            color: 'var(--sage)', fontSize: '0.82rem',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          {tier ? 'Maybe later' : 'Close'}
        </button>
      </div>
    </div>
  );
}
