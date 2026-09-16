import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#646B62';
const BONE  = '#F7F5F2';

const STATUS_FILTERS = ['all', 'pending', 'active', 'approved', 'completed', 'closed', 'terminated'];
const statusColors = {
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  active:    { bg: '#DBEAFE', color: '#0369A1' },
  approved:  { bg: '#DCFCE7', color: '#166534' },
  completed: { bg: '#D1EBDB', color: '#166534' },
  closed:    { bg: '#F3E8FF', color: '#7E22CE' },
  terminated: { bg: '#FEE2E2', color: '#991B1B' },
};

const actionBtn = {
  padding: '0.25rem 0.55rem', borderRadius: '0.35rem', fontSize: '0.7rem', fontWeight: 600,
  background: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
};

export default function CollabOversight() {
  const stats   = useQuery(api.admin.getAnalytics);
  const collabs = useQuery(api.admin.getAllCollabs);
  const terminateCollab = useMutation(api.admin.terminateCollab);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState('');

  const confirmTerminate = async () => {
    const collab = confirming;
    const id = String(collab._id);
    setConfirming(null);
    setBusyId(id);
    try {
      const { contractsFrozen, emailed } = await terminateCollab({ id });
      setNotice(`Terminated "${collab.property_name || 'collaboration'}" · ${contractsFrozen} contract${contractsFrozen === 1 ? '' : 's'} frozen · ${emailed} email${emailed === 1 ? '' : 's'} sent`);
    }
    catch (err) { window.alert(err?.data || err?.message || 'Something went wrong.'); }
    finally { setBusyId(null); }
  };

  if (stats === undefined || collabs === undefined) {
    return <div style={{ padding: '2rem 2.5rem', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }
  if (stats === null) {
    return <div style={{ padding: '2rem 2.5rem', color: SAGE, fontSize: '0.85rem' }}>Sign in with the admin account to manage collaborations.</div>;
  }

  const matchesFilter = (c, f) =>
    f === 'all' ? c.status !== 'terminated' : c.status === f || c.current_stage === f;
  const filtered = collabs.filter((c) => matchesFilter(c, statusFilter));

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1080 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Collaboration Oversight
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Monitor and manage all collaborations on the platform.
      </p>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',           value: stats.totalCollabs,      color: INK },
          { label: 'Approved',        value: stats.approvedCollabs,   color: INK },
          { label: 'Completed',       value: stats.completedCollabs,  color: INK },
          { label: 'Active Listings', value: stats.publishedListings, color: INK },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 100 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Status filter ── */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
              fontWeight: statusFilter === s ? 700 : 400,
              background: statusFilter === s ? INK : '#fff',
              color: statusFilter === s ? '#fff' : SLATE,
              border: `1px solid ${statusFilter === s ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            }}
          >
            {`${s} (${collabs.filter((c) => matchesFilter(c, s)).length})`}
          </button>
        ))}
      </div>

      {notice && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderLeft: '3px solid #991B1B', borderRadius: '0.6rem', padding: '0.65rem 0.9rem', marginBottom: '1rem', fontSize: '0.8rem', color: INK }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: SAGE, fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🤝</p>
          <p style={{ color: SAGE, fontSize: '0.85rem', margin: 0 }}>
            {collabs.length === 0
              ? 'No collaborations on the platform yet.'
              : 'No collaborations match this status filter.'}
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Property', 'Host', 'Creator', 'Status', 'Stage', 'Dates', 'Active', 'Created', ''].map((h) => (
                  <th key={h || 'actions'} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const sKey = (c.status || 'pending').toLowerCase();
                const sColors = statusColors[sKey] ?? { bg: '#F7F5F2', color: '#3C5759' };
                const busy = busyId === String(c._id);
                return (
                  <tr
                    key={String(c._id)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: INK, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.property_name || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: SLATE }}>{c.host_name || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {c.creator_name ? (
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('collabnb-admin-tab', { detail: { tab: 'messages' } }))}
                          title="View in Messages"
                          style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.1rem',
                          }}
                        >
                          <span style={{ color: SLATE, fontWeight: 600, fontSize: '0.82rem', textDecoration: 'underline', textDecorationColor: 'rgba(60,87,89,0.3)', textUnderlineOffset: 2 }}>
                            {c.creator_name}
                          </span>
                          <span style={{ color: SAGE, fontSize: '0.68rem', fontFamily: 'monospace' }}>
                            {c.creator_id ? String(c.creator_id).slice(0, 10) + '…' : ''}
                          </span>
                        </button>
                      ) : (
                        <span style={{ color: SAGE, fontSize: '0.72rem', fontFamily: 'monospace' }}>
                          {c.creator_id ? String(c.creator_id).slice(0, 12) + '…' : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: sColors.bg, color: sColors.color, textTransform: 'capitalize' }}>
                        {c.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: SLATE, fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {c.current_stage?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: SLATE, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{c.dates || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 99, background: c.is_active ? '#DCFCE7' : '#F7F5F2', color: c.is_active ? '#166534' : SAGE }}>
                        {c.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: SAGE, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {c._creationTime ? new Date(c._creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {sKey !== 'terminated' && (
                        <button
                          onClick={() => setConfirming(c)}
                          disabled={busy}
                          style={{ ...actionBtn, color: '#B91C1C', border: '1px solid rgba(185,28,28,0.3)', opacity: busy ? 0.5 : 1 }}
                        >
                          Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <ConfirmTerminate
          collab={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={confirmTerminate}
        />
      )}
    </div>
  );
}

const CONFIRM_WORD = 'TERMINATE';
const DANGER = '#B91C1C';

function ConfirmTerminate({ collab, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(25,37,36,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (matches) onConfirm(); }}
        style={{ background: '#fff', borderRadius: '0.875rem', padding: '1.5rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 50px rgba(25,37,36,0.2)' }}
      >
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.15rem', fontWeight: 700, color: INK, margin: 0 }}>Terminate collaboration</h2>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: SLATE, margin: '0.5rem 0 0' }}>
          {collab.property_name || 'Untitled property'}
          {collab.creator_name ? ` · ${collab.creator_name}` : ''}
        </p>
        <p style={{ fontSize: '0.8rem', color: SAGE, lineHeight: 1.5, margin: '0.75rem 0 1rem' }}>
          Admin override — this immediately:
        </p>
        <ul style={{ fontSize: '0.8rem', color: SAGE, lineHeight: 1.6, margin: '-0.5rem 0 1rem', paddingLeft: '1.1rem' }}>
          <li>ends the collaboration without either party's agreement</li>
          <li>freezes every payment tied to it — no charges, checkouts or payouts go through</li>
          <li>emails the creator and host that Collabnb terminated it</li>
        </ul>
        <p style={{ fontSize: '0.75rem', color: SAGE, margin: '0 0 1rem' }}>
          The record, messages and contract are kept under the Terminated filter.
        </p>
        <label style={{ display: 'block', fontSize: '0.75rem', color: SLATE, marginBottom: '0.35rem' }}>
          Type <strong style={{ color: DANGER, letterSpacing: '0.04em' }}>{CONFIRM_WORD}</strong> to confirm
        </label>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={CONFIRM_WORD}
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.45rem', border: '1px solid rgba(25,37,36,0.18)', fontSize: '0.85rem', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button type="button" onClick={onCancel} style={{ ...actionBtn, padding: '0.45rem 0.9rem', fontSize: '0.8rem', color: SLATE, border: '1px solid rgba(25,37,36,0.15)' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!matches}
            style={{ ...actionBtn, padding: '0.45rem 0.9rem', fontSize: '0.8rem', color: '#fff', border: 'none', background: DANGER, opacity: matches ? 1 : 0.4, cursor: matches ? 'pointer' : 'not-allowed' }}
          >
            Terminate
          </button>
        </div>
      </form>
    </div>
  );
}
