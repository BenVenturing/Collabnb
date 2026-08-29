import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';
import { useCollabs } from '../contexts/CollabContext';
import { DEMO_COLLAB } from '../lib/mockData';
import CollabDetail from '../components/CollabDetail';
import ProposalsOverview from '../components/dashboard/ProposalsOverview';
import { bucketByMonth, toMonthSeries, isoDate } from '../lib/monthSeries';
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

function CollabCard({ collab, onClick, onDismissDemo, onDismissSample, onOpenContract }) {
  const { t } = useTranslation('collabs');
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
          }}>{t('demoBadge')}</span>
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
            title={collab.is_demo ? t('dismissDemo') : t('dismissSample')}
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
            <span style={{ color: 'var(--sage)' }}>{t('hostLabel')}</span> {collab.host_name}
          </p>
        )}

        {/* Status + due badge + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.3rem 0.75rem', borderRadius: '9999px',
              background: style.bg, color: style.text,
              fontSize: '0.74rem', fontWeight: 600,
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{ fontSize: '0.6rem' }}>{style.icon}</span> {collab.status_text}
            </span>
            {collab.days_left != null && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.3rem 0.65rem', borderRadius: '9999px',
                background: 'rgba(212,168,67,0.14)', color: '#8a6d1f',
                fontSize: '0.68rem', fontWeight: 600,
              }}>
                <Clock size={11} /> {t('daysCount', { count: collab.days_left })}
              </span>
            )}
          </div>
          <svg viewBox="0 0 16 16" fill="none" stroke="var(--stone)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <polyline points="6 3 11 8 6 13"/>
          </svg>
        </div>

        {/* Deliverables + payout — always both, per collab */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.2rem' }}>{t('deliverablesLabel')}</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)' }}>{collab.deliverables}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '0.2rem' }}>{t('payoutLabel')}</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate)' }}>{collab.payment || t('complimentary')}</p>
          </div>
        </div>

        {/* Quick access to the linked contract, always reachable from the card */}
        {collab.contract_id && (
          <div style={{ marginTop: '0.75rem' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenContract?.(collab.contract_id); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.7rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer',
                padding: '0.35rem 0.7rem', borderRadius: '9999px', background: 'rgba(25,37,36,0.04)',
                border: 'none', fontFamily: 'var(--font-body)',
              }}
            >
              <FileText size={12} /> {t('contractLabel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Collabs() {
  const { t } = useTranslation('collabs');
  const navigate = useNavigate();
  const { collabs, contracts } = useCollabs();
  const [filter, setFilter] = useState('active');
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [listingFilter, setListingFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');

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

  const statusText = {
    pending: t('status.pendingReview'),
    approved: t('status.approved'),
    declined: t('status.declined'),
    under_review: t('status.underReview'),
    completed: t('status.completed'),
    in_progress: t('status.inProgress'),
    application_sent: t('status.applicationSent'),
  };

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
          ? statusText[pitchStatusMap[String(c.listing_id)]] || statusText.in_progress
          : c.status_text || statusText.application_sent,
        dates: c.dates || '',
        deliverables: c.deliverables || '',
        days_left: c.days_left,
        payment: c.payment,
        is_active: c.is_active ?? true,
        current_stage: c.current_stage || 'pending',
        stages: typeof c.stages === 'string' ? JSON.parse(c.stages) : (c.stages || {}),
      }));

    // Reconcile local collabs against their real Convex record where one exists —
    // current_stage/stages must come from the server (the host's proposal board
    // writes stage advances straight to Convex), otherwise a stale local cache
    // entry can show progress (e.g. "Closed") the collab never actually reached.
    const convexByListingId = new Map((convexCollabs || []).map((c) => [String(c.listing_id), c]));
    const merged = base.map((c) => {
      const real = convexByListingId.get(String(c.listing_id));
      const realStatus = pitchStatusMap[String(c.listing_id)];
      let next = c;
      if (real) {
        next = {
          ...next,
          convex_id: next.convex_id || String(real._id),
          current_stage: real.current_stage || next.current_stage,
          stages: typeof real.stages === 'string' ? JSON.parse(real.stages) : (real.stages || next.stages),
          is_active: real.is_active ?? next.is_active,
        };
      }
      if (realStatus && realStatus !== next.status) {
        next = { ...next, status: realStatus, status_text: statusText[realStatus] || next.status_text };
      }
      return next;
    });

    const withReal = [...realCollabs, ...merged];

    if (demoDismissed) return withReal;
    const hasDemo = withReal.some((c) => c.is_demo);
    return hasDemo ? withReal : [...withReal, DEMO_COLLAB];
  }, [collabs, convexCollabs, pitchStatusMap, demoDismissed, dismissedSamples]);

  // Deep-link from notifications: /collabs?open=<listing_id> auto-opens that collab
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;
    const match = allCollabs.find((c) => String(c.listing_id) === openId || String(c.id) === openId);
    if (match) {
      setSelectedCollab(match);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, allCollabs, setSearchParams]);

  const active   = allCollabs.filter((c) =>  c.is_active);
  const archived = allCollabs.filter((c) => !c.is_active);
  const baseList = filter === 'active' ? active : archived;

  // Status filter for active collabs
  const stageFiltered = filter === 'active' && statusFilter !== 'all'
    ? baseList.filter((c) => c.current_stage === statusFilter || c.status === statusFilter)
    : baseList;

  const listingOptions = useMemo(() => {
    const names = new Set(allCollabs.map((c) => c.property_name).filter(Boolean));
    return ['all', ...Array.from(names)];
  }, [allCollabs]);

  // Soonest-due collabs surface first; collabs with no due date sink to the bottom.
  const shown = stageFiltered
    .filter((c) => listingFilter === 'all' || c.property_name === listingFilter)
    .filter((c) => {
      if (dueFilter === 'all') return true;
      if (dueFilter === 'none') return !c.days_left;
      if (!c.days_left) return false;
      if (dueFilter === 'week') return c.days_left <= 7;
      if (dueFilter === 'month') return c.days_left <= 30;
      return true;
    })
    .filter((c) => !search.trim() || c.property_name?.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (a.days_left == null && b.days_left == null) return 0;
      if (a.days_left == null) return 1;
      if (b.days_left == null) return -1;
      return a.days_left - b.days_left;
    });

  // Real dashboard data — replaces ProposalsOverview's mock defaults wherever
  // we have a clean, honest mapping onto existing Convex records.
  const realActive = useMemo(() => active.filter((c) => !c.is_demo && !c.is_sample), [active]);

  const statValues = useMemo(() => {
    const uniqueListings = new Set(realActive.map((c) => c.property_name).filter(Boolean));
    const realPendingCount = (convexPitches || []).filter((p) => p.status === 'pending').length;
    const paidContracts = (contracts || []).filter((c) => c.paid);
    const totalEarned = paidContracts.reduce((sum, c) => sum + (c.payment_amount ?? c.cash_value ?? 0), 0);
    const dueCollabs = realActive.filter((c) => c.days_left != null && !['uploaded_tagged', 'closed', 'archived'].includes(c.current_stage));
    const minDue = dueCollabs.length ? Math.min(...dueCollabs.map((c) => c.days_left)) : null;

    return {
      active:  { value: String(realActive.length), sub: `Across ${uniqueListings.size} listing${uniqueListings.size === 1 ? '' : 's'}` },
      pending: { value: String(realPendingCount), sub: 'Awaiting host reply' },
      earned:  { value: `$${totalEarned.toLocaleString()}`, sub: `${paidContracts.length} contract${paidContracts.length === 1 ? '' : 's'} paid` },
      due:     { value: String(dueCollabs.length), sub: minDue !== null ? `Next due in ${minDue} day${minDue === 1 ? '' : 's'}` : 'Nothing due' },
    };
  }, [realActive, convexPitches, contracts]);

  const chartData = useMemo(() => {
    const year = new Date().getFullYear();
    const volume = bucketByMonth(convexPitches || [], (p) => new Date(p.created_at ?? p._creationTime), () => 1, year);
    const money = bucketByMonth(
      (contracts || []).filter((c) => c.paid),
      (c) => new Date(c.created_at),
      (c) => c.payment_amount ?? c.cash_value ?? 0,
      year
    );
    return { money: toMonthSeries(money), volume: toMonthSeries(volume) };
  }, [convexPitches, contracts]);

  const todoItems = useMemo(() => {
    const items = [];
    realActive.forEach((c) => {
      if (c.days_left != null && !['uploaded_tagged', 'closed', 'archived'].includes(c.current_stage)) {
        const d = new Date();
        d.setDate(d.getDate() + c.days_left);
        items.push({ type: 'deadline', title: `Upload content — ${c.property_name}`, date: isoDate(d) });
      }
    });
    (convexPitches || []).forEach((p) => {
      if (p.counter_pending === 'creator') {
        items.push({ type: 'pending_action', title: `Respond to counter-pitch — ${p.listing_title || 'listing'}`, date: isoDate(new Date(p.created_at ?? Date.now())) });
      }
    });
    return items;
  }, [realActive, convexPitches]);

  const handleStatClick = (presetKey) => {
    switch (presetKey) {
      case 'active':               setFilter('active'); setStatusFilter('all'); break;
      case 'pending_applications': setFilter('active'); setStatusFilter('pending'); break;
      case 'earned':                setFilter('active'); setStatusFilter('closed'); break;
      case 'content_due':          setFilter('active'); setStatusFilter('pending'); break;
      default: break;
    }
  };

  return (
    <div>

      {/* CRM-style overview: stats, chart, calendar, upcoming, search/filter, activity list */}
      <ProposalsOverview
        role="creator"
        search={search}
        onSearchChange={setSearch}
        onStatClick={handleStatClick}
        statValues={statValues}
        chartData={chartData}
        todoItems={todoItems}
        filters={[
          {
            key: 'status', value: statusFilter, onChange: setStatusFilter,
            options: [
              { value: 'all', label: t('filters.allStatuses') },
              { value: 'pending', label: t('filters.pending') },
              { value: 'uploaded_tagged', label: t('filters.uploaded') },
              { value: 'closed', label: t('filters.closed') },
            ],
          },
          {
            key: 'listing', value: listingFilter, onChange: setListingFilter,
            options: listingOptions.map((name) => ({ value: name, label: name === 'all' ? t('filters.allListings') : name })),
          },
          {
            key: 'due', value: dueFilter, onChange: setDueFilter,
            options: [
              { value: 'all', label: t('filters.anyDueDate') },
              { value: 'week', label: t('filters.dueThisWeek') },
              { value: 'month', label: t('filters.dueThisMonth') },
              { value: 'none', label: t('filters.noDeadline') },
            ],
          },
        ]}
        archiveToggle={{ value: filter === 'archived', onChange: (v) => setFilter(v ? 'archived' : 'active') }}
      >
        <div className="w-full max-w-2xl mx-auto space-y-4">
          {shown.length === 0 ? (
            <div className="text-center pt-16">
              <p className="text-4xl mb-4">✦</p>
              <h3 className="font-display font-bold text-ink text-lg mb-2">
                {baseList.length === 0 ? t('emptyTitleNoCollabs') : t('emptyTitleNoMatches')}
              </h3>
              <p className="text-sage text-sm mb-6">
                {baseList.length === 0 ? t('emptyBodyStart') : t('emptyBodyAdjust')}
              </p>
              {baseList.length === 0 && (
                <button
                  onClick={() => navigate('/explore')}
                  className="btn-ink"
                >
                  {t('discoverStays')}
                </button>
              )}
            </div>
          ) : (
            shown.map((c) => (
              <CollabCard
                key={c.id}
                collab={c}
                onClick={setSelectedCollab}
                onDismissDemo={dismissDemo}
                onDismissSample={() => dismissSample(c.id)}
                onOpenContract={(contractId) => navigate(`/contract?open=${contractId}`)}
              />
            ))
          )}
        </div>
      </ProposalsOverview>

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
                toast.innerHTML = t('demoToast');
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
