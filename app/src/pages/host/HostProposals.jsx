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
import { STAGES } from '../../lib/mockData';
import { STAGE_KEYS } from '../../lib/collabStages';
import { SAMPLE_PROPOSALS } from '../../lib/sampleProposals';
import {
  MessageSquare, ChevronDown, ChevronUp, ExternalLink, Sparkles,
  GripVertical, Lock, Download, Pen, CheckCircle2, Trash2, X, ArrowLeft,
  AlertTriangle, FileText, FolderOpen, Image as ImageIcon, DollarSign,
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

// Status chips were removed from the board: the column a card sits in *is*
// its status, so a chip only repeated it (and could contradict it when stage
// and pitch status drifted apart).

const TIER_COLORS = {
  'UGC Beginner':     { bg: 'rgba(209,235,219,0.6)', color: 'var(--ink)' },
  'UGC Pro':          { bg: 'rgba(60,87,89,0.12)',   color: '#3C5759'    },
  'Micro Influencer': { bg: 'rgba(123,104,200,0.12)',color: '#5b4db8'    },
  'Influencer':       { bg: 'rgba(212,168,67,0.15)', color: '#b45309'    },
};

function tierDef(tier) { return i18nInstance.t(`hostProposals:tierDefs.${tier}`); }

// Pitch-status buckets — still used to compute stat-card sub-counts (the
// board itself groups by collaboration stage, not pitch status).
const STAGE_TABS = [
  { key: 'all' },
  { key: 'pending' },
  { key: 'under_review' },
  { key: 'approved' },
  { key: 'completed' },
  { key: 'declined' },
];

const TYPE_TABS = [
  { key: 'all' },
  { key: 'application' },
  { key: 'pitch' },
];
function typeLabel(key) { return i18nInstance.t(`hostProposals:typeLabels.${key}`); }

const PITCH_BORDER_CLOSED   = '1.5px solid rgba(209,235,219,0.9)';
const PITCH_SHADOW_CLOSED   = '0 2px 12px rgba(25,37,36,0.05), 0 0 0 1px rgba(209,235,219,0.5)';


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

// Who settles the creator's cash on completion, and for how much.
// 'platform' — Collabnb charges the host and forwards the payout after a 48h
// dispute hold. 'in_person' — the host pays the creator directly; Collabnb
// only charges its own platform fee. Mirrors listings.payout_handling.
// The contract is the agreement both parties signed, so its snapshot wins over
// the listing's current setting — a host who flips their listing's payment
// method later must not change what an existing collab was agreed under.
// Falls back to the listing only when no contract exists yet.
function resolvePayout(proposal, listing, contract) {
  const source = contract?.payout_handling ? contract : listing;
  const handling = source?.payout_handling === 'in_person' ? 'in_person' : 'platform';

  let amount = null;
  const negotiated = getLatestFields(proposal).compensation;
  if (contract?.payment && contract.payment !== 'Free Stay') amount = String(contract.payment);
  else if (typeof contract?.cash_value === 'number' && contract.cash_value > 0) amount = `$${contract.cash_value.toLocaleString()}`;
  else if (negotiated) amount = String(negotiated);
  else if (typeof listing?.cash_amount === 'number' && listing.cash_amount > 0) amount = `$${listing.cash_amount.toLocaleString()}`;
  else if (listing?.compensation) amount = String(listing.compensation);
  return { handling, amount };
}

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

// ─── Inline host → creator message panel ─────────────────────────────────────
function HostMessagePanel({ threadKey, creatorName, fill = false }) {
  const { t } = useTranslation('hostProposals');
  const { profile } = useAuth();
  // Preview cards carry a synthetic thread key that no Convex row matches —
  // skip the query rather than firing a request that can only fail.
  const isPreviewThread = String(threadKey || '').startsWith('preview_');
  const convexMessages = useQuery(api.threadMessages.getByThread, isPreviewThread ? 'skip' : { threadKey }) ?? (isPreviewThread ? [] : undefined);
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
    <div style={{
      padding: '16px 24px', background: 'rgba(239,236,233,0.2)',
      borderTop: fill ? 'none' : '1px solid rgba(25,37,36,0.07)',
      ...(fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}),
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, flexShrink: 0 }}>
        {t('messagePanel.heading', { creatorName })}
      </div>

      {/* Message list */}
      <div style={{ ...(fill ? { flex: 1, minHeight: 0 } : { maxHeight: 200 }), overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
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
// ─── Compact "next steps" stepper — mirrors STAGES, no interactivity needed ──
function MiniStageProgress({ currentStage }) {
  const { t } = useTranslation('hostProposals');
  const curIdx = STAGE_KEYS.indexOf(currentStage);
  const currentLabel = STAGES.find((s) => s.key === currentStage)?.label || currentStage;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 2px 8px' }}>
        {STAGES.map((stage, i) => {
          const done = i < curIdx;
          const active = i === curIdx;
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : '0 0 auto' }}>
              <div title={stage.label} style={{
                width: active ? 10 : 8, height: active ? 10 : 8, borderRadius: '50%', flexShrink: 0,
                background: done || active ? '#4A9B7F' : 'rgba(25,37,36,0.15)',
                boxShadow: active ? '0 0 0 3px rgba(74,155,127,0.22)' : 'none',
                transition: 'all 150ms',
              }} />
              {i < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? '#4A9B7F' : 'rgba(25,37,36,0.12)', margin: '0 3px' }} />
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
        {t('drawer.currentStage', { stage: currentLabel })}
      </p>
    </div>
  );
}

function ProposalDrawer({ proposal, onStatusChange, onCounter, onSign, onClose, onStageChange, onTerminate, onCreatorClick, onConfirmComplete, listingById, contractById }) {
  const { t } = useTranslation('hostProposals');
  const navigate = useNavigate();
  const isPitch = proposal.type === 'pitch';
  const { signatures = emptySignatures(), contractHistory = [], locked } = proposal;
  const listing = (proposal.listingId ? listingById?.[String(proposal.listingId)] : null) || proposal.listingDetails || null;
  const contract = proposal.contractId ? contractById?.[String(proposal.contractId)] : null;
  const listingImage = listing?.image || proposal.listingImage || null;
  const tierColor = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];

  const version = contractHistory.length;
  const hostSigned    = !!signatures.hostSignature    && signatures.hostSignedVersion    === version;
  const creatorSigned = !!signatures.creatorSignature && signatures.creatorSignedVersion === version;

  const stageIdx  = STAGE_KEYS.indexOf(proposal.collabStage);
  const prevStage = stageIdx > 0 ? STAGE_KEYS[stageIdx - 1] : null;
  const nextStage = stageIdx >= 0 && stageIdx < STAGE_KEYS.length - 1 ? STAGE_KEYS[stageIdx + 1] : null;
  const stageLabelOf = (k) => STAGES.find((st) => st.key === k)?.label || k;
  const canMoveStage = proposal.status !== 'declined' && (!!proposal.convexCollabId || proposal.isPreview);

  // Once the collab has moved past Pending it's a live agreement: approving is
  // moot, and ending it needs the creator's agreement too.
  const isAccepted = proposal.collabStage !== 'pending' || proposal.status === 'approved' || proposal.status === 'completed';
  const payout = resolvePayout(proposal, listing, contract);
  const contractFields = getLatestFields(proposal);
  const contractRows = CONTRACT_FIELDS.filter((f) => contractFields[f.key]);
  const [listingOpen, setListingOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  return (
    <div style={{ background: '#fff', border: '1.5px solid rgba(25,37,36,0.1)', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 8px 32px rgba(25,37,36,0.1)' }}>

      {/* Header — creator identity + close */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <CreatorAvatar src={proposal.creator.avatar} name={proposal.creator.name} size={40}
          onClick={() => onCreatorClick?.(proposal.creator)}
          title={t('drawer.viewProfile')}
          style={{ border: '1.5px solid rgba(25,37,36,0.07)', flexShrink: 0, cursor: 'pointer' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              onClick={() => onCreatorClick?.(proposal.creator)}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >{proposal.creator.name}</span>
            <span title={tierDef(proposal.creator.tier)} style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: tierColor.bg, color: tierColor.color }}>{proposal.creator.tier}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 2 }}>{proposal.listing} · {proposal.applied}</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label={t('drawer.close')}
            style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(25,37,36,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Completed — what happens to the creator's money, kept visible so the
          host can refer back to it after the confirmation dialog is gone. */}
      {proposal.status === 'completed' && (
        <div style={{ padding: '12px 20px', background: 'rgba(74,155,127,0.08)', borderBottom: '1px solid rgba(74,155,127,0.22)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <DollarSign size={14} color="#2d7d5e" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#2d7d5e', margin: 0 }}>
              {payout.handling === 'platform' ? t('drawer.payout.platformTitle') : t('drawer.payout.inPersonTitle')}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--slate)', margin: '3px 0 0', lineHeight: 1.5 }}>
              {payout.handling === 'platform'
                ? t('drawer.payout.platformBody')
                : t('drawer.payout.inPersonBody', {
                    name: proposal.creator.name,
                    amount: payout.amount || t('drawer.payout.agreedAmount'),
                  })}
            </p>
          </div>
        </div>
      )}

      {/* Termination pending — surfaced above everything else */}
      {proposal.terminationRequestedBy && (
        <div style={{ padding: '12px 20px', background: 'rgba(200,104,104,0.09)', borderBottom: '1px solid rgba(200,104,104,0.22)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <AlertTriangle size={14} color="#9b2d2d" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 160, fontSize: 12, fontWeight: 600, color: '#9b2d2d' }}>
            {proposal.terminationRequestedBy === 'host'
              ? t('drawer.terminationAwaitingCreator')
              : t('drawer.terminationRequestedByCreator')}
          </span>
          {proposal.terminationRequestedBy === 'host' ? (
            <button onClick={() => onTerminate?.(proposal, 'cancel')}
              style={{ padding: '6px 14px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.35)', background: 'transparent', fontSize: 11.5, fontWeight: 700, color: '#9b2d2d', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {t('drawer.withdrawTermination')}
            </button>
          ) : (
            <button onClick={() => onTerminate?.(proposal, 'confirm')}
              style={{ padding: '6px 14px', borderRadius: 9999, border: 'none', background: 'rgba(200,104,104,0.85)', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {t('drawer.confirmTermination')}
            </button>
          )}
        </div>
      )}

      {/* Two-pane body — details on the left, live conversation on the right */}
      <div className="hp-expanded-body" style={{ display: 'flex', alignItems: 'stretch', minHeight: 460 }}>
        <div className="hp-expanded-main" style={{ flex: '1 1 58%', minWidth: 0, maxHeight: '70vh', overflowY: 'auto' }}>

      {/* Next steps + stage controls */}
      {proposal.status !== 'declined' && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
          <MiniStageProgress currentStage={proposal.collabStage} />
          {canMoveStage && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => prevStage && onStageChange?.(proposal, prevStage)}
                disabled={!prevStage}
                aria-label={prevStage ? t('drawer.moveToStage', { stage: stageLabelOf(prevStage) }) : undefined}
                title={prevStage ? t('drawer.moveToStage', { stage: stageLabelOf(prevStage) }) : undefined}
                style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent',
                  cursor: prevStage ? 'pointer' : 'not-allowed', opacity: prevStage ? 1 : 0.35,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)',
                }}
              >
                <ArrowLeft size={15} />
              </button>
              <button
                onClick={() => nextStage && onStageChange?.(proposal, nextStage)}
                disabled={!nextStage}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none',
                  background: nextStage ? 'var(--ink)' : 'rgba(25,37,36,0.08)',
                  color: nextStage ? '#fff' : 'var(--sage)',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                  cursor: nextStage ? 'pointer' : 'not-allowed',
                }}
              >
                {nextStage ? t('drawer.moveToStage', { stage: stageLabelOf(nextStage) }) : t('drawer.finalStage')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Listing — photo, name, and an inline expand for the full terms */}
      <div style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
          {listingImage ? (
            <img src={listingImage} alt={proposal.listing}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{ width: 60, height: 60, borderRadius: '0.75rem', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(25,37,36,0.08)' }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: '0.75rem', flexShrink: 0, background: 'rgba(25,37,36,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={18} color="var(--stone)" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{proposal.listing}</div>
            {listing?.location && (
              <p style={{ fontSize: 11.5, color: 'var(--sage)', margin: '2px 0 0' }}>{listing.location}</p>
            )}
          </div>
          <button onClick={() => setListingOpen((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.14)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {listingOpen ? t('drawer.hideListing') : t('drawer.viewListing')}
            {listingOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {listingOpen && (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{ background: 'rgba(239,236,233,0.45)', borderRadius: '0.875rem', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: t('drawer.listingFields.compensation'), value: listing?.compensation },
                { label: t('drawer.listingFields.deliverables'), value: listing?.deliverables },
                { label: t('drawer.listingFields.nights'), value: listing?.nights },
                { label: t('drawer.listingFields.turnaround'), value: listing?.turnaround_days ? t('drawer.days', { count: listing.turnaround_days }) : null },
                { label: t('drawer.listingFields.dates'), value: listing?.collab_start && listing?.collab_end ? `${listing.collab_start} – ${listing.collab_end}` : null },
                { label: t('drawer.listingFields.stay'), value: proposal.checkIn
                    ? [proposal.checkIn, proposal.checkOut].filter(Boolean)
                        .map((ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))
                        .join(' – ')
                    : null },
              ].filter((r) => r.value !== null && r.value !== undefined && r.value !== '').map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--sage)', minWidth: 104, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{String(value)}</span>
                </div>
              ))}
              {!listing && (
                <p style={{ fontSize: 11.5, color: 'var(--sage)', margin: 0 }}>{t('drawer.listingUnavailable')}</p>
              )}
              {proposal.listingId && (
                <button onClick={() => navigate(`/host/listing/${proposal.listingId}`)}
                  style={{ alignSelf: 'flex-start', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.14)', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
                  <ExternalLink size={11} /> {t('drawer.openListingPage')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contract — collapsible, always reachable */}
      <div style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
        <button onClick={() => setContractOpen((v) => !v)}
          style={{ width: '100%', padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)' }}>
          <FileText size={13} color="var(--sage)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{t('drawer.contract')}</span>
          {locked && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 9999, fontSize: 9.5, fontWeight: 700, background: 'rgba(74,155,127,0.12)', color: '#2d7d5e' }}>
              <Lock size={8} /> {t('card.locked')}
            </span>
          )}
          {contractOpen ? <ChevronUp size={13} color="var(--sage)" /> : <ChevronDown size={13} color="var(--sage)" />}
        </button>

        {contractOpen && (
          <div style={{ padding: '0 20px 14px' }}>
            {contractRows.length > 0 ? (
              <div style={{ background: 'rgba(239,236,233,0.45)', borderRadius: '0.875rem', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {contractRows.map(({ key }) => (
                  <div key={key} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--sage)', minWidth: 104, flexShrink: 0 }}>{contractFieldLabel(key)}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{String(contractFields[key])}</span>
                  </div>
                ))}
                <button onClick={() => openContractPdf(proposal)}
                  style={{ alignSelf: 'flex-start', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.14)', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
                  <Download size={11} /> {t('drawer.saveContractPdf')}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 11.5, color: 'var(--sage)', margin: 0 }}>{t('drawer.noContractYet')}</p>
            )}
          </div>
        )}
      </div>

      {/* Drive folder the creator is submitting into */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FolderOpen size={13} color="var(--sage)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--slate)', flexShrink: 0 }}>{t('drawer.driveFolder')}</span>
        {proposal.driveUrl ? (
          <a href={proposal.driveUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proposal.driveUrl}
          </a>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--sage)', fontStyle: 'italic' }}>{t('drawer.driveNotSubmitted')}</span>
        )}
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
              <button onClick={() => onTerminate?.(proposal, isAccepted ? 'request' : 'immediate')}
                style={{ padding: '9px 16px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('drawer.terminate')}
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
              <button onClick={() => onTerminate?.(proposal, isAccepted ? 'request' : 'immediate')}
                style={{ padding: '9px 16px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('drawer.terminate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standard actions (non-pitch or other statuses) ──
           Approve only exists while the proposal is still undecided; once the
           collab is live the only exits are Complete or a mutual termination. */}
      {!locked && !(proposal.status === 'under_review' && isPitch) && proposal.status !== 'declined' && (
        <div style={{ padding: '14px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isAccepted && (
            <>
              <button onClick={() => onStatusChange(proposal.id, 'approved')}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 120 }}>
                {t('drawer.approve')}
              </button>
              {proposal.status === 'pending' && (
                <button onClick={() => onStatusChange(proposal.id, 'under_review')}
                  style={{ padding: '10px 18px', borderRadius: 9999, border: '1.5px solid rgba(123,104,200,0.35)', background: 'transparent', color: '#5b4db8', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t('drawer.moveToReview')}
                </button>
              )}
            </>
          )}
          {isAccepted && proposal.status !== 'completed' && (
            <button onClick={() => onConfirmComplete?.(proposal)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 120 }}>
              {t('drawer.markCompleted')}
            </button>
          )}
          {!proposal.terminationRequestedBy && (
            <button onClick={() => onTerminate?.(proposal, isAccepted ? 'request' : 'immediate')}
              title={isAccepted ? t('drawer.terminateNeedsBoth') : undefined}
              style={{ padding: '10px 20px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t('drawer.terminate')}
            </button>
          )}
        </div>
      )}

        </div>

        {/* Right pane — live conversation with this creator */}
        <div className="hp-expanded-side" style={{ flex: '1 1 42%', minWidth: 300, borderLeft: '1px solid rgba(25,37,36,0.07)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
          {proposal.thread_key ? (
            <HostMessagePanel threadKey={proposal.thread_key} creatorName={proposal.creator.name} fill />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '2rem', background: 'rgba(239,236,233,0.2)' }}>
              <MessageSquare size={20} color="var(--stone)" />
              <p style={{ fontSize: 12.5, color: 'var(--sage)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>{t('messagePanel.empty')}</p>
              <button onClick={() => navigate('/inbox')}
                style={{ padding: '9px 18px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={13} /> {t('drawer.messageCreator')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Proposal card ────────────────────────────────────────────────────────────
// Compact, column-friendly card: identity on top, listing + status beneath.
// Follower stats, message preview and full profile live in the expanded view.
function ProposalCard({ proposal, expanded, onToggle, onCreatorClick, dragHandleListeners, dragHandleAttributes, noDrag = false }) {
  const { t: tr } = useTranslation('hostProposals');
  const tierColor = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];
  const isPitch = proposal.type === 'pitch';

  const cardBorder = expanded
    ? '1.5px solid rgba(74,155,127,0.45)'
    : isPitch ? PITCH_BORDER_CLOSED   : '1.5px solid rgba(255,255,255,0.85)';
  const cardShadow = expanded
    ? '0 0 0 3px rgba(74,155,127,0.14), 0 4px 20px rgba(25,37,36,0.08)'
    : isPitch ? PITCH_SHADOW_CLOSED   : '0 2px 10px rgba(25,37,36,0.05)';

  return (
    <div onClick={onToggle} style={{
      background: expanded ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(20px) saturate(135%)', WebkitBackdropFilter: 'blur(20px) saturate(135%)',
      border: cardBorder, borderRadius: '1rem', padding: '12px 14px', cursor: 'pointer',
      boxShadow: cardShadow, transition: 'all 200ms var(--ease-out-quart)',
      // Fixed height so every column reads as an even grid — each text row is
      // clamped to a single truncated line, so nothing can push this taller.
      height: 112, boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* Row 1 — grip, avatar, name + tier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {!noDrag && (
          <div {...dragHandleListeners} {...dragHandleAttributes} onClick={(e) => e.stopPropagation()}
            style={{ flexShrink: 0, color: 'var(--stone)', cursor: 'grab', padding: '2px 0', borderRadius: '0.375rem', touchAction: 'none', userSelect: 'none', transition: 'color 150ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--slate)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--stone)'; }}
            title={tr('card.dragToMoveStage')}>
            <GripVertical size={14} />
          </div>
        )}
        <CreatorAvatar
          src={proposal.creator.avatar} name={proposal.creator.name}
          size={34}
          onClick={e => { e.stopPropagation(); onCreatorClick(proposal.creator); }}
          title={tr('card.viewProfile')}
          style={{ border: '1.5px solid rgba(25,37,36,0.07)', cursor: 'pointer', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={e => { e.stopPropagation(); onCreatorClick(proposal.creator); }}
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={proposal.creator.name}
          >{proposal.creator.name}</div>
          {/* Tier + (for pitches only) a compact sparkle chip on the same
              line — nowrap so the row can never become two lines tall. */}
          <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', minWidth: 0 }}>
            <span title={tierDef(proposal.creator.tier)} style={{ padding: '2px 7px', borderRadius: 9999, fontSize: 9.5, fontWeight: 700, background: tierColor.bg, color: tierColor.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {proposal.creator.tier}
            </span>
            {isPitch && (
              <span title={tr('card.pitch')} aria-label={tr('card.pitch')}
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 16, borderRadius: 9999, background: 'rgba(209,235,219,0.85)', color: '#2d7d5e' }}>
                <Sparkles size={9} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 — listing */}
      <div style={{ fontSize: 11.5, color: 'var(--sage)', marginTop: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proposal.listing}>
        {proposal.listing}
      </div>

      {/* Row 3 — age. Status isn't shown: which column the card sits in is
          the status, so a chip would just repeat it (and could contradict it). */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, flexWrap: 'nowrap', minWidth: 0 }}>
        {proposal.terminationRequestedBy && (
          <span title={tr('card.terminationPending')} style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 9999, fontSize: 9.5, fontWeight: 700, background: 'rgba(200,104,104,0.12)', color: '#9b2d2d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            <AlertTriangle size={8} style={{ flexShrink: 0 }} /> {tr('card.terminationPending')}
          </span>
        )}
        <span style={{ fontSize: 10.5, color: 'var(--sage)', flexShrink: 0 }}>{proposal.applied}</span>
      </div>
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

// ─── Board column — no chrome of its own, just a heading and its cards ────────
function DroppableColumn({ stageKey, label, count, isFlashing, children }) {
  const { isOver, setNodeRef } = useDroppable({ id: stageKey });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0', minWidth: 236, maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10,
        borderRadius: '1rem', padding: '0.25rem',
        background: isOver ? 'rgba(74,155,127,0.07)' : 'transparent',
        outline: isOver ? '1.5px dashed rgba(74,155,127,0.45)' : '1.5px dashed transparent',
        outlineOffset: -2,
        animation: isFlashing ? 'tab-flash 600ms ease forwards' : undefined,
        transition: 'background 150ms, outline-color 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.15rem 0.35rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>{label}</h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 48 }}>
        {children}
      </div>
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
    listingId: p.listing_id,
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
  const advanceStageCvx = useMutation(api.collaborations.advanceStage);
  const requestTerminationCvx = useMutation(api.collaborations.requestTermination);
  const cancelTerminationCvx  = useMutation(api.collaborations.cancelTermination);
  const confirmTerminationCvx = useMutation(api.collaborations.confirmTermination);
  const rawPitches = useQuery(
    api.pitches.getByHost,
    hostId ? { hostId: String(hostId) } : 'skip'
  );
  const rawCollaborations = useQuery(
    api.collaborations.getByHost,
    hostId ? { hostId: String(hostId) } : 'skip'
  );
  const hostBilling = useQuery(
    api.fees.getBilling,
    hostId ? { hostId: String(hostId) } : 'skip'
  );
  const rawHostListings = useQuery(
    api.listings.getByHost,
    hostId ? { host_id: String(hostId) } : 'skip'
  );
  // Contracts carry the terms both sides actually agreed to — payout handling
  // and the stay window are snapshotted here, so they're the source of truth
  // over whatever the listing currently says.
  const rawContracts = useQuery(
    api.contracts.getForParty,
    hostId ? { userId: String(hostId) } : 'skip'
  );
  const contractById = useMemo(() => {
    const map = {};
    (rawContracts || []).forEach((c) => { map[String(c._id)] = c; });
    return map;
  }, [rawContracts]);
  const listingById = useMemo(() => {
    const map = {};
    (rawHostListings || []).forEach((l) => { map[String(l._id)] = l; });
    return map;
  }, [rawHostListings]);
  const pitchThreadKeys = useMemo(
    () => (rawPitches || []).filter((p) => p.thread_key).map((p) => p.thread_key),
    [rawPitches],
  );
  const hostUnreadMessages = useQuery(
    api.threadMessages.getHostUnreadCount,
    pitchThreadKeys.length > 0 ? { threadKeys: pitchThreadKeys } : { threadKeys: [] },
  ) ?? 0;

  const [typeFilter, setTypeFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('all');
  const [expanded, setExpanded]     = useState(null);
  const [activeId, setActiveId]     = useState(null);
  const [flashStage, setFlashStage] = useState(null);
  const [counterModal, setCounterModal] = useState(null);
  const [signModal, setSignModal]       = useState(null);
  const [showClearDeclined, setShowClearDeclined] = useState(false);
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [hiddenTick, setHiddenTick] = useState(0);
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

  // Real collaboration rows (production-stage tracking), keyed by their Convex
  // id so each pitch can look up its own via pitch.collaboration_id.
  const collabByConvexId = useMemo(() => {
    const map = {};
    (rawCollaborations || []).forEach((c) => { map[String(c._id)] = c; });
    return map;
  }, [rawCollaborations]);

  // Preview mode (?preview=1) appends client-side sample cards so the board
  // layout can be reviewed before there's real data. Never written to Convex.
  const [searchParams, setSearchParams] = useSearchParams();
  const previewMode = searchParams.get('preview') === '1';
  const [previewOverrides, setPreviewOverrides] = useState({});

  // Use only real Convex pitches once loaded; show empty state instead of mock data
  const allProposals = useMemo(() => {
    if (rawPitches === undefined) return []; // still loading
    const saved = loadApplications();
    const real = rawPitches.map((p) => {
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
      const base = hasConvexNegotiation
        ? { ...normalized, hidden: s.hidden ?? false }
        : {
            ...normalized,
            contractHistory: s.contractHistory ?? normalized.contractHistory,
            signatures:      s.signatures      ?? normalized.signatures,
            locked:          s.locked          ?? normalized.locked,
            counterPending:  s.counterPending  ?? normalized.counterPending,
            hidden:          s.hidden          ?? false,
          };
      // Board column placement — driven by the linked collaboration's real
      // current_stage (kept in sync by CollabContext.advanceStage). Pitches
      // without a linked collaboration yet (pre-dates this feature) default
      // to Pending rather than being lost.
      const convexCollabId = p.collaboration_id ? String(p.collaboration_id) : null;
      const collab = convexCollabId ? collabByConvexId[convexCollabId] : null;
      const contract = p.contract_id ? contractById[String(p.contract_id)] : null;
      return {
        ...base,
        convexCollabId,
        collabStage: collab?.current_stage || 'pending',
        driveUrl: collab?.drive_url || null,
        terminationRequestedBy: collab?.termination_requested_by || null,
        checkIn: typeof contract?.check_in === 'number' ? contract.check_in : null,
        checkOut: typeof contract?.check_out === 'number' ? contract.check_out : null,
      };
    });
    if (!previewMode) return real;
    return [...real, ...SAMPLE_PROPOSALS.map((s) => ({ ...s, ...(previewOverrides[s.id] || {}) }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPitches, hiddenTick, collabByConvexId, contractById, previewMode, previewOverrides]);

  // Deep-link from notifications, or clicking an Upcoming row on the Overview
  // tab: /host/proposals?pitch=<pitchId> expands that proposal and jumps to
  // the Activity tab (ProposalsOverview's tab state is internal, so a
  // changing "jump token" is the signal it watches for).
  const [activityJump, setActivityJump] = useState(0);
  useEffect(() => {
    const pitchParam = searchParams.get('pitch');
    if (!pitchParam) return;
    const match = allProposals.find((p) => String(p.id) === pitchParam);
    if (match) {
      setTypeFilter('all');
      setListingFilter('all');
      setExpanded(match.id);
      setActivityJump((j) => j + 1);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, allProposals, setSearchParams]);

  // One-time consumption of router state from HostDashboard's stat-card links
  // (/host/proposals with state:{filter:'pending'|'approved'}) — jumps to the
  // board and flashes the closest matching column.
  useEffect(() => {
    const f = location.state?.filter;
    if (!f) return;
    setActivityJump((j) => j + 1);
    setFlashStage(f === 'pending' ? 'pending' : 'accepted');
    setTimeout(() => setFlashStage(null), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listingNames = useMemo(() => (
    ['all', ...Array.from(new Set(allProposals.map((p) => p.listing)))]
  ), [allProposals]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Status / stage changes ──
  function handleStatusChange(id, newStatus) {
    // For real Convex pitches, sync status back
    const target = allProposals.find((p) => p.id === id);
    if (target?.isPreview) {
      setPreviewOverrides((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          status: newStatus,
          ...(newStatus === 'approved' && target.collabStage === 'pending' ? { collabStage: 'accepted' } : {}),
        },
      }));
      return;
    }
    if (target?.isReal && target.convexId) {
      updateStatusCvx({ id: target.convexId, status: newStatus }).catch(() => {});
    }
    // Approving is also a production decision: pull the card out of Pending so
    // the board never shows an approved proposal still sitting in Pending.
    if (newStatus === 'approved' && target?.convexCollabId && target.collabStage === 'pending') {
      advanceStageCvx({ id: target.convexCollabId, nextStage: 'accepted' }).catch(() => {});
    }
    setProposals((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
      saveApplications(next);
      return next;
    });
    // Expanded card stays open and re-renders against the updated record.
  }

  // ── Terminate ──
  // Before the collab is accepted the host can end it alone (it's just a
  // declined application). After acceptance it takes both sides: the host
  // requests, the creator confirms.
  function handleTerminate(proposal, action) {
    if (proposal?.isPreview) {
      setPreviewOverrides((prev) => {
        const cur = { ...(prev[proposal.id] || {}) };
        if (action === 'immediate') { cur.status = 'declined'; cur.terminationRequestedBy = null; }
        if (action === 'request')   { cur.terminationRequestedBy = 'host'; }
        if (action === 'cancel')    { cur.terminationRequestedBy = null; }
        if (action === 'confirm')   { cur.status = 'declined'; cur.collabStage = 'archived'; cur.terminationRequestedBy = null; }
        return { ...prev, [proposal.id]: cur };
      });
      return;
    }
    if (action === 'immediate') { handleStatusChange(proposal.id, 'declined'); return; }
    if (!proposal.convexCollabId) return;
    const args = { id: proposal.convexCollabId };
    if (action === 'request') requestTerminationCvx(args).catch(() => {});
    if (action === 'cancel')  cancelTerminationCvx(args).catch(() => {});
    if (action === 'confirm') confirmTerminationCvx(args).catch(() => {});
  }

  // ── Stage move from the expanded card (Next / Back) ──
  function handleStageChange(proposal, nextStage) {
    if (proposal?.isPreview) {
      setPreviewOverrides((prev) => ({ ...prev, [proposal.id]: { ...(prev[proposal.id] || {}), collabStage: nextStage } }));
    } else {
      if (!proposal?.convexCollabId) return;
      advanceStageCvx({ id: proposal.convexCollabId, nextStage }).catch(() => {});
    }
    setFlashStage(nextStage);
    setTimeout(() => setFlashStage(null), 600);
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
  // Operates on allProposals (the real Convex-backed data actually shown),
  // not the unused legacy `proposals` mock state. Merges into the existing
  // stored blob (never overwrite it wholesale — that would wipe negotiation
  // state for every other pitch) and bumps hiddenTick so the allProposals
  // memo (keyed only on rawPitches) actually recomputes.
  function handleClearDeclined() {
    const declinedIds = allProposals.filter((p) => p.status === 'declined' && !p.hidden).map((p) => String(p.id));
    const saved = loadApplications();
    declinedIds.forEach((id) => { saved[id] = { ...(saved[id] || {}), hidden: true }; });
    try { localStorage.setItem(APPS_KEY, JSON.stringify(saved)); } catch {}
    setHiddenTick((v) => v + 1);
    setShowClearDeclined(false);
  }

  // ── DnD ──
  function handleDragStart({ active }) { setActiveId(active.id); setExpanded(null); }
  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;
    const proposal = allProposals.find((p) => p.id === active.id);
    if (!proposal) return;
    const toKey = over.id;
    if (proposal.collabStage === toKey) return;
    // Free movement in both directions — the host owns the pipeline order.
    if (proposal.isPreview) {
      setPreviewOverrides((prev) => ({ ...prev, [proposal.id]: { ...(prev[proposal.id] || {}), collabStage: toKey } }));
    } else {
      if (!proposal.convexCollabId) return;
      advanceStageCvx({ id: proposal.convexCollabId, nextStage: toKey }).catch(() => {});
    }
    setFlashStage(toKey);
    setTimeout(() => setFlashStage(null), 600);
  }

  const activeProposal = activeId ? allProposals.find((p) => p.id === activeId) : null;
  const openProposal = expanded ? allProposals.find((p) => p.id === expanded) : null;

  // Filtering (hidden proposals excluded everywhere)
  const visible    = allProposals.filter((p) => !p.hidden);
  const byListing  = visible.filter((p) => listingFilter === 'all' || p.listing === listingFilter);
  const byType     = typeFilter === 'all' ? byListing : byListing.filter((p) => p.type === typeFilter);
  const searched   = search.trim()
    ? byType.filter((p) => {
        const q = search.trim().toLowerCase();
        return p.creator?.name?.toLowerCase().includes(q) || p.listing?.toLowerCase().includes(q);
      })
    : byType;

  // Declined sits outside the 6-stage production board (decline isn't a
  // production stage) — everything else is grouped into its real stage column.
  const declinedList = searched.filter((p) => p.status === 'declined');
  const boardList     = searched.filter((p) => p.status !== 'declined');
  const columnCards = STAGE_KEYS.reduce((acc, key) => {
    acc[key] = boardList.filter((p) => p.collabStage === key);
    return acc;
  }, {});

  const stageCounts = STAGE_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? byListing.length : byListing.filter((p) => p.status === t.key).length;
    return acc;
  }, {});

  const typeCounts = { all: byListing.length, application: byListing.filter((p) => p.type === 'application').length, pitch: byListing.filter((p) => p.type === 'pitch').length };
  const pendingCount = visible.filter((p) => p.status === 'pending').length;
  const declinedCount = declinedList.length;

  // Stays still ahead of today, soonest first — read from the contract's
  // agreed check-in, so a proposal with no contract simply has no stay.
  const upcomingStays = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return allProposals
      .filter((p) => !p.hidden && p.status !== 'declined' && typeof p.checkIn === 'number' && p.checkIn >= startOfToday.getTime())
      .sort((a, b) => a.checkIn - b.checkIn);
  }, [allProposals]);

  // Real dashboard data — replaces ProposalsOverview's mock defaults wherever
  // we have a clean, honest mapping onto existing Convex records.
  const statValues = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = (rawPitches || []).filter((p) => p.created_at >= weekAgo).length;
    const approvedListings = new Set(allProposals.filter((p) => p.status === 'approved').map((p) => p.listing).filter(Boolean));

    return {
      new:      { value: String(stageCounts.pending ?? 0), sub: `+${newThisWeek} this week` },
      active:   { value: String(stageCounts.approved ?? 0), sub: `Across ${approvedListings.size} listing${approvedListings.size === 1 ? '' : 's'}` },
      messages: { value: String(hostUnreadMessages), sub: hostUnreadMessages > 0 ? `${hostUnreadMessages} conversation${hostUnreadMessages === 1 ? '' : 's'}` : 'All caught up' },
      stays:    {
        value: String(upcomingStays.length),
        sub: upcomingStays.length > 0
          ? `Next ${new Date(upcomingStays[0].checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
          : 'No stays booked',
      },
    };
  }, [rawPitches, allProposals, stageCounts, hostUnreadMessages, upcomingStays]);

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
        items.push({ id: String(p._id), type: 'pending_action', title: `Review ${p.creator_name || 'a creator'}'s application — ${p.listing_title || 'your listing'}`, date: isoDate(new Date(p.created_at)) });
      } else if (p.counter_pending === 'host') {
        items.push({ id: String(p._id), type: 'pending_action', title: `Respond to counter-pitch — ${p.creator_name || 'a creator'}`, date: isoDate(new Date(p.created_at)) });
      }
    });
    // Agreed check-ins from signed contracts — the calendar had a stay_date
    // type defined but nothing was ever producing one.
    upcomingStays.forEach((p) => {
      items.push({
        id: String(p.id),
        type: 'stay_date',
        title: `${p.creator.name} checks in — ${p.listing}`,
        date: isoDate(new Date(p.checkIn)),
      });
    });
    return items;
  }, [rawPitches, upcomingStays]);

  function handleTodoClick(todo) {
    if (todo.id) setSearchParams({ pitch: todo.id });
  }

  function handleStatClick(presetKey) {
    // The board shows every column at once now — jump there and flash the
    // column closest to what was clicked, rather than filtering to one stage.
    const columnByPreset = { new_applications: 'pending', active_collabs: 'accepted' };
    const column = columnByPreset[presetKey];
    setTypeFilter('all');
    setListingFilter('all');
    setExpanded(null);
    if (column) {
      setFlashStage(column);
      setTimeout(() => setFlashStage(null), 1500);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ minHeight: '100dvh' }}>
        <style>{`
          @keyframes tab-flash { 0%{box-shadow:0 0 0 3px rgba(25,37,36,0.18)} 60%{box-shadow:0 0 0 5px rgba(25,37,36,0.1)} 100%{box-shadow:none} }
          @media (max-width: 900px) {
            .hp-expanded-body { flex-direction: column !important; }
            .hp-expanded-main { max-height: none !important; }
            .hp-expanded-side { border-left: none !important; min-width: 0 !important;
              border-top: 1px solid rgba(25,37,36,0.07); max-height: 420px !important; }
          }
        `}</style>

        <ProposalsOverview
          role="host" search={search} onSearchChange={setSearch} onStatClick={handleStatClick}
          statValues={statValues} chartData={chartData} todoItems={todoItems}
          onTodoClick={handleTodoClick} activityJump={activityJump}
          filters={[
            {
              key: 'listing', value: listingFilter,
              onChange: (v) => { setListingFilter(v); setExpanded(null); },
              options: listingNames.map((name) => ({ value: name, label: name === 'all' ? 'All Listings' : name })),
            },
            {
              key: 'type', value: typeFilter,
              onChange: (v) => { setTypeFilter(v); setExpanded(null); },
              options: TYPE_TABS.map((tt) => ({
                value: tt.key,
                label: `${typeLabel(tt.key)}${typeCounts[tt.key] ? ` (${typeCounts[tt.key]})` : ''}`,
              })),
            },
          ]}
        >

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>

          {previewMode && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '0.875rem',
              background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.35)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#8a6d1f' }}>
                Preview mode — the sample cards below are fake and exist only in this browser.
              </span>
              <button onClick={() => setSearchParams({}, { replace: true })}
                style={{ padding: '4px 12px', borderRadius: 9999, border: '1px solid rgba(212,168,67,0.5)', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#8a6d1f', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Exit preview
              </button>
            </div>
          )}

          {/* Header */}
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2rem)', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>{t('header.heading')}</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: '0.25rem' }}>{t('header.subtitle', { total: visible.length, pending: pendingCount })}</p>
          </div>

          {/* An open card takes over the board area entirely — page chrome
              (back button, search, title) stays put above it. */}
          {openProposal ? (
            <ProposalDrawer
              proposal={openProposal}
              onStatusChange={handleStatusChange}
              onStageChange={handleStageChange}
              onTerminate={handleTerminate}
              onConfirmComplete={(p) => setCompleteModal(p)}
              onCreatorClick={(creator) => setPopupCreator(creator)}
              onCounter={(proposalId, fromParty) => setCounterModal({ proposalId, fromParty })}
              onSign={(proposalId, party) => setSignModal({ proposalId, party })}
              onClose={() => setExpanded(null)}
              listingById={listingById}
              contractById={contractById}
            />
          ) : rawPitches === undefined ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} variant="proposal" />
              ))}
            </div>
          ) : allProposals.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: '1.25rem', padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>{t('empty.noProposalsYet')}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)', margin: 0 }}>{t('empty.onceCreatorsApply')}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'flex-start' }}>
                {STAGE_KEYS.map((key) => {
                  const stageDef = STAGES.find((s) => s.key === key);
                  const cards = columnCards[key] || [];
                  return (
                    <DroppableColumn key={key} stageKey={key} label={stageDef?.label || key} count={cards.length} isFlashing={flashStage === key}>
                      {cards.map((p) => (
                        <DraggableProposalCard key={p.id} proposal={p}
                          expanded={expanded === p.id}
                          onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                          onCreatorClick={(creator) => setPopupCreator(creator)}
                        />
                      ))}
                    </DroppableColumn>
                  );
                })}
              </div>

              {/* Declined — outside the production board */}
              {declinedList.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div
                    onClick={() => setDeclinedOpen((v) => !v)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.5rem 0.25rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {declinedOpen ? <ChevronUp size={14} color="var(--sage)" /> : <ChevronDown size={14} color="var(--sage)" />}
                      <span style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>{t('declinedHeader.count', { count: declinedCount })}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowClearDeclined(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 9999, border: '1px solid rgba(200,104,104,0.3)', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#9b2d2d', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      <Trash2 size={11} /> {t('declinedHeader.clearAll')}
                    </button>
                  </div>
                  {declinedOpen && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginTop: '0.5rem' }}>
                      {declinedList.map((p) => (
                        <ProposalCard key={p.id} proposal={p} noDrag
                          expanded={expanded === p.id}
                          onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                          onCreatorClick={(creator) => setPopupCreator(creator)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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

      {/* Mark-complete confirmation — spells out the payment consequence
          before the host commits, since completing triggers real money. */}
      {completeModal && (() => {
        const listing = completeModal.listingId ? listingById[String(completeModal.listingId)] : null;
        const modalContract = completeModal.contractId ? contractById[String(completeModal.contractId)] : null;
        const resolved = resolvePayout(completeModal, listing || completeModal.listingDetails || null, modalContract);
        return (
          <div onClick={() => setCompleteModal(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.97)', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 20px 60px rgba(25,37,36,0.2)' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.75rem' }}>
                {t('completeModal.heading', { name: completeModal.creator.name })}
              </h4>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0.875rem 1rem', borderRadius: '0.875rem', background: 'rgba(74,155,127,0.09)', border: '1px solid rgba(74,155,127,0.22)', marginBottom: '1.25rem' }}>
                <DollarSign size={15} color="#2d7d5e" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2d7d5e', margin: 0 }}>
                    {resolved.handling === 'platform' ? t('drawer.payout.platformTitle') : t('drawer.payout.inPersonTitle')}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--slate)', margin: '4px 0 0', lineHeight: 1.55 }}>
                    {resolved.handling === 'platform'
                      ? t('drawer.payout.platformBody')
                      : t('drawer.payout.inPersonBody', {
                          name: completeModal.creator.name,
                          amount: resolved.amount || t('drawer.payout.agreedAmount'),
                        })}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setCompleteModal(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>
                  {t('completeModal.cancel')}
                </button>
                <button onClick={() => { handleStatusChange(completeModal.id, 'completed'); setCompleteModal(null); }}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: 'none', background: 'rgba(74,155,127,0.9)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  {t('completeModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </DndContext>
  );
}
