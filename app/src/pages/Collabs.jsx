import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollabs } from '../contexts/CollabContext';
import { DEMO_COLLAB } from '../lib/mockData';
import CollabDetail from '../components/CollabDetail';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

const XIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
    <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
  </svg>
);

const STATUS_STYLES = {
  pending:  { bg: 'rgba(25,37,36,0.08)',  text: '#192524', icon: '◉' },
  accepted: { bg: 'rgba(149,157,144,0.15)', text: '#3C5759', icon: '◎' },
  uploaded: { bg: 'rgba(209,235,221,0.4)', text: '#3C5759', icon: '◉' },
  approved: { bg: 'rgba(74,155,127,0.15)', text: '#4A9B7F', icon: '✓' },
  closed:   { bg: 'rgba(74,155,127,0.15)', text: '#4A9B7F', icon: '✓' },
  archived: { bg: 'rgba(208,213,206,0.3)', text: '#959D90', icon: '◻' },
  demo:     { bg: 'rgba(212,168,67,0.12)', text: '#B8922A', icon: '▶' },
};

function CollabCard({ collab, onClick, onDismissDemo, onDismissSample }) {
  const style = STATUS_STYLES[collab.status] || STATUS_STYLES.pending;
  const canDismiss = collab.is_demo || collab.is_sample;
  const onDismiss = collab.is_demo ? onDismissDemo : onDismissSample;
  const hasImage = !!collab.image;

  return (
    <div
      onClick={() => onClick?.(collab)}
      style={{
        borderRadius: '1.375rem',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(25,37,36,0.04), 0 20px 40px -15px rgba(25,37,36,0.10)',
        transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(25,37,36,0.14), inset 0 1px 0 rgba(255,255,255,0.6)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(25,37,36,0.04), 0 20px 40px -15px rgba(25,37,36,0.10)'; }}
    >
      {/* ── Hero image ─────────────────────────────────────────────────────── */}
      <div style={{ height: 172, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #EFECE9 0%, #D1EBDB 100%)' }}>
        {hasImage && (
          <img
            src={collab.image}
            alt={collab.property_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        {/* Bottom gradient for text legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,30,28,0.68) 0%, rgba(20,30,28,0.18) 55%, transparent 100%)' }} />

        {/* Demo badge */}
        {collab.is_demo && (
          <span style={{
            position: 'absolute', top: '0.625rem', left: '0.75rem',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#fff', background: 'rgba(184,146,42,0.88)',
            padding: '0.2rem 0.55rem', borderRadius: '9999px',
            backdropFilter: 'blur(8px)',
          }}>Demo Tour</span>
        )}

        {/* Dismiss button */}
        {canDismiss && (
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
            style={{
              position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 5,
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.28)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', backdropFilter: 'blur(8px)',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,60,60,0.75)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.28)'; }}
            title={collab.is_demo ? 'Dismiss demo' : 'Remove sample'}
          >
            <XIcon />
          </button>
        )}

        {/* Property name + meta overlaid on image */}
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.875rem', right: '0.875rem' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1rem', color: '#fff', lineHeight: 1.25,
            textShadow: '0 1px 6px rgba(0,0,0,0.35)', marginBottom: '0.2rem',
          }}>{collab.property_name}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {collab.location && (
              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.88)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 10, height: 10, opacity: 0.8 }}><path d="M8 0C5.24 0 3 2.24 3 5c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
                {collab.location}
              </span>
            )}
            {collab.dates && (
              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.88)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10, opacity: 0.8 }}><rect x="1" y="2" width="14" height="13" rx="2"/><line x1="1" y1="6" x2="15" y2="6"/><line x1="5" y1="0" x2="5" y2="4"/><line x1="11" y1="0" x2="11" y2="4"/></svg>
                {collab.dates}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Glass info panel ───────────────────────────────────────────────── */}
      <div style={{ padding: '0.875rem 1rem' }}>

        {/* Host row */}
        {collab.host_name && (
          <p style={{ fontSize: '0.78rem', color: 'var(--slate)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 12, height: 12, color: 'var(--sage)', flexShrink: 0 }}>
              <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/>
            </svg>
            <span style={{ color: 'var(--sage)' }}>Host:</span> {collab.host_name}
          </p>
        )}

        {/* Status + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.3rem 0.75rem', borderRadius: '9999px',
            background: style.bg, color: style.text,
            fontSize: '0.74rem', fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: '0.6rem' }}>{style.icon}</span> {collab.status_text}
          </span>
          <svg viewBox="0 0 16 16" fill="none" stroke="var(--stone)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <polyline points="6 3 11 8 6 13"/>
          </svg>
        </div>

        {/* Deliverables + due/payment */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.2rem' }}>Deliverables</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)' }}>{collab.deliverables}</p>
          </div>
          {collab.days_left && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.2rem' }}>Due in</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate)' }}>{collab.days_left} days</p>
            </div>
          )}
          {collab.payment && !collab.days_left && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.2rem' }}>Payment</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate)' }}>{collab.payment}</p>
            </div>
          )}
          {!collab.days_left && !collab.payment && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.2rem' }}>Stay</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate)' }}>Complimentary</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Collabs() {
  const navigate = useNavigate();
  const { collabs } = useCollabs();
  const [filter, setFilter] = useState('active');
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { profile } = useAuth();
  const creatorId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : null);
  const convexPitches = useQuery(api.pitches.getByCreator, creatorId ? { creatorId } : 'skip');
  const convexCollabs = useQuery(api.collaborations.getByCreator, creatorId ? { creatorId } : 'skip');

  // Inject demo collab into the list
  const [demoDismissed, setDemoDismissed] = useState(() => {
    return localStorage.getItem('collabnb_demo_dismissed') === 'true';
  });

  // Track dismissed sample collab IDs
  const [dismissedSamples, setDismissedSamples] = useState(() => {
    try { return JSON.parse(localStorage.getItem('collabnb_dismissed_samples') || '[]'); }
    catch { return []; }
  });

  const dismissDemo = () => {
    setDemoDismissed(true);
    localStorage.setItem('collabnb_demo_dismissed', 'true');
  };

  const dismissSample = (collabId) => {
    const updated = [...dismissedSamples, collabId];
    setDismissedSamples(updated);
    try { localStorage.setItem('collabnb_dismissed_samples', JSON.stringify(updated)); } catch {}
  };

  // Map listing_id → latest pitch status from Convex
  const pitchStatusMap = useMemo(() => {
    const map = {};
    (convexPitches || []).forEach((p) => { map[String(p.listing_id)] = p.status; });
    return map;
  }, [convexPitches]);

  const allCollabs = useMemo(() => {
    const base = collabs.filter((c) => !c.is_sample || !dismissedSamples.includes(c.id));

    // Merge real Convex collabs (for cross-device persistence): add any not already in local state
    const localListingIds = new Set(base.map((c) => String(c.listing_id)));
    const realCollabs = (convexCollabs || [])
      .filter((c) => !localListingIds.has(String(c.listing_id)))
      .map((c) => ({
        id: String(c._id),
        listing_id: String(c.listing_id),
        property_name: c.property_name || 'Collab',
        location: c.location || '',
        host_name: c.host_name || '',
        image: c.image || '',
        status: pitchStatusMap[String(c.listing_id)] || c.status || 'pending',
        status_text: pitchStatusMap[String(c.listing_id)]
          ? { pending: 'Pending Review', approved: 'Approved!', declined: 'Declined' }[pitchStatusMap[String(c.listing_id)]] || 'In Progress'
          : c.status_text || 'Application Sent',
        dates: c.dates || '',
        deliverables: c.deliverables || '',
        days_left: c.days_left,
        payment: c.payment,
        is_active: c.is_active ?? true,
        current_stage: c.current_stage || 'pending',
        stages: typeof c.stages === 'string' ? JSON.parse(c.stages) : (c.stages || {}),
      }));

    // Override status for local collabs where we have a real Convex pitch status
    const merged = base.map((c) => {
      const realStatus = pitchStatusMap[String(c.listing_id)];
      if (!realStatus || realStatus === c.status) return c;
      const statusTextMap = { pending: 'Pending Review', approved: 'Approved!', declined: 'Declined', under_review: 'Under Review', completed: 'Completed' };
      return { ...c, status: realStatus, status_text: statusTextMap[realStatus] || c.status_text };
    });

    const withReal = [...realCollabs, ...merged];

    if (demoDismissed) return withReal;
    const hasDemo = withReal.some((c) => c.is_demo);
    return hasDemo ? withReal : [...withReal, DEMO_COLLAB];
  }, [collabs, convexCollabs, pitchStatusMap, demoDismissed, dismissedSamples]);

  const active   = allCollabs.filter((c) =>  c.is_active);
  const archived = allCollabs.filter((c) => !c.is_active);
  const baseList = filter === 'active' ? active : archived;

  // Status filter for active collabs
  const shown = filter === 'active' && statusFilter !== 'all'
    ? baseList.filter((c) => c.current_stage === statusFilter || c.status === statusFilter)
    : baseList;

  return (
    <div>

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md border-b border-stone/50 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="font-display font-bold text-ink text-2xl mb-3">Collaborations</h1>
        {/* Active / Archived toggle */}
        <div className="flex bg-bone rounded-xl p-1 gap-1 max-w-xs mb-3">
          {['active', 'archived'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                filter === f ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Status filter chips (active only) */}
        {filter === 'active' && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { key: 'all',      label: 'All' },
              { key: 'pending',  label: 'Pending' },
              { key: 'uploaded_tagged', label: 'Uploaded' },
              { key: 'closed',   label: 'Closed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.7rem', borderRadius: '9999px',
                  fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap',
                  background: statusFilter === key ? 'var(--ink)' : 'rgba(255,255,255,0.65)',
                  color: statusFilter === key ? 'var(--bone)' : 'var(--slate)',
                  border: statusFilter === key ? 'none' : '1px solid rgba(25,37,36,0.08)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 150ms',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {shown.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-4xl mb-4">✦</p>
            <h3 className="font-display font-bold text-ink text-lg mb-2">No collabs yet</h3>
            <p className="text-sage text-sm mb-6">Apply to a stay to get started</p>
            <button
              onClick={() => navigate('/explore')}
              className="btn-ink"
            >
              Discover Stays
            </button>
          </div>
        ) : (
          shown.map((c) => (
            <CollabCard
              key={c.id}
              collab={c}
              onClick={setSelectedCollab}
              onDismissDemo={dismissDemo}
              onDismissSample={() => dismissSample(c.id)}
            />
          ))
        )}
      </div>

      {selectedCollab && (
        <CollabDetail
          collab={selectedCollab}
          onClose={() => {
            setSelectedCollab(null);
            // Show dismiss toast for demo tour
            if (selectedCollab.is_demo) {
              (async () => {
                // Wait a tick then show the notification
                await new Promise(r => setTimeout(r, 100));
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(25,37,36,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#EFECE9;padding:0.75rem 1.5rem;border-radius:9999px;font-size:0.875rem;font-weight:600;font-family:var(--font-body);box-shadow:0 8px 24px rgba(25,37,36,0.25);display:flex;align-items:center;gap:0.5rem;animation:fadeUp 300ms cubic-bezier(0.16,1,0.3,1) forwards;max-width:calc(100vw - 2rem);';
                toast.innerHTML = 'Demo tour closed — find it again in <strong>Settings</strong> or the <strong>Help Center (? icon)</strong>';
                document.body.appendChild(toast);
                setTimeout(() => {
                  toast.style.transition = 'opacity 300ms, transform 300ms';
                  toast.style.opacity = '0';
                  toast.style.transform = 'translateX(-50%) translateY(12px)';
                  setTimeout(() => toast.remove(), 300);
                }, 5000);
              })();
            }
          }}
        />
      )}
    </div>
  );
}
