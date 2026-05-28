import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';
const MINT  = '#D1EBDB';

function Badge({ color, bg, children }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color, display: 'inline-block', lineHeight: 1.6 }}>
      {children}
    </span>
  );
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROLE_FILTERS = ['all', 'creator', 'host'];

export default function FounderTracker() {
  const founders = useQuery(api.admin.getFounders);
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort]             = useState('newest');

  if (founders === undefined) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  const filtered = founders
    .filter((f) => roleFilter === 'all' || f.role === roleFilter)
    .sort((a, b) => {
      if (sort === 'newest')    return b._creationTime - a._creationTime;
      if (sort === 'oldest')    return a._creationTime - b._creationTime;
      if (sort === 'collabs')   return b.collabCount - a.collabCount;
      return 0;
    });

  const creatorCount  = founders.filter((f) => f.role === 'creator').length;
  const hostCount     = founders.filter((f) => f.role === 'host').length;
  const goneLiveCount = founders.filter((f) => f.goneLive).length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Founder Tracker
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        All users with Founder status — early supporters of Collabnb.
      </p>

      {/* ── Summary pills ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Founders', value: founders.length, bg: MINT, color: '#166534' },
          { label: 'Creators',       value: creatorCount,    bg: '#E0F2FE', color: '#0369A1' },
          { label: 'Hosts',          value: hostCount,       bg: '#FEF3C7', color: '#92400E' },
          { label: 'Gone Live',      value: goneLiveCount,   bg: '#F3E8FF', color: '#7E22CE' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 120 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem',
                fontSize: '0.78rem', fontWeight: roleFilter === r ? 700 : 400,
                background: roleFilter === r ? INK : '#fff',
                color: roleFilter === r ? '#fff' : SLATE,
                border: `1px solid ${roleFilter === r ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ marginLeft: 'auto', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.78rem', border: '1px solid rgba(25,37,36,0.12)', background: '#fff', color: SLATE, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="collabs">Most collabs</option>
        </select>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.75rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          No founders found.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Founder', 'Role', 'Location', 'Joined', 'Collabs', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr
                  key={f._id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Name + handle */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: INK }}>{f.full_name}</div>
                    <div style={{ color: SAGE, fontSize: '0.75rem' }}>@{f.username}</div>
                    <div style={{ color: SAGE, fontSize: '0.72rem', marginTop: '0.1rem' }}>{f.email}</div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {f.role === 'creator'
                      ? <Badge bg="#E0F2FE" color="#0369A1">Creator</Badge>
                      : <Badge bg="#FEF3C7" color="#92400E">Host</Badge>
                    }
                    {!f.is_verified && <div style={{ marginTop: '0.25rem' }}><Badge bg="#FEE2E2" color="#991B1B">Unverified</Badge></div>}
                  </td>

                  {/* Location */}
                  <td style={{ padding: '0.875rem 1rem', color: SLATE }}>
                    {[f.city, f.region].filter(Boolean).join(', ') || <span style={{ color: SAGE }}>—</span>}
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '0.875rem 1rem', color: SLATE, whiteSpace: 'nowrap' }}>
                    {fmtDate(f._creationTime)}
                  </td>

                  {/* Collabs */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, color: f.collabCount > 0 ? '#166534' : SAGE, fontSize: '1rem' }}>{f.collabCount}</span>
                    {f.completedCount > 0 && <span style={{ color: SAGE, fontSize: '0.72rem', marginLeft: '0.3rem' }}>({f.completedCount} done)</span>}
                  </td>

                  {/* Gone live status */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {f.goneLive
                      ? <Badge bg={MINT} color="#166534">🟢 Gone Live</Badge>
                      : <Badge bg={BONE} color={SAGE}>Not yet</Badge>
                    }
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
