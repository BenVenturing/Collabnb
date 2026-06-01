import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MINT  = '#D1EBDB';
const BONE  = '#F7F5F2';
const CARD  = { background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1.25rem 1.5rem' };

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PFmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

const PROPERTY_TYPES = ['all', 'Boutique Hotel', 'BnB', 'Glamping', 'Small Resort', 'Experience'];
const STATUS_FILTERS = ['all', 'published', 'draft'];

export default function ListingManager() {
  const listings = useQuery(api.admin.getAdminListings);
  const toggleFeatured = useMutation(api.admin.toggleFeatured);
  const [propFilter, setPropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  const filtered = (listings ?? []).filter((l) => {
    if (propFilter !== 'all' && l.property_type !== propFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.title?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.host_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleToggleFeatured(listingId, current) {
    setToggling(listingId);
    await toggleFeatured({ listingId, featured: !current });
    setToggling(null);
  }

  const publishedCount = (listings ?? []).filter((l) => l.status === 'published').length;
  const draftCount = (listings ?? []).filter((l) => l.status === 'draft').length;
  const featuredCount = (listings ?? []).filter((l) => l.is_featured).length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 960 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Listing Management
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Browse and manage all property listings on the platform.
      </p>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Listings', value: listings?.length ?? '…', color: INK },
          { label: 'Published',      value: publishedCount,          color: '#166534' },
          { label: 'Drafts',         value: draftCount,              color: '#92400E' },
          { label: 'Featured',       value: featuredCount,           color: '#7E22CE' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 100 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Property type filter */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setPropFilter(t)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: propFilter === t ? 700 : 400,
                background: propFilter === t ? INK : '#fff',
                color: propFilter === t ? '#fff' : SLATE,
                border: `1px solid ${propFilter === t ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: statusFilter === s ? 700 : 400,
                background: statusFilter === s ? (s === 'draft' ? '#92400E' : s === 'published' ? '#166534' : INK) : '#fff',
                color: statusFilter === s ? '#fff' : SLATE,
                border: `1px solid ${statusFilter === s ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, location, host…"
          style={{ flex: 1, minWidth: 180, padding: '0.4rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.82rem', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'inherit', color: INK, outline: 'none', background: '#fff' }}
        />
      </div>

      {/* ── Table ── */}
      {listings === undefined ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.75rem' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.75rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          No listings match your filters.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Listing', 'Host', 'Type', 'Location', 'Comp', 'Collabs', 'Status', 'Featured', ''].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr
                  key={String(l._id)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Listing */}
                  <td style={{ padding: '0.75rem', minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {l.image && (
                        <img src={l.image} alt="" style={{ width: 36, height: 36, borderRadius: '0.375rem', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: INK, fontSize: '0.82rem' }}>{l.title}</div>
                        <div style={{ color: SAGE, fontSize: '0.72rem' }}>{l.subtitle || ''}</div>
                      </div>
                    </div>
                  </td>

                  {/* Host */}
                  <td style={{ padding: '0.75rem', color: SLATE, fontSize: '0.78rem' }}>
                    {l.host_name || '—'}
                  </td>

                  {/* Type */}
                  <td style={{ padding: '0.75rem', color: SLATE, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {l.property_type || '—'}
                  </td>

                  {/* Location */}
                  <td style={{ padding: '0.75rem', color: SLATE, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {l.location_city || l.location || '—'}
                  </td>

                  {/* Comp */}
                  <td style={{ padding: '0.75rem', color: SLATE, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {l.compensation_type === 'cash' && l.cash_amount ? PFmt(l.cash_amount) : l.compensation_type || '—'}
                  </td>

                  {/* Collabs */}
                  <td style={{ padding: '0.75rem', color: SLATE, textAlign: 'center' }}>
                    {l.collaboratorCount || 0}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99,
                      background: l.status === 'published' ? '#DCFCE7' : '#FEF3C7',
                      color: l.status === 'published' ? '#166534' : '#92400E',
                      textTransform: 'capitalize',
                    }}>
                      {l.status}
                    </span>
                  </td>

                  {/* Featured */}
                  <td style={{ padding: '0.75rem' }}>
                    {l.is_featured
                      ? <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#F3E8FF', color: '#7E22CE', padding: '0.1rem 0.45rem', borderRadius: 99 }}>⭐ Featured</span>
                      : <span style={{ fontSize: '0.65rem', color: SAGE }}>—</span>
                    }
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => handleToggleFeatured(l._id, l.is_featured)}
                      disabled={toggling === l._id}
                      style={{
                        fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.35rem',
                        background: l.is_featured ? '#FEF2F2' : '#F7F5F2',
                        color: l.is_featured ? '#991B1B' : SLATE,
                        border: '1px solid rgba(25,37,36,0.1)',
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        opacity: toggling === l._id ? 0.5 : 1,
                      }}
                    >
                      {l.is_featured ? 'Unfeature' : 'Feature'}
                    </button>
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
