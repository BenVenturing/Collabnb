import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import collabnbLogo from '../assets/collabnb-logo.png';
import SocialPortfolio from '../components/SocialPortfolio';

// The one app page a signed-out stranger can reach. It is what the mobile
// share sheet, the QR code and every pasted profile link resolve to, so it
// renders without a session and reads from profiles.getPublicByUsername —
// a whitelisted shape, not the full row.
export default function PublicProfile() {
  const { username } = useParams();
  const profile = useQuery(
    api.profiles.getPublicByUsername,
    username ? { username } : 'skip',
  );

  const loading = profile === undefined;

  useEffect(() => {
    if (!profile) return;
    const previous = document.title;
    document.title = `${profile.full_name} · Collabnb`;
    return () => { document.title = previous; };
  }, [profile]);

  if (loading) {
    return (
      <Shell>
        <div style={{ ...S.card, alignItems: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ color: 'var(--sage)', fontSize: '0.9rem' }}>Loading profile…</p>
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div style={{ ...S.card, alignItems: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Profile not found
          </h1>
          <p style={{ color: 'var(--sage)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            This profile doesn’t exist, or it isn’t public yet.
          </p>
          <a href="/" style={S.cta}>Go to Collabnb</a>
        </div>
      </Shell>
    );
  }

  const location = [profile.city, profile.region || profile.country].filter(Boolean).join(', ');
  const socials = [
    profile.instagram_handle && {
      label: 'Instagram',
      href: `https://instagram.com/${profile.instagram_handle.replace(/^@/, '')}`,
    },
    profile.tiktok_handle && {
      label: 'TikTok',
      href: `https://tiktok.com/@${profile.tiktok_handle.replace(/^@/, '')}`,
    },
    profile.youtube_handle && {
      label: 'YouTube',
      href: `https://youtube.com/@${profile.youtube_handle.replace(/^@/, '')}`,
    },
    profile.portfolio && { label: 'Portfolio', href: withProtocol(profile.portfolio) },
  ].filter(Boolean);

  return (
    <Shell>
      <div style={S.card}>
        <div style={S.banner}>
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" style={S.bannerImg} />
          ) : (
            <div style={{ ...S.bannerImg, background: 'linear-gradient(135deg, var(--ink), var(--slate))' }} />
          )}
        </div>

        <div style={S.body}>
          <img
            src={profile.avatar_url || collabnbLogo}
            alt={profile.full_name}
            style={S.avatar}
          />

          <h1 style={S.name}>{profile.full_name}</h1>

          <p style={S.meta}>
            @{profile.username}
            {location ? ` · ${location}` : ''}
          </p>

          <div style={S.chips}>
            {profile.is_founder && <span style={S.chip}>★ Founding Member</span>}
            {profile.tier && <span style={S.chip}>{profile.tier}</span>}
            <span style={S.chip}>{profile.role === 'host' ? 'Host' : 'Creator'}</span>
          </div>

          {profile.bio && <p style={S.bio}>{profile.bio}</p>}

          {(profile.follower_count || profile.collab_count) && (
            <div style={S.stats}>
              {profile.follower_count ? (
                <Stat value={formatCount(profile.follower_count)} label="Followers" />
              ) : null}
              {profile.collab_count ? (
                <Stat value={String(profile.collab_count)} label="Collabs" />
              ) : null}
            </div>
          )}

          {socials.length > 0 && (
            <div style={S.socials}>
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  style={S.socialLink}
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}

          {profile.role === 'creator' && <SocialPortfolio username={profile.username} />}

          {profile.portfolio_images?.length > 0 && (
            <div style={S.grid}>
              {profile.portfolio_images.slice(0, 6).map((src, i) => (
                <img key={i} src={src} alt="" style={S.gridImg} loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div style={S.footer}>
          <p style={{ fontSize: '0.8rem', color: 'var(--sage)', marginBottom: '0.75rem' }}>
            Collabnb connects creators with stays worth posting about.
          </p>
          <a href="/join.html" style={S.cta}>Join Collabnb</a>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={collabnbLogo} alt="Collabnb" style={{ height: 26 }} />
        </Link>
      </header>
      {children}
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--ink)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  );
}

function withProtocol(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bone, #efece9)',
    padding: '0 1rem 3rem',
  },
  header: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '1.25rem 0',
  },
  card: {
    maxWidth: 560,
    margin: '0 auto',
    background: 'var(--surface, #fff)',
    borderRadius: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 40px rgba(25,37,36,0.08)',
  },
  banner: { height: 180, position: 'relative', background: 'var(--stone, #ddd8d2)' },
  bannerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    // Same anchor the signed-in profile and the app use, so one photo crops
    // identically on all three.
    objectPosition: 'top center',
    display: 'block',
  },
  body: { padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid var(--surface, #fff)',
    marginTop: -52,
    background: 'var(--stone, #ddd8d2)',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.65rem',
    color: 'var(--ink)',
    margin: '0.75rem 0 0.25rem',
    textAlign: 'center',
  },
  meta: { fontSize: '0.85rem', color: 'var(--sage)', margin: 0, textAlign: 'center' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginTop: '0.75rem' },
  chip: {
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '0.3rem 0.65rem',
    borderRadius: 999,
    background: 'var(--bone, #efece9)',
    color: 'var(--slate)',
  },
  bio: {
    fontSize: '0.92rem',
    lineHeight: 1.6,
    color: 'var(--slate)',
    textAlign: 'center',
    marginTop: '1rem',
    maxWidth: 420,
  },
  stats: { display: 'flex', gap: '2.5rem', marginTop: '1.25rem' },
  socials: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' },
  socialLink: {
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '0.5rem 0.9rem',
    borderRadius: 999,
    border: '1px solid var(--stone, #ddd8d2)',
    color: 'var(--ink)',
    textDecoration: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.4rem',
    marginTop: '1.5rem',
    width: '100%',
  },
  gridImg: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, display: 'block' },
  footer: {
    borderTop: '1px solid var(--bone, #efece9)',
    padding: '1.25rem 1.5rem',
    textAlign: 'center',
  },
  cta: {
    display: 'inline-block',
    background: 'var(--ink, #192524)',
    color: '#fff',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: 600,
    padding: '0.7rem 1.6rem',
    borderRadius: 999,
  },
};
