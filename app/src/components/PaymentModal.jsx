import { useState } from 'react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { ACH_REQUIRED_ABOVE_CASH_VALUE } from '../../convex/lib/fees';

export default function PaymentModal({ isOpen, onClose, fee, isFreeStay, cashAmount, contractId, isInPerson }) {
  const { t } = useTranslation('paymentModal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noUSBank, setNoUSBank] = useState(false);
  const createFeeSetupSession = useAction(api.stripe.createFeeSetupSession);

  if (!isOpen) return null;

  const feeDisplay = `$${fee.toFixed(2)}`;
  const feeExplain = isFreeStay
    ? t('feeExplain.flatFee')
    : t('feeExplain.percentage', { amount: (cashAmount || 0).toFixed(0) });

  // Mirrors the server-side rule in createFeeSetupSession — shown here so the
  // host isn't surprised when Checkout only offers a bank account.
  const requiresACH = !isFreeStay && !isInPerson && (cashAmount || 0) >= ACH_REQUIRED_ABOVE_CASH_VALUE && !noUSBank;

  const handlePay = async () => {
    if (!contractId || contractId === 'draft' || contractId === 'unknown') {
      setError(t('errors.saveContractFirst'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = `${window.location.origin}/contract`;
      const successUrl = `${base}?setup=success&contract_id=${encodeURIComponent(contractId)}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${base}?setup=cancelled`;

      const result = await createFeeSetupSession({
        contractId,
        successUrl,
        cancelUrl,
        noUSBank,
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Stripe setup error:', err);
      setError(
        err?.message?.includes('STRIPE_SECRET_KEY')
          ? t('errors.stripeNotConfigured')
          : t('errors.checkoutFailed')
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
          {t('heading')}
        </h3>
        <p style={{
          color: 'var(--sage)', fontSize: '0.875rem',
          textAlign: 'center', lineHeight: 1.5,
          margin: '0 0 1.5rem',
        }}>
          {t('body')}
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
              {t('feeCard.title')}
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

        {/* ACH requirement notice */}
        {!isFreeStay && !isInPerson && (cashAmount || 0) >= ACH_REQUIRED_ABOVE_CASH_VALUE && (
          <div style={{
            background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.25)',
            borderRadius: '0.875rem', padding: '0.75rem 1rem', marginBottom: '1rem',
          }}>
            <p style={{ color: '#2d6a4f', fontSize: '0.78rem', margin: 0, lineHeight: 1.4 }}>
              {t('achRequired.banner', { amount: (cashAmount || 0).toFixed(0) })}
            </p>
            {!noUSBank ? (
              <button
                type="button"
                onClick={() => setNoUSBank(true)}
                style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#2d6a4f', textDecoration: 'underline', cursor: 'pointer' }}
              >
                {t('achRequired.optOut')}
              </button>
            ) : (
              <p style={{ color: '#7a5a10', fontSize: '0.72rem', margin: '6px 0 0' }}>
                {t('achRequired.optedOutNote')}
              </p>
            )}
          </div>
        )}

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
              {t('cta.redirecting')}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              {t('cta.payButton', { fee: feeDisplay })}
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
          {t('cta.later')}
        </button>
      </div>
    </div>
  );
}
