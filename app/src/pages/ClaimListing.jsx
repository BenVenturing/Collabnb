import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { SignUp, SignIn } from '@clerk/clerk-react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useListingDraft } from '../contexts/ListingDraftContext';
import collabnbLogo from '../assets/collabnb-logo.png';

const C = {
  bg: '#F4F8F3', mint: '#D1EBDB', mintSoft: '#E8F4EC', green: '#3F6B52',
  ink: '#192524', slate: '#3C5759', sage: '#646B62', line: '#E1EADF', white: '#FFFFFF',
};
const PENDING_KEY = 'collabnb_claim_pending';

export default function ClaimListing() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const { loadDraft } = useListingDraft();
  const claim = useQuery(api.claims.getByToken, token ? { token } : 'skip');
  const markViewed = useMutation(api.claims.markViewed);
  const redeem = useMutation(api.claims.redeem);
  const [mode, setMode] = useState(null); // null | 'signup' | 'signin'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const viewed = useRef(false);
  const authRef = useRef(null);

  useEffect(() => {
    if (claim && !viewed.current) { viewed.current = true; markViewed({ token }).catch(() => {}); }
  }, [claim, token, markViewed]);

  async function doRedeem() {
    setBusy(true); setError('');
    try {
      const { listingId, listing } = await redeem({ token });
      try { localStorage.removeItem(PENDING_KEY); } catch {}
      await refreshProfile?.();
      const draft = {
        title: listing.title || '',
        location_city: listing.location_city || '',
        location_country: listing.location_country || '',
        lat: listing.lat, lng: listing.lng,
        property_url: listing.property_url || '',
        contact_phone: listing.contact_phone || '',
        collaboration_brief: listing.collaboration_brief || '',
        compensation_type: listing.compensation_type || 'hybrid',
        nights: listing.nights || 2,
        images: listing.gallery_images || [],
        amenities: listing.amenities || [],
        perks: listing.perks || [],
        vibe_tags: listing.vibe_tags || [],
      };
      localStorage.setItem('collabnb_listing_draft_v1', JSON.stringify(draft));
      loadDraft(draft);
      localStorage.setItem('collabnb_editing_listing_id_v1', String(listingId));
      navigate('/host/listings/create/basics', { replace: true });
    } catch (e) {
      setError(e?.data || e?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  // Back from Clerk signup/signin with a pending claim: finish automatically.
  useEffect(() => {
    let pending = false;
    try { pending = localStorage.getItem(PENDING_KEY) === token; } catch {}
    if (session && profile?._id && pending && claim?.status === 'open' && !busy) doRedeem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile?._id, claim?.status]);

  function start(which) {
    try {
      localStorage.setItem(PENDING_KEY, token);
      localStorage.setItem('collabnb_waitlist_role', 'host');
    } catch {}
    if (session && profile?._id) { doRedeem(); return; }
    setMode(which);
    setTimeout(() => authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  if (claim === undefined) return <Shell><p style={{ color: C.sage, textAlign: 'center', padding: '4rem 0' }}>Loading your listing…</p></Shell>;
  if (claim === null) return <Shell><p style={{ color: C.sage, textAlign: 'center', padding: '4rem 0' }}>This link has expired. Reach us at hellocollabnb@gmail.com.</p></Shell>;

  const p = claim.prefill || {};
  const pv = claim.preview || {};
  const imgs = p.gallery_images || [];
  const here = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const claimed = claim.status === 'claimed';

  return (
    <Shell>
      <section style={{ textAlign: 'center', padding: '2.5rem 0 1.75rem' }}>
        <div style={pill}>Made for {claim.hotel_name}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,6vw,3rem)', lineHeight: 1.08, color: C.ink, margin: '0.9rem 0 0.75rem', letterSpacing: '-0.02em' }}>
          Your Collabnb listing is <span style={{ color: C.green }}>already built.</span>
        </h1>
        <p style={{ color: C.slate, fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
          We filled it in from your public profile. Check it, change anything you like, and publish when you're ready. It takes under 5 minutes.
        </p>
      </section>

      {/* Listing preview, as creators see it */}
      <Label>How creators will see you</Label>
      <div style={{ background: C.white, borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 20px 40px -18px rgba(25,37,36,0.18)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: imgs.length > 2 ? '2fr 1fr' : '1fr', gap: 4, height: 280 }}>
          <Img src={imgs[0]} />
          {imgs.length > 2 && (
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 4 }}>
              <Img src={imgs[1]} /><Img src={imgs[2]} />
            </div>
          )}
        </div>
        <div style={{ padding: '1.25rem 1.4rem 1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', margin: 0, color: C.ink }}>{p.title || claim.hotel_name}</h2>
            {p.rating ? <span style={{ fontSize: '0.9rem', color: C.ink, fontWeight: 600 }}>★ {p.rating}{p.review_count ? <span style={{ color: C.sage, fontWeight: 400 }}> · {p.review_count} reviews</span> : null}</span> : null}
          </div>
          <p style={{ margin: '0.25rem 0 0.9rem', color: C.sage, fontSize: '0.92rem' }}>{[p.location_city, p.location_country].filter(Boolean).join(', ')}</p>
          {p.vibe_tags?.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.9rem' }}>
              {p.vibe_tags.map((t) => <span key={t} style={{ background: C.mintSoft, color: C.green, fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>{t}</span>)}
            </div>
          ) : null}
          {p.collaboration_brief && <p style={{ margin: 0, color: C.slate, fontSize: '0.95rem', lineHeight: 1.6 }}>{p.collaboration_brief}</p>}
          {p.perks?.length ? (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${C.line}`, display: 'grid', gap: 6 }}>
              {p.perks.map((x) => <div key={x} style={{ fontSize: '0.9rem', color: C.ink }}>✓ {x}</div>)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Host dashboard preview */}
      <Label>What hosting looks like</Label>
      <div style={{ background: C.ink, borderRadius: 20, padding: '1.25rem', color: '#EFECE9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Host dashboard</span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(209,235,219,0.15)', color: C.mint, padding: '3px 9px', borderRadius: 999 }}>Preview</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1rem' }}>
          {[['Applications', 'New'], ['Status', 'You decide'], ['Fees to list', '$0']].map(([k, val]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.7rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#A9B5AF' }}>{k}</div>
              <div style={{ fontWeight: 700, color: C.mint, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
        {(pv.steps || [
          ['A creator applies', 'You see their profile, audience and past work before replying.'],
          ['You accept or pass', 'One tap. Nobody is approved unless you say so.'],
          ['Content arrives', 'Photos and reels delivered in your inbox, with usage rights.'],
        ]).map(([t, d], i) => (
          <div key={t} style={{ display: 'flex', gap: 12, padding: '0.75rem 0', borderTop: i ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: C.mint, color: C.ink, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: '0.85rem' }}>{i + 1}</div>
            <div><div style={{ fontWeight: 600 }}>{t}</div><div style={{ fontSize: '0.86rem', color: '#A9B5AF', marginTop: 2 }}>{d}</div></div>
          </div>
        ))}
      </div>

      {/* Risk reversal */}
      <div style={{ background: C.mintSoft, border: `1px solid ${C.mint}`, borderRadius: 16, padding: '1.1rem 1.25rem', margin: '1.5rem 0', color: C.ink, lineHeight: 1.6, fontSize: '0.95rem' }}>
        <strong>No catch.</strong> Listing is free for Founding Hosts, and nothing goes live until you publish.
      </div>

      {/* CTA + auth */}
      <div ref={authRef} style={{ textAlign: 'center', paddingBottom: '3rem' }}>
        {claimed && !(session && profile) ? (
          <p style={{ color: C.slate }}>This listing has been claimed. <a href="/login.html" style={{ color: C.green, fontWeight: 600 }}>Sign in</a> to continue.</p>
        ) : !mode ? (
          <>
            <button onClick={() => start('signup')} disabled={busy} style={cta}>
              {busy ? 'Opening your listing…' : session && profile ? `Claim ${claim.hotel_name}` : `Claim ${claim.hotel_name} — free`}
            </button>
            <p style={{ color: C.sage, fontSize: '0.85rem', marginTop: '0.75rem' }}>
              {session && profile ? `Signed in as ${profile.email}` : <>Already on Collabnb? <button onClick={() => start('signin')} style={linkBtn}>Sign in</button></>}
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <p style={{ fontWeight: 600, color: C.ink, margin: 0 }}>Step 1 of 2 · create your account</p>
            {mode === 'signup' ? (
              <SignUp routing="hash" initialValues={claim.email ? { emailAddress: claim.email } : undefined}
                unsafeMetadata={{ role: 'host' }} forceRedirectUrl={here} signInForceRedirectUrl={here} signInUrl={`${here}#signin`} />
            ) : (
              <SignIn routing="hash" forceRedirectUrl={here} signUpForceRedirectUrl={here} />
            )}
            <button onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} style={linkBtn}>
              {mode === 'signup' ? 'I already have an account' : 'Create a new account instead'}
            </button>
          </div>
        )}
        {error && <p style={{ color: '#B5544B', marginTop: '0.75rem' }}>{error}</p>}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-body)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1rem 1.25rem', maxWidth: 680, margin: '0 auto' }}>
        <img src={collabnbLogo} width="28" height="28" alt="" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: C.ink }}>Collabnb</span>
      </header>
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>{children}</main>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, margin: '1.75rem 0 0.6rem' }}>{children}</div>;
}

function Img({ src }) {
  return src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ background: C.mint }} />;
}

const pill = { display: 'inline-block', background: C.mint, color: C.green, fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: 999 };
const cta = { background: C.ink, color: C.white, border: 'none', borderRadius: 999, padding: '1rem 2rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', maxWidth: 420 };
const linkBtn = { background: 'none', border: 'none', color: C.green, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit' };
