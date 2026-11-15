import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

const btn = {
  border: '1.5px solid rgba(25,37,36,0.15)', borderRadius: '0.6rem', cursor: 'pointer',
  padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
  background: 'none', color: 'var(--slate)', textDecoration: 'none', display: 'inline-block',
};

export default function HostReferral() {
  const { t } = useTranslation('settings');
  const { profile } = useAuth();
  const userId = profile?._id ? String(profile._id) : null;
  const stats = useQuery(api.referrals.getMyCode, userId ? { profileId: userId } : 'skip');
  const ensureCode = useMutation(api.referrals.ensureCode);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!userId) return null;

  const link = stats?.code
    ? `https://collabnb.com/join.html?ref=${encodeURIComponent(stats.code)}&join=true`
    : '';
  const message = t('hostReferral.message', 'We host content creators through Collabnb and get photos and video for our channels. Founding hotels pay no platform fee. Join with my link: {{link}}', { link });

  const create = async () => {
    setBusy(true);
    try {
      await ensureCode({ profileId: userId, username: profile?.username || profile?.name || 'host' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div style={{ background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.2)', borderRadius: '1rem', padding: '1rem 1.1rem' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
        {t('hostReferral.intro', 'Know another hotel or villa that would fit? Send them your link. They join as a founding host while spots last. Once {{target}} hotels you invited are approved, your listing gets a Founding Partner badge.', { target: stats?.partner_target || 3 })}
      </p>
      {!stats?.code ? (
        <button type="button" onClick={create} disabled={busy || stats === undefined} style={{ ...btn, background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)', opacity: busy ? 0.6 : 1 }}>
          {busy ? t('hostReferral.creating', 'Creating…') : t('hostReferral.create', 'Get my invite link')}
        </button>
      ) : (
        <>
          <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--ink)', background: 'rgba(25,37,36,0.05)', padding: '0.5rem 0.7rem', borderRadius: '0.5rem', overflowWrap: 'anywhere', marginBottom: '0.6rem' }}>{link}</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={copy} style={btn}>{copied ? t('hostReferral.copied', 'Copied') : t('hostReferral.copy', 'Copy link')}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" style={btn}>{t('hostReferral.whatsapp', 'Send on WhatsApp')}</a>
            <span style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>
              {profile?.is_founding_partner
                ? t('hostReferral.partner', 'Founding Partner badge earned')
                : t('hostReferral.progress', '{{approved}} of {{target}} approved · {{count}} signed up', { approved: stats.approved_hosts || 0, target: stats.partner_target || 3, count: stats.signups_rewarded || 0 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
