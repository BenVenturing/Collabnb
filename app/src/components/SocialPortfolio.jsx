import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const PLATFORM_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };
const TIER_LABEL = { strong: 'Strong', average: 'Average', low: 'Low' };

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// Live stats + portfolio of posts that play straight from Instagram / TikTok /
// YouTube. Renders nothing when a creator has neither linked accounts nor posts.
export default function SocialPortfolio({ username }) {
  const data = useQuery(api.creatorSocial.getPublicSocial, username ? { username } : 'skip');
  const [playing, setPlaying] = useState(null);

  if (!data) return null;
  const { stats, platforms, portfolio } = data;
  if (!platforms.length && !portfolio.length) return null;

  const verified = new Set(stats.verified_platforms);

  return (
    <div style={{ width: '100%', marginTop: '1.5rem' }}>
      {platforms.length > 0 && (
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

      {portfolio.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '1.25rem' }}>
          {portfolio.map((item) => (
            <Tile key={item.id} item={item} active={playing === item.id} onPlay={() => setPlaying(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ item, active, onPlay }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const base = { position: 'relative', aspectRatio: '9 / 16', borderRadius: 10, overflow: 'hidden', background: 'var(--ink, #192524)' };

  if (active) {
    return (
      <div style={{ ...base, gridColumn: 'span 3', aspectRatio: item.platform === 'youtube' ? '16 / 9' : '9 / 14', maxHeight: 640 }}>
        <iframe
          src={item.embed_url}
          title={item.caption || `${PLATFORM_LABEL[item.platform]} post`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${PLATFORM_LABEL[item.platform]} post`}
      style={{ ...base, border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {item.thumbnail_url && !thumbFailed && (
        <img
          src={item.thumbnail_url}
          alt=""
          loading="lazy"
          onError={() => setThumbFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '0.15rem 0.45rem' }}>
        {PLATFORM_LABEL[item.platform]}
      </span>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.6rem', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>▶</span>
      {item.views != null && (
        <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.65rem', fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          {fmt(item.views)} views
        </span>
      )}
    </button>
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
