import { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const SLATE = '#3C5759';
const SAGE  = '#959D90';

export const payoutStatusColors = {
  pending:    { bg: '#FEF3C7', color: '#92400E' },
  processing: { bg: '#DBEAFE', color: '#0369A1' },
  paid:       { bg: '#DCFCE7', color: '#166534' },
  failed:     { bg: '#FEE2E2', color: '#991B1B' },
};

export function PayoutBadge({ contract: c }) {
  if (!c.creator_payout_amount) return <span style={{ color: SAGE, fontSize: '0.78rem' }}>—</span>;
  const status = c.creator_payout_status ?? 'pending';
  const colors = payoutStatusColors[status] ?? { bg: '#F7F5F2', color: SLATE };
  const releaseAt = c.creator_payout_release_at;
  const hoursLeft = releaseAt ? Math.max(0, Math.ceil((releaseAt - Date.now()) / (60 * 60 * 1000))) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: colors.bg, color: colors.color, textTransform: 'capitalize' }}>
        {status}
      </span>
      {c.creator_payout_held && (
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 99, background: '#FEE2E2', color: '#991B1B' }}>
          ⏸ On hold
        </span>
      )}
      <span style={{ fontSize: '0.75rem', color: SLATE }}>
        ${c.creator_payout_amount} · {c.creator_payout_method === 'wise' ? 'Wise' : c.creator_payout_method === 'stripe_connect' ? 'Stripe' : '—'}
      </span>
      {status === 'pending' && !c.creator_payout_held && hoursLeft !== null && hoursLeft > 0 && (
        <span style={{ fontSize: '0.7rem', color: SAGE }}>· releases in {hoursLeft}h</span>
      )}
    </div>
  );
}

// Dispute-resolution controls for a payout still awaiting its scheduled
// forward: hold it (pause the automatic release) or resume/release it now.
export function PayoutHoldControls({ contract: c, size = 'md' }) {
  const setPayoutHold = useMutation(api.contracts.setPayoutHold);
  const releasePayoutNow = useAction(api.stripe.releasePayoutNow);
  const [busy, setBusy] = useState(null); // 'hold' | 'release'
  const [result, setResult] = useState(null);

  if (!c.creator_payout_amount || c.creator_payout_status === 'paid' || c.creator_payout_method === 'wise') return null;

  const toggleHold = async () => {
    setBusy('hold');
    try { await setPayoutHold({ contractId: c._id, held: !c.creator_payout_held }); }
    finally { setBusy(null); }
  };

  const release = async () => {
    if (!window.confirm(`Release $${c.creator_payout_amount} to ${c.creator_name} right now, skipping the rest of the hold window?`)) return;
    setBusy('release');
    setResult(null);
    try {
      await releasePayoutNow({ contractId: c._id });
      setResult({ ok: true });
    } catch (err) {
      setResult({ ok: false, message: err?.message || 'Failed' });
    } finally {
      setBusy(null);
    }
  };

  const pad = size === 'sm' ? '0.25rem 0.55rem' : '0.4rem 0.8rem';
  const fs = size === 'sm' ? '0.7rem' : '0.8rem';
  const btnStyle = (color) => ({
    padding: pad, fontSize: fs, fontWeight: 600, borderRadius: '0.4rem',
    border: `1px solid ${color}55`, background: '#fff', color,
    cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <button onClick={toggleHold} disabled={!!busy} style={btnStyle(c.creator_payout_held ? '#166534' : '#991B1B')}>
          {busy === 'hold' ? '…' : c.creator_payout_held ? 'Resume' : 'Hold'}
        </button>
        {!c.creator_payout_held && (
          <button onClick={release} disabled={!!busy} style={btnStyle('#0369A1')}>
            {busy === 'release' ? 'Releasing…' : 'Release Now'}
          </button>
        )}
      </div>
      {result && (
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: result.ok ? '#166534' : '#991B1B' }}>
          {result.ok ? 'Released' : result.message}
        </span>
      )}
    </div>
  );
}

export function SendWisePayoutButton({ contract: c, size = 'md' }) {
  const sendWisePayout = useAction(api.stripe.sendWisePayout);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (c.creator_payout_method !== 'wise' || c.creator_payout_status === 'paid' || !c.creator_payout_amount) return null;

  const send = async () => {
    if (!window.confirm(`Send $${c.creator_payout_amount} to ${c.creator_name} via Wise? Only do this once Collabnb's Stripe balance has actually settled to your bank.`)) return;
    setBusy(true);
    setResult(null);
    try {
      await sendWisePayout({ contractId: c._id });
      setResult({ ok: true });
    } catch (err) {
      setResult({ ok: false, message: err?.message || 'Failed' });
    } finally {
      setBusy(false);
    }
  };

  const pad = size === 'sm' ? '0.25rem 0.55rem' : '0.4rem 0.8rem';
  const fs = size === 'sm' ? '0.7rem' : '0.8rem';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
      <button
        onClick={send}
        disabled={busy}
        style={{
          padding: pad, fontSize: fs, fontWeight: 600, borderRadius: '0.4rem',
          border: '1px solid rgba(3,105,161,0.3)', background: '#fff', color: '#0369A1',
          cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Sending…' : 'Send Wise Payout'}
      </button>
      {result && (
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: result.ok ? '#166534' : '#991B1B' }}>
          {result.ok ? 'Payout sent' : result.message}
        </span>
      )}
    </div>
  );
}
