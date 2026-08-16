import { useTranslation } from 'react-i18next';
import { useVerification } from '../contexts/VerificationContext';

export default function VerificationPendingModal() {
  const { t } = useTranslation('verificationPendingModal');
  const { isOpen, closeModal } = useVerification();
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(25,37,36,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'vpFadeIn 200ms ease forwards',
      }}
    >
      <style>{`@keyframes vpFadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.82)',
        borderRadius: '1.5rem',
        padding: '2.25rem 2rem 2rem',
        boxShadow: '0 24px 56px -12px rgba(25,37,36,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(209,235,219,0.7)',
          border: '1px solid rgba(74,155,127,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.375rem',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.35rem',
          color: 'var(--ink)', marginBottom: '0.75rem', lineHeight: 1.2,
        }}>
          {t('heading')}
        </h2>

        <p style={{
          fontSize: '0.9rem', color: 'var(--slate)', lineHeight: 1.75,
          marginBottom: '2rem',
        }}>
          {t('body')}
        </p>

        <button
          onClick={closeModal}
          style={{
            width: '100%', padding: '0.9rem',
            background: 'var(--ink)', color: 'var(--bone)',
            borderRadius: '999px', fontFamily: 'var(--font-body)',
            fontSize: '0.95rem', fontWeight: 700,
            border: 'none', cursor: 'pointer',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {t('cta.gotIt')}
        </button>
      </div>
    </div>
  );
}
