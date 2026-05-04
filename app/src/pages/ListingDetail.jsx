import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SAMPLE_LISTINGS, SAMPLE_HOST, MOCK_CREATOR } from '../lib/mockData';
import { useCollabs } from '../contexts/CollabContext';

const SECTIONS = ['Photos', 'The Offer', 'Requirements', 'Location'];

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

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12, flexShrink: 0 }}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="4" y1="10" x2="16" y2="10" /><polyline points="11 5 16 10 11 15" />
    </svg>
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
            style={{ width: '100%', borderRadius: '1rem', objectFit: 'cover', display: 'block' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Apply Now Modal ──────────────────────────────────────────────────────────
function ApplyModal({ listing, onClose, onApply }) {
  const defaultPitch =
`Hi! I'm ${MOCK_CREATOR.full_name} (@${MOCK_CREATOR.instagram_handle}), a ${MOCK_CREATOR.tier} travel creator with ${Math.round(MOCK_CREATOR.follower_count / 1000)}K followers across Instagram and TikTok.

I'd love to collaborate on ${listing.title} in ${listing.location}.

I specialize in ${listing.collab_type} content and have completed ${MOCK_CREATOR.collab_count}+ collabs to date with an ${MOCK_CREATOR.engagement_rate}% engagement rate — meaning my audience is highly active and receptive to authentic travel stories.

I'm available during ${listing.dates_available} and can deliver ${listing.deliverables} within ${listing.due_days} days of my stay. Looking forward to creating stunning content that showcases your incredible property!

Let's make something great together.`;

  const [pitch, setPitch] = useState(defaultPitch);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    onApply(listing, pitch);
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
        {submitted ? (
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

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.4rem 0 1.25rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>{pitch.length} characters</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>Adds to Collabs & Inbox automatically</p>
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
              Send Application <ArrowRight />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = SAMPLE_LISTINGS.find((l) => l.id === id);
  const { applyToListing, hasApplied } = useCollabs();
  const isDesktop = useIsDesktop();
  const isMd      = useIsMd();

  const [showStickyNav,  setShowStickyNav]  = useState(false);
  const [activeSection,  setActiveSection]  = useState('Photos');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showGallery,    setShowGallery]    = useState(false);
  const [hostImgError,   setHostImgError]   = useState(false);

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

  const applied     = hasApplied(listing.id);
  const loadStyle   = LOAD_COLOR[listing.deliverable_load] || LOAD_COLOR.Moderate;
  const hostAvatar  = hostImgError ? SAMPLE_HOST.avatar_fallback : SAMPLE_HOST.avatar_url;

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: isDesktop ? '2rem' : '7rem' }}>

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
          {['Share', 'Save'].map((label) => (
            <button key={label} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)',
              background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(25,37,36,0.1)', borderRadius: '999px', padding: '0.5rem 0.9rem', cursor: 'pointer',
            }}>
              {label === 'Share' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              )}
              {label}
            </button>
          ))}
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms ease' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6 }}>
                {listing.gallery_images.slice(1, 5).map((src, i) => (
                  <div key={i} style={{ overflow: 'hidden' }}>
                    <img src={src} alt={`${listing.title} ${i + 2}`}
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

            {/* Location + rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>
                ✦ {listing.property_type} · {listing.location}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>
                <StarIcon />{listing.rating}
                <span style={{ color: 'var(--sage)', fontWeight: 400 }}>({listing.review_count} reviews)</span>
              </span>
            </div>

            {/* Tag pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {[
                { label: listing.creator_tier, bg: 'rgba(25,37,36,0.07)', color: 'var(--slate)' },
                { label: listing.compensation, bg: listing.compensation_type === 'cash' ? 'rgba(209,235,219,0.8)' : 'rgba(25,37,36,0.07)', color: listing.compensation_type === 'cash' ? '#2d6a4f' : 'var(--slate)' },
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
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={hostAvatar} alt={SAMPLE_HOST.name}
                  onError={() => setHostImgError(true)}
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(25,37,36,0.12)' }}
                />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: '#192524', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                    <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
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
                { emoji: '🎯', label: 'Creator Tier',  value: listing.creator_tier },
                { emoji: '💰', label: 'Compensation',  value: listing.compensation_type === 'cash' ? `$${listing.cash_amount} Cash` : 'Complimentary Stay' },
                { emoji: '📦', label: 'Deliverables',  value: `${listing.deliverable_load} load` },
              ].map(({ emoji, label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{emoji}</div>
                  <p style={{ fontSize: '0.67rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{value}</p>
                </div>
              ))}
            </div>

            <Divider />

            {/* About */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.875rem' }}>About this stay</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--slate)', lineHeight: 1.75 }}>{listing.about}</p>
            </div>

            <Divider />

            {/* Amenities */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '1rem' }}>What this place offers</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
                {listing.amenities.map(({ icon, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.1rem', width: 26, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
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
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--sage)', marginBottom: '0.5rem' }}>What you deliver</p>
                  <p style={{ fontSize: '0.95rem', color: 'var(--ink)', fontWeight: 600, marginBottom: '0.2rem' }}>{listing.deliverables}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)' }}>{listing.what_you_deliver}</p>
                </div>
              </div>
            </div>

            <Divider />

            {/* REQUIREMENTS */}
            <div ref={reqRef} style={{ marginBottom: '2rem', scrollMarginTop: '80px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>Requirements</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
                Creator tier required: <strong style={{ color: 'var(--slate)' }}>{listing.creator_tier}</strong>
              </p>
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
              <div style={{ borderRadius: '1.25rem', overflow: 'hidden', height: 320, border: '1px solid rgba(25,37,36,0.08)' }}>
                <iframe
                  title="map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.lng - 0.15}%2C${listing.lat - 0.1}%2C${listing.lng + 0.15}%2C${listing.lat + 0.1}&layer=mapnik&marker=${listing.lat}%2C${listing.lng}`}
                  style={{ width: '100%', height: '100%', border: 'none', filter: 'saturate(0.6) brightness(1.04)' }}
                  loading="lazy"
                />
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
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                    <img src={hostAvatar} alt={SAMPLE_HOST.name}
                      onError={() => setHostImgError(true)}
                      style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#192524', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                      <svg viewBox="0 0 12 12" fill="none" style={{ width: 10, height: 10 }}>
                        <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.15rem' }}>{SAMPLE_HOST.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginBottom: '0.875rem' }}>Collabnb Host</p>
                  {[{ val: SAMPLE_HOST.review_count, label: 'Reviews' }, { val: `${SAMPLE_HOST.rating}★`, label: 'Rating' }, { val: `${SAMPLE_HOST.years_hosting}`, label: 'Years hosting' }].map(({ val, label }) => (
                    <div key={label} style={{ borderTop: '1px solid rgba(25,37,36,0.07)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>{val}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Host bio + details */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
                    {SAMPLE_HOST.name} is a Verified Host
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--slate)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{SAMPLE_HOST.bio}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '0.35rem' }}><strong>Response rate:</strong> {SAMPLE_HOST.response_rate}%</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1.25rem' }}><strong>Responds</strong> {SAMPLE_HOST.response_time}</p>
                  <button style={{
                    padding: '0.65rem 1.5rem',
                    background: 'var(--bone)', border: '1.5px solid rgba(25,37,36,0.15)',
                    borderRadius: '999px', fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.07)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bone)'; }}
                  >
                    Message host
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right sidebar — desktop only ──────────────────────────────── */}
          {isDesktop && (
            <div style={{ width: 360, flexShrink: 0 }}>
              <div style={{
                position: 'sticky', top: '6rem',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(24px) saturate(140%)',
                WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.7)',
                borderRadius: '1.5rem', padding: '1.75rem',
                boxShadow: '0 20px 40px -15px rgba(25,37,36,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
                  {listing.compensation_type === 'cash' ? `$${listing.cash_amount}` : 'Free Stay'}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
                  {listing.compensation_type === 'cash' ? `+ stay included · ${listing.deliverable_count} deliverables` : `${listing.deliverable_count} deliverables`}
                </p>

                {/* Details grid */}
                <div style={{ border: '1.5px solid rgba(25,37,36,0.1)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1rem' }}>
                  {[
                    { label: 'Availability', value: listing.dates_available },
                    { label: 'Creator tier', value: listing.creator_tier },
                    { label: 'Deliverables', value: listing.deliverables },
                    { label: 'Due in',        value: `${listing.due_days} days of checkout` },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} style={{ padding: '0.875rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(25,37,36,0.08)' : 'none' }}>
                      <p style={{ fontSize: '0.67rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sage)', marginBottom: '0.15rem' }}>{label}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowApplyModal(true)}
                  disabled={applied}
                  style={{
                    width: '100%', padding: '1rem',
                    background: applied ? 'rgba(25,37,36,0.1)' : 'var(--ink)',
                    color: applied ? 'var(--sage)' : 'var(--bone)',
                    borderRadius: '999px', fontFamily: 'var(--font-body)',
                    fontSize: '1rem', fontWeight: 700,
                    cursor: applied ? 'default' : 'pointer',
                    border: 'none', marginBottom: '0.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={(e) => { if (!applied) e.currentTarget.style.opacity = '0.88'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {applied ? '✓ Applied' : <><span>Apply Now</span> <ArrowRight /></>}
                </button>

                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', textAlign: 'center' }}>
                  Collabnb is free for creators.
                </p>
              </div>
            </div>
          )}
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
              {listing.compensation_type === 'cash' ? `$${listing.cash_amount}` : 'Free stay'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>{listing.deliverable_count} deliverables</p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            disabled={applied}
            style={{
              padding: '0.875rem 2rem',
              background: applied ? 'rgba(25,37,36,0.1)' : 'var(--ink)',
              color: applied ? 'var(--sage)' : 'var(--bone)',
              borderRadius: '999px', fontFamily: 'var(--font-body)',
              fontSize: '0.95rem', fontWeight: 700,
              cursor: applied ? 'default' : 'pointer',
              border: 'none', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {applied ? '✓ Applied' : <><span>Apply Now</span> <ArrowRight /></>}
          </button>
        </div>
      )}

      {/* ── Apply modal ───────────────────────────────────────────────────────── */}
      {showApplyModal && (
        <ApplyModal
          listing={listing}
          onClose={() => setShowApplyModal(false)}
          onApply={applyToListing}
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
    </div>
  );
}
