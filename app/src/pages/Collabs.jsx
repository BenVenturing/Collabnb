import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, FileText, Pin, Archive, ArchiveRestore, StickyNote, ChevronDown } from 'lucide-react';
import { useCollabs } from '../contexts/CollabContext';
import { DEMO_COLLAB } from '../lib/mockData';
import { withServerCollab } from '../lib/collabStages';
import CollabDetail from '../components/CollabDetail';
import ProposalsOverview from '../components/dashboard/ProposalsOverview';
import { bucketByMonth, toMonthSeries, isoDate } from '../lib/monthSeries';
import { useQuery, useMutation } from 'convex/react';
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
  archived: { bg: 'rgba(208,213,206,0.3)', text: '#646B62', icon: '◻' },
  demo:     { bg: 'rgba(212,168,67,0.12)', text: '#B8922A', icon: '▶' },
};

const iconBtn = (active) => ({
  width: '28px', height: '28px', borderRadius: '50%', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
  background: active ? 'rgba(25,37,36,0.85)' : 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)',
});

function CollabCard({ collab, onClick, onDismissDemo, onDismissSample, onOpenContract, onStartContract, onPin, onArchive, onSaveNote }) {
  const { t } = useTranslation('collabs');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(collab.creator_note || '');
  const archivedForMe = !collab.is_active || collab.creator_archived;
  const canOrganise = !!collab.convex_id && !collab.is_demo && !collab.is_sample;
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

        {canOrganise && (
          <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 5, display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onPin?.(collab); }}
              style={iconBtn(collab.creator_pinned)}
              title={collab.creator_pinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin size={13} fill={collab.creator_pinned ? 'white' : 'none'} />
            </button>
            {collab.is_active && (
              <button
                onClick={(e) => { e.stopPropagation(); onArchive?.(collab); }}
                style={iconBtn(false)}
                title={collab.creator_archived ? 'Move back to active' : 'Archive'}
              >
                {collab.creator_archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              </button>
            )}
          </div>
        )}

        {archivedForMe && (
          <span style={{
            position: 'absolute', top: '0.625rem', left: '0.75rem',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#fff', background: 'rgba(25,37,36,0.6)', padding: '0.2rem 0.55rem', borderRadius: '9999px',
            backdropFilter: 'blur(8px)',
          }}>Archived</span>
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

        {canOrganise && (editingNote ? (
          <textarea
            autoFocus
            value={noteDraft}
            maxLength={500}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => { setEditingNote(false); if (noteDraft !== (collab.creator_note || '')) onSaveNote?.(collab, noteDraft); }}
            placeholder="Private note — only you can see this"
            rows={2}
            style={{
              width: '100%', marginBottom: '0.75rem', padding: '0.5rem 0.65rem', borderRadius: '0.7rem',
              border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.7)',
              fontSize: '0.8rem', fontFamily: 'var(--font-body)', color: 'var(--ink)', resize: 'none',
            }}
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setNoteDraft(collab.creator_note || ''); setEditingNote(true); }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.35rem', width: '100%', textAlign: 'left',
              marginBottom: '0.75rem', padding: 0, border: 'none', background: 'none', cursor: 'text',
              fontSize: '0.78rem', fontFamily: 'var(--font-body)',
              color: collab.creator_note ? 'var(--ink)' : 'var(--sage)',
            }}
          >
            <StickyNote size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--sage)' }} />
            {collab.creator_note || 'Add a private note'}
          </button>
        ))}

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

        {/* Quick access to the linked contract, always reachable from the card.
            With no contract yet, the chip says so rather than showing nothing —
            otherwise there's no way to tell an unsigned collab from a signed one. */}
        <div style={{ marginTop: '0.75rem' }}>
          {collab.contract_id ? (
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
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onStartContract?.(collab); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.7rem', fontWeight: 600, color: 'var(--sage)', cursor: 'pointer',
                padding: '0.35rem 0.7rem', borderRadius: '9999px', background: 'rgba(25,37,36,0.03)',
                border: '1px dashed rgba(25,37,36,0.14)', fontFamily: 'var(--font-body)',
              }}
            >
              <FileText size={12} /> {t('contractIncompleteLabel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Collabs() {
  const { t } = useTranslation('collabs');
  const navigate = useNavigate();
  const { collabs, contracts } = useCollabs();
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [sortBy, setSortBy] = useState('all');
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [listingFilter, setListingFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');

  const { profile } = useAuth();
  const creatorId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : null);
  const convexPitches = useQuery(api.pitches.getByCreator, creatorId ? { creatorId } : 'skip');
  const convexCollabs = useQuery(api.collaborations.getByCreator, creatorId ? { creatorId } : 'skip');
  const setCreatorCrm = useMutation(api.collaborations.setCreatorCrm);
  const crm = (c, patch) => setCreatorCrm({ id: c.convex_id, ...patch }).catch(() => {});

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
      .map((c) => withServerCollab({
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
      }, c, contracts));

    // Reconcile local collabs against their real Convex record where one exists —
    // current_stage/stages must come from the server (the host's proposal board
    // writes stage advances straight to Convex), otherwise a stale local cache
    // entry can show progress (e.g. "Closed") the collab never actually reached.
    const convexByListingId = new Map((convexCollabs || []).map((c) => [String(c.listing_id), c]));
    const merged = base.map((c) => {
      const real = convexByListingId.get(String(c.listing_id));
      const realStatus = pitchStatusMap[String(c.listing_id)];
      let next = c;
      if (real) next = withServerCollab(next, real, contracts);
      if (realStatus && realStatus !== next.status) {
        next = { ...next, status: realStatus, status_text: statusText[realStatus] || next.status_text };
      }
      return next;
    });

    const withReal = [...realCollabs, ...merged];

    if (demoDismissed) return withReal;
    const hasDemo = withReal.some((c) => c.is_demo);
    return hasDemo ? withReal : [...withReal, DEMO_COLLAB];
  }, [collabs, convexCollabs, contracts, pitchStatusMap, demoDismissed, dismissedSamples]);

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

  // creator_archived is the creator's own shelf; it doesn't end the collab for the host.
  const isArchived = (c) => !c.is_active || c.creator_archived;
  const active   = allCollabs.filter((c) => !isArchived(c));
  const archived = allCollabs.filter(isArchived);

  const listingOptions = useMemo(() => {
    const names = new Set(allCollabs.map((c) => c.property_name).filter(Boolean));
    return ['all', ...Array.from(names)];
  }, [allCollabs]);

  const term = search.trim().toLowerCase();
  const matches = (c) => {
    if (statusFilter !== 'all' && c.current_stage !== statusFilter && c.status !== statusFilter) return false;
    if (listingFilter !== 'all' && c.property_name !== listingFilter) return false;
    if (dueFilter === 'none' && c.days_left) return false;
    if (['any', 'week', 'month'].includes(dueFilter)) {
      if (c.days_left == null || ['uploaded_tagged', 'closed', 'archived'].includes(c.current_stage)) return false;
      if (dueFilter === 'week' && c.days_left > 7) return false;
      if (dueFilter === 'month' && c.days_left > 30) return false;
    }
    if (term && !c.property_name?.toLowerCase().includes(term) && !c.host_name?.toLowerCase().includes(term)) return false;
    return true;
  };
  const compare = (a, b) => {
    if (!!b.creator_pinned !== !!a.creator_pinned) return b.creator_pinned ? 1 : -1;
    if (sortBy === 'newest') return (b.created_ms ?? 0) - (a.created_ms ?? 0);
    if (sortBy === 'az') return (a.property_name || '').localeCompare(b.property_name || '');
    // Default: soonest-due first; collabs with no due date sink to the bottom.
    if (a.days_left == null && b.days_left == null) return 0;
    if (a.days_left == null) return 1;
    if (b.days_left == null) return -1;
    return a.days_left - b.days_left;
  };
  const shown = active.filter(matches).sort(compare);
  const shownArchived = archived.filter(matches).sort(compare);
  // A search reaches into the archive automatically — no mode switch needed to find one.
  const showArchived = !!term || archivedOpen;

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
    // Signed by both sides but not paid out yet — money on its way.
    const upcoming = (contracts || [])
      .filter((c) => c.creator_signed && c.host_signed && !c.paid && !['terminated', 'cancelled', 'declined'].includes(c.status))
      .reduce((sum, c) => sum + (c.payment_amount ?? c.cash_value ?? 0), 0);

    return {
      active:  { value: String(realActive.length), sub: `Across ${uniqueListings.size} listing${uniqueListings.size === 1 ? '' : 's'}` },
      pending: { value: String(realPendingCount), sub: 'Awaiting host reply' },
      earned:  { value: `$${totalEarned.toLocaleString()}`, sub: upcoming > 0 ? `+$${upcoming.toLocaleString()} upcoming` : `${paidContracts.length} contract${paidContracts.length === 1 ? '' : 's'} paid` },
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
        items.push({ id: c.id, type: 'deadline', title: `Upload content — ${c.property_name}`, date: isoDate(d) });
      }
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    (contracts || []).forEach((k) => {
      if (!k.check_in || k.check_in < today.getTime() || k.check_in - today.getTime() > 30 * 86400000) return;
      const collab = realActive.find((c) => c.property_name === k.property_name);
      items.push({ id: collab?.id, type: 'stay_date', title: `Check in — ${k.property_name || 'your stay'}`, date: isoDate(new Date(k.check_in)) });
    });
    (convexPitches || []).forEach((p) => {
      if (p.counter_pending === 'creator') {
        // No creator-side counter UI yet, so this opens the collab for that listing.
        const collab = realActive.find((c) => String(c.listing_id) === String(p.listing_id));
        items.push({ id: collab?.id, type: 'pending_action', title: `Respond to counter-pitch — ${p.listing_title || 'listing'}`, date: isoDate(new Date(p.created_at ?? Date.now())) });
      }
    });
    return items;
  }, [realActive, convexPitches, contracts]);

  const handleTodoClick = (todo) => {
    const match = allCollabs.find((c) => String(c.id) === String(todo.id));
    if (match) setSelectedCollab(match);
  };

  const applyStat = (status, due) => { setStatusFilter(status); setDueFilter(due); setListingFilter('all'); };
  const handleStatClick = (presetKey) => {
    switch (presetKey) {
      case 'active':               applyStat('all', 'all'); break;
      case 'pending_applications': applyStat('pending', 'all'); break;
      case 'earned':               applyStat('closed', 'all'); break;
      case 'content_due':          applyStat('all', 'any'); break;
      default: break;
    }
  };

  const renderCard = (c) => (
    <CollabCard
      key={c.id}
      collab={c}
      onClick={setSelectedCollab}
      onDismissDemo={dismissDemo}
      onDismissSample={() => dismissSample(c.id)}
      onPin={(x) => crm(x, { pinned: !x.creator_pinned })}
      onArchive={(x) => crm(x, { archived: !x.creator_archived })}
      onSaveNote={(x, note) => crm(x, { note })}
      onOpenContract={(contractId) => navigate(`/contract?open=${contractId}`)}
      onStartContract={(c) => navigate('/contract', {
        state: {
          prefill: {
            creator_id: c.creator_id,
            creator: c.creator_name,
            host: c.host_name,
            property_name: c.property_name,
            location: c.location,
            dates: c.dates,
            deliverables: c.deliverables,
          },
        },
      })}
    />
  );

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
        onTodoClick={handleTodoClick}
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
              { value: 'any', label: 'Has a deadline' },
              { value: 'week', label: t('filters.dueThisWeek') },
              { value: 'month', label: t('filters.dueThisMonth') },
              { value: 'none', label: t('filters.noDeadline') },
            ],
          },
          {
            key: 'sort', value: sortBy, onChange: setSortBy,
            options: [
              { value: 'all', label: 'Sort: soonest due' },
              { value: 'newest', label: 'Sort: newest' },
              { value: 'az', label: 'Sort: A–Z' },
            ],
          },
        ]}
      >
        <div className="w-full max-w-2xl mx-auto space-y-4">
          {shown.length === 0 && allCollabs.length === 0 ? (
            <div className="text-center pt-16">
              <p className="text-4xl mb-4">✦</p>
              <h3 className="font-display font-bold text-ink text-lg mb-2">{t('emptyTitleNoCollabs')}</h3>
              <p className="text-sage text-sm mb-6">{t('emptyBodyStart')}</p>
              <button onClick={() => navigate('/explore')} className="btn-ink">{t('discoverStays')}</button>
            </div>
          ) : (
            shown.map(renderCard)
          )}

          {shownArchived.length > 0 && (
            <div>
              <button
                onClick={() => setArchivedOpen((o) => !o)}
                disabled={!!term}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 0.25rem',
                  border: 'none', background: 'none', cursor: term ? 'default' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 700, color: 'var(--sage)', fontFamily: 'var(--font-body)',
                }}
              >
                <Archive size={14} />
                <span style={{ flex: 1, textAlign: 'left' }}>Archived ({shownArchived.length})</span>
                {!term && <ChevronDown size={15} style={{ transform: showArchived ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />}
              </button>
              {showArchived && <div className="space-y-4" style={{ opacity: 0.8 }}>{shownArchived.map(renderCard)}</div>}
            </div>
          )}
        </div>
      </ProposalsOverview>

      {selectedCollab && (
        <CollabDetail
          collab={allCollabs.find((c) => String(c.id) === String(selectedCollab.id)) || selectedCollab}
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
