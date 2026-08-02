import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { PayoutBadge, PayoutHoldControls, SendWisePayoutButton } from '../../components/admin/PayoutControls';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

const PAYOUT_FILTERS = ['all', 'pending', 'processing', 'paid', 'failed', 'held'];

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Cross-contract view of every collab payout owed to a creator — the
// "collect & forward" half of a completed collaboration, independent of the
// contract-lifecycle details Contract Manager focuses on.
export default function PayoutsManager() {
  const contracts = useQuery(api.contracts.getAll);
  const [filter, setFilter] = useState('all');

  const payouts = (contracts ?? []).filter((c) => c.creator_payout_amount);

  const filtered = payouts.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'held') return c.creator_payout_held === true;
    return (c.creator_payout_status ?? 'pending') === filter && !c.creator_payout_held;
  });

  const totalPending = payouts.filter((c) => (c.creator_payout_status ?? 'pending') !== 'paid').reduce((sum, c) => sum + (c.creator_payout_amount || 0), 0);
  const totalPaid = payouts.filter((c) => c.creator_payout_status === 'paid').reduce((sum, c) => sum + (c.creator_payout_amount || 0), 0);
  const heldCount = payouts.filter((c) => c.creator_payout_held).length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Payouts
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Creator payouts owed from completed collaborations — the money Collabnb collects from hosts and forwards on.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Payouts',    value: payouts.length,               color: INK },
          { label: 'Owed (unpaid)',    value: `$${totalPending.toFixed(0)}`, color: '#92400E' },
          { label: 'Paid Out',         value: `$${totalPaid.toFixed(0)}`,    color: '#166534' },
          { label: 'On Hold',          value: heldCount,                     color: '#991B1B' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 120 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {PAYOUT_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
              fontWeight: filter === f ? 700 : 400,
              background: filter === f ? INK : '#fff',
              color: filter === f ? '#fff' : SLATE,
              border: `1px solid ${filter === f ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {contracts === undefined && (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          Loading…
        </div>
      )}

      {contracts !== undefined && filtered.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>💸</p>
          <p style={{ color: SAGE, fontSize: '0.85rem', margin: 0 }}>No payouts match this filter yet.</p>
        </div>
      )}

      {contracts !== undefined && filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Creator', 'Host', 'Property', 'Payout', 'Completed', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={String(c._id)} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: INK }}>{c.creator_name || '—'}</td>
                  <td style={{ padding: '0.75rem', color: SLATE }}>{c.host_name || '—'}</td>
                  <td style={{ padding: '0.75rem', color: SLATE, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.property_name || c.location || '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <PayoutBadge contract={c} />
                  </td>
                  <td style={{ padding: '0.75rem', color: SAGE, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {fmtDate(c.creator_payout_paid_at || c._creationTime)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                      <SendWisePayoutButton contract={c} size="sm" />
                      <PayoutHoldControls contract={c} size="sm" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
