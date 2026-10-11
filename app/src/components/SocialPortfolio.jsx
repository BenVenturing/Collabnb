import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const PLATFORM_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };
const TIER_LABEL = { strong: 'Strong', average: 'Average', low: 'Low' };
const SCROLL_FROM = 4; // more than 3 clips -> auto-scrolling strip

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// part="stats": follower / views / engagement strip. part="clips": the sample
// clip row for the bottom of a profile. Clips are cover images linked to the
// creator's own post — nothing is stored or re-hosted by Collabnb.
export default function SocialPortfolio({ username, part = 'all' }) {
  const data = useQuery(api.creatorSocial.getPublicSocial, username ? { username } : 'skip');
  const [open, setOpen] = useState(null);

  if (!data) return null;
  const { stats, platforms, portfolio } = data;
  const verified = new Set(stats.verified_platforms);
  const showStats = (part === 'all' || part === 'stats') && platforms.length > 0;
  const showClips = (part === 'all' || part === 'clips') && portfolio.length > 0;
  if (!showStats && !showClips) return null;

  return (
    <div style={{ width: '100%', marginTop: '1.5rem' }}>
      {showStats && (
        <>
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Stat value={fmt(stats.followers)} label="Followers" />
            {stats.avg_views ? <Stat value={fmt(stats.avg_views)} label="Avg views" /> : null}
            {stats.engagement_tier ? (
              <Stat
                value={TIER_LABEL[stats.engagement_tier]}
                label={stats.engagement_rate ? `Engagement · ${stats.engagement_rate}%` : 'Engagement'}
              />
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.9rem' }}>
            {platforms.map((p) => (
              <span key={p.platform} style={chip}>
                {PLATFORM_LABEL[p.platform]} {fmt(p.followers)}
                {verified.has(p.platform) && <span title="Verified by connecting the account" style={{ color: '#4A9B7F' }}> ✓</span>}
              </span>
            ))}
          </div>
        </>
      )}

      {showClips && <Clips items={portfolio} onOpen={setOpen} />}
      {open && <Player item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Clips({ items, onOpen }) {
  const scrolling = items.length >= SCROLL_FROM;
  // Duplicated once so the -50% translate loops seamlessly.
  const row = scrolling ? [...items, ...items] : items;
  return (
    <div className="sample-clips" style={{ marginTop: '1.25rem', overflow: scrolling ? 'hidden' : 'visible' }}>
      <style>{`
        @keyframes clips-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .sample-clips-track { display: flex; gap: 0.5rem; width: max-content; }
        .sample-clips-track.scrolling { animation: clips-marquee ${Math.max(items.length * 5, 20)}s linear infinite; }
        .sample-clips:hover .sample-clips-track.scrolling { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .sample-clips { overflow-x: auto !important; }
          .sample-clips-track.scrolling { animation: none; }
        }
      `}</style>
      <div className={`sample-clips-track${scrolling ? ' scrolling' : ''}`} style={scrolling ? undefined : { width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {row.map((item, i) => (
          <Tile key={`${item.id}-${i}`} item={item} fixed={scrolling} onOpen={() => onOpen(item)} />
        ))}
      </div>
    </div>
  );
}

function Tile({ item, fixed, onOpen }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play ${PLATFORM_LABEL[item.platform]} clip`}
      style={{
        position: 'relative', aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden',
        background: 'var(--ink, #192524)', border: 'none', padding: 0, cursor: 'pointer',
        ...(fixed ? { width: 150, flexShrink: 0 } : {}),
      }}
    >
      {item.thumbnail_url && !thumbFailed && (
        <img src={item.thumbnail_url} alt="" loading="lazy" onError={() => setThumbFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
      <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '0.15rem 0.45rem' }}>
        {PLATFORM_LABEL[item.platform]}
      </span>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.6rem', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>▶</span>
    </button>
  );
}

function Player({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div onClick={onClose} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(100%, 380px)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ aspectRatio: item.platform === 'youtube' ? '16 / 9' : '9 / 14', width: '100%', background: '#000', borderRadius: 14, overflow: 'hidden' }}>
          <iframe
            src={item.embed_url}
            title={item.caption || `${PLATFORM_LABEL[item.platform]} clip`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <a href={item.permalink} target="_blank" rel="noopener noreferrer nofollow" style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
            Open on {PLATFORM_LABEL[item.platform]} ↗
          </a>
          <button type="button" onClick={onClose} style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

const chip = {
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '0.3rem 0.65rem',
  borderRadius: 999,
  background: 'var(--bone, #efece9)',
  color: 'var(--slate)',
};
