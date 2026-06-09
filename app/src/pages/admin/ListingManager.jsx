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
  const deleteListing = useMutation(api.listings.deleteListing);
  const [propFilter, setPropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { id, title }

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

  function handleDelete(listingId, title) {
    setConfirmModal({ id: listingId, title });
  }

  async function handleConfirmDelete() {
    const { id } = confirmModal;
    setConfirmModal(null);
    setDeleting(id);
    await deleteListing({ id });
    setDeleting(null);
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
                      ? <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(212,168,67,0.15)', color: '#92400E', padding: '0.15rem 0.55rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor"><path d="M8 1l1.85 3.75L14 5.5l-3 2.92.7 4.08L8 10.4l-3.7 2.1.7-4.08L2 5.5l4.15-.75z"/></svg>
                          Featured
                        </span>
                      : <span style={{ fontSize: '0.65rem', color: SAGE }}>—</span>
                    }
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                      <button
                        onClick={() => handleDelete(l._id, l.title)}
                        disabled={deleting === l._id}
                        style={{
                          fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.35rem',
                          background: '#FEF2F2', color: '#991B1B',
                          border: '1px solid rgba(153,27,27,0.15)',
                          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                          opacity: deleting === l._id ? 0.5 : 1,
                        }}
                      >
                        {deleting === l._id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Branded delete confirmation modal ── */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(25,37,36,0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '0 20px 60px rgba(25,37,36,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
              borderRadius: '1.25rem',
              padding: '2rem',
              width: 380,
              maxWidth: '100%',
              animation: 'fadeUp 160ms ease forwards',
            }}
          >
            <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {/* Icon */}
            <div style={{
              width: 44, height: 44, borderRadius: '0.875rem',
              background: 'rgba(200,104,104,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#C86868" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>

            <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1rem', color: INK, margin: '0 0 0.4rem' }}>
              Delete listing
            </p>
            <p style={{ fontSize: '0.82rem', color: SLATE, margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Delete <strong style={{ color: INK }}>"{confirmModal.title}"</strong>? This cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: '0.625rem',
                  background: 'rgba(25,37,36,0.06)',
                  border: '1px solid rgba(25,37,36,0.1)',
                  color: SLATE, fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 140ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.06)'}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: '0.625rem',
                  background: '#C86868',
                  border: '1px solid transparent',
                  color: '#fff', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 140ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
