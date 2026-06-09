import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

const STATUS_FILTERS = ['all', 'pending', 'active', 'approved', 'completed', 'closed'];
const statusColors = {
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  active:    { bg: '#DBEAFE', color: '#0369A1' },
  approved:  { bg: '#DCFCE7', color: '#166534' },
  completed: { bg: '#D1EBDB', color: '#166534' },
  closed:    { bg: '#F3E8FF', color: '#7E22CE' },
};

export default function CollabOversight() {
  const stats   = useQuery(api.admin.getAnalytics);
  const collabs = useQuery(api.admin.getAllCollabs);
  const [statusFilter, setStatusFilter] = useState('all');

  if (stats === undefined || collabs === undefined) {
    return <div style={{ padding: '2rem 2.5rem', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  const filtered = collabs.filter((c) =>
    statusFilter === 'all' || c.status === statusFilter || c.current_stage === statusFilter
  );

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 960 }}>
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
          { label: 'Approved',        value: stats.approvedCollabs,   color: '#166534' },
          { label: 'Completed',       value: stats.completedCollabs,  color: '#166534' },
          { label: 'Active Listings', value: stats.publishedListings, color: '#0369A1' },
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
            {s === 'all' ? `All (${collabs.length})` : `${s} (${collabs.filter(c => c.status === s || c.current_stage === s).length})`}
          </button>
        ))}
      </div>

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
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Property', 'Host', 'Creator', 'Status', 'Stage', 'Dates', 'Active', 'Created'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const sKey = (c.status || 'pending').toLowerCase();
                const sColors = statusColors[sKey] ?? { bg: '#F7F5F2', color: '#3C5759' };
                return (
                  <tr
                    key={String(c._id)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: INK, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
