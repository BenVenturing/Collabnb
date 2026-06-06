import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'signed', 'active', 'completed', 'cancelled'];

const statusColors = {
  draft:      { bg: '#F7F5F2',  color: '#3C5759' },
  sent:       { bg: '#FEF3C7',  color: '#92400E' },
  signed:     { bg: '#DBEAFE',  color: '#0369A1' },
  active:     { bg: '#DCFCE7',  color: '#166534' },
  completed:  { bg: '#D1EBDB',  color: '#166534' },
  cancelled:  { bg: '#FEE2E2',  color: '#991B1B' },
};

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const s = (status ?? 'draft').toLowerCase();
  const colors = statusColors[s] ?? { bg: '#F7F5F2', color: '#3C5759' };
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem',
      borderRadius: 99, background: colors.bg, color: colors.color,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {s}
    </span>
  );
}

export default function ContractManager() {
  const contracts = useQuery(api.contracts.getAll);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = (contracts ?? []).filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.creator_name?.toLowerCase().includes(q) ||
        c.host_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = (contracts ?? []).filter(c => c.status === 'active').length;
  const signedCount = (contracts ?? []).filter(c => c.creator_signed && c.host_signed).length;
  const paidCount   = (contracts ?? []).filter(c => c.paid === true).length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 960 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Contract Management
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        View and manage all contracts on the platform.
      </p>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',        value: contracts?.length ?? '…', color: INK },
          { label: 'Active',       value: activeCount,               color: '#166534' },
          { label: 'Fully Signed', value: signedCount,               color: '#0369A1' },
          { label: 'Paid',         value: paidCount,                 color: '#7E22CE' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 100 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
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
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creator or host…"
          style={{ flex: 1, minWidth: 200, padding: '0.4rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.82rem', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'inherit', color: INK, outline: 'none', background: '#fff' }}
        />
      </div>

      {/* ── Loading ── */}
      {contracts === undefined && (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          Loading…
        </div>
      )}

      {/* ── Empty ── */}
      {contracts !== undefined && filtered.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📄</p>
          <p style={{ color: SAGE, fontSize: '0.85rem', margin: 0 }}>
            {contracts.length === 0
              ? 'No contracts have been created on the platform yet.'
              : 'No contracts match your current filters.'}
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {contracts !== undefined && filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Creator', 'Host', 'Property', 'Status', 'Dates', 'Payment', 'Signatures', 'Created'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={String(c._id)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: INK }}>{c.creator_name || '—'}</td>
                  <td style={{ padding: '0.75rem', color: SLATE }}>{c.host_name || '—'}</td>
                  <td style={{ padding: '0.75rem', color: SLATE, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.property_name || c.location || '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '0.75rem', color: SLATE, whiteSpace: 'nowrap' }}>{c.dates || '—'}</td>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                    {c.paid
                      ? <span style={{ color: '#166534', fontWeight: 600 }}>Paid{c.payment_amount ? ` $${c.payment_amount}` : ''}</span>
                      : <span style={{ color: SLATE }}>{c.payment || '—'}</span>}
                  </td>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: c.creator_signed ? '#166534' : SAGE, marginRight: '0.5rem', fontSize: '0.8rem' }}>
                      {c.creator_signed ? '✓' : '○'} Creator
                    </span>
                    <span style={{ color: c.host_signed ? '#166534' : SAGE, fontSize: '0.8rem' }}>
                      {c.host_signed ? '✓' : '○'} Host
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: SAGE, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {fmtDate(c._creationTime)}
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
