import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import ProfilePopupCard from '../../components/ProfilePopupCard';
import CreatorAvatar from '../../components/CreatorAvatar';
import SkeletonCard from '../../components/SkeletonCard';
import ProposalsOverview from '../../components/dashboard/ProposalsOverview';
import { bucketByMonth, toMonthSeries, isoDate } from '../../lib/monthSeries';
import {
  MessageSquare, ChevronDown, ChevronUp, ExternalLink, Check, Sparkles,
  GripVertical, Lock, Download, Pen, CheckCircle2, Trash2,
} from 'lucide-react';
import {
  DndContext, DragOverlay,
  useDraggable, useDroppable,
  useSensor, useSensors, PointerSensor,
} from '@dnd-kit/core';
import {
  DELIVERABLE_TYPES, DELIVERABLE_LABELS, DELIVERABLE_POINTS,
  normalizeTierId, totalPoints, calcMidpoint, calcHardFloor, calcRange, evaluateZone,
  isDeliverableAllowedForTier,
} from '../../../convex/lib/compensationPoints';

// ─── Mock proposal data ───────────────────────────────────────────────────────
const PROPOSALS = [
  {
    id: 'p1', listing: 'Glacier Prime Cabin', status: 'pending', type: 'application', applied: '2h ago',
    message: "I've been documenting boutique mountain stays for 2 years and Glacier Prime is exactly the vibe my audience loves. My last cabin Reel got 2.3M views. I'd love to create a full weekend series.",
    creator: { name: 'Priya Nair', username: 'priya.wanders', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=47', followers: 84200, engagement: 9.4, collab_count: 18, location: 'San Francisco, CA', platforms: ['Instagram', 'TikTok'], portfolio: 'priya.wanders', verified: true },
  },
  {
    id: 'p2', listing: 'Glacier Prime Cabin', status: 'under_review', type: 'pitch', applied: '1d ago',
    message: "Mountain content is my bread and butter — I've done 6 cabin collabs and all exceeded expectations.",
    pitch_details: [
      { field: 'Nights', original: '3', proposed: '5' },
      { field: 'Extra Deliverable', original: '—', proposed: '1× YouTube Short' },
      { field: 'Turnaround', original: '14 days', proposed: '10 days' },
    ],
    creator: { name: 'Lena Park', username: 'lena.explores', tier: 'Micro Influencer', avatar: 'https://i.pravatar.cc/80?img=32', followers: 31500, engagement: 12.1, collab_count: 31, location: 'Portland, OR', platforms: ['TikTok', 'Instagram'], portfolio: 'lenaexplores.co', verified: false },
  },
  {
    id: 'p3', listing: 'Cliffside Villa', status: 'approved', type: 'pitch', applied: '3d ago',
    message: "Coastal luxury is my niche. I shoot for boutique hotels and villas full-time — clean editorial style, fast turnaround.",
    pitch_details: [
      { field: 'Compensation', original: '$200 cash', proposed: 'Hybrid + $300 cash' },
      { field: 'Turnaround', original: '14 days', proposed: '7 days' },
    ],
    creator: { name: 'Maya Chen', username: 'mayachen.travel', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=5', followers: 218000, engagement: 6.8, collab_count: 47, location: 'Los Angeles, CA', platforms: ['Instagram', 'YouTube'], portfolio: 'mayachen.co', verified: true },
  },
  {
    id: 'p4', listing: 'Desert Solar House', status: 'pending', type: 'application', applied: '5h ago',
    message: "Sustainable design content is my thing — this solar house is exactly what my eco-conscious audience wants to see.",
    creator: { name: 'Jordan Ellis', username: 'jordanellis.co', tier: 'UGC Pro', avatar: 'https://i.pravatar.cc/80?img=11', followers: 12400, engagement: 14.2, collab_count: 4, location: 'Austin, TX', platforms: ['TikTok'], portfolio: 'jordanellis.co', verified: false },
  },
  {
    id: 'p5', listing: 'Cliffside Villa', status: 'completed', type: 'pitch', applied: '3wk ago',
    message: "I specialize in dreamy coastal content — think golden hour, crystal waters, linen aesthetics.",
    pitch_details: [
      { field: 'Photos', original: '10', proposed: '8' },
      { field: 'Add-on', original: '—', proposed: 'Branded integration shot' },
      { field: 'Affiliate %', original: '—', proposed: '5% affiliate link' },
    ],
    creator: { name: 'Sam Kowalski', username: 'sam.kowalski', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=59', followers: 58300, engagement: 8.9, collab_count: 23, location: 'Miami, FL', platforms: ['Instagram', 'TikTok'], portfolio: 'samkowalski.com', verified: true },
  },
  {
    id: 'p6', listing: 'Floating Boathouse', status: 'declined', type: 'application', applied: '1wk ago',
    message: "I do water-based travel content and this boathouse is incredible.",
    creator: { name: 'Ava Torres', username: 'ava.offshore', tier: 'Micro Influencer', avatar: 'https://i.pravatar.cc/80?img=21', followers: 43900, engagement: 7.3, collab_count: 9, location: 'Seattle, WA', platforms: ['Instagram'], portfolio: 'ava-offshore.com', verified: false },
  },
  {
    id: 'p7', listing: 'Treehouse Canopy Suite', status: 'pending', type: 'application', applied: '8h ago',
    message: "Nature and wellness content creator — this treehouse is my dream collab.",
    creator: { name: 'Kai Yamamoto', username: 'kai.wilderness', tier: 'UGC Pro', avatar: 'https://i.pravatar.cc/80?img=68', followers: 9200, engagement: 18.7, collab_count: 2, location: 'Asheville, NC', platforms: ['TikTok'], portfolio: 'kaiyamamoto.com', verified: false },
  },
  {
    id: 'p8', listing: 'Glacier Prime Cabin', status: 'under_review', type: 'application', applied: '2d ago',
    message: "Long-time follower of your property — the aesthetics are exactly on-brand for my content.",
    creator: { name: 'Nina Okafor', username: 'ninaokafor', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=44', followers: 67100, engagement: 10.5, collab_count: 14, location: 'Chicago, IL', platforms: ['Instagram', 'TikTok'], portfolio: 'ninaokafor.com', verified: true },
  },
];

const STATUS_CFG = {
  pending:      { bg: 'rgba(212,168,67,0.15)',  border: 'rgba(212,168,67,0.4)',  color: '#b45309' },
  under_review: { bg: 'rgba(123,104,200,0.12)', border: 'rgba(123,104,200,0.3)', color: '#5b4db8' },
  approved:     { bg: 'rgba(74,155,127,0.12)',  border: 'rgba(74,155,127,0.3)',  color: '#2d7d5e' },
  completed:    { bg: 'rgba(60,87,89,0.12)',    border: 'rgba(60,87,89,0.3)',    color: '#3C5759' },
  declined:     { bg: 'rgba(200,104,104,0.1)',  border: 'rgba(200,104,104,0.25)',color: '#9b2d2d' },
};
function statusLabel(key) { return i18nInstance.t(`hostProposals:statusLabels.${key}`); }

const TIER_COLORS = {
  'UGC Beginner':     { bg: 'rgba(209,235,219,0.6)', color: 'var(--ink)' },
  'UGC Pro':          { bg: 'rgba(60,87,89,0.12)',   color: '#3C5759'    },
  'Micro Influencer': { bg: 'rgba(123,104,200,0.12)',color: '#5b4db8'    },
  'Influencer':       { bg: 'rgba(212,168,67,0.15)', color: '#b45309'    },
};

function tierDef(tier) { return i18nInstance.t(`hostProposals:tierDefs.${tier}`); }

const STAGE_TABS = [
  { key: 'all' },
  { key: 'pending' },
  { key: 'under_review' },
  { key: 'approved' },
  { key: 'completed' },
  { key: 'declined' },
];
function stageLabel(key) { return key === 'all' ? i18nInstance.t('hostProposals:stageAll') : statusLabel(key); }

const TYPE_TABS = [
  { key: 'all' },
  { key: 'application' },
  { key: 'pitch' },
];
function typeLabel(key) { return i18nInstance.t(`hostProposals:typeLabels.${key}`); }

const PITCH_BORDER_CLOSED   = '1.5px solid rgba(209,235,219,0.9)';
const PITCH_BORDER_EXPANDED = '1.5px solid rgba(149,157,144,0.55)';
const PITCH_SHADOW_CLOSED   = '0 2px 12px rgba(25,37,36,0.05), 0 0 0 1px rgba(209,235,219,0.5)';
const PITCH_SHADOW_EXPANDED = '0 4px 20px rgba(25,37,36,0.08), 0 0 0 1px rgba(209,235,219,0.4)';

function fmtFollowers(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Contract fields ──────────────────────────────────────────────────────────
const CONTRACT_FIELDS = [
  { key: 'nights' },
  { key: 'compensation' },
  { key: 'deliverables' },
  { key: 'turnaround' },
  { key: 'affiliate' },
  { key: 'extra_terms' },
];
function contractFieldLabel(key) { return i18nInstance.t(`hostProposals:contractFields.${key}.label`); }
function contractFieldPlaceholder(key) { return i18nInstance.t(`hostProposals:contractFields.${key}.placeholder`); }

function getLatestFields(proposal) {
  if (proposal.contractHistory?.length > 0) {
    return { ...proposal.contractHistory[proposal.contractHistory.length - 1].fields };
  }
  const fields = { nights: '', compensation: '', deliverables: '', turnaround: '', affiliate: '', extra_terms: '' };
  (proposal.pitch_details || []).forEach(({ field, proposed }) => {
    const k = field.toLowerCase();
    if (k.includes('night')) fields.nights = proposed;
    else if (k.includes('compensation') || k.includes('cash') || k.includes('pay')) fields.compensation = proposed;
    else if (k.includes('deliverable') || k.includes('photo') || k.includes('extra') || k.includes('add-on')) fields.deliverables = proposed;
    else if (k.includes('turnaround') || k.includes('days')) fields.turnaround = proposed;
    else if (k.includes('affiliate') || k.includes('%')) fields.affiliate = proposed;
    else fields.extra_terms = fields.extra_terms ? `${fields.extra_terms}; ${proposed}` : proposed;
  });
  return fields;
}

function emptySignatures() {
  return { hostSignature: null, hostSignedAt: null, hostSignedVersion: null, creatorSignature: null, creatorSignedAt: null, creatorSignedVersion: null };
}

function safeParse(s, fallback) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

// ─── Persistence ──────────────────────────────────────────────────────────────
const APPS_KEY = '@collabnb_applications_v1';

function loadApplications() {
  try { return JSON.parse(localStorage.getItem(APPS_KEY) || '{}'); }
  catch { return {}; }
}

function saveApplications(list) {
  try {
    localStorage.setItem(APPS_KEY, JSON.stringify(
      Object.fromEntries(list.map((p) => [p.id, {
        status: p.status, contractHistory: p.contractHistory,
        signatures: p.signatures, locked: p.locked,
        counterPending: p.counterPending, hidden: p.hidden,
      }]))
    ));
  } catch {}
}

// ─── PDF export ───────────────────────────────────────────────────────────────
function generateContractHtml(proposal) {
  const fields = getLatestFields(proposal);
  const { signatures, contractHistory, creator, listing } = proposal;
  const tp = (key, opts) => i18nInstance.t(`hostProposals:${key}`, opts);
  const rows = CONTRACT_FIELDS
    .filter(f => fields[f.key])
    .map(f => `<tr><td style="font-weight:700;width:140px;padding:10px 14px;border-bottom:1px solid #eee;">${contractFieldLabel(f.key)}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;">${fields[f.key]}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${tp('pdf.documentTitle')}</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#192524;line-height:1.6}h1{font-size:22px;margin:0 0 4px}p.meta{color:#666;font-size:13px;margin:0 0 32px}table{width:100%;border-collapse:collapse;margin:24px 0}h2{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#666;margin:28px 0 8px}.sig-row{display:flex;gap:40px;margin-top:40px}.sig-box{flex:1;border-top:1px solid #ccc;padding-top:12px}.sig-name{font-size:20px;font-style:italic;margin-bottom:4px}.sig-label{font-size:11px;color:#666}.locked{display:inline-block;padding:3px 10px;border-radius:9999px;background:rgba(74,155,127,0.15);color:#2d7d5e;font-size:12px;font-weight:700;margin-bottom:24px}</style></head>
<body>
<h1>${tp('pdf.heading')}</h1>
<p class="meta">${listing} · ${creator.name} (@${creator.username}) · ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
${proposal.locked ? `<span class="locked">${tp('pdf.locked')}</span>` : ''}
<h2>${tp('pdf.terms')}</h2><table>${rows}</table>
${contractHistory.length > 0 ? `<p style="font-size:12px;color:#666;margin-top:8px;">${tp('pdf.negotiatedRounds', { count: contractHistory.length })}</p>` : ''}
<h2>${tp('pdf.signatures')}</h2>
<div class="sig-row">
  <div class="sig-box"><div class="sig-name">${signatures.hostSignature || '___________________________'}</div><div class="sig-label">${tp('pdf.host')} · ${signatures.hostSignedAt ? new Date(signatures.hostSignedAt).toLocaleDateString() : tp('pdf.notYetSigned')}</div></div>
  <div class="sig-box"><div class="sig-name">${signatures.creatorSignature || '___________________________'}</div><div class="sig-label">${creator.name} ${tp('pdf.creatorSuffix')} · ${signatures.creatorSignedAt ? new Date(signatures.creatorSignedAt).toLocaleDateString() : tp('pdf.notYetSigned')}</div></div>
</div>
</body></html>`;
}

function openContractPdf(proposal) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(generateContractHtml(proposal));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ─── Contract history timeline ────────────────────────────────────────────────
function ContractHistoryTimeline({ history }) {
  const { t } = useTranslation('hostProposals');
  if (!history?.length) return null;
  return (
    <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', background: 'rgba(239,236,233,0.35)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>{t('history.heading')}</div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage)', padding: '3px 8px', borderRadius: 9999, background: 'rgba(25,37,36,0.06)' }}>{t('history.creatorPitch')}</span>
        {history.map((entry, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ color: 'var(--stone)', fontSize: 10, margin: '0 3px' }}>→</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: entry.modifiedBy === 'host' ? 'rgba(123,104,200,0.1)' : 'rgba(74,155,127,0.1)', color: entry.modifiedBy === 'host' ? '#5b4db8' : '#2d7d5e' }}>
              {entry.modifiedBy === 'host' ? t('history.host') : t('history.creator')} {t('history.version', { version: entry.version })}
              {i === history.length - 1 && <span style={{ marginLeft: 4, opacity: 0.6 }}>{t('history.latest')}</span>}
            </span>
          </span>
        ))}
      </div>
      {history[history.length - 1]?.note && (
        <p style={{ fontSize: 11, color: 'var(--slate)', margin: '7px 0 0', fontStyle: 'italic' }}>
          "{history[history.length - 1].note}"
        </p>
      )}
    </div>
  );
}

// ─── Counter pitch modal ──────────────────────────────────────────────────────
function CounterPitchModal({ proposal, fromParty, onSend, onClose }) {
  const { t } = useTranslation('hostProposals');
  const [fields, setFields] = useState(() => getLatestFields(proposal));
  const [note, setNote] = useState('');
  const version = (proposal.contractHistory?.length ?? 0) + 1;
  const partyLabel = fromParty === 'host' ? t('history.host') : proposal.creator.name;

  // ── Live points/pricing — the same math the listing pricing tool uses ──
  const tierId = normalizeTierId(proposal.creator.tier) || 'ugc_pro';
  const [pricedDeliverables, setPricedDeliverables] = useState([]);
  const [cashAmount, setCashAmount] = useState(() => {
    const parsed = parseFloat(String(fields.compensation || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const quantities = Object.fromEntries(DELIVERABLE_TYPES.map((t) => [t, pricedDeliverables.find((d) => d.type === t)?.quantity || 0]));

  function setQuantity(type, quantity) {
    setPricedDeliverables((prev) => {
      const next = prev.filter((d) => d.type !== type);
      if (quantity > 0) next.push({ type, quantity });
      return next;
    });
  }

  const points = totalPoints(pricedDeliverables);
  const midpoint = calcMidpoint(points, tierId);
  const range = calcRange(midpoint);
  const hardFloor = calcHardFloor(midpoint, 0);
  const zone = points > 0 ? evaluateZone(cashAmount, midpoint, 0) : null;
  const belowFloor = zone === 'red';

  function handleSend() {
    if (belowFloor) return;
    const nextFields = { ...fields };
    if (points > 0) {
      nextFields.cash_amount = cashAmount;
      nextFields.deliverables = pricedDeliverables;
      nextFields.compensation = `$${cashAmount}`;
      nextFields.deliverables_summary = pricedDeliverables.map((d) => `${d.quantity}× ${DELIVERABLE_LABELS[d.type]}`).join(', ');
    }
    onSend(nextFields, note);
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '1.5rem', padding: '1.75rem', maxHeight: '88dvh', overflowY: 'auto', boxShadow: '0 32px 64px -16px rgba(25,37,36,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>{t('counterModal.heading')}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.2rem 0 0' }}>
              {t('counterModal.versionLine', { creatorName: proposal.creator.name, listing: proposal.listing, version })}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: '0.9rem' }}>✕</button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
          {t('counterModal.editingAs')}<strong style={{ color: 'var(--slate)' }}>{partyLabel}</strong>{t('counterModal.adjustTerms')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
          {CONTRACT_FIELDS.map(({ key }) => (
            <div key={key}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>{contractFieldLabel(key)}</p>
              <input value={fields[key] || ''} onChange={(e) => setFields(f => ({ ...f, [key]: e.target.value }))} placeholder={contractFieldPlaceholder(key)}
                style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }} />
            </div>
          ))}
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>{t('counterModal.noteLabel')}</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('counterModal.notePlaceholder')} rows={2}
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', background: '#fafafa', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }} />
          </div>

          {/* ── Live pricing calculator — optional, overrides the free-text compensation/deliverables fields when used ── */}
          <div style={{ borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.1)', padding: '0.875rem', background: 'rgba(209,235,219,0.25)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
              {t('counterModal.pricingCalculator', { tier: proposal.creator.tier })}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.4rem', marginBottom: '0.625rem' }}>
              {DELIVERABLE_TYPES.map((type) => {
                const allowed = isDeliverableAllowedForTier(type, tierId);
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '0.4rem 0.55rem', borderRadius: '0.5rem', background: '#fff', opacity: allowed ? 1 : 0.4 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink)' }}>{DELIVERABLE_LABELS[type]}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button disabled={!allowed} onClick={() => setQuantity(type, Math.max(0, quantities[type] - 1))} style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--sage)', background: 'transparent', cursor: allowed ? 'pointer' : 'not-allowed', fontSize: '0.7rem', lineHeight: 1 }}>−</button>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{quantities[type]}</span>
                      <button disabled={!allowed} onClick={() => setQuantity(type, quantities[type] + 1)} style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--ink)', background: 'var(--ink)', color: '#fff', cursor: allowed ? 'pointer' : 'not-allowed', fontSize: '0.7rem', lineHeight: 1 }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: points > 0 ? 8 : 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{t('counterModal.cash')}</span>
              <input type="number" min={0} value={cashAmount || ''} onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                style={{ width: 90, padding: '0.35rem 0.5rem', borderRadius: '0.5rem', border: '1.5px solid rgba(25,37,36,0.15)', fontSize: '0.8rem', outline: 'none' }} />
              {points > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>{t('counterModal.pointsSummary', { points, midpoint: Math.round(midpoint), low: Math.round(range.low), high: Math.round(range.high) })}</span>}
            </div>
            {zone === 'red' && (
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8a4a30', margin: 0 }}>
                {t('counterModal.belowFloor', { floor: Math.round(hardFloor) })}
              </p>
            )}
            {zone === 'amber' && (
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#7a5a10', margin: 0 }}>
                {t('counterModal.belowRecommended')}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>{t('counterModal.cancel')}</button>
          <button onClick={handleSend} disabled={belowFloor}
            style={{ flex: 2, padding: '0.75rem', borderRadius: 9999, border: 'none', background: belowFloor ? 'rgba(25,37,36,0.25)' : 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: belowFloor ? 'not-allowed' : 'pointer' }}>
            {t('counterModal.send')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Signature modal ──────────────────────────────────────────────────────────
function SignatureModal({ proposal, party, onSign, onClose }) {
  const { t } = useTranslation('hostProposals');
  const [name, setName] = useState('');
  const partyLabel = party === 'host' ? t('history.host') : `${proposal.creator.name} ${t('pdf.creatorSuffix')}`;
  const latestFields = getLatestFields(proposal);
  const roundCount = proposal.contractHistory?.length ?? 0;
  const ready = name.trim().length >= 2;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: '1.5rem', padding: '1.75rem', maxHeight: '88dvh', overflowY: 'auto', boxShadow: '0 32px 64px -16px rgba(25,37,36,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>{t('signModal.heading')}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.2rem 0 0' }}>{t('signModal.signingAs', { partyLabel })}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: '0.9rem' }}>✕</button>
        </div>
        <div style={{ background: 'rgba(239,236,233,0.5)', borderRadius: '1rem', padding: '1rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>{t('signModal.contractTerms')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {CONTRACT_FIELDS.filter(f => latestFields[f.key]).map(({ key }) => (
              <div key={key} style={{ display: 'flex', gap: 8, fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--sage)', minWidth: 110 }}>{contractFieldLabel(key)}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{latestFields[key]}</span>
              </div>
            ))}
          </div>
          {roundCount > 0 && <p style={{ fontSize: '0.7rem', color: 'var(--sage)', margin: '0.75rem 0 0' }}>{t('signModal.afterRounds', { count: roundCount })}</p>}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)', marginBottom: '0.875rem', lineHeight: 1.55 }}>
          {t('signModal.agreement')}
        </p>
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.35rem' }}>{t('signModal.yourName')}</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('signModal.namePlaceholder')}
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'Georgia, serif', fontSize: '1rem', fontStyle: 'italic', color: 'var(--ink)', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }} />
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>{t('signModal.cancel')}</button>
          <button onClick={() => { if (ready) onSign(name.trim()); }} disabled={!ready}
            style={{ flex: 2, padding: '0.75rem', borderRadius: 9999, border: 'none', background: ready ? 'rgba(74,155,127,0.9)' : 'rgba(25,37,36,0.1)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: ready ? '#fff' : 'var(--sage)', cursor: ready ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Pen size={13} /> {t('signModal.sign')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Droppable stage tab ──────────────────────────────────────────────────────
function DroppableTab({ stageKey, label, count, active, isFlashing, dragging, currentDragStatus, onClick }) {
  const isAll = stageKey === 'all';
  const { isOver, setNodeRef } = useDroppable({ id: stageKey, disabled: isAll || !dragging });
  const s = STATUS_CFG[stageKey];
  const isSameStage = stageKey === currentDragStatus;
  return (
    <button ref={setNodeRef} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: dragging ? '0.65rem 1.25rem' : '0.4rem 0.875rem',
      borderRadius: 9999, fontSize: dragging ? '0.84rem' : '0.78rem', fontWeight: 600,
      background: isOver && s ? s.bg : (isFlashing && s) ? s.bg : active ? 'var(--ink)' : (dragging && !isAll && !isSameStage) ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.65)',
      color: isOver && s ? s.color : active ? 'var(--bone)' : 'var(--slate)',
      border: '1px solid',
      borderColor: isOver && s ? s.border : (isFlashing && s) ? s.border : active ? 'var(--ink)' : (dragging && !isAll && !isSameStage) ? 'rgba(25,37,36,0.18)' : 'rgba(25,37,36,0.12)',
      backdropFilter: 'blur(12px)', cursor: 'pointer',
      transform: isOver ? 'translateY(-2px) scale(1.04)' : 'translateY(0) scale(1)',
      boxShadow: isOver && s ? `0 4px 14px ${s.bg}, 0 0 0 2px ${s.border}` : 'none',
      opacity: dragging && !isAll && isSameStage ? 0.45 : 1,
      animation: isFlashing ? 'tab-flash 600ms ease forwards' : undefined,
      transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
    }}>
      {label}
      {count > 0 && (
        <span style={{ padding: '1px 6px', borderRadius: 9999, fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.5, background: active ? 'rgba(255,255,255,0.2)' : 'rgba(25,37,36,0.08)', color: active ? '#fff' : 'var(--slate)' }}>{count}</span>
      )}
    </button>
  );
}

// ─── Inline host → creator message panel ─────────────────────────────────────
function HostMessagePanel({ threadKey, creatorName }) {
  const { t } = useTranslation('hostProposals');
  const { profile } = useAuth();
  const convexMessages = useQuery(api.threadMessages.getByThread, { threadKey });
  const sendMutation = useMutation(api.threadMessages.sendMessage);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convexMessages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      const senderId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : 'host');
      await sendMutation({
        threadKey,
        senderId,
        senderName: profile?.full_name || profile?.name || 'Host',
        senderAvatar: profile?.avatar_url,
        senderRole: 'host',
        text,
      });
    } catch { /* silently ignore */ }
    finally { setSending(false); }
  };

  const hostId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : null);

  return (
    <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(25,37,36,0.07)', background: 'rgba(239,236,233,0.2)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        {t('messagePanel.heading', { creatorName })}
      </div>

      {/* Message list */}
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {convexMessages === undefined ? (
          <SkeletonCard variant="message" />
        ) : convexMessages.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--sage)', margin: 0 }}>{t('messagePanel.empty')}</p>
        ) : (
          convexMessages.map((msg) => {
            const isMe = msg.sender_role === 'host' || (hostId && msg.sender_id === hostId);
            return (
              <div key={String(msg._id)} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isMe ? 'var(--ink)' : '#fff',
                  border: isMe ? 'none' : '1px solid rgba(25,37,36,0.1)',
                  color: isMe ? '#fff' : 'var(--ink)', fontSize: 13, lineHeight: 1.5,
                }}>
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 10, opacity: 0.5, textAlign: 'right' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t('messagePanel.replyPlaceholder', { creatorName })}
          style={{ flex: 1, padding: '9px 12px', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', background: '#fff', outline: 'none', resize: 'none', minHeight: '2.25rem', maxHeight: 100 }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: draft.trim() ? 'var(--ink)' : 'rgba(25,37,36,0.1)',
            cursor: draft.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={draft.trim() ? 'white' : 'var(--sage)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Proposal drawer ──────────────────────────────────────────────────────────
function ProposalDrawer({ proposal, onStatusChange, onCounter, onSign, onCreatorClick }) {
  const { t } = useTranslation('hostProposals');
  const navigate = useNavigate();
  const tierColor = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];
  const isPitch = proposal.type === 'pitch';
  const { signatures = emptySignatures(), contractHistory = [], locked } = proposal;

  const version = contractHistory.length;
  const hostSigned    = !!signatures.hostSignature    && signatures.hostSignedVersion    === version;
  const creatorSigned = !!signatures.creatorSignature && signatures.creatorSignedVersion === version;

  return (
    <div style={{ background: '#fff', border: isPitch ? PITCH_BORDER_EXPANDED : '1.5px solid rgba(25,37,36,0.08)', borderTop: 'none', borderRadius: '0 0 1rem 1rem', overflow: 'hidden' }}>

      {/* Creator header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <CreatorAvatar
            src={proposal.creator.avatar} name={proposal.creator.name}
            size={60}
            onClick={() => onCreatorClick(proposal.creator)}
            title={t('drawer.viewProfile')}
            style={{ border: '2px solid rgba(25,37,36,0.08)', cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{proposal.creator.name}</span>
              {proposal.creator.verified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, background: 'rgba(74,155,127,0.12)', border: '1px solid rgba(74,155,127,0.3)', fontSize: 10, fontWeight: 700, color: '#2d7d5e' }}><Check size={9} />{t('drawer.verified')}</span>
              )}
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: tierColor.bg, color: tierColor.color }}>{proposal.creator.tier}</span>
              <span title={tierDef(proposal.creator.tier)} style={{ fontSize: 9, color: 'var(--sage)', cursor: 'help', lineHeight: 1 }}>ⓘ</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 3 }}>@{proposal.creator.username} · {proposal.creator.location}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {proposal.creator.platforms.map((p) => (
                <span key={p} style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'var(--bone)', color: 'var(--slate)' }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, marginTop: 16, background: 'rgba(25,37,36,0.06)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {[{ label: t('drawer.followers'), value: fmtFollowers(proposal.creator.followers) }, { label: t('drawer.engagement'), value: `${proposal.creator.engagement}%` }, { label: t('drawer.collabs'), value: proposal.creator.collab_count }].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px 0', background: '#fff', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pitch: original modified terms */}
      {isPitch && proposal.pitch_details && (
        <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', background: 'rgba(209,235,219,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Sparkles size={12} color="#2d7d5e" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2d7d5e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {contractHistory.length > 0 ? t('drawer.originalPitchTerms') : t('drawer.modifiedTerms')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {proposal.pitch_details.map(({ field, original, proposed }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--slate)', minWidth: 120 }}>{field}</span>
                <span style={{ color: 'var(--sage)', textDecoration: 'line-through' }}>{original}</span>
                <span style={{ color: '#2d7d5e', fontWeight: 700 }}>→ {proposed}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negotiation history */}
      <ContractHistoryTimeline history={contractHistory} />

      {/* Message */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          {isPitch ? t('drawer.pitchMessage') : t('drawer.applicationMessage')}
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>{proposal.message}</p>
      </div>

      {/* Portfolio */}
      <div style={{ padding: '11px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ExternalLink size={13} color="var(--sage)" />
        <span style={{ fontSize: 12, color: 'var(--slate)' }}>{t('drawer.portfolio')}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{proposal.creator.portfolio}</span>
      </div>

      {/* ── LOCKED state ── */}
      {locked && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px', borderRadius: '0.875rem', background: 'rgba(74,155,127,0.1)', border: '1px solid rgba(74,155,127,0.25)' }}>
            <Lock size={14} color="#2d7d5e" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2d7d5e' }}>{t('drawer.contractLocked')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: t('history.host'), sig: signatures.hostSignature, at: signatures.hostSignedAt },
              { label: proposal.creator.name, sig: signatures.creatorSignature, at: signatures.creatorSignedAt },
            ].map(({ label, sig, at }) => (
              <div key={label} style={{ padding: '12px 14px', borderRadius: '0.875rem', background: 'rgba(239,236,233,0.6)', border: '1px solid rgba(25,37,36,0.08)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', marginBottom: 3 }}>{sig}</div>
                <div style={{ fontSize: 10, color: 'var(--sage)' }}>{at ? new Date(at).toLocaleDateString() : ''}</div>
              </div>
            ))}
          </div>
          <button onClick={() => openContractPdf(proposal)}
            style={{ width: '100%', padding: '10px 0', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Download size={13} /> {t('drawer.saveContractPdf')}
          </button>
        </div>
      )}

      {/* ── COUNTER-PITCH FLOW for Under Review + pitch (not locked) ── */}
      {!locked && proposal.status === 'under_review' && isPitch && (
        <div>
          {/* Signature status row */}
          {(hostSigned || creatorSigned) && (
            <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {hostSigned && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', fontSize: 11, fontWeight: 700, color: '#2d7d5e' }}>
                  <CheckCircle2 size={11} /> {t('drawer.hostSigned')}
                </span>
              )}
              {creatorSigned && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', fontSize: 11, fontWeight: 700, color: '#2d7d5e' }}>
                  <CheckCircle2 size={11} /> {t('drawer.creatorSigned', { name: proposal.creator.name })}
                </span>
              )}
              {hostSigned && !creatorSigned && (
                <span style={{ fontSize: 11, color: 'var(--sage)', alignSelf: 'center' }}>{t('drawer.awaitingCreatorSignature')}</span>
              )}
              {!hostSigned && creatorSigned && (
                <span style={{ fontSize: 11, color: 'var(--sage)', alignSelf: 'center' }}>{t('drawer.awaitingHostSignature')}</span>
              )}
            </div>
          )}

          {/* HOST actions */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {t('drawer.hostActions')} {proposal.counterPending === 'creator' && <span style={{ color: '#b45309', marginLeft: 6 }}>{t('drawer.counterSentAwaitingCreator')}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!hostSigned ? (
                <button onClick={() => onSign(proposal.id, 'host')}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: 'none', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Pen size={12} /> {t('drawer.acceptAsIs')}
                </button>
              ) : (
                <span style={{ flex: 1, padding: '9px 0', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', color: '#2d7d5e', fontSize: 13, fontWeight: 700, textAlign: 'center', minWidth: 120 }}>{t('drawer.youSigned')}</span>
              )}
              <button onClick={() => onCounter(proposal.id, 'host')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: '1.5px solid rgba(123,104,200,0.4)', background: 'rgba(123,104,200,0.08)', color: '#5b4db8', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 100 }}>
                {t('drawer.counterPitch')}
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '9px 16px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('drawer.decline')}
              </button>
            </div>
          </div>

          {/* CREATOR actions (demo) */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', background: 'rgba(239,236,233,0.3)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {t('drawer.creatorsResponse')} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--stone)' }}>{t('drawer.demo')}</span>
              {proposal.counterPending === 'host' && <span style={{ color: '#2d7d5e', marginLeft: 6 }}>{t('drawer.creatorCounteredBack')}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!creatorSigned ? (
                <button onClick={() => onSign(proposal.id, 'creator')}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: 'none', background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Pen size={12} /> {t('drawer.accept')}
                </button>
              ) : (
                <span style={{ flex: 1, padding: '9px 0', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', color: '#2d7d5e', fontSize: 13, fontWeight: 700, textAlign: 'center', minWidth: 80 }}>{t('drawer.creatorSignedChip')}</span>
              )}
              <button onClick={() => onCounter(proposal.id, 'creator')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: '1.5px solid rgba(74,155,127,0.3)', background: 'rgba(74,155,127,0.07)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 100 }}>
                {t('drawer.counterBack')}
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '9px 16px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('drawer.decline')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standard actions (non-pitch or other statuses) ── */}
      {!locked && !(proposal.status === 'under_review' && isPitch) && (
        <div style={{ padding: '14px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {proposal.status === 'pending' && (
            <>
              <button onClick={() => onStatusChange(proposal.id, 'under_review')}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'rgba(123,104,200,0.12)', color: '#5b4db8', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 120 }}>
                {t('drawer.moveToReview')}
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '10px 20px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('drawer.decline')}
              </button>
            </>
          )}
          {proposal.status === 'under_review' && !isPitch && (
            <>
              <button onClick={() => onStatusChange(proposal.id, 'approved')}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 100 }}>
                {t('drawer.approve')}
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '10px 20px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', color: 'var(--slate)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('drawer.decline')}
              </button>
            </>
          )}
          {proposal.status === 'approved' && (
            <button onClick={() => onStatusChange(proposal.id, 'completed')}
              style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t('drawer.markCompleted')}
            </button>
          )}
          {!proposal.thread_key && (
            <button onClick={() => navigate('/inbox')}
              style={{ padding: '10px 18px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={13} /> {t('drawer.message')}
            </button>
          )}
        </div>
      )}

      {/* Message button always visible for pitch under_review */}
      {!locked && proposal.status === 'under_review' && isPitch && !proposal.thread_key && (
        <div style={{ padding: '0 24px 14px' }}>
          <button onClick={() => navigate('/inbox')}
            style={{ padding: '9px 18px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={13} /> {t('drawer.messageCreator')}
          </button>
        </div>
      )}

      {/* Real-time message thread (only for real Convex pitches with a thread_key) */}
      {proposal.thread_key && (
        <HostMessagePanel threadKey={proposal.thread_key} creatorName={proposal.creator.name} />
      )}
    </div>
  );
}

// ─── Proposal card ────────────────────────────────────────────────────────────
function ProposalCard({ proposal, expanded, onToggle, onStatusChange, onCounter, onSign, onCreatorClick, dragHandleListeners, dragHandleAttributes }) {
  const { t: tr } = useTranslation('hostProposals');
  const s = STATUS_CFG[proposal.status] || STATUS_CFG.pending;
  const tierColor = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];
  const isPitch = proposal.type === 'pitch';
  const isLocked = proposal.locked;

  const cardBorder = expanded
    ? isPitch ? PITCH_BORDER_EXPANDED : '1.5px solid rgba(25,37,36,0.18)'
    : isPitch ? PITCH_BORDER_CLOSED   : '1.5px solid rgba(255,255,255,0.85)';
  const cardShadow = expanded
    ? isPitch ? PITCH_SHADOW_EXPANDED : '0 4px 20px rgba(25,37,36,0.08)'
    : isPitch ? PITCH_SHADOW_CLOSED   : '0 2px 10px rgba(25,37,36,0.05)';

  return (
    <div style={{ marginBottom: 10 }}>
      <div onClick={onToggle} style={{ background: expanded ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px) saturate(135%)', WebkitBackdropFilter: 'blur(20px) saturate(135%)', border: cardBorder, borderRadius: expanded ? '1rem 1rem 0 0' : '1rem', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: cardShadow, transition: 'all 200ms var(--ease-out-quart)' }}>
        <div {...dragHandleListeners} {...dragHandleAttributes} onClick={(e) => e.stopPropagation()}
          style={{ flexShrink: 0, color: 'var(--stone)', cursor: 'grab', padding: '4px 2px', borderRadius: '0.375rem', touchAction: 'none', userSelect: 'none', transition: 'color 150ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--slate)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--stone)'; }} title={tr('card.dragToMoveStage')}>
          <GripVertical size={15} />
        </div>
        <CreatorAvatar
          src={proposal.creator.avatar} name={proposal.creator.name}
          size={44}
          onClick={e => { e.stopPropagation(); onCreatorClick(proposal.creator); }}
          title={tr('card.viewProfile')}
          style={{ border: '1.5px solid rgba(25,37,36,0.07)', cursor: 'pointer' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              onClick={e => { e.stopPropagation(); onCreatorClick(proposal.creator); }}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ink)', cursor: 'pointer', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >{proposal.creator.name}</span>
            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: tierColor.bg, color: tierColor.color, flexShrink: 0 }}>{proposal.creator.tier}</span>
            <span title={tierDef(proposal.creator.tier)} style={{ fontSize: 9, color: 'var(--sage)', cursor: 'help', lineHeight: 1 }}>ⓘ</span>
            {isPitch ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(209,235,219,0.7)', border: '1px solid rgba(149,157,144,0.35)', color: '#2d7d5e', flexShrink: 0 }}>
                <Sparkles size={8} />{tr('card.pitch')}
              </span>
            ) : (
              <span style={{ padding: '2px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(25,37,36,0.06)', color: 'var(--sage)', flexShrink: 0 }}>{tr('card.application')}</span>
            )}
            {isLocked && <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', flexShrink: 0 }}><Lock size={8} />{tr('card.locked')}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 2 }}>{tr('card.listingStats', { listing: proposal.listing, followers: fmtFollowers(proposal.creator.followers), engagement: proposal.creator.engagement })}</div>
          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proposal.message.slice(0, 90)}…</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color, whiteSpace: 'nowrap' }}>{statusLabel(proposal.status)}</span>
          <span style={{ fontSize: 11, color: 'var(--sage)' }}>{proposal.applied}</span>
          {expanded ? <ChevronUp size={14} color="var(--sage)" /> : <ChevronDown size={14} color="var(--sage)" />}
        </div>
      </div>
      {expanded && <ProposalDrawer proposal={proposal} onStatusChange={onStatusChange} onCounter={onCounter} onSign={onSign} onCreatorClick={onCreatorClick} />}
    </div>
  );
}

// ─── Draggable wrapper ────────────────────────────────────────────────────────
function DraggableProposalCard(props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.proposal.id });
  return (
    <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, opacity: isDragging ? 0.3 : 1, position: 'relative', zIndex: isDragging ? 50 : 'auto', transition: isDragging ? undefined : 'opacity 200ms' }}>
      <ProposalCard {...props} dragHandleListeners={listeners} dragHandleAttributes={attributes} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function normalizePitch(p) {
  const elapsed = Date.now() - p.created_at;
  const hours = Math.floor(elapsed / 3600000);
  const days  = Math.floor(elapsed / 86400000);
  const applied = hours < 1 ? 'Just now' : hours < 24 ? `${hours}h ago` : `${days}d ago`;
  return {
    id: p._id,
    listing: p.listing_title || 'Your Listing',
    status: p.status,
    type: p.type || 'application',
    applied,
    thread_key: p.thread_key,
    message: p.message,
    creator: {
      name: p.creator_name,
      username: p.creator_username || '',
      tier: p.creator_tier || 'UGC Pro',
      avatar: p.creator_avatar || null,
      followers: p.creator_followers || 0,
      engagement: p.creator_engagement || 0,
      collab_count: 0,
      location: '',
      platforms: p.creator_platforms || [],
      portfolio: p.creator_username || '',
      verified: false,
    },
    contractHistory: safeParse(p.contract_history, []),
    signatures: safeParse(p.signatures, emptySignatures()),
    locked: p.contract_locked ?? false,
    counterPending: p.counter_pending ?? null,
    contractId: p.contract_id ?? null,
    hidden: false,
    isReal: true,
    convexId: p._id,
  };
}

export default function HostProposals() {
  const { t } = useTranslation('hostProposals');
  const location = useLocation();
  const { profile } = useAuth();
  const hostId = profile?._id || profile?.id;

  const updateStatusCvx = useMutation(api.pitches.updateStatus);
  const sendCounterCvx  = useMutation(api.pitches.sendCounter);
  const signContractCvx = useMutation(api.pitches.signContract);
  const rawPitches = useQuery(
    api.pitches.getByHost,
    hostId ? { hostId: String(hostId) } : 'skip'
  );
  const hostBilling = useQuery(
    api.fees.getBilling,
    hostId ? { hostId: String(hostId) } : 'skip'
  );

  const [tab, setTab]               = useState(location.state?.filter ?? 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('All Listings');
  const [expanded, setExpanded]     = useState(null);
  const [dropOpen, setDropOpen]     = useState(false);
  const [activeId, setActiveId]     = useState(null);
  const [flashStage, setFlashStage] = useState(null);
  const [counterModal, setCounterModal] = useState(null);
  const [signModal, setSignModal]       = useState(null);
  const [showClearDeclined, setShowClearDeclined] = useState(false);
  const [popupCreator, setPopupCreator] = useState(null);
  const [search, setSearch] = useState('');

  const [proposals, setProposals] = useState(() => {
    const saved = loadApplications();
    return PROPOSALS.map((p) => {
      const s = saved[p.id] || {};
      return {
        ...p,
        status:          s.status          ?? p.status,
        contractHistory: s.contractHistory ?? [],
        signatures:      s.signatures      ?? emptySignatures(),
        locked:          s.locked          ?? false,
        counterPending:  s.counterPending  ?? null,
        hidden:          s.hidden          ?? false,
        isReal: false,
      };
    });
  });

  // Use only real Convex pitches once loaded; show empty state instead of mock data
  const allProposals = useMemo(() => {
    if (rawPitches === undefined) return []; // still loading
    const saved = loadApplications();
    return rawPitches.map((p) => {
      const normalized = normalizePitch(p);   // negotiation parsed from Convex
      const s = saved[String(p._id)] || {};
      // Convex is the source of truth for negotiation. Fall back to legacy
      // localStorage only when the pitch has no Convex negotiation data yet.
      const hasConvexNegotiation =
        normalized.contractHistory.length > 0 ||
        normalized.locked ||
        !!normalized.counterPending ||
        !!normalized.signatures.hostSignature ||
        !!normalized.signatures.creatorSignature;
      if (hasConvexNegotiation) {
        return { ...normalized, hidden: s.hidden ?? false };
      }
      return {
        ...normalized,
        contractHistory: s.contractHistory ?? normalized.contractHistory,
        signatures:      s.signatures      ?? normalized.signatures,
        locked:          s.locked          ?? normalized.locked,
        counterPending:  s.counterPending  ?? normalized.counterPending,
        hidden:          s.hidden          ?? false,
      };
    });
  }, [rawPitches]);

  // Deep-link from notifications: /host/proposals?pitch=<pitchId> expands that proposal
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const pitchParam = searchParams.get('pitch');
    if (!pitchParam) return;
    const match = allProposals.find((p) => String(p.id) === pitchParam);
    if (match) {
      setTab('all');
      setTypeFilter('all');
      setListingFilter('All Listings');
      setExpanded(match.id);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, allProposals, setSearchParams]);

  const listingNames = useMemo(() => (
    ['All Listings', ...Array.from(new Set(allProposals.map((p) => p.listing)))]
  ), [allProposals]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Status / stage changes ──
  function handleStatusChange(id, newStatus) {
    // For real Convex pitches, sync status back
    const target = allProposals.find((p) => p.id === id);
    if (target?.isReal && target.convexId) {
      updateStatusCvx({ id: target.convexId, status: newStatus }).catch(() => {});
    }
    setProposals((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
      saveApplications(next);
      return next;
    });
    setExpanded(null);
  }

  // ── Counter pitch ──
  function handleSendCounter(proposalId, fromParty, fields, note) {
    const target = allProposals.find((p) => p.id === proposalId);
    if (target?.isReal && target.convexId) {
      sendCounterCvx({ id: target.convexId, fromParty, fields, note }).catch(() => {});
      setCounterModal(null);
      return;
    }
    setProposals((prev) => {
      const next = prev.map((p) => {
        if (p.id !== proposalId) return p;
        const version = (p.contractHistory?.length ?? 0) + 1;
        const newEntry = { version, fields, modifiedBy: fromParty, timestamp: new Date().toISOString(), note };
        return {
          ...p,
          contractHistory: [...(p.contractHistory || []), newEntry],
          counterPending: fromParty === 'host' ? 'creator' : 'host',
          signatures: emptySignatures(),
        };
      });
      saveApplications(next);
      return next;
    });
    setCounterModal(null);
  }

  // ── Sign ──
  function handleSign(proposalId, party, signerName) {
    const target = allProposals.find((p) => p.id === proposalId);
    if (target?.isReal && target.convexId) {
      signContractCvx({ id: target.convexId, party, signerName }).catch(() => {});
      setSignModal(null);
      return;
    }
    setProposals((prev) => {
      const next = prev.map((p) => {
        if (p.id !== proposalId) return p;
        const version = p.contractHistory?.length ?? 0;
        const now = new Date().toISOString();
        const newSigs = { ...p.signatures };
        if (party === 'host') {
          newSigs.hostSignature = signerName;
          newSigs.hostSignedAt  = now;
          newSigs.hostSignedVersion = version;
        } else {
          newSigs.creatorSignature = signerName;
          newSigs.creatorSignedAt  = now;
          newSigs.creatorSignedVersion = version;
        }
        const bothSigned = newSigs.hostSignature && newSigs.creatorSignature &&
                           newSigs.hostSignedVersion === newSigs.creatorSignedVersion;
        return {
          ...p,
          signatures: newSigs,
          locked: bothSigned,
          status: bothSigned ? 'approved' : p.status,
          counterPending: bothSigned ? null : p.counterPending,
        };
      });
      saveApplications(next);
      return next;
    });
    setSignModal(null);
  }

  // ── Clear declined ──
  function handleClearDeclined() {
    setProposals((prev) => {
      const next = prev.map((p) => p.status === 'declined' ? { ...p, hidden: true } : p);
      saveApplications(next);
      return next;
    });
    setShowClearDeclined(false);
  }

  // ── DnD ──
  function handleDragStart({ active }) { setActiveId(active.id); setExpanded(null); }
  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;
    const proposal = allProposals.find((p) => p.id === active.id);
    if (!proposal || proposal.status === over.id) return;
    handleStatusChange(active.id, over.id);
    setFlashStage(over.id);
    setTimeout(() => setFlashStage(null), 600);
  }

  const activeProposal = activeId ? allProposals.find((p) => p.id === activeId) : null;
  const dragging = !!activeId;

  // Filtering (hidden proposals excluded everywhere)
  const visible    = allProposals.filter((p) => !p.hidden);
  const byListing  = visible.filter((p) => listingFilter === 'All Listings' || p.listing === listingFilter);
  const byStage    = tab === 'all'        ? byListing : byListing.filter((p) => p.status === tab);
  const byType     = typeFilter === 'all' ? byStage   : byStage.filter((p) => p.type === typeFilter);
  const filtered   = search.trim()
    ? byType.filter((p) => {
        const q = search.trim().toLowerCase();
        return p.creator?.name?.toLowerCase().includes(q) || p.listing?.toLowerCase().includes(q);
      })
    : byType;

  const stageCounts = STAGE_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? byListing.length : byListing.filter((p) => p.status === t.key).length;
    return acc;
  }, {});

  const typeCounts = { all: byStage.length, application: byStage.filter((p) => p.type === 'application').length, pitch: byStage.filter((p) => p.type === 'pitch').length };
  const pendingCount = visible.filter((p) => p.status === 'pending').length;
  const declinedCount = byListing.filter((p) => p.status === 'declined').length;

  function resetTypeOnTabChange(newTab) { setTab(newTab); setExpanded(null); }

  // Real dashboard data — replaces ProposalsOverview's mock defaults wherever
  // we have a clean, honest mapping onto existing Convex records.
  const statValues = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = (rawPitches || []).filter((p) => p.created_at >= weekAgo).length;
    const approvedListings = new Set(allProposals.filter((p) => p.status === 'approved').map((p) => p.listing).filter(Boolean));
    const paidFees = (hostBilling || []).filter((f) => f.status === 'paid');
    const now = new Date();
    const paidThisMonth = paidFees.filter((f) => {
      const d = new Date(f.paid_at ?? f.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const spendThisMonth = paidThisMonth.reduce((sum, f) => sum + (f.amount || 0), 0);

    return {
      new:    { value: String(stageCounts.pending ?? 0), sub: `+${newThisWeek} this week` },
      review: { value: String(stageCounts.under_review ?? 0), sub: 'Awaiting your review' },
      active: { value: String(stageCounts.approved ?? 0), sub: `Across ${approvedListings.size} listing${approvedListings.size === 1 ? '' : 's'}` },
      spend:  { value: `$${spendThisMonth.toLocaleString()}`, sub: 'This month' },
    };
  }, [rawPitches, allProposals, stageCounts, hostBilling]);

  const chartData = useMemo(() => {
    const year = new Date().getFullYear();
    const volume = bucketByMonth(rawPitches || [], (p) => new Date(p.created_at), () => 1, year);
    const money = bucketByMonth(
      (hostBilling || []).filter((f) => f.status === 'paid'),
      (f) => new Date(f.paid_at ?? f.created_at),
      (f) => f.amount || 0,
      year
    );
    return { money: toMonthSeries(money), volume: toMonthSeries(volume) };
  }, [rawPitches, hostBilling]);

  const todoItems = useMemo(() => {
    const items = [];
    (rawPitches || []).forEach((p) => {
      if (p.status === 'pending') {
        items.push({ type: 'pending_action', title: `Review ${p.creator_name || 'a creator'}'s application — ${p.listing_title || 'your listing'}`, date: isoDate(new Date(p.created_at)) });
      } else if (p.counter_pending === 'host') {
        items.push({ type: 'pending_action', title: `Respond to counter-pitch — ${p.creator_name || 'a creator'}`, date: isoDate(new Date(p.created_at)) });
      }
    });
    return items;
  }, [rawPitches]);

  function handleStatClick(presetKey) {
    const stageByPreset = {
      new_applications: 'pending',
      pending_review:   'under_review',
      active_collabs:   'approved',
      completed:        'completed',
    };
    const stage = stageByPreset[presetKey];
    if (stage) setTab(stage);
    setTypeFilter('all');
    setListingFilter('All Listings');
    setExpanded(null);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ minHeight: '100dvh' }}>
        <style>{`
          @keyframes tab-flash { 0%{box-shadow:0 0 0 3px rgba(25,37,36,0.18)} 60%{box-shadow:0 0 0 5px rgba(25,37,36,0.1)} 100%{box-shadow:none} }
        `}</style>

        <ProposalsOverview role="host" search={search} onSearchChange={setSearch} onStatClick={handleStatClick} statValues={statValues} chartData={chartData} todoItems={todoItems}>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2rem)', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>{t('header.heading')}</h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: '0.25rem' }}>{t('header.subtitle', { total: visible.length, pending: pendingCount })}</p>
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setDropOpen(!dropOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9999, background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', backdropFilter: 'blur(12px)', fontFamily: 'var(--font-body)' }}>
                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listingFilter}</span>
                <ChevronDown size={13} />
              </button>
              {dropOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(24px) saturate(140%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: '0.875rem', boxShadow: '0 12px 40px rgba(25,37,36,0.14)', zIndex: 40, minWidth: 200, overflow: 'hidden' }}>
                  {listingNames.map((name) => (
                    <button key={name} onClick={() => { setListingFilter(name); setDropOpen(false); setExpanded(null); }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: listingFilter === name ? 'var(--mint)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: listingFilter === name ? 700 : 500, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}
                      onMouseEnter={(e) => { if (listingFilter !== name) e.currentTarget.style.background = 'rgba(25,37,36,0.04)'; }}
                      onMouseLeave={(e) => { if (listingFilter !== name) e.currentTarget.style.background = 'transparent'; }}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stage tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem', flexWrap: 'wrap', padding: dragging ? '0.5rem 0.625rem' : '0', background: dragging ? 'rgba(255,255,255,0.55)' : 'transparent', backdropFilter: dragging ? 'blur(16px) saturate(140%)' : undefined, WebkitBackdropFilter: dragging ? 'blur(16px) saturate(140%)' : undefined, border: `1.5px solid ${dragging ? 'rgba(255,255,255,0.75)' : 'transparent'}`, borderRadius: '1.25rem', boxShadow: dragging ? '0 4px 20px rgba(25,37,36,0.07)' : 'none', transition: 'all 250ms cubic-bezier(0.32,0.72,0,1)' }}>
            {STAGE_TABS.map((st) => (
              <DroppableTab key={st.key} stageKey={st.key} label={stageLabel(st.key)} count={stageCounts[st.key]} active={tab === st.key} isFlashing={flashStage === st.key} dragging={dragging} currentDragStatus={activeProposal?.status} onClick={() => resetTypeOnTabChange(st.key)} />
            ))}
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', alignItems: 'center' }}>
            {TYPE_TABS.map((tt) => {
              const active = typeFilter === tt.key;
              const count  = typeCounts[tt.key];
              const isPitchTab = tt.key === 'pitch';
              return (
                <button key={tt.key} onClick={() => { setTypeFilter(tt.key); setExpanded(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.75rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: active ? (isPitchTab ? 'rgba(209,235,219,0.7)' : 'rgba(25,37,36,0.08)') : 'transparent', color: active ? (isPitchTab ? '#2d7d5e' : 'var(--ink)') : 'var(--sage)', border: `1px solid ${active ? (isPitchTab ? 'rgba(149,157,144,0.4)' : 'rgba(25,37,36,0.15)') : 'transparent'}`, cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)' }}>
                  {isPitchTab && <Sparkles size={10} />}
                  {typeLabel(tt.key)}
                  {count > 0 && <span style={{ padding: '1px 5px', borderRadius: 9999, fontSize: '0.62rem', fontWeight: 700, lineHeight: 1.5, background: active ? 'rgba(25,37,36,0.1)' : 'rgba(25,37,36,0.06)', color: active ? 'inherit' : 'var(--slate)' }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Clear All Declined header */}
          {tab === 'declined' && declinedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>{t('declinedHeader.count', { count: declinedCount })}</span>
              <button onClick={() => setShowClearDeclined(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 9999, border: '1px solid rgba(200,104,104,0.3)', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#9b2d2d', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Trash2 size={11} /> {t('declinedHeader.clearAll')}
              </button>
            </div>
          )}

          {/* List */}
          {rawPitches === undefined ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} variant="proposal" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: '1.25rem', padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                {allProposals.length === 0
                  ? t('empty.noProposalsYet')
                  : t('empty.noFilteredProposals', { filters: [typeFilter !== 'all' ? typeLabel(typeFilter).toLowerCase() : '', tab !== 'all' ? stageLabel(tab).toLowerCase() : ''].filter(Boolean).join(' ') + (typeFilter !== 'all' || tab !== 'all' ? ' ' : '') })}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)', margin: 0 }}>
                {allProposals.length === 0
                  ? t('empty.onceCreatorsApply')
                  : t('empty.tryDifferentFilter')}
              </p>
            </div>
          ) : (
            filtered.map((p) => (
              <DraggableProposalCard key={p.id} proposal={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onStatusChange={handleStatusChange}
                onCounter={(proposalId, fromParty) => setCounterModal({ proposalId, fromParty })}
                onSign={(proposalId, party) => setSignModal({ proposalId, party })}
                onCreatorClick={(creator) => setPopupCreator(creator)}
              />
            ))
          )}
        </div>

        </ProposalsOverview>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeProposal ? (
            <div style={{ background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(25,37,36,0.14)', borderRadius: '1rem', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 24px 48px rgba(25,37,36,0.22)', transform: 'rotate(1.5deg) scale(1.03)', cursor: 'grabbing', width: 340 }}>
              <CreatorAvatar src={activeProposal.creator.avatar} name={activeProposal.creator.name} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>{activeProposal.creator.name}</div>
                <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 2 }}>{activeProposal.listing}</div>
              </div>
              <span style={{ marginLeft: 'auto', flexShrink: 0, padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: STATUS_CFG[activeProposal.status]?.bg, color: STATUS_CFG[activeProposal.status]?.color }}>
                {statusLabel(activeProposal.status)}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Counter pitch modal */}
      {counterModal && (() => {
        const proposal = allProposals.find((p) => p.id === counterModal.proposalId);
        return proposal ? (
          <CounterPitchModal proposal={proposal} fromParty={counterModal.fromParty}
            onSend={(fields, note) => handleSendCounter(counterModal.proposalId, counterModal.fromParty, fields, note)}
            onClose={() => setCounterModal(null)} />
        ) : null;
      })()}

      {/* Signature modal */}
      {signModal && (() => {
        const proposal = allProposals.find((p) => p.id === signModal.proposalId);
        return proposal ? (
          <SignatureModal proposal={proposal} party={signModal.party}
            onSign={(name) => handleSign(signModal.proposalId, signModal.party, name)}
            onClose={() => setSignModal(null)} />
        ) : null;
      })()}

      {/* Creator profile popup */}
      {popupCreator && (
        <ProfilePopupCard
          person={{
            name:         popupCreator.name,
            username:     popupCreator.username,
            avatar:       popupCreator.avatar,
            location:     popupCreator.location,
            tier:         popupCreator.tier,
            followers:    popupCreator.followers,
            engagement:   popupCreator.engagement,
            collab_count: popupCreator.collab_count,
            platforms:    popupCreator.platforms || [],
            niches:       [],
            isFounder:    false,
            past_collab:  false,
            portfolioUrl: popupCreator.portfolio ? `https://${popupCreator.portfolio}` : null,
            travelCalendar: [],
          }}
          onClose={() => setPopupCreator(null)}
          onMessage={() => { setPopupCreator(null); navigate('/inbox'); }}
        />
      )}

      {/* Clear Declined confirmation */}
      {showClearDeclined && (
        <div onClick={() => setShowClearDeclined(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.97)', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 20px 60px rgba(25,37,36,0.2)' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate)', margin: '0 0 0.75rem' }}>{t('clearDeclinedModal.heading')}</h4>
            <p style={{ color: 'var(--sage)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              {t('clearDeclinedModal.body', { count: declinedCount })}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowClearDeclined(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>{t('clearDeclinedModal.cancel')}</button>
              <button onClick={handleClearDeclined} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: 'none', background: 'rgba(200,104,104,0.85)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>{t('clearDeclinedModal.removeAll')}</button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
