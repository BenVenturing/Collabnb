import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Hook: returns access state for the current user ───────────────────────────
export function useAccessGate() {
  const { profile, loading } = useAuth();
  const access = useQuery(
    api.gates.getMyAccess,
    profile?._id ? { profileId: profile._id } : 'skip'
  );

  if (loading || !access) return { loading: true, state: 'pending', canAccess: false };
  return {
    loading: false,
    state: access.state,
    canAccess: access.canAccess,
    isFounder: access.isFounder,
    tier: access.tier,
    track: access.track,
    daysLeft: access.daysLeft,
    trialEndsAt: access.trialEndsAt,
    role: access.role,
    isVerified: access.isVerified,
    isAdmin: access.isAdmin,
    subscriptionStatus: access.subscriptionStatus,
  };
}

// ─── Pending Approval Screen ────────────────────────────────────────────────────
export function PendingApprovalScreen({ role = 'creator' }) {
  const { t } = useTranslation('accessGate');
  const label = role === 'creator' ? 'Creator' : 'Host';

  return (
    <div style={{
      minHeight: '80dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        {/* Clock icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(209,235,219,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#192524" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', margin: '0 0 0.625rem', letterSpacing: '-0.02em' }}>
          {t('pendingApproval.heading')}
        </h1>
        <p style={{ color: '#3C5759', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.25rem' }}>
          {role === 'creator' ? t('pendingApproval.thanksCreator') : t('pendingApproval.thanksHost')}
        </p>
        <p style={{ color: '#959D90', fontSize: '0.8125rem', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
          {t('pendingApproval.reviewing')}
        </p>

        {/* Checklist */}
        {role === 'creator' && (
          <div style={{
            background: '#F7F5F2', borderRadius: '0.75rem', padding: '1rem 1.25rem',
            textAlign: 'left', marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#192524', margin: '0 0 0.5rem' }}>{t('pendingApproval.checklist.heading')}</p>
            <ul style={{ margin: 0, padding: '0 0 0 1.25rem', fontSize: '0.78rem', color: '#3C5759', lineHeight: 1.8 }}>
              <li>{t('pendingApproval.checklist.socialReview')}</li>
              <li>{t('pendingApproval.checklist.followerVerify')}</li>
              <li>{t('pendingApproval.checklist.experienceAssess')}</li>
              <li>{t('pendingApproval.checklist.interview')}</li>
              <li>{t('pendingApproval.checklist.trackTier')}</li>
              <li>{t('pendingApproval.checklist.fullAccess')}</li>
            </ul>
          </div>
        )}

        <div style={{
          padding: '0.875rem 1rem', background: 'rgba(209,235,219,0.15)',
          border: '1px solid rgba(209,235,219,0.4)', borderRadius: '0.75rem', marginBottom: '1.5rem',
        }}>
          <p style={{ fontSize: '0.78rem', color: '#3C5759', margin: 0 }}>
            <span style={{ fontWeight: 600 }}>{t('pendingApproval.receivedTitle')}</span>
            <span style={{ color: '#959D90' }}> {t('pendingApproval.receivedDetail')}</span>
          </p>
        </div>

        <a href="/" style={{
          display: 'inline-block', padding: '0.625rem 1.25rem',
          background: '#192524', color: '#fff', borderRadius: '0.5rem',
          fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit',
        }}>
          {t('pendingApproval.backHome')}
        </a>
      </div>
    </div>
  );
}

// ─── Limited Access Screen ──────────────────────────────────────────────────────
export function LimitedAccessScreen() {
  const { t } = useTranslation('accessGate');
  return (
    <div style={{
      minHeight: '80dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(209,235,219,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#192524" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', margin: '0 0 0.625rem', letterSpacing: '-0.02em' }}>
          {t('limitedAccess.heading')}
        </h1>
        <p style={{ color: '#3C5759', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
          {t('limitedAccess.body')}
        </p>

        <div style={{
          padding: '0.875rem 1rem', background: '#F7F5F2',
          borderRadius: '0.75rem', marginBottom: '1.5rem',
          fontSize: '0.78rem', color: '#3C5759', lineHeight: 1.55, textAlign: 'left',
        }}>
          <p style={{ margin: '0 0 0.375rem', fontWeight: 600 }}>{t('limitedAccess.stillCanHeading')}</p>
          <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
            <li>{t('limitedAccess.stillCan.dashboard')}</li>
            <li>{t('limitedAccess.stillCan.contracts')}</li>
            <li>{t('limitedAccess.stillCan.settings')}</li>
          </ul>
        </div>

        <a href="/pricing" style={{
          display: 'inline-block', padding: '0.625rem 1.5rem',
          background: '#192524', color: '#fff', borderRadius: '0.5rem',
          fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit',
        }}>
          {t('limitedAccess.viewPricing')}
        </a>
      </div>
    </div>
  );
}

// ─── Trial Countdown Banner ────────────────────────────────────────────────────
export function TrialBanner({ daysLeft, onDismiss, dismissible = true }) {
  const { t } = useTranslation('accessGate');
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('collabnb_trial_banner_hidden') === '1'; }
    catch { return false; }
  });

  if (hidden || daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft > 7) return null; // only show in last 7 days

  const handleDismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem('collabnb_trial_banner_hidden', '1'); } catch {}
    onDismiss?.();
  };

  const isExpired = daysLeft <= 0;

  return (
    <div style={{
      padding: '0.625rem 1rem',
      background: isExpired
        ? 'linear-gradient(135deg, #FEF2F2, #FEE2E2)'
        : 'linear-gradient(135deg, rgba(209,235,219,0.4), rgba(209,235,219,0.15))',
      borderBottom: isExpired
        ? '1px solid rgba(153,27,27,0.1)'
        : '1px solid rgba(209,235,219,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
      flexWrap: 'wrap', fontSize: '0.8125rem', position: 'relative',
    }}>
      <span style={{ color: isExpired ? '#991B1B' : '#3C5759', fontWeight: 500 }}>
        {isExpired
          ? t('trialBanner.expired')
          : t('trialBanner.daysLeft', { count: daysLeft })
        }
      </span>
      {!isExpired && daysLeft <= 3 && (
        <span style={{ fontWeight: 700, color: '#991B1B' }}>
          {t('trialBanner.daysRemaining', { count: daysLeft })}
        </span>
      )}
      <a href="/pricing"
        style={{
          padding: '0.3rem 0.75rem', borderRadius: '0.4rem',
          background: isExpired ? '#DC2626' : '#192524',
          color: '#fff', fontSize: '0.75rem', fontWeight: 600,
          textDecoration: 'none', fontFamily: 'inherit',
        }}
      >
        {isExpired ? t('trialBanner.subscribeNow') : t('trialBanner.upgrade')}
      </a>
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label={t('trialBanner.dismissAriaLabel')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#959D90', fontSize: '1.1rem', padding: '0.1rem 0.25rem',
            lineHeight: 1, fontFamily: 'inherit',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
