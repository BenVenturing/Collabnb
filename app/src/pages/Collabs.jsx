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

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-stone/30 flex flex-col cursor-pointer transition-shadow hover:shadow-md relative" onClick={() => onClick?.(collab)}>
      {canDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
          style={{
            position: 'absolute', top: '6px', right: '6px', zIndex: 5,
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.22)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '0.65rem',
            transition: 'opacity 150ms, background 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,60,60,0.7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.22)'; }}
          title={collab.is_demo ? 'Dismiss demo' : 'Remove sample'}
        >
          <XIcon />
        </button>
      )}
      <div className="flex relative">
        {/* Details (no photo) */}
        <div className="flex-1 p-3">
          {collab.is_demo && (
            <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8922A', marginBottom: '0.15rem', display: 'block' }}>Demo Tour</span>
          )}
          <p className="font-display font-bold text-ink text-sm leading-tight pr-2 line-clamp-1">{collab.property_name}</p>
          <p className="text-slate text-xs mt-1 flex items-center gap-1">
            <span>📍</span>{collab.location}
          </p>
          <p className="text-slate text-xs flex items-center gap-1">
            <span>👤</span>Host: {collab.host_name}
          </p>
          <p className="text-slate text-xs flex items-center gap-1">
            <span>📅</span>{collab.dates}
          </p>
        </div>
      </div>
      {/* Status row */}
      <div className="px-3 py-2.5 border-t border-stone/30 flex items-center justify-between">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.25rem 0.65rem', borderRadius: '9999px',
          background: style.bg, color: style.text,
          fontSize: '0.74rem', fontWeight: 600,
        }}>
          <span style={{ fontSize: '0.6rem' }}>{style.icon}</span> {collab.status_text}
        </span>
        <svg viewBox="0 0 256 256" fill="none" stroke="#959D90" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="96 48 176 128 96 208"/>
        </svg>
      </div>
      {/* Deliverables + due */}
      <div className="px-3 pb-3 flex justify-between">
        <div>
          <p className="text-sage text-[10px] uppercase tracking-wider mb-0.5">Deliverables</p>
          <p className="text-ink text-sm font-semibold">{collab.deliverables}</p>
        </div>
        {collab.days_left && (
          <div className="text-right">
            <p className="text-sage text-[10px] uppercase tracking-wider mb-0.5">Due in</p>
            <p className="text-slate text-sm font-semibold">{collab.days_left} days</p>
          </div>
        )}
        {collab.payment && (
          <div className="text-right">
            <p className="text-sage text-[10px] uppercase tracking-wider mb-0.5">Payment</p>
            <p className="text-slate text-sm font-semibold">{collab.payment}</p>
          </div>
        )}
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
    <div className="min-h-dvh">

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
        <CollabDetail collab={selectedCollab} onClose={() => setSelectedCollab(null)} />
      )}
    </div>
  );
}
