import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function PaymentModal({ isOpen, onClose, fee, isFreeStay, cashAmount, contractId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  if (!isOpen) return null;

  const feeDisplay = `$${fee.toFixed(2)}`;
  const feeExplain = isFreeStay
    ? 'Flat fee for free-stay collaboration'
    : `5% of $${(cashAmount || 0).toFixed(0)} collaboration value (min. $20)`;

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = `${window.location.origin}/#/contract`;
      const successUrl = `${base}?payment=success&contract_id=${encodeURIComponent(contractId || '')}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${base}?payment=cancelled`;

      const result = await createCheckoutSession({
        contractId: contractId || 'unknown',
        isFreeStay,
        cashAmount: cashAmount || 0,
        successUrl,
        cancelUrl,
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setError(
        err?.message?.includes('STRIPE_SECRET_KEY')
          ? 'Stripe not configured. Run: npx convex env set STRIPE_SECRET_KEY sk_test_...'
          : 'Could not start checkout. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(25,37,36,0.45)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <style>{`@keyframes collabnb-spin { to { transform: rotate(360deg); } }`}</style>

      <div
        style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px) saturate(140%)',
          borderRadius: '1.75rem',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 20px 60px rgba(25,37,36,0.18)',
          padding: '2rem',
          fontFamily: 'var(--font-body)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(209,235,219,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1.25rem', color: 'var(--ink)',
          textAlign: 'center', margin: '0 0 0.5rem',
        }}>
          Complete your collaboration
        </h3>
        <p style={{
          color: 'var(--sage)', fontSize: '0.875rem',
          textAlign: 'center', lineHeight: 1.5,
          margin: '0 0 1.5rem',
        }}>
          Both parties have signed. One last step: confirm your collaboration with payment.
        </p>

        {/* Fee breakdown */}
        <div style={{
          background: 'rgba(209,235,219,0.25)',
          border: '1px solid rgba(209,235,219,0.5)',
          borderRadius: '1rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem', margin: 0 }}>
              Collabnb Platform Fee
            </p>
            <p style={{ color: 'var(--sage)', fontSize: '0.75rem', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
              {feeExplain}
            </p>
          </div>
          <span style={{
            fontWeight: 700, color: 'var(--ink)',
            fontSize: '1.05rem', flexShrink: 0,
          }}>
            {feeDisplay}
          </span>
        </div>

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

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '1rem',
            background: loading ? 'rgba(25,37,36,0.45)' : 'var(--ink)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s',
            marginBottom: '0.875rem',
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'collabnb-spin 0.7s linear infinite',
              }} />
              Redirecting to Stripe…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Pay {feeDisplay} with Stripe
            </>
          )}
        </button>

        {/* Pay later */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--sage)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '0.375rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          I'll complete this later
        </button>
      </div>
    </div>
  );
}
