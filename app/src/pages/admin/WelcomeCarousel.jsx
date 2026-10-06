import { useState, useMemo, useRef } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { buildWelcomeReel } from './welcomeReel';
import collabnbLogo from '../../assets/collabnb-logo.png';

// Admin tool chrome (buttons, labels, section cards) — separate from the
// brand's actual Instagram content palette below.
const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#646B62';
const MINT  = '#D1EBDB';
const BONE  = '#F7F5F2';

const GLASS = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid rgba(25,37,36,0.08)',
};

// Anything that gets exported/posted (the spotlight card, the reel) follows
// the brand's actual Instagram Slide Design System instead: warm cream HAZY
// paper, umber-brown ink, Fraunces serif + Inter sans, muted earthy accents,
// no logo on slides. See design.md.
const CONTENT_CREAM = '#EFECE9';
const CONTENT_UMBER = '#5A3A28';
const CONTENT_UMBER_SOFT = '#7A5C47';
const CONTENT_SERIF = '"Fraunces", serif';
const CONTENT_SANS = '"Inter", sans-serif';
// Three muted brand colors only (sage, ochre, dusty blue) — same set
// welcomeReel.js uses, so the picker and the rendered reel always agree.
const CONTENT_ACCENTS = ['#8A9471', '#B08552', '#7D96A3'];
function accentFor(name) {
  const i = (name || '').charCodeAt(0) || 0;
  return CONTENT_ACCENTS[i % CONTENT_ACCENTS.length];
}

async function uploadRawFile(file, generateUploadUrl) {
  const uploadUrl = await generateUploadUrl();
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error('Upload failed');
  const { storageId } = await res.json();
  return storageId;
}

function handleOf(c) {
  return c.instagram_handle || c.tiktok_handle || '';
}

function fmtFollowers(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

// "October 1–7" / "Sep 29 – Oct 5" style label for the trailing 7 days.
function weekRangeLabel() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}–${end.getDate()}`;
  }
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Follows design.md's Collabnb Instagram Slide Design System exactly —
// hand-painted watercolor/gouache, Kinfolk/Cereal editorial, cream HAZY
// paper, Fraunces-style umber headline, Inter-style umber subhead, one
// centered watercolor motif, no logo. Reuses their prompt template and
// "learned the hard way" rules (never say black, no curly quotes outside
// Myth slides, avoid Instagram/UI words, "no lettering" on the motif).
function defaultWelcomePrompt() {
  const headline = 'Welcome to Collabnb';
  const subhead = `Meet our newest creators — week of ${weekRangeLabel()}`;
  const motif = 'a small hand-painted bundle of botanical sprigs tied with twine, resting on linen, no lettering anywhere';
  return `Portrait carousel slide, hand-painted watercolor and gouache editorial style (Kinfolk / Cereal magazine feel). The whole canvas is one continuous warm cream watercolor-paper texture with subtle grain and soft wash variations, full-bleed and seamless to all four edges: no visible paper edge, no border, no frame, no inset panel, no lighter strip or band along any edge. Muted, slightly desaturated earthy palette: sage and olive greens, wood and ochre browns, dusty warm blues. Centered single-column layout. Upper-middle: a headline in a bold, high-contrast serif typeface (Fraunces-style), warm dark umber-brown ink tone (not pure black), medium-bold weight matching the painterly linework. The headline text reads exactly: "${headline}" Directly below, a short subhead in a smaller clean sans-serif typeface (Inter-style), same umber-brown tone, centered, text reads exactly: "${subhead}" Do not paint quotation marks around the headline or the subhead. Below the text, exactly one hand-painted watercolor motif, centered: ${motif}. Generous plain cream negative space at the very top and very bottom and in the side margins, free of text or fine detail. No logo, no watermark, no extra text, no additional icons or objects beyond the single motif.`;
}

function sanitizeFilename(s) {
  return (s || 'creator').toString().replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'creator';
}

// Branded "spotlight" slide built from data already on file (avatar, handle,
// follower count, bio, tier) — not a screenshot. Rasterized to a downloadable
// PNG client-side via html2canvas, so there's no dependency on Instagram
// actually letting us in (it doesn't, for logged-out scrapers). Styled to
// design.md's Instagram Slide Design System — warm cream paper, umber ink,
// Fraunces/Inter, no logo on the slide.
function SpotlightCard({ creator, cardRef }) {
  const handle = handleOf(creator);
  const followers = fmtFollowers(creator.followers);
  const accent = accentFor(creator.full_name);
  return (
    <div ref={cardRef} id={`spotlight-${creator._id}`} style={{
      width: '100%', aspectRatio: '1', borderRadius: '1rem', overflow: 'hidden', position: 'relative',
      background: CONTENT_CREAM,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem 1.25rem', boxSizing: 'border-box', textAlign: 'center',
    }}>
      {creator.avatar_url ? (
        <img src={creator.avatar_url} alt="" crossOrigin="anonymous"
          style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${CONTENT_CREAM}`, boxShadow: '0 4px 16px rgba(90,58,40,0.15)' }} />
      ) : (
        <div style={{
          width: 84, height: 84, borderRadius: '50%', background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: CONTENT_CREAM, fontSize: '1.8rem', fontWeight: 700, fontFamily: CONTENT_SERIF,
          border: `3px solid ${CONTENT_CREAM}`, boxShadow: '0 4px 16px rgba(90,58,40,0.15)',
        }}>
          {(creator.full_name || '?')[0].toUpperCase()}
        </div>
      )}

      <p style={{ fontFamily: CONTENT_SERIF, fontWeight: 700, fontSize: '1.1rem', color: CONTENT_UMBER, margin: '0.7rem 0 0.1rem' }}>
        {creator.full_name}
      </p>
      {handle && <p style={{ fontFamily: CONTENT_SANS, fontSize: '0.78rem', color: CONTENT_UMBER_SOFT, margin: 0 }}>@{handle.replace(/^@/, '')}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {followers && (
          <span style={{ fontFamily: CONTENT_SANS, fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 9999, background: accent, color: CONTENT_CREAM }}>
            {followers} followers
          </span>
        )}
        {creator.tier && (
          <span style={{ fontFamily: CONTENT_SANS, fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 9999, background: 'rgba(90,58,40,0.08)', color: CONTENT_UMBER_SOFT }}>
            {creator.tier}
          </span>
        )}
      </div>

      {creator.bio && (
        <p style={{
          fontFamily: CONTENT_SANS, fontSize: '0.7rem', color: CONTENT_UMBER_SOFT, margin: '0.7rem 0 0', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {creator.bio}
        </p>
      )}

      <img src={collabnbLogo} alt="" style={{ position: 'absolute', bottom: 12, left: 12, width: 22, height: 22, objectFit: 'contain', opacity: 0.8 }} />
    </div>
  );
}

function CreatorSlide({ creator, selected, onToggle, orderIndex, orderTotal, followersOverride, onFollowersChange }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const setScreenshot = useMutation(api.carousel.setScreenshot);
  const clearScreenshot = useMutation(api.carousel.clearScreenshot);
  const estimateFollowers = useAction(api.carousel.estimateFollowersFromScreenshot);
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [exportError, setExportError] = useState('');

  const effectiveFollowers = followersOverride !== undefined ? followersOverride : creator.followers;
  const effectiveCreator = effectiveFollowers !== creator.followers ? { ...creator, followers: effectiveFollowers } : creator;

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setExportError('');
    try {
      const storageId = await uploadRawFile(file, generateUploadUrl);
      await setScreenshot({ profileId: creator._id, storageId });
      setEstimating(true);
      try {
        const n = await estimateFollowers({ storageId });
        if (n) onFollowersChange(n);
      } finally {
        setEstimating(false);
      }
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleDownload() {
    setExportError('');
    setBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 4, useCORS: true });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${creator.username || creator._id}-welcome.png`;
      a.click();
    } catch {
      setExportError('Could not export — right-click the card and "Save image as" instead.');
    } finally {
      setBusy(false);
    }
  }

  const hasOverride = !!creator.screenshot_url;

  return (
    <div style={{
      ...GLASS, borderRadius: '1rem', padding: '0.875rem', width: 260,
      opacity: selected ? 1 : 0.5, transition: 'opacity 0.15s',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: INK, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {creator.full_name}
        </span>
      </div>

      <div style={{
        position: 'relative', borderRadius: '0.9rem', boxSizing: 'border-box',
        border: selected ? `3px solid ${accentFor(creator.full_name)}` : '3px solid transparent',
        transition: 'border-color 0.15s',
      }}>
        {selected && orderIndex > -1 && (
          <span style={{
            position: 'absolute', top: 8, left: 8, zIndex: 1,
            fontSize: '0.64rem', fontWeight: 700, color: CONTENT_CREAM,
            background: accentFor(creator.full_name), padding: '0.15rem 0.5rem', borderRadius: 9999,
            fontFamily: CONTENT_SANS,
          }}>
            {orderIndex + 1}/{orderTotal}
          </span>
        )}
        {hasOverride ? (
          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '0.7rem', overflow: 'hidden', background: BONE }}>
            <img src={creator.screenshot_url} alt={creator.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <SpotlightCard creator={effectiveCreator} cardRef={cardRef} />
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: SLATE }}>
        Followers (for reach tally){estimating && ' — reading screenshot…'}
        <input type="number" min="0" placeholder={creator.followers ? String(creator.followers) : 'e.g. 23200'}
          value={followersOverride ?? ''}
          onChange={(e) => onFollowersChange(e.target.value === '' ? undefined : Number(e.target.value))}
          style={{ width: 90, padding: '0.2rem 0.4rem', borderRadius: '0.4rem', border: '1px solid rgba(25,37,36,0.15)', fontSize: '0.68rem', fontFamily: 'inherit', color: INK }} />
      </label>

      {exportError && <div style={{ fontSize: '0.66rem', color: '#991B1B' }}>{exportError}</div>}

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <label style={{ flex: 1, padding: '0.3rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.68rem', border: '1px solid rgba(25,37,36,0.15)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
          {hasOverride ? 'Replace image' : 'Use my own image'}
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={busy} />
        </label>
        {hasOverride && (
          <button onClick={() => clearScreenshot({ profileId: creator._id })} disabled={busy}
            style={{ padding: '0.3rem 0.6rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.68rem', border: '1px solid rgba(25,37,36,0.15)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            Reset
          </button>
        )}
      </div>

      {hasOverride ? (
        <a href={creator.screenshot_url} download={`${creator.username || creator._id}-welcome.jpg`}
          style={{ fontSize: '0.68rem', color: '#166534', textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}>
          ↓ Download
        </a>
      ) : (
        <button onClick={handleDownload} disabled={busy}
          style={{ fontSize: '0.68rem', color: '#166534', textAlign: 'center', background: 'transparent', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit', padding: '0.2rem' }}>
          {busy ? '…' : '↓ Download'}
        </button>
      )}
    </div>
  );
}

export default function WelcomeCarousel() {
  const creators = useQuery(api.carousel.listFeaturable);
  const markFeatured = useMutation(api.carousel.markFeatured);
  const generateCaption = useAction(api.carousel.generateCaption);
  const generateWelcomeImage = useAction(api.carousel.generateWelcomeImage);

  const [selected, setSelected] = useState(null); // Set, initialized once creators load
  const [prompt, setPrompt] = useState(defaultWelcomePrompt);
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [caption, setCaption] = useState('');
  const [captionBusy, setCaptionBusy] = useState(false);
  const [captionError, setCaptionError] = useState('');
  const [copied, setCopied] = useState(false);
  const [posting, setPosting] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState('');
  const [reelBusy, setReelBusy] = useState(false);
  const [reelProgress, setReelProgress] = useState(0);
  const [reelError, setReelError] = useState('');
  const [reelUrl, setReelUrl] = useState(null);
  const [reelExt, setReelExt] = useState('mp4');
  const [followerOverrides, setFollowerOverrides] = useState({});

  // Default-select the 5 newest once the list first loads.
  const effectiveSelected = useMemo(() => {
    if (selected) return selected;
    if (!creators) return new Set();
    return new Set(creators.slice(0, 5).map(c => c._id));
  }, [selected, creators]);

  function toggle(id) {
    const next = new Set(effectiveSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  const selectedCreators = (creators || []).filter(c => effectiveSelected.has(c._id));
  // Reach tally needs a follower number per creator — falls back to the
  // manual override typed into each slide when metrics_instagram_followers
  // etc. were never self-reported (common for creators approved before
  // this feature existed, or who just haven't filled it in).
  const selectedCreatorsForReel = selectedCreators.map((c) => ({
    ...c,
    followers: followerOverrides[c._id] !== undefined ? followerOverrides[c._id] : c.followers,
  }));

  async function handleGenerateImage() {
    setImageBusy(true);
    setImageError('');
    try {
      const url = await generateWelcomeImage({ prompt: prompt || undefined });
      setWelcomeImageUrl(url);
    } catch (err) {
      setImageError(err?.data || err?.message || 'Failed to generate image.');
    } finally {
      setImageBusy(false);
    }
  }

  async function handleGenerateCaption() {
    setCaptionBusy(true);
    setCaptionError('');
    try {
      const text = await generateCaption({
        creators: selectedCreators.map(c => ({ full_name: c.full_name, handle: handleOf(c) || undefined })),
      });
      setCaption(text);
    } catch (err) {
      setCaptionError(err?.data || err?.message || 'Failed to draft a caption.');
    } finally {
      setCaptionBusy(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(prompt || defaultWelcomePrompt()).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    });
  }

  // Bundles the welcome slide + every selected creator's image (+ the
  // caption as a text file) into one .zip so posting a carousel is a single
  // drag-and-drop into Instagram instead of five separate downloads.
  async function handleDownloadAll() {
    setZipBusy(true);
    setZipError('');
    try {
      const { zipSync, strToU8 } = await import('fflate');
      const html2canvas = (await import('html2canvas')).default;
      const files = {};

      if (welcomeImageUrl) {
        const buf = await (await fetch(welcomeImageUrl)).arrayBuffer();
        files['00-welcome-slide.png'] = new Uint8Array(buf);
      }

      let i = 1;
      for (const c of selectedCreators) {
        const label = String(i).padStart(2, '0');
        const name = sanitizeFilename(c.username || handleOf(c) || c._id);
        if (c.screenshot_url) {
          const buf = await (await fetch(c.screenshot_url)).arrayBuffer();
          files[`${label}-${name}.jpg`] = new Uint8Array(buf);
        } else {
          const node = document.getElementById(`spotlight-${c._id}`);
          if (node) {
            const canvas = await html2canvas(node, { backgroundColor: null, scale: 4, useCORS: true });
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            const buf = await blob.arrayBuffer();
            files[`${label}-${name}.png`] = new Uint8Array(buf);
          }
        }
        i++;
      }

      if (caption) files['caption.txt'] = strToU8(caption);

      const zipped = zipSync(files, { level: 6 });
      const blob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collabnb-welcome-carousel-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setZipError('Could not build the zip — try downloading images individually instead.');
    } finally {
      setZipBusy(false);
    }
  }

  async function handleGenerateReel() {
    setReelBusy(true);
    setReelError('');
    setReelProgress(0);
    if (reelUrl) URL.revokeObjectURL(reelUrl);
    setReelUrl(null);
    try {
      const { blob, mimeType } = await buildWelcomeReel({
        creators: selectedCreatorsForReel,
        welcomeImageUrl,
        weekLabel: weekRangeLabel(),
        onProgress: setReelProgress,
      });
      setReelExt(mimeType.includes('mp4') ? 'mp4' : 'webm');
      setReelUrl(URL.createObjectURL(blob));
    } catch (err) {
      setReelError(err?.message || 'Could not generate the reel.');
    } finally {
      setReelBusy(false);
    }
  }

  async function handleMarkPosted() {
    if (!window.confirm(`Mark ${selectedCreators.length} creator${selectedCreators.length === 1 ? '' : 's'} as featured? They won't show up here again.`)) return;
    setPosting(true);
    try {
      await markFeatured({ profileIds: selectedCreators.map(c => c._id) });
      setSelected(new Set());
      setCaption('');
      setWelcomeImageUrl(null);
    } finally {
      setPosting(false);
    }
  }

  if (creators === undefined) {
    return <div style={{ padding: '2rem', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: INK, margin: '0 0 0.2rem' }}>Welcome Carousel</p>
      <p style={{ fontSize: '0.78rem', color: SAGE, marginBottom: '1.25rem' }}>
        Pick 3–5 newly approved creators, generate a themed welcome slide and a caption, then download everything and post it yourself.
      </p>

      {/* Welcome image */}
      <div style={{ ...GLASS, borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
          1. Welcome slide (Gemini)
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 220, aspectRatio: '1', borderRadius: '0.75rem', overflow: 'hidden', background: BONE,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {welcomeImageUrl ? (
              <img src={welcomeImageUrl} alt="Welcome slide" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '0.7rem', color: SAGE, padding: '0.5rem', textAlign: 'center' }}>No image yet</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea
              placeholder="Optional — leave blank to use the default HAZY-palette welcome prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={7}
              style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.15)', fontSize: '0.74rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: INK, lineHeight: 1.5 }}
            />
            <p style={{ fontSize: '0.68rem', color: SAGE, margin: 0 }}>
              Click Generate to build it here via Gemini, or Copy prompt to paste into gemini.google.com yourself.
            </p>
            {imageError && <div style={{ fontSize: '0.72rem', color: '#991B1B' }}>{String(imageError)}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleGenerateImage} disabled={imageBusy}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: MINT, color: '#166534', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: imageBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {imageBusy ? 'Generating…' : welcomeImageUrl ? 'Regenerate' : 'Generate welcome slide'}
              </button>
              <button onClick={handleCopyPrompt}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.8rem', border: '1px solid rgba(25,37,36,0.15)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {promptCopied ? 'Copied ✓' : 'Copy prompt'}
              </button>
              {welcomeImageUrl && (
                <a href={welcomeImageUrl} download="welcome-slide.png"
                  style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.8rem', border: '1px solid rgba(25,37,36,0.15)', textDecoration: 'none', fontFamily: 'inherit' }}>
                  ↓ Download
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Creator picks */}
      <div style={{ ...GLASS, borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            2. Pick creators ({effectiveSelected.size} selected)
          </div>
          <button onClick={handleDownloadAll} disabled={zipBusy || selectedCreators.length === 0}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '0.5rem', background: INK, color: '#fff', fontSize: '0.76rem', fontWeight: 600, border: 'none', cursor: (zipBusy || selectedCreators.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {zipBusy ? 'Zipping…' : `↓ Download all as .zip`}
          </button>
        </div>
        {zipError && <div style={{ fontSize: '0.72rem', color: '#991B1B', marginBottom: '0.6rem' }}>{zipError}</div>}
        {creators.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: SAGE }}>No newly approved creators waiting to be featured.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
            {creators.map(c => (
              <CreatorSlide key={c._id} creator={c} selected={effectiveSelected.has(c._id)} onToggle={() => toggle(c._id)}
                orderIndex={selectedCreators.findIndex(sc => sc._id === c._id)} orderTotal={selectedCreators.length}
                followersOverride={followerOverrides[c._id]}
                onFollowersChange={(v) => setFollowerOverrides(prev => ({ ...prev, [c._id]: v }))} />
            ))}
          </div>
        )}
      </div>

      {/* Reel */}
      <div style={{ ...GLASS, borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
          3. Reel (optional)
        </div>
        <p style={{ fontSize: '0.78rem', color: SAGE, margin: '0 0 0.75rem' }}>
          Turns the welcome slide into a vertical video: intro, then a running tally of the creators' combined reach, then each creator pops in with their name, handle, and follower count. Renders right in your browser, no upload needed. Or skip this and just use the images above.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {reelUrl && (
            <video src={reelUrl} controls style={{ width: 180, aspectRatio: '9/16', borderRadius: '0.75rem', background: '#000', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reelError && <div style={{ fontSize: '0.72rem', color: '#991B1B' }}>{reelError}</div>}
            {reelBusy && (
              <div style={{ fontSize: '0.72rem', color: SLATE }}>
                Rendering… {Math.round(reelProgress * 100)}%
                <div style={{ width: '100%', height: 4, background: 'rgba(25,37,36,0.08)', borderRadius: 2, marginTop: '0.3rem', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(reelProgress * 100)}%`, height: '100%', background: MINT }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleGenerateReel} disabled={reelBusy || selectedCreators.length === 0}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: MINT, color: '#166534', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: (reelBusy || selectedCreators.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {reelBusy ? 'Rendering…' : reelUrl ? 'Regenerate reel' : 'Generate reel'}
              </button>
              {reelUrl && (
                <a href={reelUrl} download={`collabnb-welcome-reel-${new Date().toISOString().slice(0, 10)}.${reelExt}`}
                  style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.8rem', border: '1px solid rgba(25,37,36,0.15)', textDecoration: 'none', fontFamily: 'inherit' }}>
                  ↓ Download {reelExt.toUpperCase()}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div style={{ ...GLASS, borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
          4. Caption
        </div>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Draft a caption, then tweak it here before posting…"
          rows={4}
          style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.15)', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: INK, lineHeight: 1.5, marginBottom: '0.5rem' }}
        />
        {captionError && <div style={{ fontSize: '0.72rem', color: '#991B1B', marginBottom: '0.5rem' }}>{String(captionError)}</div>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleGenerateCaption} disabled={captionBusy || selectedCreators.length === 0}
            style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: MINT, color: '#166534', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: (captionBusy || selectedCreators.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {captionBusy ? 'Drafting…' : caption ? 'Redraft' : 'Draft caption'}
          </button>
          {caption && (
            <button onClick={handleCopy}
              style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.8rem', border: '1px solid rgba(25,37,36,0.15)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Finish */}
      <button onClick={handleMarkPosted} disabled={posting || selectedCreators.length === 0}
        style={{ padding: '0.6rem 1.25rem', borderRadius: '0.6rem', background: INK, color: '#fff', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: (posting || selectedCreators.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {posting ? 'Marking…' : `Mark ${selectedCreators.length} as featured`}
      </button>
      <p style={{ fontSize: '0.72rem', color: SAGE, marginTop: '0.5rem' }}>
        Once you've downloaded and posted the carousel to Instagram, click this to keep these creators out of next week's batch.
      </p>
    </div>
  );
}
