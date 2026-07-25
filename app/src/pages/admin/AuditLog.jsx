import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function prettyAction(a) {
  return (a || '').replace(/_/g, ' ');
}

export default function AuditLog() {
  const logs = useQuery(api.admin.getAuditLog);
  const profiles = useQuery(api.profiles.getAll);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Resolve target_id → name so rows show who was acted on and search can match names.
  const nameById = {};
  (profiles || []).forEach(p => { nameById[String(p._id)] = p.full_name; });

  const actions = ['all', ...Array.from(new Set((logs || []).map(l => l.action).filter(Boolean)))];

  const rows = (logs || []).filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = nameById[String(log.target_id)] || '';
      return (
        (log.action || '').toLowerCase().includes(q) ||
        (log.target_type || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.target_id || '').toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Audit Log
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Track all admin actions taken on the platform.
      </p>

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {actions.map(a => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: actionFilter === a ? 700 : 400,
                background: actionFilter === a ? INK : '#fff',
                color: actionFilter === a ? '#fff' : SLATE,
                border: `1px solid ${actionFilter === a ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {a === 'all' ? 'All actions' : prettyAction(a)}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, action, or details…"
          style={{ flex: 1, minWidth: 200, padding: '0.4rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.82rem', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'inherit', color: INK, outline: 'none', background: '#fff' }}
        />
      </div>

      {logs === undefined ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: SAGE, fontSize: '0.85rem' }}>
            {logs.length === 0
              ? 'No actions logged yet. Every time you approve or reject a user, grant access, or change settings, a record appears here.'
              : 'No log entries match your search.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Action', 'Target', 'Details', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((log, i) => {
                const name = nameById[String(log.target_id)];
                return (
                  <tr key={String(log._id)} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem', color: INK, fontWeight: 500, textTransform: 'capitalize' }}>{prettyAction(log.action)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: SLATE }}>
                      <span style={{ fontSize: '0.7rem', background: BONE, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{log.target_type}</span>
                      {name
                        ? <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: INK, fontWeight: 500 }}>{name}</span>
                        : <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: SAGE }}>{log.target_id?.slice(0, 12)}…</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: SLATE, fontSize: '0.78rem' }}>{log.details || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: SAGE, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
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
