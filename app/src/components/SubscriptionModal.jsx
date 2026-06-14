import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function SubscriptionModal() {
  const { isModalOpen, closeModal } = useSubscription();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(null); // "monthly" | "yearly" | null
  const [error, setError] = useState(null);
  const createSubscriptionSession = useAction(api.stripe.createSubscriptionSession);

  if (!isModalOpen) return null;

  const profileId = profile?._id ?? profile?.id ?? '';

  const handleSubscribe = async (tier) => {
    if (!profileId) {
      setError('Profile not found. Please ensure you are logged in.');
      return;
    }
    setLoading(tier);
    setError(null);
    try {
      const appBase = window.location.origin;
      const successUrl = `${appBase}/profile?subscription=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${appBase}/profile?subscription=cancelled`;

      const result = await createSubscriptionSession({
        profileId,
        tier,
        successUrl,
        cancelUrl,
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Subscription checkout error:', err);
      setError(
        err?.message?.includes('STRIPE_SECRET_KEY')
          ? 'Stripe not configured. Run: npx convex env set STRIPE_SECRET_KEY sk_test_...'
          : 'Could not start checkout. Please try again.'
      );
      setLoading(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(25,37,36,0.50)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={closeModal}
    >
      <style>{`@keyframes collabnb-sub-spin { to { transform: rotate(360deg); } }`}</style>

      <div
        style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(24px) saturate(140%)',
          borderRadius: '1.75rem',
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: '0 24px 64px rgba(25,37,36,0.20)',
          padding: '2rem',
          fontFamily: 'var(--font-body)',
        }}
        onClick={(e) => e.stopPropagation()}
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

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1.25rem', color: 'var(--ink)',
          textAlign: 'center', margin: '0 0 0.5rem',
        }}>
          Keep collaborating
        </h3>

        {/* Body */}
        <p style={{
          color: 'var(--sage)', fontSize: '0.875rem',
          textAlign: 'center', lineHeight: 1.6,
          margin: '0 0 1.625rem',
        }}>
          You've completed your first collab — amazing! To continue messaging hosts and applying to listings, choose a plan.
        </p>

        {/* Error */}
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

        {/* Monthly plan */}
        <button
          onClick={() => handleSubscribe('monthly')}
          disabled={loading !== null}
          style={{
            width: '100%',
            padding: '0.875rem 1rem',
            borderRadius: '1rem',
            background: loading === 'monthly' ? 'rgba(60,87,89,0.45)' : 'var(--slate)',
            color: '#fff',
            fontFamily: 'var(--font-body)', fontWeight: 600,
            fontSize: '0.95rem', border: 'none',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            marginBottom: '0.625rem',
            transition: 'all 0.15s',
          }}
        >
          {loading === 'monthly' ? (
            <>
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'collabnb-sub-spin 0.7s linear infinite',
              }} />
              Redirecting…
            </>
          ) : '$10 / month'}
        </button>

        {/* Yearly plan */}
        <button
          onClick={() => handleSubscribe('yearly')}
          disabled={loading !== null}
          style={{
            width: '100%',
            padding: '0.875rem 1rem',
            borderRadius: '1rem',
            background: loading === 'yearly' ? 'rgba(25,37,36,0.45)' : 'var(--ink)',
            color: '#fff',
            fontFamily: 'var(--font-body)', fontWeight: 600,
            fontSize: '0.95rem', border: 'none',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
            transition: 'all 0.15s',
          }}
        >
          {loading === 'yearly' ? (
            <>
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'collabnb-sub-spin 0.7s linear infinite',
              }} />
              Redirecting…
            </>
          ) : (
            <span>
              $60 / year{' '}
              <span style={{ fontSize: '0.78rem', opacity: 0.8, fontWeight: 500 }}>
                (save 50%)
              </span>
            </span>
          )}
        </button>

        {/* Fine print */}
        <p style={{
          textAlign: 'center', color: 'var(--sage)',
          fontSize: '0.72rem', lineHeight: 1.5,
          margin: '0 0 1rem',
        }}>
          Cancel anytime. Founding members are always free.
        </p>

        {/* Dismiss */}
        <button
          onClick={closeModal}
          style={{
            display: 'block', margin: '0 auto',
            background: 'none', border: 'none',
            color: 'var(--sage)', fontSize: '0.82rem',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
