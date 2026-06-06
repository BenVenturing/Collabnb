import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import ProfilePopupCard from '../../components/ProfilePopupCard';
import {
  MessageSquare, ChevronDown, ChevronUp, ExternalLink, Check, Sparkles,
  GripVertical, Lock, Download, Pen, CheckCircle2, Trash2,
} from 'lucide-react';
import {
  DndContext, DragOverlay,
  useDraggable, useDroppable,
  useSensor, useSensors, PointerSensor,
} from '@dnd-kit/core';

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
      { field: 'Compensation', original: 'Free Stay', proposed: 'Hybrid + $300 cash' },
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
  pending:      { label: 'Pending',      bg: 'rgba(212,168,67,0.15)',  border: 'rgba(212,168,67,0.4)',  color: '#b45309' },
  under_review: { label: 'Under Review', bg: 'rgba(123,104,200,0.12)', border: 'rgba(123,104,200,0.3)', color: '#5b4db8' },
  approved:     { label: 'Approved',     bg: 'rgba(74,155,127,0.12)',  border: 'rgba(74,155,127,0.3)',  color: '#2d7d5e' },
  completed:    { label: 'Completed',    bg: 'rgba(60,87,89,0.12)',    border: 'rgba(60,87,89,0.3)',    color: '#3C5759' },
  declined:     { label: 'Declined',     bg: 'rgba(200,104,104,0.1)',  border: 'rgba(200,104,104,0.25)',color: '#9b2d2d' },
};

const TIER_COLORS = {
  'UGC Beginner':     { bg: 'rgba(209,235,219,0.6)', color: 'var(--ink)' },
  'UGC Pro':          { bg: 'rgba(60,87,89,0.12)',   color: '#3C5759'    },
  'Micro Influencer': { bg: 'rgba(123,104,200,0.12)',color: '#5b4db8'    },
  'Influencer':       { bg: 'rgba(212,168,67,0.15)', color: '#b45309'    },
};

const TIER_DEFS = {
  'UGC Beginner':     '< 5K followers — New creators building their portfolio',
  'UGC Pro':          '5K–20K followers — Content creators, not influencer reach',
  'Micro Influencer': '5K–50K followers — Influencer-style content, engaged audience',
  'Influencer':       '50K+ followers — Broad reach, established audience',
};

const STAGE_TABS = [
  { key: 'all',          label: 'All'          },
  { key: 'pending',      label: 'Pending'      },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved',     label: 'Approved'     },
  { key: 'completed',    label: 'Completed'    },
  { key: 'declined',     label: 'Declined'     },
];

const TYPE_TABS = [
  { key: 'all',         label: 'All Types'    },
  { key: 'application', label: 'Applications' },
  { key: 'pitch',       label: 'Pitches'      },
];

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
  { key: 'nights',       label: 'Nights',       placeholder: 'e.g. 3' },
  { key: 'compensation', label: 'Compensation', placeholder: 'e.g. Free Stay or $500' },
  { key: 'deliverables', label: 'Deliverables', placeholder: 'e.g. 2 Reels + 5 Photos' },
  { key: 'turnaround',   label: 'Turnaround',   placeholder: 'e.g. 14 days' },
  { key: 'affiliate',    label: 'Affiliate %',  placeholder: 'e.g. 5% or —' },
  { key: 'extra_terms',  label: 'Extra Terms',  placeholder: 'Optional add-ons' },
];

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
  const rows = CONTRACT_FIELDS
    .filter(f => fields[f.key])
    .map(f => `<tr><td style="font-weight:700;width:140px;padding:10px 14px;border-bottom:1px solid #eee;">${f.label}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;">${fields[f.key]}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Collabnb Contract</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#192524;line-height:1.6}h1{font-size:22px;margin:0 0 4px}p.meta{color:#666;font-size:13px;margin:0 0 32px}table{width:100%;border-collapse:collapse;margin:24px 0}h2{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#666;margin:28px 0 8px}.sig-row{display:flex;gap:40px;margin-top:40px}.sig-box{flex:1;border-top:1px solid #ccc;padding-top:12px}.sig-name{font-size:20px;font-style:italic;margin-bottom:4px}.sig-label{font-size:11px;color:#666}.locked{display:inline-block;padding:3px 10px;border-radius:9999px;background:rgba(74,155,127,0.15);color:#2d7d5e;font-size:12px;font-weight:700;margin-bottom:24px}</style></head>
<body>
<h1>Collabnb Collaboration Contract</h1>
<p class="meta">${listing} · ${creator.name} (@${creator.username}) · ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
${proposal.locked ? '<span class="locked">CONTRACT LOCKED</span>' : ''}
<h2>Terms</h2><table>${rows}</table>
${contractHistory.length > 0 ? `<p style="font-size:12px;color:#666;margin-top:8px;">Negotiated over ${contractHistory.length} round${contractHistory.length!==1?'s':''}.</p>` : ''}
<h2>Signatures</h2>
<div class="sig-row">
  <div class="sig-box"><div class="sig-name">${signatures.hostSignature || '___________________________'}</div><div class="sig-label">Host · ${signatures.hostSignedAt ? new Date(signatures.hostSignedAt).toLocaleDateString() : 'Not yet signed'}</div></div>
  <div class="sig-box"><div class="sig-name">${signatures.creatorSignature || '___________________________'}</div><div class="sig-label">${creator.name} (Creator) · ${signatures.creatorSignedAt ? new Date(signatures.creatorSignedAt).toLocaleDateString() : 'Not yet signed'}</div></div>
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
  if (!history?.length) return null;
  return (
    <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', background: 'rgba(239,236,233,0.35)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Negotiation history</div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage)', padding: '3px 8px', borderRadius: 9999, background: 'rgba(25,37,36,0.06)' }}>Creator Pitch</span>
        {history.map((entry, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ color: 'var(--stone)', fontSize: 10, margin: '0 3px' }}>→</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: entry.modifiedBy === 'host' ? 'rgba(123,104,200,0.1)' : 'rgba(74,155,127,0.1)', color: entry.modifiedBy === 'host' ? '#5b4db8' : '#2d7d5e' }}>
              {entry.modifiedBy === 'host' ? 'Host' : 'Creator'} v{entry.version}
              {i === history.length - 1 && <span style={{ marginLeft: 4, opacity: 0.6 }}>← latest</span>}
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
  const [fields, setFields] = useState(() => getLatestFields(proposal));
  const [note, setNote] = useState('');
  const version = (proposal.contractHistory?.length ?? 0) + 1;
  const partyLabel = fromParty === 'host' ? 'Host' : proposal.creator.name;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '1.5rem', padding: '1.75rem', maxHeight: '88dvh', overflowY: 'auto', boxShadow: '0 32px 64px -16px rgba(25,37,36,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>Counter Pitch</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.2rem 0 0' }}>
              {proposal.creator.name} · {proposal.listing} · Version {version}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: '0.9rem' }}>✕</button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
          Editing as <strong style={{ color: 'var(--slate)' }}>{partyLabel}</strong> — adjust any terms, then send.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
          {CONTRACT_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>{label}</p>
              <input value={fields[key] || ''} onChange={(e) => setFields(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }} />
            </div>
          ))}
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem' }}>Note (optional)</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain your changes to the other party..." rows={2}
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', background: '#fafafa', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSend(fields, note)}
            style={{ flex: 2, padding: '0.75rem', borderRadius: 9999, border: 'none', background: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            Send Counter Pitch
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Signature modal ──────────────────────────────────────────────────────────
function SignatureModal({ proposal, party, onSign, onClose }) {
  const [name, setName] = useState('');
  const partyLabel = party === 'host' ? 'Host' : `${proposal.creator.name} (Creator)`;
  const latestFields = getLatestFields(proposal);
  const roundCount = proposal.contractHistory?.length ?? 0;
  const ready = name.trim().length >= 2;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: '1.5rem', padding: '1.75rem', maxHeight: '88dvh', overflowY: 'auto', boxShadow: '0 32px 64px -16px rgba(25,37,36,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>Sign & Accept</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.2rem 0 0' }}>Signing as {partyLabel}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: '0.9rem' }}>✕</button>
        </div>
        <div style={{ background: 'rgba(239,236,233,0.5)', borderRadius: '1rem', padding: '1rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>Contract Terms</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {CONTRACT_FIELDS.filter(f => latestFields[f.key]).map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', gap: 8, fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--sage)', minWidth: 110 }}>{label}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{latestFields[key]}</span>
              </div>
            ))}
          </div>
          {roundCount > 0 && <p style={{ fontSize: '0.7rem', color: 'var(--sage)', margin: '0.75rem 0 0' }}>After {roundCount} round{roundCount !== 1 ? 's' : ''} of negotiation</p>}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)', marginBottom: '0.875rem', lineHeight: 1.55 }}>
          By signing, you agree to the terms above. The contract locks once both parties sign the same version.
        </p>
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.35rem' }}>Your full name</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name as signature"
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(25,37,36,0.12)', borderRadius: '0.75rem', fontFamily: 'Georgia, serif', fontSize: '1rem', fontStyle: 'italic', color: 'var(--ink)', background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.35)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }} />
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { if (ready) onSign(name.trim()); }} disabled={!ready}
            style={{ flex: 2, padding: '0.75rem', borderRadius: 9999, border: 'none', background: ready ? 'rgba(74,155,127,0.9)' : 'rgba(25,37,36,0.1)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: ready ? '#fff' : 'var(--sage)', cursor: ready ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Pen size={13} /> Sign and Accept
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

// ─── Proposal drawer ──────────────────────────────────────────────────────────
function ProposalDrawer({ proposal, onStatusChange, onCounter, onSign, onCreatorClick }) {
  const navigate = useNavigate();
  const t = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];
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
          <img
          src={proposal.creator.avatar} alt={proposal.creator.name}
          onClick={() => onCreatorClick(proposal.creator)}
          title="View profile"
          style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(25,37,36,0.08)', flexShrink: 0, cursor: 'pointer' }}
        />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{proposal.creator.name}</span>
              {proposal.creator.verified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, background: 'rgba(74,155,127,0.12)', border: '1px solid rgba(74,155,127,0.3)', fontSize: 10, fontWeight: 700, color: '#2d7d5e' }}><Check size={9} />Verified</span>
              )}
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: t.bg, color: t.color }}>{proposal.creator.tier}</span>
              <span title={TIER_DEFS[proposal.creator.tier]} style={{ fontSize: 9, color: 'var(--sage)', cursor: 'help', lineHeight: 1 }}>ⓘ</span>
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
          {[{ label: 'Followers', value: fmtFollowers(proposal.creator.followers) }, { label: 'Engagement', value: `${proposal.creator.engagement}%` }, { label: 'Collabs', value: proposal.creator.collab_count }].map(({ label, value }) => (
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
              {contractHistory.length > 0 ? 'Original Pitch Terms' : 'Modified Terms'}
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
          {isPitch ? 'Pitch Message' : 'Application Message'}
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>{proposal.message}</p>
      </div>

      {/* Portfolio */}
      <div style={{ padding: '11px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ExternalLink size={13} color="var(--sage)" />
        <span style={{ fontSize: 12, color: 'var(--slate)' }}>Portfolio:</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{proposal.creator.portfolio}</span>
      </div>

      {/* ── LOCKED state ── */}
      {locked && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px', borderRadius: '0.875rem', background: 'rgba(74,155,127,0.1)', border: '1px solid rgba(74,155,127,0.25)' }}>
            <Lock size={14} color="#2d7d5e" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2d7d5e' }}>Contract Locked — both parties have signed</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Host', sig: signatures.hostSignature, at: signatures.hostSignedAt },
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
            <Download size={13} /> Save Contract (PDF)
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
                  <CheckCircle2 size={11} /> Host signed
                </span>
              )}
              {creatorSigned && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', fontSize: 11, fontWeight: 700, color: '#2d7d5e' }}>
                  <CheckCircle2 size={11} /> {proposal.creator.name} signed
                </span>
              )}
              {hostSigned && !creatorSigned && (
                <span style={{ fontSize: 11, color: 'var(--sage)', alignSelf: 'center' }}>Awaiting creator signature</span>
              )}
              {!hostSigned && creatorSigned && (
                <span style={{ fontSize: 11, color: 'var(--sage)', alignSelf: 'center' }}>Awaiting host signature</span>
              )}
            </div>
          )}

          {/* HOST actions */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Host Actions {proposal.counterPending === 'creator' && <span style={{ color: '#b45309', marginLeft: 6 }}>· Counter sent — awaiting creator</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!hostSigned ? (
                <button onClick={() => onSign(proposal.id, 'host')}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: 'none', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Pen size={12} /> Accept As Is
                </button>
              ) : (
                <span style={{ flex: 1, padding: '9px 0', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', color: '#2d7d5e', fontSize: 13, fontWeight: 700, textAlign: 'center', minWidth: 120 }}>✓ You signed</span>
              )}
              <button onClick={() => onCounter(proposal.id, 'host')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: '1.5px solid rgba(123,104,200,0.4)', background: 'rgba(123,104,200,0.08)', color: '#5b4db8', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 100 }}>
                Counter Pitch
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '9px 16px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Decline
              </button>
            </div>
          </div>

          {/* CREATOR actions (demo) */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(25,37,36,0.07)', background: 'rgba(239,236,233,0.3)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Creator's Response <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--stone)' }}>· demo</span>
              {proposal.counterPending === 'host' && <span style={{ color: '#2d7d5e', marginLeft: 6 }}>· Creator countered back</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!creatorSigned ? (
                <button onClick={() => onSign(proposal.id, 'creator')}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: 'none', background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Pen size={12} /> Accept
                </button>
              ) : (
                <span style={{ flex: 1, padding: '9px 0', borderRadius: 9999, background: 'rgba(74,155,127,0.1)', color: '#2d7d5e', fontSize: 13, fontWeight: 700, textAlign: 'center', minWidth: 80 }}>✓ Creator signed</span>
              )}
              <button onClick={() => onCounter(proposal.id, 'creator')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9999, border: '1.5px solid rgba(74,155,127,0.3)', background: 'rgba(74,155,127,0.07)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 100 }}>
                Counter Back
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '9px 16px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Decline
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
                Move to Review
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '10px 20px', borderRadius: 9999, border: '1.5px solid rgba(200,104,104,0.3)', background: 'transparent', color: '#9b2d2d', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Decline
              </button>
            </>
          )}
          {proposal.status === 'under_review' && !isPitch && (
            <>
              <button onClick={() => onStatusChange(proposal.id, 'approved')}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 100 }}>
                Approve
              </button>
              <button onClick={() => onStatusChange(proposal.id, 'declined')}
                style={{ padding: '10px 20px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', color: 'var(--slate)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Decline
              </button>
            </>
          )}
          {proposal.status === 'approved' && (
            <button onClick={() => onStatusChange(proposal.id, 'completed')}
              style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: 'none', background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Mark Completed
            </button>
          )}
          <button onClick={() => navigate('/inbox')}
            style={{ padding: '10px 18px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={13} /> Message
          </button>
        </div>
      )}

      {/* Message button always visible for pitch under_review */}
      {!locked && proposal.status === 'under_review' && isPitch && (
        <div style={{ padding: '0 24px 14px' }}>
          <button onClick={() => navigate('/inbox')}
            style={{ padding: '9px 18px', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={13} /> Message Creator
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Proposal card ────────────────────────────────────────────────────────────
function ProposalCard({ proposal, expanded, onToggle, onStatusChange, onCounter, onSign, onCreatorClick, dragHandleListeners, dragHandleAttributes }) {
  const s = STATUS_CFG[proposal.status] || STATUS_CFG.pending;
  const t = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];
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
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--stone)'; }} title="Drag to move stage">
          <GripVertical size={15} />
        </div>
        <img
          src={proposal.creator.avatar} alt={proposal.creator.name}
          onClick={e => { e.stopPropagation(); onCreatorClick(proposal.creator); }}
          title="View profile"
          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(25,37,36,0.07)', cursor: 'pointer' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              onClick={e => { e.stopPropagation(); onCreatorClick(proposal.creator); }}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ink)', cursor: 'pointer', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >{proposal.creator.name}</span>
            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: t.bg, color: t.color, flexShrink: 0 }}>{proposal.creator.tier}</span>
            <span title={TIER_DEFS[proposal.creator.tier]} style={{ fontSize: 9, color: 'var(--sage)', cursor: 'help', lineHeight: 1 }}>ⓘ</span>
            {isPitch ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(209,235,219,0.7)', border: '1px solid rgba(149,157,144,0.35)', color: '#2d7d5e', flexShrink: 0 }}>
                <Sparkles size={8} />Pitch
              </span>
            ) : (
              <span style={{ padding: '2px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(25,37,36,0.06)', color: 'var(--sage)', flexShrink: 0 }}>Application</span>
            )}
            {isLocked && <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(74,155,127,0.12)', color: '#2d7d5e', flexShrink: 0 }}><Lock size={8} />Locked</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 2 }}>{proposal.listing} · {fmtFollowers(proposal.creator.followers)} followers · {proposal.creator.engagement}% ER</div>
          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proposal.message.slice(0, 90)}…</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
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
    contractHistory: [],
    signatures: emptySignatures(),
    locked: false,
    counterPending: null,
    hidden: false,
    isReal: true,
    convexId: p._id,
  };
}

export default function HostProposals() {
  const location = useLocation();
  const { profile } = useAuth();
  const hostId = profile?._id || profile?.id;

  const updateStatusCvx = useMutation(api.pitches.updateStatus);
  const rawPitches = useQuery(
    api.pitches.getByHost,
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

  // Merge real Convex pitches (prepended) with mock data
  const allProposals = useMemo(() => {
    if (!rawPitches?.length) return proposals;
    const saved = loadApplications();
    const real = rawPitches.map((p) => {
      const normalized = normalizePitch(p);
      const s = saved[String(p._id)] || {};
      return {
        ...normalized,
        status:          s.status          ?? normalized.status,
        contractHistory: s.contractHistory ?? [],
        signatures:      s.signatures      ?? emptySignatures(),
        locked:          s.locked          ?? false,
        counterPending:  s.counterPending  ?? null,
        hidden:          s.hidden          ?? false,
      };
    });
    return [...real, ...proposals];
  }, [rawPitches, proposals]);

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
  const filtered   = typeFilter === 'all' ? byStage   : byStage.filter((p) => p.type === typeFilter);

  const stageCounts = STAGE_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? byListing.length : byListing.filter((p) => p.status === t.key).length;
    return acc;
  }, {});

  const typeCounts = { all: byStage.length, application: byStage.filter((p) => p.type === 'application').length, pitch: byStage.filter((p) => p.type === 'pitch').length };
  const pendingCount = visible.filter((p) => p.status === 'pending').length;
  const declinedCount = byListing.filter((p) => p.status === 'declined').length;

  function resetTypeOnTabChange(newTab) { setTab(newTab); setExpanded(null); }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ minHeight: '100dvh' }}>
        <style>{`
          @keyframes tab-flash { 0%{box-shadow:0 0 0 3px rgba(25,37,36,0.18)} 60%{box-shadow:0 0 0 5px rgba(25,37,36,0.1)} 100%{box-shadow:none} }
        `}</style>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2rem)', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>Proposals</h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: '0.25rem' }}>{visible.length} total · {pendingCount} pending your review</p>
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
            {STAGE_TABS.map((t) => (
              <DroppableTab key={t.key} stageKey={t.key} label={t.label} count={stageCounts[t.key]} active={tab === t.key} isFlashing={flashStage === t.key} dragging={dragging} currentDragStatus={activeProposal?.status} onClick={() => resetTypeOnTabChange(t.key)} />
            ))}
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', alignItems: 'center' }}>
            {TYPE_TABS.map((t) => {
              const active = typeFilter === t.key;
              const count  = typeCounts[t.key];
              const isPitchTab = t.key === 'pitch';
              return (
                <button key={t.key} onClick={() => { setTypeFilter(t.key); setExpanded(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.75rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: active ? (isPitchTab ? 'rgba(209,235,219,0.7)' : 'rgba(25,37,36,0.08)') : 'transparent', color: active ? (isPitchTab ? '#2d7d5e' : 'var(--ink)') : 'var(--sage)', border: `1px solid ${active ? (isPitchTab ? 'rgba(149,157,144,0.4)' : 'rgba(25,37,36,0.15)') : 'transparent'}`, cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)' }}>
                  {isPitchTab && <Sparkles size={10} />}
                  {t.label}
                  {count > 0 && <span style={{ padding: '1px 5px', borderRadius: 9999, fontSize: '0.62rem', fontWeight: 700, lineHeight: 1.5, background: active ? 'rgba(25,37,36,0.1)' : 'rgba(25,37,36,0.06)', color: active ? 'inherit' : 'var(--slate)' }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Clear All Declined header */}
          {tab === 'declined' && declinedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>{declinedCount} declined proposal{declinedCount !== 1 ? 's' : ''}</span>
              <button onClick={() => setShowClearDeclined(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 9999, border: '1px solid rgba(200,104,104,0.3)', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#9b2d2d', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Trash2 size={11} /> Clear All
              </button>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: '1.25rem', padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                No {typeFilter !== 'all' ? typeFilter + 's' : ''} {tab !== 'all' ? (STAGE_TABS.find((t) => t.key === tab)?.label.toLowerCase() + ' ') : ''}proposals
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)', margin: 0 }}>Try a different filter.</p>
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

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeProposal ? (
            <div style={{ background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(25,37,36,0.14)', borderRadius: '1rem', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 24px 48px rgba(25,37,36,0.22)', transform: 'rotate(1.5deg) scale(1.03)', cursor: 'grabbing', width: 340 }}>
              <img src={activeProposal.creator.avatar} alt={activeProposal.creator.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>{activeProposal.creator.name}</div>
                <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 2 }}>{activeProposal.listing}</div>
              </div>
              <span style={{ marginLeft: 'auto', flexShrink: 0, padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: STATUS_CFG[activeProposal.status]?.bg, color: STATUS_CFG[activeProposal.status]?.color }}>
                {STATUS_CFG[activeProposal.status]?.label}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Counter pitch modal */}
      {counterModal && (() => {
        const proposal = proposals.find((p) => p.id === counterModal.proposalId);
        return proposal ? (
          <CounterPitchModal proposal={proposal} fromParty={counterModal.fromParty}
            onSend={(fields, note) => handleSendCounter(counterModal.proposalId, counterModal.fromParty, fields, note)}
            onClose={() => setCounterModal(null)} />
        ) : null;
      })()}

      {/* Signature modal */}
      {signModal && (() => {
        const proposal = proposals.find((p) => p.id === signModal.proposalId);
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
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate)', margin: '0 0 0.75rem' }}>Clear Declined Proposals</h4>
            <p style={{ color: 'var(--sage)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Remove all {declinedCount} declined proposal{declinedCount !== 1 ? 's' : ''} from view? This won't delete creator data, just hides them from your pipeline.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowClearDeclined(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleClearDeclined} style={{ flex: 1, padding: '0.75rem', borderRadius: 9999, border: 'none', background: 'rgba(200,104,104,0.85)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Remove All</button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
