import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SAMPLE_LISTINGS, SAMPLE_HOST, IMG_FALLBACK } from '../lib/mockData';
import { useCollabs } from '../contexts/CollabContext';
import { useAuth } from '../contexts/AuthContext';
import { useVerification } from '../contexts/VerificationContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAccessGate, PendingApprovalScreen, LimitedAccessScreen } from '../components/AccessGate';
import { canSubmitPitch, incrementPitchCount, syncPitchCount } from '../lib/pitchCount';
import { formatDateRange } from '../lib/dateUtils';
import { cache } from '../lib/cache';
import {
  Sprout, BadgeCheck, Radio, Zap,
  Home, DollarSign, Gift, Star, Quote,
  Image, Film, Smartphone, PlayCircle, Camera, FileText, Package,
} from 'lucide-react';
import { AmenityIcon } from '../lib/amenityIcons';
import ListingLocationMap from '../components/map/ListingLocationMap';
import { TIERS, normalizeTierId } from '../../convex/lib/compensationPoints';

// listing.creator_tier is stored as an id ("ugc_pro") — resolve to the
// clean display label ("UGC Pro") wherever it's shown to a creator.
function tierLabel(tier) {
  return TIERS[normalizeTierId(tier)]?.label || tier;
}

function normalizeConvexListingDetail(l) {
  const images = l.gallery_images?.length ? l.gallery_images : (l.image ? [l.image] : []);

  let compensation = l.compensation || '';
  if (!compensation) {
    if (l.compensation_type === 'paid') compensation = `$${l.cash_amount || '?'} cash`;
    else if (l.compensation_type === 'hybrid') compensation = `$${l.cash_amount || '?'} + stay`;
    else compensation = 'See listing';
  }

  let deliverables = typeof l.deliverables === 'string' ? l.deliverables : '';
  if (!deliverables && l.deliverables_list?.length) {
    const parts = l.deliverables_list.slice(0, 2).map((d) => `${d.quantity}× ${d.type}`);
    deliverables = parts.join(', ');
    if (l.deliverables_list.length > 2) deliverables += ` +${l.deliverables_list.length - 2} more`;
  } else if (!deliverables && l.deliverable_count) {
    deliverables = `${l.deliverable_count} deliverables`;
  }

  return {
    ...l,
    id: String(l._id),
    image: images[0] || '',
    gallery_images: images,
    compensation,
    deliverables,
    about: l.about || l.collaboration_brief || '',
    collab_type: l.collab_type || l.deliverable_load || 'Collab',
    dates_available: (l.date_ranges?.length
      ? l.date_ranges.map((r) => formatDateRange(r.startDate, r.endDate)).join(' · ')
      : l.dates_available || (l.collab_start && l.collab_end ? formatDateRange(l.collab_start, l.collab_end) : '')),
    due_days: l.due_days ?? l.turnaround_days,
    amenities: l.amenities || [],
    what_you_get: l.what_you_get || [],
    what_you_deliver: l.what_you_deliver || (l.deliverable_count ? `${l.deliverable_count} total deliverables` : ''),
    requirements: l.requirements || [],
    is_featured: l.is_featured ?? false,
  };
}

const SECTIONS = ['Photos', 'The Offer', 'Requirements', 'Location'];

// ── Tier / Comp / Deliverable icon helpers ────────────────────────────────────
function TierIcon({ tier, size = 18 }) {
  const props = { size, strokeWidth: 1.75 };
  const id = normalizeTierId(tier);
  if (id === 'ugc_beginner') return <Sprout     {...props} color="var(--sage)" />;
  if (id === 'ugc_pro')      return <BadgeCheck {...props} color="#3C5759" />;
  if (id === 'micro')        return <Radio      {...props} color="#7b68c8" />;
  if (id === 'mid')          return <Zap        {...props} color="#b45309" />;
  return <Sprout {...props} color="var(--sage)" />;
}

// Prefer the host-chosen currency code over a hardcoded $ so non-USD listings
// aren't mislabeled; USD keeps the familiar $ symbol.
function formatCash(amount, currency) {
  const n = typeof amount === 'number' ? amount.toLocaleString() : (amount ?? '?');
  return currency && currency !== 'USD' ? `${currency} ${n}` : `$${n}`;
}

function CompIcon({ type, size = 18 }) {
  const props = { size, strokeWidth: 1.75 };
  if (type === 'paid')    return <DollarSign {...props} color="#2d6a4f" />;
  if (type === 'hybrid')  return <DollarSign {...props} color="#b45309" />;
  if (type === 'product') return <Gift       {...props} color="#7b68c8" />;
  return <Home {...props} color="var(--sage)" />;
}

function DeliverableIcon({ type = '', size = 15 }) {
  const t = type.toLowerCase();
  const props = { size, strokeWidth: 1.75, color: 'var(--slate)' };
  if (t.includes('reel'))           return <Film        {...props} />;
  if (t.includes('instagram'))      return <Image       {...props} />;
  if (t.includes('tiktok'))         return <Smartphone  {...props} />;
  if (t.includes('youtube'))        return <PlayCircle  {...props} />;
  if (t.includes('photo') || t.includes('ugc')) return <Camera {...props} />;
  if (t.includes('blog'))           return <FileText    {...props} />;
  return <Package {...props} />;
}

const LOAD_COLOR = {
  Light:    { bg: 'rgba(209,235,219,0.6)',  text: '#2d6a4f' },
  Moderate: { bg: 'rgba(255,243,205,0.8)',  text: '#7d5a00' },
  Heavy:    { bg: 'rgba(255,220,210,0.8)',  text: '#8b2500' },
};

function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= breakpoint);
  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', handle, { passive: true });
    return () => window.removeEventListener('resize', handle);
  }, [breakpoint]);
  return isDesktop;
}

function useIsMd(breakpoint = 768) {
  const [isMd, setIsMd] = useState(() => window.innerWidth >= breakpoint);
  useEffect(() => {
    const handle = () => setIsMd(window.innerWidth >= breakpoint);
    window.addEventListener('resize', handle, { passive: true });
    return () => window.removeEventListener('resize', handle);
  }, [breakpoint]);
  return isMd;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ borderTop: '1px solid rgba(25,37,36,0.08)', margin: '2rem 0' }} />;
}

// Teaser detail for trial-ended (limited) creators: the area + the offer
// (compensation / deliverables / dates) stay visible to drive FOMO, while the
// photos, name, and description are blurred behind a subscribe CTA.
function RedactedListingDetail({ listing, onBack, onSubscribe }) {
  const hero = listing.image || listing.gallery_images?.[0] || IMG_FALLBACK;
  const area = listing.location
    || [listing.location_city, listing.location_country].filter(Boolean).join(', ')
    || 'Location hidden';
  const comp = listing.compensation
    || (listing.cash_amount ? `$${Number(listing.cash_amount).toLocaleString()}` : '');
  const deliv = listing.deliverables
    || (listing.deliverables_list?.length
        ? listing.deliverables_list.map((d) => `${d.quantity}× ${d.type}`).join(', ')
        : '')
    || (listing.deliverable_count ? `${listing.deliverable_count} deliverables` : '');

  const Stat = ({ label, value }) => (
    <div style={{ flex: '1 1 150px', minWidth: 150, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(25,37,36,0.08)', borderRadius: '1rem', padding: '0.9rem 1rem' }}>
      <p style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sage)', marginBottom: '0.3rem', fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>{value}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1.5rem 7rem' }}>
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 1.25rem', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate)', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(25,37,36,0.1)', borderRadius: '999px', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >← Back</button>

      {/* Blurred hero */}
      <div style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 300, marginBottom: '1.5rem' }}>
        <img src={hero} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(0.72)', transform: 'scale(1.15)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#fff', background: 'rgba(25,37,36,0.22)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 30, height: 30, opacity: 0.85 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Photos hidden — subscribe to view</p>
        </div>
      </div>

      {/* Blurred title */}
      <div aria-hidden style={{ filter: 'blur(7px)', userSelect: 'none', marginBottom: '0.5rem' }}>
        <div style={{ height: 26, width: '58%', background: 'rgba(25,37,36,0.18)', borderRadius: 6 }} />
      </div>

      {/* Area — visible */}
      <p style={{ fontSize: '0.95rem', color: 'var(--slate)', fontWeight: 600, marginBottom: '1.5rem' }}>📍 {area}</p>

      {/* The offer — visible */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {comp && <Stat label="Compensation" value={comp} />}
        {deliv && <Stat label="Deliverables" value={deliv} />}
        {listing.dates_available && <Stat label="Dates" value={listing.dates_available} />}
      </div>

      {/* Blurred description */}
      <div aria-hidden style={{ filter: 'blur(6px)', userSelect: 'none', marginBottom: '2rem' }}>
        {[92, 97, 85, 72, 60].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: 'rgba(25,37,36,0.12)', borderRadius: 5, marginBottom: 10 }} />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onSubscribe}
        style={{ width: '100%', maxWidth: 380, display: 'block', margin: '0 auto', padding: '0.95rem 1.25rem', borderRadius: '999px', border: 'none', cursor: 'pointer', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 8px 24px rgba(25,37,36,0.25)' }}
      >
        Subscribe to unlock full details →
      </button>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="4" y1="10" x2="16" y2="10" /><polyline points="11 5 16 10 11 15" />
    </svg>
  );
}


function LockIcon({ size = 13 }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, flexShrink: 0 }}>
      <rect x="3" y="8" width="10" height="6" rx="1"/>
      <path d="M5 8V5.5a3 3 0 0 1 6 0V8"/>
    </svg>
  );
}

// ─── Reviews Carousel ─────────────────────────────────────────────────────────
const PLACEHOLDER_REVIEWS = [
  { rating: 5, comment: 'The stay exceeded expectations and the content came together effortlessly.', reviewer_name: 'Creator' },
  { rating: 5, comment: 'Clear communication from the host and a genuinely beautiful property to shoot.', reviewer_name: 'Creator' },
  { rating: 4, comment: 'Great collaboration overall — would happily work with this host again.', reviewer_name: 'Creator' },
];

function ReviewCard({ rating, comment, reviewer_name, blurred }) {
  return (
    <div style={{
      flexShrink: 0, width: 280, scrollSnapAlign: 'start',
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.65)', borderRadius: '1.25rem',
      padding: '1.25rem', boxShadow: '0 4px 16px rgba(25,37,36,0.05)',
      filter: blurred ? 'blur(5px)' : 'none',
      userSelect: blurred ? 'none' : 'auto',
    }}>
      <Quote size={18} strokeWidth={1.75} color="var(--sage)" style={{ marginBottom: '0.5rem' }} />
      <p style={{ fontSize: '0.85rem', color: 'var(--slate)', lineHeight: 1.6, marginBottom: '1rem', minHeight: '3.4em' }}>
        {comment}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>{reviewer_name || 'Creator'}</span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} strokeWidth={0} fill={i < rating ? '#d9a441' : 'rgba(25,37,36,0.15)'} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewsCarousel({ reviews }) {
  const hasReviews = reviews && reviews.length > 0;
  const shown = hasReviews ? reviews : PLACEHOLDER_REVIEWS;
  return (
    <div style={{ position: 'relative' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '1.25rem' }}>
        What creators are saying
      </h2>
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: '0.5rem' }}>
        {shown.map((r, i) => (
          <ReviewCard key={i} {...r} blurred={!hasReviews} />
        ))}
      </div>
      {!hasReviews && (
        <div style={{
          position: 'absolute', inset: '2.25rem 0 0.5rem', zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(239,236,233,0.35)', borderRadius: '1.25rem', pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)',
            background: 'rgba(255,255,255,0.85)', padding: '0.5rem 1rem', borderRadius: '999px',
            border: '1px solid rgba(25,37,36,0.1)',
          }}>
            No reviews yet for this stay
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Photo Gallery Overlay ────────────────────────────────────────────────────
function PhotoGallery({ images, title, onClose }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 180,
        background: 'rgba(25,37,36,0.97)',
        overflowY: 'auto', padding: '5rem 1.5rem 3rem',
        animation: 'detailFadeIn 200ms ease forwards',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '1.25rem', left: '1.5rem',
          color: 'rgba(239,236,233,0.9)', fontFamily: 'var(--font-body)',
          fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '999px', padding: '0.5rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}
      >
        ← Close
      </button>
      <p style={{ color: 'rgba(239,236,233,0.6)', fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'center', marginBottom: '2rem' }}>
        {title} — All Photos
      </p>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={`Photo ${i + 1}`}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
            style={{ width: '100%', borderRadius: '1rem', objectFit: 'cover', display: 'block' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Apply Now Modal ──────────────────────────────────────────────────────────
function ApplyModal({ listing, userId, creatorProfile, onClose, onApply, isPreview, navigate, isVerified, onVerificationRequired, isSubscribed, onSubscriptionRequired }) {
  const checkAndIncrementCvx = useMutation(api.pitches.checkAndIncrement);

  const handle = creatorProfile?.instagram_handle || creatorProfile?.tiktok_handle || creatorProfile?.username;
  const followerCount = creatorProfile?.follower_count;
  const followerStr = followerCount >= 1000 ? ` with ${Math.round(followerCount / 1000)}K followers` : '';
  const engagementStr = creatorProfile?.engagement_rate ? ` with a ${creatorProfile.engagement_rate}% engagement rate` : '';
  const collabStr = creatorProfile?.collab_count ? `${creatorProfile.collab_count}+` : 'several';
  const tierStr = creatorProfile?.tier || 'travel creator';
  const nameStr = creatorProfile?.full_name || 'I';

  const defaultPitch =
`Hi! I'm ${nameStr}${handle ? ` (@${handle})` : ''}${followerStr ? `, a ${tierStr}${followerStr}` : ''}.

I'd love to collaborate on ${listing.title} in ${listing.location}.

I specialize in ${listing.collab_type || 'travel'} content and have completed ${collabStr} collabs to date${engagementStr ? `${engagementStr} — meaning my audience is highly active and receptive to authentic travel stories` : ''}.

I'm available during ${listing.dates_available} and can deliver ${listing.deliverables} within ${listing.due_days} days of my stay. Looking forward to creating stunning content that showcases your incredible property!

Let's make something great together.`;

  const [pitch, setPitch] = useState(defaultPitch);
  const [submitted, setSubmitted] = useState(false);
  const [pitchBlocked, setPitchBlocked] = useState(false);
  const [previewBlocked, setPreviewBlocked] = useState(false);

  const isPitch = pitch.trim() !== defaultPitch.trim();

  const handleSubmit = async () => {
    // Preview mode (host viewing their own not-yet-published listing) must
    // never fire a real application — no rate-limit increment, no pitch
    // saved, and no fake "sent" confirmation implying it went somewhere.
    if (isPreview) { setPreviewBlocked(true); return; }
    if (!isVerified) { onVerificationRequired(); return; }
    if (!isSubscribed) { onSubscriptionRequired(); return; }
    if (isPitch) {
      const { allowed: localAllowed } = canSubmitPitch();
      if (!localAllowed) { setPitchBlocked(true); return; }
      try {
        const result = await checkAndIncrementCvx({ userId: userId || 'mock-user-001' });
        if (!result.allowed) {
          syncPitchCount(result.count);
          setPitchBlocked(true);
          return;
        }
        syncPitchCount(result.count);
      } catch {
        incrementPitchCount();
      }
    }
    onApply(listing, pitch, creatorProfile);
    setSubmitted(true);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(25,37,36,0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '1rem', animation: 'detailFadeIn 200ms ease forwards',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '560px',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(24px)',
        borderRadius: '1.5rem', padding: '2rem',
        boxShadow: '0 32px 64px -16px rgba(25,37,36,0.25)',
        animation: 'detailSlideUp 300ms cubic-bezier(0.32,0.72,0,1) forwards',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        {previewBlocked ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,220,210,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.6rem', color: '#8b2500',
            }}>
              ✕
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
              This is a preview
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '2rem' }}>
              Applications can't be sent until this listing is actually published — creators won't be able to see or apply to it until then either.
            </p>
            <button onClick={onClose} style={{
              width: '100%', padding: '0.875rem',
              background: 'var(--ink)', color: 'var(--bone)',
              borderRadius: '999px', fontWeight: 700,
              fontSize: '0.9rem', fontFamily: 'var(--font-body)',
              border: 'none', cursor: 'pointer',
            }}>Close</button>
          </div>
        ) : pitchBlocked ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,220,210,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.6rem', color: '#8b2500',
            }}>
              ✕
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
              Pitch Limit Reached
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '0.75rem' }}>
              You've used all 10 pitches this month. Pitches reset on the 1st of next month. You can still submit standard applications anytime.
            </p>
            <p style={{ color: 'var(--sage)', fontSize: '0.8rem', marginBottom: '2rem' }}>
              To send a standard application, restore your pitch message to the default template.
            </p>
            <button onClick={() => setPitchBlocked(false)} style={{
              width: '100%', padding: '0.875rem', marginBottom: '0.625rem',
              background: 'var(--ink)', color: 'var(--bone)',
              borderRadius: '999px', fontWeight: 700,
              fontSize: '0.9rem', fontFamily: 'var(--font-body)',
              border: 'none', cursor: 'pointer',
            }}>Back to Application</button>
            <button onClick={onClose} style={{
              width: '100%', padding: '0.875rem',
              background: 'transparent', color: 'var(--sage)',
              borderRadius: '999px', fontWeight: 600,
              fontSize: '0.875rem', fontFamily: 'var(--font-body)',
              border: '1.5px solid rgba(25,37,36,0.12)', cursor: 'pointer',
            }}>Close</button>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(209,235,219,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', fontSize: '1.75rem', color: '#2d6a4f',
            }}>
              ✓
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Application Sent!
            </h2>
            <p style={{ color: 'var(--sage)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Your pitch for <strong style={{ color: 'var(--slate)' }}>{listing.title}</strong> has been sent.
            </p>
            <p style={{ color: 'var(--sage)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Check <strong style={{ color: 'var(--slate)' }}>Collabs</strong> to track your application and <strong style={{ color: 'var(--slate)' }}>Inbox</strong> for the host's reply.
            </p>
            <button
              onClick={() => {
                navigate('/contract', {
                  state: {
                    prefill: {
                      creator: creatorProfile?.full_name || nameStr,
                      host: listing.title.split(' ').slice(0, 2).join(' '),
                      property_name: listing.title,
                      location: listing.location,
                      dates: listing.dates_available,
                      deliverables: listing.deliverables,
                    }
                  }
                });
              }}
              style={{
                width: '100%', padding: '0.875rem', marginBottom: '0.625rem',
                background: 'var(--ink)', color: 'var(--bone)',
                borderRadius: '999px', fontWeight: 700,
                fontSize: '0.9rem', fontFamily: 'var(--font-body)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Create Contract
            </button>
            <button onClick={onClose} style={{
              width: '100%', padding: '0.875rem',
              background: 'var(--ink)', color: 'var(--bone)',
              borderRadius: '999px', fontWeight: 700,
              fontSize: '0.9rem', fontFamily: 'var(--font-body)',
              border: 'none', cursor: 'pointer',
            }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={listing.image} alt={listing.title}
                  style={{ width: 48, height: 48, borderRadius: '0.75rem', objectFit: 'cover', flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', lineHeight: 1.2 }}>
                    Apply to {listing.title}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginTop: '0.1rem' }}>{listing.location}</p>
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(25,37,36,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                fontSize: '1rem', color: 'var(--slate)',
              }}>✕</button>
            </div>

            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
              Your Pitch
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginBottom: '0.75rem' }}>
              Auto-filled from your profile — personalize as you like.
            </p>

            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={10}
              style={{
                width: '100%', padding: '1rem',
                borderRadius: '1rem',
                border: '1.5px solid rgba(25,37,36,0.12)',
                background: 'rgba(239,236,233,0.5)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem', lineHeight: 1.65,
                color: 'var(--ink)', resize: 'vertical', outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.4)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.4rem 0 1.25rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0 }}>{pitch.length} characters</p>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.6rem',
                borderRadius: '999px',
                background: isPitch ? 'rgba(209,235,219,0.8)' : 'rgba(25,37,36,0.07)',
                color: isPitch ? '#2d6a4f' : 'var(--sage)',
                border: isPitch ? '1px solid rgba(74,155,127,0.3)' : 'none',
                transition: 'all 200ms',
              }}>
                {isPitch ? 'Pitch' : 'Application'}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              style={{
                width: '100%', padding: '0.9rem',
                background: 'var(--ink)', color: 'var(--bone)',
                borderRadius: '999px', fontWeight: 700,
                fontSize: '0.95rem', fontFamily: 'var(--font-body)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {isPitch ? 'Send Pitch' : 'Send Application'} <ArrowRight />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Share Modal ─────────────────────────────────────────────────────────────
function ShareModal({ listing, onClose, onCopied }) {
  const url = window.location.href;
  const text = `Check out this collab listing: ${listing.title} in ${listing.location}`;
  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text + ' ')}&url=${encodeURIComponent(url)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;

  const rows = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      ),
      label: 'Copy link',
      action: async () => {
        try { await navigator.clipboard.writeText(url); } catch { /* fallback */ const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
        onCopied();
        onClose();
      },
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      label: 'Share on X',
      action: () => { window.open(tweetUrl, '_blank', 'noopener'); onClose(); },
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18, color: '#25D366' }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      label: 'Share on WhatsApp',
      action: () => { window.open(waUrl, '_blank', 'noopener'); onClose(); },
    },
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(25,37,36,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '1rem', animation: 'detailFadeIn 200ms ease forwards',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)',
          borderRadius: '1.75rem', padding: '1.5rem',
          boxShadow: '0 32px 64px -16px rgba(25,37,36,0.2)',
          animation: 'detailSlideUp 280ms cubic-bezier(0.32,0.72,0,1) forwards',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Share listing</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--slate)' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {rows.map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.875rem 1rem', borderRadius: '1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.925rem', fontWeight: 600, color: 'var(--ink)',
                textAlign: 'left', transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <span style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'rgba(25,37,36,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--slate)' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Save Collection Modal ────────────────────────────────────────────────────
function SaveCollectionModal({ listing, collections, onMoveToCollection, onRemove, onCreateAndSave, onClose }) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const savedIn = collections.find((c) => c.listingIds.includes(listing.id));

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateAndSave(name);
    setNewName('');
    setCreating(false);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(25,37,36,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '1rem', animation: 'detailFadeIn 200ms ease forwards',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)',
          borderRadius: '1.75rem', padding: '1.5rem',
          boxShadow: '0 32px 64px -16px rgba(25,37,36,0.2)',
          animation: 'detailSlideUp 280ms cubic-bezier(0.32,0.72,0,1) forwards',
          maxHeight: '70dvh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Save to collection</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--slate)' }}>✕</button>
        </div>

        {/* Collections list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
          {collections.map((col) => {
            const isInThis = col.listingIds.includes(listing.id);
            return (
              <button
                key={col.id}
                onClick={() => isInThis ? onRemove(col.id) : onMoveToCollection(col.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem 1rem', borderRadius: '1rem',
                  background: isInThis ? 'rgba(209,235,219,0.4)' : 'none',
                  border: isInThis ? '1.5px solid rgba(45,106,79,0.2)' : '1.5px solid transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 120ms',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => { if (!isInThis) e.currentTarget.style.background = 'rgba(25,37,36,0.05)'; }}
                onMouseLeave={(e) => { if (!isInThis) e.currentTarget.style.background = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: isInThis ? 'rgba(45,106,79,0.15)' : 'rgba(25,37,36,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill={isInThis ? '#2d6a4f' : 'none'} stroke={isInThis ? '#2d6a4f' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--sage)' }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: isInThis ? '#2d6a4f' : 'var(--ink)', marginBottom: '0.05rem' }}>{col.name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>{col.listingIds.length} saved</p>
                  </div>
                </div>
                {isInThis && (
                  <svg viewBox="0 0 20 20" fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
                    <polyline points="4 10 8 14 16 6"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Create new collection */}
        {creating ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
              placeholder="Collection name"
              style={{
                flex: 1, padding: '0.65rem 0.875rem',
                borderRadius: '0.75rem', border: '1.5px solid rgba(25,37,36,0.15)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)',
                background: 'rgba(255,255,255,0.9)', outline: 'none',
              }}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{
                padding: '0.65rem 1rem', borderRadius: '0.75rem',
                background: newName.trim() ? 'var(--ink)' : 'rgba(25,37,36,0.1)',
                color: newName.trim() ? 'var(--bone)' : 'var(--sage)',
                border: 'none', cursor: newName.trim() ? 'pointer' : 'default',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700,
              }}
            >Create</button>
            <button
              onClick={() => { setCreating(false); setNewName(''); }}
              style={{ padding: '0.65rem 0.875rem', borderRadius: '0.75rem', background: 'none', border: '1.5px solid rgba(25,37,36,0.12)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--sage)' }}
            >Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '1rem',
              background: 'none', border: '1.5px dashed rgba(25,37,36,0.15)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--sage)',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 15, height: 15 }}>
              <line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/>
            </svg>
            New collection
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sample listing hover tooltip ────────────────────────────────────────────
function SampleTooltip({ active, children }) {
  const [visible, setVisible] = useState(false);
  if (!active) return children;
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(25,37,36,0.92)', backdropFilter: 'blur(8px)',
          color: '#EFECE9', padding: '0.45rem 0.9rem',
          borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 600,
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30,
          fontFamily: 'var(--font-body)', letterSpacing: '0.01em',
          boxShadow: '0 4px 16px rgba(25,37,36,0.2)',
        }}>
          Sample listing · interactions disabled
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(25,37,36,0.92)',
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Host Profile Modal ───────────────────────────────────────────────────────
function HostProfileModal({ host, listing, onClose, onMessage, isSample }) {
  const [imgError, setImgError]   = useState(false);
  const [flipped, setFlipped]     = useState(false);
  const avatar = imgError ? host.avatar_fallback : host.avatar_url;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(25,37,36,0.5)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'detailFadeIn 200ms ease forwards',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto',
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.88)',
          boxShadow: '0 28px 80px rgba(25,37,36,0.24), inset 0 1px 0 rgba(255,255,255,0.9)',
          animation: 'detailSlideUp 300ms cubic-bezier(0.32,0.72,0,1) forwards',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(25,37,36,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,37,36,0.1)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fff'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.88)'}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="#3C5759" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Horizontal layout */}
        <div style={{ display: 'flex' }}>

          {/* LEFT — flip card */}
          <div style={{
            width: 200, flexShrink: 0,
            padding: '32px 20px 32px 28px',
            borderRight: '1px solid rgba(25,37,36,0.07)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            {/* 3D flip container */}
            <div
              onMouseEnter={() => setFlipped(true)}
              onMouseLeave={() => setFlipped(false)}
              style={{ width: 160, height: 160, perspective: 800, cursor: 'pointer' }}
            >
              <div style={{
                width: '100%', height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 500ms ease',
              }}>
                {/* Front: host avatar on sage gradient */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '1.25rem', overflow: 'hidden',
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  background: 'linear-gradient(150deg, #D1EBDB 0%, #E6EFE7 45%, #EFECE9 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 28px rgba(25,37,36,0.14)',
                }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={avatar} alt={host.name}
                      onError={() => setImgError(true)}
                      style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '4px solid rgba(255,255,255,0.97)', boxShadow: '0 4px 18px rgba(25,37,36,0.18)' }}
                    />
                    {host.verified && (
                      <div style={{ position: 'absolute', bottom: 2, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#192524', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid white' }}>
                        <svg viewBox="0 0 12 12" fill="none" style={{ width: 10, height: 10 }}>
                          <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                {/* Back: listing image */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '1.25rem', overflow: 'hidden',
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  boxShadow: '0 6px 28px rgba(25,37,36,0.14)',
                }}>
                  {listing.image ? (
                    <img src={listing.image} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(150deg, #D1EBDB 0%, #EFECE9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(25,37,36,0.25)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(25,37,36,0.4) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{listing.title}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--sage)', textAlign: 'center', lineHeight: 1.4 }}>
              Hover to see the listing
            </div>
          </div>

          {/* RIGHT — host details */}
          <div style={{ flex: 1, padding: '28px 28px 24px 24px', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)', lineHeight: 1.1 }}>
              {host.name}
            </div>
            {host.role && (
              <div style={{ fontSize: 12.5, color: 'var(--sage)', marginTop: 4 }}>{host.role}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 4 }}>
              Hosting in {listing.location}
            </div>

            <div style={{ height: 1, background: 'rgba(25,37,36,0.07)', margin: '14px 0' }} />

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(25,37,36,0.06)', borderRadius: '0.875rem', overflow: 'hidden', marginBottom: 16 }}>
              {[
                { val: `${host.rating}★`, label: 'Rating' },
                { val: `${host.years_hosting}`, label: 'Yrs Hosting' },
                { val: `${host.response_rate}%`, label: 'Response' },
              ].map(({ val, label }) => (
                <div key={label} style={{ padding: '12px 0', background: 'rgba(255,255,255,0.78)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)', lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {host.bio && (
              <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.7, marginBottom: 12 }}>{host.bio}</p>
            )}
            {host.response_time && (
              <p style={{ fontSize: 12, color: 'var(--sage)', marginBottom: 16 }}>
                <strong style={{ color: 'var(--slate)' }}>Responds</strong> {host.response_time}
              </p>
            )}

            <SampleTooltip active={isSample}>
              <button
                onClick={isSample ? undefined : onMessage}
                disabled={isSample}
                style={{
                  width: '100%', padding: '13px 0',
                  background: 'var(--ink)', color: 'var(--bone)',
                  borderRadius: '999px', fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem', fontWeight: 700,
                  border: 'none', cursor: isSample ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  transition: 'opacity 150ms', opacity: isSample ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!isSample) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = isSample ? '0.5' : '1'; }}
              >
                Message {host.name.split(' ')[0]} <ArrowRight />
              </button>
            </SampleTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ListingDetail({ previewListing = null, preview = false }) {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const isPreview = preview || !!previewListing;
  const id = previewListing ? String(previewListing.id || previewListing._id || 'preview') : routeId;

  const sampleListing = previewListing ? null : SAMPLE_LISTINGS.find((l) => l.id === id);
  // Only query Convex if this is a live route that didn't match a sample listing
  const convexListing = useQuery(api.listings.getById, (sampleListing || isPreview) ? 'skip' : { id });
  const convexNormalized = convexListing ? normalizeConvexListingDetail(convexListing) : undefined;
  const previewNormalized = previewListing ? normalizeConvexListingDetail(previewListing) : undefined;

  // Cache Convex listing details per id (5 min TTL) to avoid re-fetch on back-navigation
  const listingCacheKey = `listing_detail_${id}`;
  useEffect(() => {
    if (convexNormalized) cache.set(listingCacheKey, convexNormalized, 5);
  }, [convexListing]); // eslint-disable-line react-hooks/exhaustive-deps

  const cachedListing = (!sampleListing && !isPreview) ? cache.get(listingCacheKey) : null;
  const listing = previewNormalized || sampleListing || convexNormalized || cachedListing || undefined;

  // Sample listings are demo content — messaging/applying is disabled on them.
  const isSampleListing = !!sampleListing || convexListing?.is_sample === true || listing?.is_sample === true || listing?._isSample === true;
  const SAMPLE_TOOLTIP = 'This is a sample listing — for reference only. Please delete.';

  const { applyToListing, hasApplied, threads, createThread, toggleSave, isSaved, collections, createCollection, moveToCollection } = useCollabs();
  const { profile } = useAuth();
  const { openModal } = useVerification();
  const { isSubscribed, openModal: openSubModal } = useSubscription();
  const access = useAccessGate();
  const isVerified = profile?.is_verified === true;

  // Fetch host profile from Convex to get their Clerk-synced avatar
  const sampleHostProfile = useQuery(
    api.profiles.getByUsername,
    sampleListing ? { username: 'ben.venturing' } : 'skip'
  );
  const convexHostId = listing?.host_id;
  const convexHostProfile = useQuery(
    api.profiles.getById,
    convexHostId ? { id: convexHostId } : 'skip'
  );
  const hostProfile = convexHostProfile ?? sampleHostProfile;

  // Reviews left by creators on past collaborations for this listing.
  const listingReviews = useQuery(
    api.reviews.getForListing,
    (listing?.id && !isSampleListing && !isPreview) ? { listingId: listing.id } : 'skip'
  );

  const isDesktop = useIsDesktop();
  const isMd      = useIsMd();

  const [showStickyNav,  setShowStickyNav]  = useState(false);
  const [activeSection,  setActiveSection]  = useState('Photos');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showGallery,    setShowGallery]    = useState(false);
  const [hostImgError,   setHostImgError]   = useState(false);
  const [showHostModal,  setShowHostModal]  = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const [toast,          setToast]          = useState('');
  const toastTimer = useRef(null);
  const photoGridRef = useRef(null);
  const offerRef     = useRef(null);
  const reqRef       = useRef(null);
  const locationRef  = useRef(null);

  const sectionMap = { 'Photos': photoGridRef, 'The Offer': offerRef, 'Requirements': reqRef, 'Location': locationRef };

  const scrollToSection = useCallback((section) => {
    const el = sectionMap[section]?.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
  }, []);

  const handleMessageHost = useCallback(() => {
    if (isPreview) return;
    if (!isVerified) { openModal(); setShowHostModal(false); return; }
    if (!isSubscribed) { openSubModal(); setShowHostModal(false); return; }
    const existing = threads.find((t) => !t.archived && t.host_name === SAMPLE_HOST.name);
    const threadId = existing ? existing.id : createThread(listing.title, SAMPLE_HOST.name, 'Application');
    navigate('/inbox', { state: { selectedThreadId: threadId } });
  }, [isPreview, isVerified, openModal, threads, createThread, listing, navigate]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text: `Check out this collab listing: ${listing.title} in ${listing.location}`, url: window.location.href });
        return;
      } catch {}
    }
    setShowShareModal(true);
  }, [listing]);

  const handleSaveToCollection = useCallback((collectionId) => {
    if (!listing) return;
    moveToCollection(listing.id, collectionId);
    const col = collections.find((c) => c.id === collectionId);
    showToast(`Saved to "${col?.name || 'collection'}"`);
    setShowSaveModal(false);
  }, [listing, moveToCollection, collections, showToast]);

  const handleRemoveFromCollection = useCallback((collectionId) => {
    if (!listing) return;
    toggleSave(listing.id);
    showToast('Removed from collection');
    setShowSaveModal(false);
  }, [listing, toggleSave, showToast]);

  const handleCreateAndSave = useCallback(async (name) => {
    if (!listing) return;
    const newCol = await createCollection(name);
    moveToCollection(listing.id, newCol.id);
    showToast(`Saved to "${name}"`);
    setShowSaveModal(false);
  }, [listing, createCollection, moveToCollection, showToast]);

  useEffect(() => {
    const onScroll = () => {
      if (!photoGridRef.current) return;
      setShowStickyNav(photoGridRef.current.getBoundingClientRect().bottom < 0);

      const ordered = [
        { name: 'Location',     ref: locationRef },
        { name: 'Requirements', ref: reqRef },
        { name: 'The Offer',    ref: offerRef },
        { name: 'Photos',       ref: photoGridRef },
      ];
      for (const { name, ref } of ordered) {
        if (ref.current && ref.current.getBoundingClientRect().top < 120) {
          setActiveSection(name);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!listing) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ color: 'var(--sage)', marginBottom: '1rem' }}>Listing not found.</p>
        <button onClick={() => navigate('/explore')} style={{
          padding: '0.75rem 1.5rem', background: 'var(--ink)', color: 'var(--bone)',
          borderRadius: '999px', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer', border: 'none',
        }}>Back to Explore</button>
      </div>
    );
  }

  // Server already redacted this listing for pending/limited creators — block the
  // full detail page instead of rendering a half-blank page (title/host/etc. are
  // undefined in the redacted payload). Sample/preview listings are exempt.
  // Pending creators are hard-blocked. Limited (trial-ended) creators instead get
  // a blurred teaser — area + deliverables visible, photos/name/description hidden.
  // Covers server-redacted real listings AND sample listings (redacted client-side).
  const isLimitedCreator = !access.loading && access.role === 'creator' && access.state === 'limited' && !access.isAdmin && !access.isFounder;
  if (!isPreview && !access.loading) {
    if (access.state === 'pending' && convexListing?._redacted) return <PendingApprovalScreen />;
    const redactThis = convexListing?._redacted || (isLimitedCreator && (isSampleListing || !!sampleListing));
    if (redactThis) {
      return (
        <RedactedListingDetail
          listing={listing}
          onBack={() => navigate(-1)}
          onSubscribe={() => (typeof openSubModal === 'function' ? openSubModal() : navigate('/pricing'))}
        />
      );
    }
  }

  const applied     = hasApplied(listing.id);
  const loadStyle   = LOAD_COLOR[listing.deliverable_load] || LOAD_COLOR.Moderate;
  const resolvedHostAvatarUrl = hostProfile?.avatar_url || SAMPLE_HOST.avatar_fallback;
  const hostAvatar  = hostImgError ? SAMPLE_HOST.avatar_fallback : resolvedHostAvatarUrl;

  return (
    <div style={{ paddingBottom: isDesktop ? '2rem' : '7rem' }}>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes detailFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes detailSlideUp { from{transform:translateY(50px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* ── Back + Share/Save ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate)',
            background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(25,37,36,0.1)', borderRadius: '999px', padding: '0.5rem 1rem',
            cursor: 'pointer', transition: 'background 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.65)'; }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)',
              background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(25,37,36,0.1)', borderRadius: '999px', padding: '0.5rem 0.9rem', cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>

          {/* Save */}
          {(() => {
            const saved = isSaved(listing.id);
            return (
              <button
                onClick={() => setShowSaveModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600,
                  color: saved ? '#c0392b' : 'var(--slate)',
                  background: saved ? 'rgba(255,220,220,0.75)' : 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(12px)',
                  border: saved ? '1px solid rgba(192,57,43,0.2)' : '1px solid rgba(25,37,36,0.1)',
                  borderRadius: '999px', padding: '0.5rem 0.9rem', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <svg viewBox="0 0 24 24" fill={saved ? '#c0392b' : 'none'} stroke={saved ? '#c0392b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {saved ? 'Saved' : 'Save'}
              </button>
            );
          })()}
        </div>
      </div>

      {/* ── Photo grid ───────────────────────────────────────────────────────── */}
      <div ref={photoGridRef} style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', maxWidth: '1120px', margin: '0 auto' }}>
          {isMd ? (
            /* Desktop 5-photo grid */
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 6, height: 460 }}>
              <div style={{ overflow: 'hidden' }}>
                <img src={listing.gallery_images[0]} alt={listing.title}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms ease' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6 }}>
                {listing.gallery_images.slice(1, 5).map((src, i) => (
                  <div key={i} style={{ overflow: 'hidden' }}>
                    <img src={src} alt={`${listing.title} ${i + 2}`}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms ease' }}
                      onMouseEnter={(e) => { e.target.style.transform = 'scale(1.04)'; }}
                      onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Mobile single photo */
            <div style={{ height: 280 }}>
              <img src={listing.gallery_images[0]} alt={listing.title}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          {/* Show all photos */}
          <button
            onClick={() => setShowGallery(true)}
            style={{
              position: 'absolute', bottom: '1rem', right: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(25,37,36,0.12)',
              borderRadius: '0.75rem', padding: '0.5rem 0.875rem',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700,
              color: 'var(--ink)', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(25,37,36,0.12)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Show all photos
          </button>
        </div>
      </div>

      {/* ── Sticky section nav (fixed, appears after photos leave view) ───────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 45,
        background: 'rgba(239,236,233,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(25,37,36,0.08)',
        transform: showStickyNav ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
        pointerEvents: showStickyNav ? 'auto' : 'none',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', overflowX: 'auto' }}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => scrollToSection(s)}
              style={{
                flexShrink: 0,
                padding: '1rem 1.25rem',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
                color: activeSection === s ? 'var(--ink)' : 'var(--sage)',
                borderBottom: `2px solid ${activeSection === s ? 'var(--ink)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 150ms',
                background: 'none', marginBottom: '-1px',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'flex-start' }}>

          {/* Left column */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Title */}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.5rem,4vw,2rem)', color: 'var(--ink)', lineHeight: 1.1, marginBottom: '0.5rem' }}>
              {listing.title}
            </h1>

            {/* Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>
                ✦ {listing.property_type ? `${listing.property_type} · ` : ''}{listing.location}
              </span>
            </div>

            {/* Tag pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {[
                { label: tierLabel(listing.creator_tier), bg: 'rgba(25,37,36,0.07)', color: 'var(--slate)' },
                { label: listing.compensation, bg: listing.compensation_type === 'paid' ? 'rgba(209,235,219,0.8)' : 'rgba(25,37,36,0.07)', color: listing.compensation_type === 'paid' ? '#2d6a4f' : 'var(--slate)' },
                { label: `${listing.deliverable_load} Load`, bg: loadStyle.bg, color: loadStyle.text },
                { label: `Due in ${listing.due_days} days`, bg: 'rgba(255,220,210,0.7)', color: '#8b3a00' },
              ].map(({ label, bg, color }) => (
                <span key={label} style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', background: bg, fontSize: '0.78rem', fontWeight: 600, color, fontFamily: 'var(--font-body)' }}>
                  {label}
                </span>
              ))}
            </div>

            <Divider />

            {/* Host row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
              <button
                onClick={() => setShowHostModal(true)}
                style={{ position: 'relative', flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img src={hostAvatar} alt={SAMPLE_HOST.name}
                  onError={() => setHostImgError(true)}
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(25,37,36,0.12)', display: 'block' }}
                />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: '#192524', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                    <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', lineHeight: 1.2 }}>
                  Listed by {SAMPLE_HOST.name}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)' }}>{SAMPLE_HOST.role}</p>
              </div>
            </div>

            {/* Creator stats glass card */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
              padding: '1.25rem',
              background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.6)', borderRadius: '1.25rem',
              marginBottom: '2rem', boxShadow: '0 4px 16px rgba(25,37,36,0.06)',
            }}>
              {[
                {
                  icon: <TierIcon tier={listing.creator_tier} size={20} />,
                  label: 'Creator Tier',
                  value: tierLabel(listing.creator_tier),
                },
                {
                  icon: <CompIcon type={listing.compensation_type} size={20} />,
                  label: 'Compensation',
                  value: listing.compensation_type === 'paid' ? `$${listing.cash_amount} Cash`
                       : listing.compensation_type === 'hybrid' ? `$${listing.cash_amount} + Stay`
                       : 'Complimentary Stay',
                },
                {
                  icon: <Package size={20} strokeWidth={1.75} color="var(--slate)" />,
                  label: 'Deliverables',
                  value: `${listing.deliverable_load} load`,
                },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>{icon}</div>
                  <p style={{ fontSize: '0.67rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{value}</p>
                </div>
              ))}
            </div>

            <Divider />

            {/* About */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.875rem' }}>About this stay</h2>
              {listing.about.split('\n\n').map((para, i) => (
                <p key={i} style={{ fontSize: '0.95rem', color: 'var(--slate)', lineHeight: 1.75, marginBottom: '1rem' }}>{para}</p>
              ))}
            </div>

            <Divider />

            {/* Amenities */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '1rem' }}>What this place offers</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
                {listing.amenities.map(({ icon, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AmenityIcon icon={icon} size={18} />
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            {/* THE OFFER */}
            <div ref={offerRef} style={{ marginBottom: '2rem', scrollMarginTop: '80px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '1.25rem' }}>The Offer</h2>
              <div style={{
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.65)', borderRadius: '1.25rem', padding: '1.5rem',
                boxShadow: '0 4px 16px rgba(25,37,36,0.05)',
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--sage)', marginBottom: '0.875rem' }}>What you get</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {listing.what_you_get.map((item) => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0, marginTop: '0.1rem' }}>
                        <polyline points="4 10 8 14 16 6"/>
                      </svg>
                      <span style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: '1px solid rgba(25,37,36,0.08)', paddingTop: '1.25rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--sage)', marginBottom: '0.75rem' }}>What you deliver</p>
                  {listing.deliverables_list?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {listing.deliverables_list.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: '0.5rem', flexShrink: 0,
                            background: 'rgba(25,37,36,0.05)', border: '1px solid rgba(25,37,36,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <DeliverableIcon type={d.type} size={14} />
                          </span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600 }}>
                            {d.quantity}× {d.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.95rem', color: 'var(--ink)', fontWeight: 600, marginBottom: '0.2rem' }}>{listing.deliverables}</p>
                  )}
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: '0.25rem' }}>{listing.what_you_deliver}</p>
                </div>
              </div>
            </div>

            <Divider />

            {/* REQUIREMENTS */}
            <div ref={reqRef} style={{ marginBottom: '2rem', scrollMarginTop: '80px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>Requirements</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>Creator tier required:</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '3px 10px 3px 7px', borderRadius: 9999,
                  background: 'rgba(25,37,36,0.06)', border: '1px solid rgba(25,37,36,0.1)',
                }}>
                  <TierIcon tier={listing.creator_tier} size={13} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate)' }}>{tierLabel(listing.creator_tier)}</span>
                </span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {listing.requirements.map((req) => (
                  <li key={req} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--slate)', flexShrink: 0, marginTop: '0.5rem' }}/>
                    <span style={{ fontSize: '0.9rem', color: 'var(--slate)', lineHeight: 1.6 }}>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Divider />

            {/* LOCATION */}
            <div ref={locationRef} style={{ marginBottom: '2rem', scrollMarginTop: '80px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>Location</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>{listing.location_full}</p>
              <div style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 320, border: '1px solid rgba(25,37,36,0.08)' }}>
                <ListingLocationMap lat={listing.lat} lng={listing.lng} />
              </div>
            </div>

            <Divider />

            {/* MEET YOUR HOST */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '1.25rem' }}>Meet your host</h2>
              <div style={{
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.65)', borderRadius: '1.25rem', padding: '1.75rem',
                display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
                boxShadow: '0 4px 16px rgba(25,37,36,0.05)',
              }}>
                {/* Host card */}
                <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center', minWidth: 155, border: '1px solid rgba(25,37,36,0.08)' }}>
                  <button
                    onClick={() => setShowHostModal(true)}
                    style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <img src={hostAvatar} alt={SAMPLE_HOST.name}
                      onError={() => setHostImgError(true)}
                      style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#192524', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                      <svg viewBox="0 0 12 12" fill="none" style={{ width: 10, height: 10 }}>
                        <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.15rem' }}>{SAMPLE_HOST.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginBottom: '0.875rem' }}>Collabnb Host</p>
                  {[{ val: `${SAMPLE_HOST.years_hosting}`, label: 'Years hosting' }].map(({ val, label }) => (
                    <div key={label} style={{ borderTop: '1px solid rgba(25,37,36,0.07)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>{val}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Host bio + details */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
                    {SAMPLE_HOST.name}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--slate)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{SAMPLE_HOST.bio}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '0.35rem' }}><strong>Response rate:</strong> {SAMPLE_HOST.response_rate}%</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1.25rem' }}><strong>Responds</strong> {SAMPLE_HOST.response_time}</p>
                  <SampleTooltip active={isSampleListing}>
                    <button
                      onClick={isSampleListing ? undefined : handleMessageHost}
                      disabled={isSampleListing}
                      style={{
                        padding: '0.65rem 1.5rem',
                        background: 'var(--bone)', border: '1.5px solid rgba(25,37,36,0.15)',
                        borderRadius: '999px', fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)',
                        cursor: isSampleListing ? 'not-allowed' : 'pointer',
                        opacity: isSampleListing ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { if (!isSampleListing) e.currentTarget.style.background = 'rgba(25,37,36,0.07)'; }}
                      onMouseLeave={(e) => { if (!isSampleListing) e.currentTarget.style.background = 'var(--bone)'; }}
                    >
                      Message host
                    </button>
                  </SampleTooltip>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right sidebar — desktop only ──────────────────────────────── */}
          {isDesktop && (
            <div style={{ width: 360, flexShrink: 0, alignSelf: 'stretch' }}>
              <div style={{
                position: 'sticky', top: 'calc(8rem + var(--banner-h, 0rem))',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(24px) saturate(140%)',
                WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.7)',
                borderRadius: '1.5rem', padding: '1.75rem',
                boxShadow: '0 20px 40px -15px rgba(25,37,36,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  {listing.compensation_type !== 'paid' && listing.compensation_type !== 'hybrid' && (
                    <CompIcon type={listing.compensation_type} size={22} />
                  )}
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', margin: 0 }}>
                    {listing.compensation_type === 'paid' ? formatCash(listing.cash_amount, listing.currency)
                   : listing.compensation_type === 'hybrid' ? `${formatCash(listing.cash_amount, listing.currency)} + Stay`
                   : listing.compensation || '—'}
                  </p>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
                  {listing.compensation_type === 'paid' ? `· ${listing.deliverable_count} deliverables`
                 : listing.compensation_type === 'hybrid' ? `stay included · ${listing.deliverable_count} deliverables`
                 : `${listing.deliverable_count} deliverables`}
                </p>

                {/* Details grid */}
                <div style={{ border: '1.5px solid rgba(25,37,36,0.1)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1rem' }}>
                  {[
                    { label: 'Availability', value: listing.dates_available },
                    { label: 'Creator tier', value: tierLabel(listing.creator_tier) },
                    { label: 'Deliverables', value: listing.deliverables },
                    { label: 'Due in',        value: `${listing.due_days} days of checkout` },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} style={{ padding: '0.875rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(25,37,36,0.08)' : 'none' }}>
                      <p style={{ fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sage)', marginBottom: '0.15rem' }}>{label}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                <SampleTooltip active={isSampleListing}>
                  <button
                    onClick={(applied || isSampleListing) ? undefined : (!isVerified ? openModal : !isSubscribed ? openSubModal : () => setShowApplyModal(true))}
                    disabled={applied || isSampleListing}
                    style={{
                      width: '100%', padding: '1rem',
                      opacity: isSampleListing ? 0.5 : 1,
                      background: applied ? 'rgba(25,37,36,0.1)' : 'var(--ink)',
                      color: applied ? 'var(--sage)' : 'var(--bone)',
                      borderRadius: '999px', fontFamily: 'var(--font-body)',
                      fontSize: '1rem', fontWeight: 700,
                      cursor: (applied || isSampleListing) ? 'default' : 'pointer',
                      border: 'none', marginBottom: '0.75rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={(e) => { if (!applied && !isSampleListing) e.currentTarget.style.opacity = '0.88'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = isSampleListing ? '0.5' : '1'; }}
                  >
                    {applied ? '✓ Applied' : (!isVerified || !isSubscribed) ? <><LockIcon /><span>Apply Now</span></> : <><span>Apply Now</span><ArrowRight /></>}
                  </button>
                </SampleTooltip>

                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', textAlign: 'center' }}>
                  Collabnb is free for creators.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Reviews carousel — sits below both columns, doesn't affect sidebar sticky height ── */}
        <div style={{ marginTop: '2rem', marginBottom: isDesktop ? '3rem' : '6rem' }}>
          <ReviewsCarousel reviews={listingReviews} />
        </div>
      </div>

      {/* ── Mobile bottom bar ─────────────────────────────────────────────────── */}
      {!isDesktop && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
          background: 'rgba(239,236,233,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(25,37,36,0.1)',
          padding: '0.875rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--ink)', lineHeight: 1.1 }}>
              {listing.compensation_type === 'paid' ? formatCash(listing.cash_amount, listing.currency) : `${formatCash(listing.cash_amount, listing.currency)} + Stay`}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>{listing.deliverable_count} deliverables</p>
          </div>
          <SampleTooltip active={isSampleListing}>
            <button
              onClick={(applied || isSampleListing) ? undefined : (!isVerified ? openModal : !isSubscribed ? openSubModal : () => setShowApplyModal(true))}
              disabled={applied || isSampleListing}
              style={{
                padding: '0.875rem 2rem',
                opacity: isSampleListing ? 0.5 : 1,
                background: applied ? 'rgba(25,37,36,0.1)' : 'var(--ink)',
                color: applied ? 'var(--sage)' : 'var(--bone)',
                borderRadius: '999px', fontFamily: 'var(--font-body)',
                fontSize: '0.95rem', fontWeight: 700,
                cursor: (applied || isSampleListing) ? 'default' : 'pointer',
                border: 'none', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              {applied ? '✓ Applied' : (!isVerified || !isSubscribed) ? <><LockIcon /><span>Apply Now</span></> : <><span>Apply Now</span><ArrowRight /></>}
            </button>
          </SampleTooltip>
        </div>
      )}

      {/* ── Apply modal ───────────────────────────────────────────────────────── */}
      {showApplyModal && (
        <ApplyModal
          listing={listing}
          userId={profile?._id || profile?.id}
          creatorProfile={profile}
          onClose={() => setShowApplyModal(false)}
          onApply={applyToListing}
          isPreview={isPreview}
          navigate={navigate}
          isVerified={isVerified}
          onVerificationRequired={() => { setShowApplyModal(false); openModal(); }}
          isSubscribed={isSubscribed}
          onSubscriptionRequired={() => { setShowApplyModal(false); openSubModal(); }}
        />
      )}

      {/* ── Gallery overlay ───────────────────────────────────────────────────── */}
      {showGallery && (
        <PhotoGallery
          images={listing.gallery_images}
          title={listing.title}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* ── Host profile modal ────────────────────────────────────────────────── */}
      {showHostModal && (
        <HostProfileModal
          host={SAMPLE_HOST}
          listing={listing}
          onClose={() => setShowHostModal(false)}
          onMessage={() => { setShowHostModal(false); handleMessageHost(); }}
          isSample={isSampleListing}
        />
      )}

      {/* ── Share modal ───────────────────────────────────────────────────────── */}
      {showShareModal && (
        <ShareModal
          listing={listing}
          onClose={() => setShowShareModal(false)}
          onCopied={() => showToast('Link copied!')}
        />
      )}

      {/* ── Save collection modal ─────────────────────────────────────────────── */}
      {showSaveModal && (
        <SaveCollectionModal
          listing={listing}
          collections={collections}
          onMoveToCollection={handleSaveToCollection}
          onRemove={handleRemoveFromCollection}
          onCreateAndSave={handleCreateAndSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: 'rgba(25,37,36,0.92)', backdropFilter: 'blur(12px)',
          color: '#EFECE9', padding: '0.65rem 1.25rem', borderRadius: '9999px',
          fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          boxShadow: '0 8px 24px rgba(25,37,36,0.22)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          animation: 'detailFadeIn 200ms ease forwards',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
