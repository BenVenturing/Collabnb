import { useState, useMemo } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

function CreatorSlide({ creator, selected, onToggle }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const setScreenshot = useMutation(api.carousel.setScreenshot);
  const regenerate = useAction(api.carousel.regenerateScreenshot);
  const [busy, setBusy] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  async function handleRegenerate() {
    setBusy(true);
    try { await regenerate({ profileId: creator._id }); } finally { setBusy(false); }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const storageId = await uploadRawFile(file, generateUploadUrl);
      await setScreenshot({ profileId: creator._id, storageId });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  const imageUrl = !imgFailed ? (creator.screenshot_url || creator.avatar_url) : null;

  return (
    <div style={{
      ...GLASS, borderRadius: '1rem', padding: '0.875rem', width: 220,
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
        width: '100%', aspectRatio: '1', borderRadius: '0.7rem', overflow: 'hidden',
        background: BONE, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={creator.full_name} onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '0.7rem', color: SAGE, padding: '0.5rem', textAlign: 'center' }}>
            No screenshot captured
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.72rem', color: SLATE }}>
        {handleOf(creator) ? `@${handleOf(creator).replace(/^@/, '')}` : '—'}
        {creator.tier ? ` · ${creator.tier}` : ''}
      </div>

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button onClick={handleRegenerate} disabled={busy}
          style={{ flex: 1, padding: '0.3rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.68rem', border: '1px solid rgba(25,37,36,0.15)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {busy ? '…' : 'Retry screenshot'}
        </button>
        <label style={{ flex: 1, padding: '0.3rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.68rem', border: '1px solid rgba(25,37,36,0.15)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
          Upload
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={busy} />
        </label>
      </div>

      {imageUrl && (
        <a href={imageUrl} download={`${creator.username || creator._id}-welcome.jpg`}
          style={{ fontSize: '0.68rem', color: '#166534', textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}>
          ↓ Download
        </a>
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
  const [prompt, setPrompt] = useState('');
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [caption, setCaption] = useState('');
  const [captionBusy, setCaptionBusy] = useState(false);
  const [captionError, setCaptionError] = useState('');
  const [copied, setCopied] = useState(false);
  const [posting, setPosting] = useState(false);

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
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1100 }}>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: INK, marginBottom: '0.25rem' }}>Welcome Carousel</h1>
      <p style={{ fontSize: '0.82rem', color: SAGE, marginBottom: '1.5rem' }}>
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
              rows={4}
              style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.15)', fontSize: '0.78rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: INK, lineHeight: 1.5 }}
            />
            {imageError && <div style={{ fontSize: '0.72rem', color: '#991B1B' }}>{String(imageError)}</div>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleGenerateImage} disabled={imageBusy}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: MINT, color: '#166534', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: imageBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {imageBusy ? 'Generating…' : welcomeImageUrl ? 'Regenerate' : 'Generate welcome slide'}
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
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
          2. Pick creators ({effectiveSelected.size} selected)
        </div>
        {creators.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: SAGE }}>No newly approved creators waiting to be featured.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
            {creators.map(c => (
              <CreatorSlide key={c._id} creator={c} selected={effectiveSelected.has(c._id)} onToggle={() => toggle(c._id)} />
            ))}
          </div>
        )}
      </div>

      {/* Caption */}
      <div style={{ ...GLASS, borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
          3. Caption
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
