import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { SAMPLE_LISTINGS } from '../../lib/mockData';
import { useListingDraft } from '../../contexts/ListingDraftContext';
import { ArrowLeft, MapPin, Copy, Check, ChevronDown, ChevronUp, MessageSquare, ExternalLink, X, AlertTriangle } from 'lucide-react';

// ─── Glass card token ─────────────────────────────────────────────────────────
const GC = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.85)',
  boxShadow: '0 4px 20px rgba(25,37,36,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
  borderRadius: '1.25rem',
};

// ─── Mock applicants per listing ──────────────────────────────────────────────
const MOCK_APPLICANTS = {
  '1': [
    {
      id: 'p1', type: 'application', status: 'pending', applied: '2h ago',
      message: "I've been documenting boutique mountain stays for 2 years and Glacier Prime is exactly the vibe my audience loves. My last cabin Reel got 2.3M views. I'd love to create a full weekend series.",
      creator: { name: 'Priya Nair', username: 'priya.wanders', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=47', followers: 84200, platforms: ['Instagram', 'TikTok'], verified: true },
    },
    {
      id: 'p2', type: 'pitch', status: 'under_review', applied: '1d ago',
      message: "Mountain content is my bread and butter — 6 cabin collabs all exceeded expectations. Tahoe is on my bucket list and this listing is perfect for an authentic winter escape series.",
      pitch_details: [
        { field: 'Nights', original: '3', proposed: '5' },
        { field: 'Extra Deliverable', original: '—', proposed: '1× YouTube Short' },
        { field: 'Turnaround', original: '14 days', proposed: '10 days' },
      ],
      creator: { name: 'Lena Park', username: 'lena.explores', tier: 'Micro Influencer', avatar: 'https://i.pravatar.cc/80?img=32', followers: 31500, platforms: ['TikTok', 'Instagram'], verified: false },
    },
    {
      id: 'p8', type: 'application', status: 'under_review', applied: '2d ago',
      message: "Long-time follower of your property — the aesthetics are exactly on-brand for my content. Happy to share my full media kit and references from previous hosts.",
      creator: { name: 'Nina Okafor', username: 'ninaokafor', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=44', followers: 67100, platforms: ['Instagram', 'TikTok'], verified: true },
    },
    {
      id: 'p9', type: 'application', status: 'approved', applied: '5d ago',
      message: "Specialise in editorial mountain stays — clean, aspirational, fast. My last 3 cabin collabs drove 180K+ combined reach for the hosts.",
      creator: { name: 'Maya Chen', username: 'mayachen.travel', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=5', followers: 218000, platforms: ['Instagram', 'YouTube'], verified: true },
    },
  ],
  '2': [
    {
      id: 'p10', type: 'pitch', status: 'approved', applied: '3d ago',
      message: "Coastal luxury is my niche. I shoot for boutique hotels and villas full-time — clean editorial style, fast turnaround. Happy to deliver ahead of schedule.",
      pitch_details: [
        { field: 'Compensation', original: '$200 cash', proposed: 'Hybrid + $300 cash' },
        { field: 'Turnaround', original: '10 days', proposed: '7 days' },
      ],
      creator: { name: 'Sam Kowalski', username: 'sam.kowalski', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=59', followers: 58300, platforms: ['Instagram', 'TikTok'], verified: true },
    },
    {
      id: 'p11', type: 'application', status: 'pending', applied: '6h ago',
      message: "Patagonia is a dream destination for me and my audience. Love lakefront properties — I cover one per month and this one is unreal.",
      creator: { name: 'Jordan Ellis', username: 'jordanellis.co', tier: 'UGC Pro', avatar: 'https://i.pravatar.cc/80?img=11', followers: 12400, platforms: ['TikTok'], verified: false },
    },
  ],
  '4': [
    {
      id: 'p12', type: 'application', status: 'completed', applied: '3wk ago',
      message: "Jungle and wellness content is my specialty — Southeast Asia + yoga = my entire brand. Chiang Mai is the perfect setting and this lodge is the kind of place my audience books.",
      creator: { name: 'Ava Torres', username: 'ava.offshore', tier: 'Micro Influencer', avatar: 'https://i.pravatar.cc/80?img=21', followers: 43900, platforms: ['Instagram'], verified: false },
    },
  ],
  '5': [
    {
      id: 'p13', type: 'application', status: 'pending', applied: '10h ago',
      message: "Nature and off-grid content creator based in Asheville. This treehouse is literally my dream collab — I've been following this listing since it launched.",
      creator: { name: 'Kai Yamamoto', username: 'kai.wilderness', tier: 'UGC Pro', avatar: 'https://i.pravatar.cc/80?img=68', followers: 9200, platforms: ['TikTok'], verified: false },
    },
    {
      id: 'p14', type: 'pitch', status: 'pending', applied: '2d ago',
      message: "Photography specialist with a portfolio of 40+ treehouse and forest stays. I'd love to propose a dawn-to-dusk series for this one.",
      pitch_details: [
        { field: 'Nights', original: '2', proposed: '3' },
        { field: 'Photos', original: '6', proposed: '10' },
      ],
      creator: { name: 'Priya Nair', username: 'priya.wanders', tier: 'Influencer', avatar: 'https://i.pravatar.cc/80?img=47', followers: 84200, platforms: ['Instagram', 'TikTok'], verified: true },
    },
  ],
  '7': [
    {
      id: 'p15', type: 'pitch', status: 'pending', applied: '1d ago',
      message: "Wine tourism content is a gap in the market and I have 100K+ followers who are obsessed with wine travel. I've covered 30+ estates globally.",
      pitch_details: [
        { field: 'Deliverables', original: '3 Reels', proposed: '5 Reels' },
        { field: 'Turnaround', original: '14 days', proposed: '21 days' },
      ],
      creator: { name: 'Lena Park', username: 'lena.explores', tier: 'Micro Influencer', avatar: 'https://i.pravatar.cc/80?img=32', followers: 31500, platforms: ['TikTok', 'Instagram'], verified: false },
    },
  ],
};

const AFFILIATE_CODES = {
  '1': 'COLLABNB-GPC7X2',
  '2': 'COLLABNB-TWR4K9',
  '4': 'COLLABNB-MLE2B5',
  '5': 'COLLABNB-LFT8Q1',
  '6': 'COLLABNB-DDG3N6',
  '7': 'COLLABNB-VWE5M8',
};

// ─── Status config ────────────────────────────────────────────────────────────
const APPL_STATUS = {
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
  'Macro':            { bg: 'rgba(200,104,104,0.1)', color: '#9b2d2d'    },
};

const TIER_DEFS = {
  'UGC Beginner':     '< 5K followers — New creators building their portfolio',
  'UGC Pro':          '5K–20K followers — Content creators, not influencer reach',
  'Micro Influencer': '5K–50K followers — Influencer-style content, engaged audience',
  'Influencer':       '50K+ followers — Broad reach, established audience',
  'Macro':            '100K+ followers — Top-tier creators with major reach',
};

function fmtFollowers(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getListingStatus(id) {
  try {
    const stored = JSON.parse(localStorage.getItem('@collabnb_host_listings_local_v1') || '{}');
    return stored[id]?.status || null;
  } catch { return null; }
}

const LISTING_STATUS_CFG = {
  active: { label: 'Active', bg: 'rgba(74,155,127,0.85)',  color: '#fff' },
  paused: { label: 'Paused', bg: 'rgba(212,168,67,0.85)',  color: '#fff' },
  draft:  { label: 'Draft',  bg: 'rgba(149,157,144,0.7)',  color: '#fff' },
};

const HOST_META_DEFAULT = {
  '1': 'active', '2': 'active', '3': 'paused',
  '4': 'draft',  '5': 'active', '6': 'draft',
};

function normalizeConvexListing(l) {
  if (!l) return null;
  const images = l.gallery_images?.length ? l.gallery_images : (l.image ? [l.image] : []);
  let compensation = l.compensation || '';
  if (!compensation) {
    if (l.compensation_type === 'paid') compensation = `$${l.cash_amount || '?'} cash`;
    else if (l.compensation_type === 'hybrid') compensation = `$${l.cash_amount || '?'} + stay`;
    else compensation = 'See listing';
  }
  const status = l.status === 'published' ? 'active' : (l.status || 'draft');
  return { ...l, id: String(l._id), status, image: images[0] || '', gallery_images: images, compensation, about: l.collaboration_brief || l.about || '' };
}

// ─── Photo zoom modal ─────────────────────────────────────────────────────────
function PhotoModal({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx((p) => (p - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((p) => (p + 1) % images.length), [images.length]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  next();
      if (e.key === 'ArrowLeft')   prev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, next, prev]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(25,37,36,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'detailFadeIn 180ms ease forwards',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.25rem', left: '1.5rem',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 9999, padding: '0.45rem 1rem',
          color: 'rgba(239,236,233,0.9)', fontSize: '0.875rem', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'var(--font-body)',
        }}
      >
        <ArrowLeft size={14} /> Close
      </button>

      {/* Counter */}
      <p style={{ color: 'rgba(239,236,233,0.45)', fontSize: '0.78rem', marginBottom: '0.875rem', fontFamily: 'var(--font-body)' }}>
        {idx + 1} / {images.length}
      </p>

      {/* Main image */}
      <img
        src={images[idx]}
        alt={`Photo ${idx + 1}`}
        style={{ maxHeight: '72vh', maxWidth: '100%', borderRadius: '1rem', objectFit: 'contain', display: 'block' }}
      />

      {/* Arrows */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          {[{ label: '←', action: prev }, { label: '→', action: next }].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(239,236,233,0.9)', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 140ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: 48, height: 36, borderRadius: '0.4rem', padding: 0, border: 'none',
                overflow: 'hidden', cursor: 'pointer',
                outline: i === idx ? '2px solid rgba(209,235,219,0.9)' : '2px solid transparent',
                transition: 'outline 140ms',
              }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Applicant row ─────────────────────────────────────────────────────────────
function ApplicantRow({ proposal, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const isPitch = proposal.type === 'pitch';
  const st = APPL_STATUS[proposal.status] || APPL_STATUS.pending;
  const tier = TIER_COLORS[proposal.creator.tier] || TIER_COLORS['UGC Beginner'];

  return (
    <div style={{
      borderRadius: '1rem',
      border: isPitch ? '1.5px solid rgba(209,235,219,0.85)' : '1px solid rgba(25,37,36,0.08)',
      boxShadow: isPitch ? '0 2px 12px rgba(25,37,36,0.05), 0 0 0 1px rgba(209,235,219,0.4)' : '0 2px 8px rgba(25,37,36,0.04)',
      background: 'rgba(255,255,255,0.88)',
      overflow: 'hidden',
      transition: 'box-shadow 160ms',
    }}>
      {/* ── Row header ── */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.875rem 1rem', cursor: 'pointer',
          background: expanded ? 'rgba(25,37,36,0.02)' : 'transparent',
          transition: 'background 140ms',
        }}
        onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'rgba(25,37,36,0.02)'; }}
        onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={proposal.creator.avatar}
            alt={proposal.creator.name}
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(25,37,36,0.08)', display: 'block' }}
          />
          {proposal.creator.verified && (
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
              borderRadius: '50%', background: '#4A9B7F', border: '1.5px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 10 10" fill="none" style={{ width: 7, height: 7 }}>
                <path d="M1.5 5l2 2L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>

        {/* Name + handle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>
              {proposal.creator.name}
            </span>
            {isPitch && (
              <span style={{
                padding: '0.15rem 0.5rem', borderRadius: 9999,
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em',
                background: 'rgba(209,235,219,0.7)', color: '#2d6a4f',
                border: '1px solid rgba(74,155,127,0.3)',
              }}>
                PITCH
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.05rem' }}>
            @{proposal.creator.username} · {fmtFollowers(proposal.creator.followers)} followers · {proposal.applied}
          </p>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, fontSize: '0.67rem', fontWeight: 700, background: tier.bg, color: tier.color }}>
              {proposal.creator.tier}
            </span>
            <span title={TIER_DEFS[proposal.creator.tier]} style={{ fontSize: '0.6rem', color: 'var(--sage)', cursor: 'help', lineHeight: 1 }}>ⓘ</span>
          </div>
          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, fontSize: '0.67rem', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {st.label}
          </span>
          {expanded ? <ChevronUp size={14} color="var(--sage)" /> : <ChevronDown size={14} color="var(--sage)" />}
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(25,37,36,0.07)', padding: '1rem 1rem 1rem' }}>
          {/* Platforms */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            {proposal.creator.platforms.map((p) => (
              <span key={p} style={{ padding: '0.2rem 0.65rem', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(25,37,36,0.06)', color: 'var(--slate)' }}>
                {p}
              </span>
            ))}
          </div>

          {/* Message */}
          <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.65, marginBottom: '0.875rem' }}>
            "{proposal.message}"
          </p>

          {/* Pitch proposed changes */}
          {isPitch && proposal.pitch_details?.length > 0 && (
            <div style={{ background: 'rgba(209,235,219,0.18)', border: '1px solid rgba(74,155,127,0.2)', borderRadius: '0.875rem', padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2d6a4f', marginBottom: '0.625rem' }}>
                Proposed changes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {proposal.pitch_details.map(({ field, original, proposed }) => (
                  <div key={field} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--slate)', alignItems: 'baseline' }}>
                    <span style={{ minWidth: 120, fontWeight: 600, color: 'var(--ink)', flexShrink: 0 }}>{field}</span>
                    <span style={{ color: 'var(--sage)', textDecoration: 'line-through' }}>{original}</span>
                    <span>→</span>
                    <span style={{ fontWeight: 600, color: '#2d7d5e' }}>{proposed}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/host/proposals'); }}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: 9999,
                background: 'var(--ink)', border: 'none', color: '#fff',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'opacity 140ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {proposal.status === 'pending' ? 'Review' : 'Open proposal'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/inbox'); }}
              style={{
                padding: '0.5rem 1rem', borderRadius: 9999, cursor: 'pointer',
                background: 'rgba(25,37,36,0.06)', border: '1px solid rgba(25,37,36,0.1)',
                color: 'var(--ink)', fontSize: '0.78rem', fontWeight: 600,
                fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.3rem',
                transition: 'background 140ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.06)'}
            >
              <MessageSquare size={12} /> Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: '0.15rem' }}>{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HostListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadDraft } = useListingDraft();

  const isSampleId = SAMPLE_LISTINGS.some((l) => l.id === id);
  const convexRaw = useQuery(api.listings.getById, !isSampleId ? { id } : 'skip');
  const updateListing = useMutation(api.listings.update);

  const sampleListing = isSampleId ? SAMPLE_LISTINGS.find((l) => l.id === id) : null;
  const convexListing = !isSampleId ? normalizeConvexListing(convexRaw) : null;
  const listing = isSampleId ? sampleListing : convexListing;

  // Reactive status — localStorage overrides, synced with DB on Convex listings
  const [localStatus, setLocalStatus] = useState(null);
  useEffect(() => {
    const stored = getListingStatus(id);
    if (stored) { setLocalStatus(stored); return; }
    if (isSampleId) setLocalStatus(HOST_META_DEFAULT[id] || 'draft');
  }, [id, isSampleId]);
  useEffect(() => {
    if (!isSampleId && listing) setLocalStatus((prev) => prev || listing.status);
  }, [listing, isSampleId]);

  const rawStatus = localStatus || (isSampleId ? HOST_META_DEFAULT[id] || 'draft' : listing?.status || 'draft');
  const statusCfg = LISTING_STATUS_CFG[rawStatus] || LISTING_STATUS_CFG.draft;

  // Status modal state
  const [statusModal, setStatusModal] = useState(null); // null | 'publish' | 'to-draft'
  const [draftConfirmText, setDraftConfirmText] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [modalPhoto, setModalPhoto] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const applicants = MOCK_APPLICANTS[id] || [];
  const affiliateCode = isSampleId
    ? (AFFILIATE_CODES[id] || null)
    : (listing?.affiliate_code || null);

  const hasActiveContracts = applicants.some((a) => a.status === 'approved');
  const hasPendingInquiries = applicants.some((a) => a.status === 'pending' || a.status === 'under_review');
  const pendingCount = applicants.filter((a) => a.status === 'pending' || a.status === 'under_review').length;

  const filteredApplicants = statusFilter === 'all'
    ? applicants
    : applicants.filter((a) => a.status === statusFilter);

  const statusCounts = applicants.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  function copyCode() {
    if (!affiliateCode) return;
    navigator.clipboard.writeText(affiliateCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function applyStatusChange(newDisplayStatus) {
    setStatusSaving(true);
    const dbStatus = newDisplayStatus === 'active' ? 'published' : newDisplayStatus;
    setLocalStatus(newDisplayStatus);
    // Persist to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('@collabnb_host_listings_local_v1') || '{}');
      stored[id] = { status: newDisplayStatus };
      localStorage.setItem('@collabnb_host_listings_local_v1', JSON.stringify(stored));
    } catch {}
    // Persist to Convex for real listings
    if (!isSampleId) {
      try { await updateListing({ id, status: dbStatus }); } catch (e) { console.error(e); }
    }
    setStatusSaving(false);
    setStatusModal(null);
    setDraftConfirmText('');
  }

  function handleEditListing() {
    if (!listing) return;
    const draftData = {
      title: listing.title || '',
      location_city: listing.location?.split(',')[0]?.trim() || '',
      location_country: listing.location?.split(',').slice(1).join(',').trim() || '',
      property_url: listing.property_url || '',
      collaboration_brief: listing.about || listing.collaboration_brief || '',
      compensation_type: listing.compensation_type || 'paid',
      nights: listing.nights || 2,
      cash_amount: listing.cash_amount || 0,
      creator_tier: listing.creator_tier || '',
      deliverable_load: listing.deliverable_load || '',
      images: listing.gallery_images || (listing.image ? [listing.image] : []),
      perks: listing.perks || [],
      vibe_tags: listing.vibe_tags || [],
      affiliate_code: affiliateCode || '',
      affiliate_percent: 0,
      maxOffers: '',
      collab_start: listing.collab_start || '',
      collab_end: listing.collab_end || '',
      date_ranges: listing.date_ranges || [],
      turnaround_days: listing.turnaround_days || 14,
      deliverables_list: listing.deliverables_list || [],
      revision_policy: listing.revision_policy || '',
      usage_rights: listing.usage_rights || '',
    };
    loadDraft(draftData);
    localStorage.setItem('collabnb_listing_draft_v1', JSON.stringify(draftData));
    if (isSampleId) {
      localStorage.removeItem('collabnb_editing_listing_id_v1');
    } else {
      localStorage.setItem('collabnb_editing_listing_id_v1', id);
    }
    navigate('/host/listings/create/basics');
  }

  // Loading / not-found guards
  if (!isSampleId && convexRaw === undefined) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--sage)', fontFamily: 'var(--font-body)' }}>Loading…</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--sage)', fontFamily: 'var(--font-body)' }}>Listing not found.</p>
      </div>
    );
  }

  const images = listing.gallery_images || [listing.image];
  const pitchCount = applicants.filter((a) => a.type === 'pitch').length;

  return (
    <div style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes detailFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.75rem 1.5rem 5rem' }}>

        {/* ── Back nav ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/host')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)',
              fontFamily: 'var(--font-body)', padding: 0,
              transition: 'color 140ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--slate)'}
          >
            <ArrowLeft size={14} /> My Listings
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate(`/listing/${id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.875rem', borderRadius: 9999,
                background: 'rgba(25,37,36,0.06)', border: '1px solid rgba(25,37,36,0.1)',
                color: 'var(--ink)', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'background 140ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.06)'}
            >
              <ExternalLink size={12} /> Creator view
            </button>
            <button
              onClick={handleEditListing}
              style={{
                padding: '0.4rem 0.875rem', borderRadius: 9999,
                background: 'var(--ink)', border: 'none',
                color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'opacity 140ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Edit listing
            </button>
          </div>
        </div>

        {/* ── Title + status ────────────────────────────────────────────── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.4rem,4vw,1.8rem)', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>
              {listing.title}
            </h1>
            <button
              onClick={() => {
                if (rawStatus === 'draft') setStatusModal('publish');
                else if (hasActiveContracts) setStatusModal('blocked');
                else setStatusModal('to-draft');
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.7rem', borderRadius: 9999,
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em',
                background: statusCfg.bg, color: statusCfg.color,
                border: 'none', cursor: 'pointer',
                transition: 'opacity 140ms, transform 140ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              title="Click to change status"
            >
              {statusCfg.label}
              <ChevronDown size={9} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={12} color="var(--sage)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--sage)' }}>{listing.location_full || listing.location}</span>
          </div>
        </div>

        {/* ── 1. Photo gallery ──────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <SectionHead title="Photos" sub={`${images.length} photo${images.length !== 1 ? 's' : ''} — click to zoom`} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.5rem',
          }}>
            {images.map((src, i) => (
              <div
                key={i}
                onClick={() => setModalPhoto(i)}
                style={{
                  position: 'relative', height: 140, borderRadius: '0.875rem',
                  overflow: 'hidden', cursor: 'zoom-in',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 2px 8px rgba(25,37,36,0.06)',
                }}
                onMouseEnter={(e) => e.currentTarget.querySelector('div')?.style && (e.currentTarget.querySelector('div').style.opacity = '1')}
                onMouseLeave={(e) => e.currentTarget.querySelector('div')?.style && (e.currentTarget.querySelector('div').style.opacity = '0')}
              >
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 250ms' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(25,37,36,0.38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 200ms',
                }}>
                  <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                    View
                  </span>
                </div>
                {i === 0 && (
                  <span style={{
                    position: 'absolute', bottom: '0.5rem', left: '0.5rem',
                    fontSize: '0.58rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                    background: 'rgba(255,255,255,0.88)', borderRadius: 9999,
                    color: 'var(--ink)', backdropFilter: 'blur(8px)',
                  }}>
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Listing details ────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <SectionHead title="Listing details" />
          <div style={{ ...GC, padding: '1.5rem' }}>
            {/* Description */}
            <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              {listing.about}
            </p>

            {/* Key info grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}>
              {[
                { icon: '💰', label: 'Compensation', value: listing.compensation },
                { icon: '📦', label: 'Deliverables', value: listing.deliverables },
                { icon: '🎯', label: 'Creator tier', value: listing.creator_tier },
                { icon: '📅', label: 'Available', value: listing.dates_available },
                { icon: '⏱️', label: 'Deliverable load', value: listing.deliverable_load },
                { icon: '📋', label: 'Due in', value: `${listing.due_days} days` },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ padding: '0.875rem', background: 'rgba(25,37,36,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(25,37,36,0.06)' }}>
                  <p style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{icon}</p>
                  <p style={{ fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sage)', marginBottom: '0.2rem' }}>{label}</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* What creator gets */}
            {listing.what_you_get?.length > 0 && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(25,37,36,0.07)', paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sage)', marginBottom: '0.75rem' }}>
                  What you're offering
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {listing.what_you_get.map((item) => (
                    <span key={item} style={{ padding: '0.3rem 0.75rem', borderRadius: 9999, fontSize: '0.78rem', color: 'var(--slate)', background: 'rgba(25,37,36,0.05)', border: '1px solid rgba(25,37,36,0.08)' }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Affiliate info ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <SectionHead title="Affiliate code" sub="Creators can use this code to earn commission from bookings" />
          <div style={{ ...GC, padding: '1.25rem 1.5rem' }}>
            {affiliateCode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <code style={{
                  fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700,
                  color: 'var(--ink)', background: 'rgba(25,37,36,0.05)',
                  padding: '0.5rem 1rem', borderRadius: '0.625rem',
                  border: '1px solid rgba(25,37,36,0.1)', letterSpacing: '0.08em',
                }}>
                  {affiliateCode}
                </code>
                <button
                  onClick={copyCode}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.5rem 1rem', borderRadius: 9999, cursor: 'pointer',
                    background: copiedCode ? 'rgba(74,155,127,0.12)' : 'rgba(25,37,36,0.06)',
                    border: copiedCode ? '1px solid rgba(74,155,127,0.3)' : '1px solid rgba(25,37,36,0.1)',
                    color: copiedCode ? '#2d7d5e' : 'var(--ink)',
                    fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                    transition: 'all 200ms',
                  }}
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0 }}>
                  Share this code with approved creators
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--sage)', margin: 0 }}>
                  No affiliate code set for this listing.
                </p>
                <button
                  onClick={() => navigate('/host/listings/create/offer')}
                  style={{
                    padding: '0.45rem 0.875rem', borderRadius: 9999,
                    background: 'var(--ink)', border: 'none', color: '#fff',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Add code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Applicants ─────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>
                Applicants
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: '0.15rem' }}>
                {applicants.length} total · {pitchCount} pitch{pitchCount !== 1 ? 'es' : ''}
              </p>
            </div>
            {/* Status filter chips */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: `All (${applicants.length})` },
                ...Object.entries(statusCounts).map(([k, n]) => ({
                  key: k,
                  label: `${APPL_STATUS[k]?.label || k} (${n})`,
                })),
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: 9999,
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    background: statusFilter === key ? 'var(--ink)' : 'rgba(255,255,255,0.65)',
                    color: statusFilter === key ? 'var(--bone)' : 'var(--slate)',
                    border: '1px solid',
                    borderColor: statusFilter === key ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                    backdropFilter: 'blur(12px)',
                    transition: 'all 180ms',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredApplicants.length === 0 ? (
            <div style={{ ...GC, padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--sage)', margin: 0 }}>
                {applicants.length === 0
                  ? 'No applications yet — share your listing to attract creators.'
                  : `No ${statusFilter} applicants.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredApplicants.map((proposal) => (
                <ApplicantRow key={proposal.id} proposal={proposal} navigate={navigate} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Photo modal ──────────────────────────────────────────────────── */}
      {modalPhoto !== null && (
        <PhotoModal
          images={images}
          startIndex={modalPhoto}
          onClose={() => setModalPhoto(null)}
        />
      )}

      {/* ── Status modal ─────────────────────────────────────────────────── */}
      {statusModal && (
        <div
          onClick={() => { if (!statusSaving) { setStatusModal(null); setDraftConfirmText(''); } }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'detailFadeIn 160ms ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '1.5rem', padding: '1.75rem', maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(25,37,36,0.2)', border: '1px solid rgba(255,255,255,0.9)', animation: 'fadeUp 180ms ease forwards' }}
          >
            {/* Blocked: active contracts */}
            {statusModal === 'blocked' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <AlertTriangle size={18} color="#b45309" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: 0 }}>Can't move to draft</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  This listing has creators in an active contract. You must complete or cancel all active collaborations before changing the status to draft.
                </p>
                <button onClick={() => setStatusModal(null)} style={{ width: '100%', padding: '0.65rem', borderRadius: 9999, background: 'var(--ink)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Got it
                </button>
              </>
            )}

            {/* Publish confirmation */}
            {statusModal === 'publish' && (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>Publish this listing?</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  It will become live and visible to creators on Collabnb right away.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setStatusModal(null); setDraftConfirmText(''); }} style={{ flex: 1, padding: '0.65rem', borderRadius: 9999, background: 'rgba(25,37,36,0.07)', border: 'none', color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Cancel
                  </button>
                  <button onClick={() => applyStatusChange('active')} disabled={statusSaving} style={{ flex: 1, padding: '0.65rem', borderRadius: 9999, background: '#4A9B7F', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: statusSaving ? 0.6 : 1 }}>
                    {statusSaving ? 'Publishing…' : 'Publish'}
                  </button>
                </div>
              </>
            )}

            {/* To-draft confirmation (with or without pending inquiries) */}
            {statusModal === 'to-draft' && (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>Move to draft?</h3>
                {hasPendingInquiries ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '0.875rem' }}>
                      <AlertTriangle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: 1.55, margin: 0 }}>
                        {pendingCount} creator{pendingCount !== 1 ? 's' : ''} with pending or under-review inquiries will receive a message: <em>"Sorry for the hassle — this listing has been temporarily paused. We'll reach out if it goes live again."</em>
                      </p>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--slate)', marginBottom: '0.75rem' }}>Type <strong>draft</strong> to confirm:</p>
                    <input
                      value={draftConfirmText}
                      onChange={e => setDraftConfirmText(e.target.value)}
                      placeholder="draft"
                      autoFocus
                      style={{ width: '100%', padding: '0.6rem 0.875rem', border: '1.5px solid rgba(25,37,36,0.15)', borderRadius: '0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }}
                    />
                  </>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    The listing will be hidden from creators and no new applications will be accepted.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setStatusModal(null); setDraftConfirmText(''); }} style={{ flex: 1, padding: '0.65rem', borderRadius: 9999, background: 'rgba(25,37,36,0.07)', border: 'none', color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => applyStatusChange('draft')}
                    disabled={statusSaving || (hasPendingInquiries && draftConfirmText.toLowerCase().trim() !== 'draft')}
                    style={{ flex: 1, padding: '0.65rem', borderRadius: 9999, background: 'var(--ink)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: (statusSaving || (hasPendingInquiries && draftConfirmText.toLowerCase().trim() !== 'draft')) ? 0.4 : 1, transition: 'opacity 140ms' }}
                  >
                    {statusSaving ? 'Saving…' : 'Move to draft'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
