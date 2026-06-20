import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';
import collabnbLogo from '../assets/collabnb-logo.png';

const CAT = {
  creators: { label: 'Creators', color: '#7B68C8', bg: 'rgba(123,104,200,0.1)' },
  hosts:    { label: 'Hosts',    color: '#4A9B7F', bg: 'rgba(74,155,127,0.1)' },
  industry: { label: 'Industry', color: '#3C5759', bg: 'rgba(60,87,89,0.1)'   },
  stats:    { label: 'Stats',    color: '#D4A843', bg: 'rgba(212,168,67,0.1)' },
};

const CATS = ['all', 'creators', 'hosts', 'industry', 'stats'];

function CategoryPill({ cat, size = 'sm' }) {
  const cfg = CAT[cat] || { label: cat, color: '#3C5759', bg: 'rgba(60,87,89,0.1)' };
  return (
    <span style={{
      fontSize: size === 'sm' ? '0.62rem' : '0.7rem',
      fontWeight: 700,
      padding: size === 'sm' ? '0.2rem 0.55rem' : '0.25rem 0.7rem',
      borderRadius: 9999,
      background: cfg.bg,
      color: cfg.color,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      lineHeight: 1,
    }}>
      {cfg.label || cat}
    </span>
  );
}

function ReadTime({ mins }) {
  return (
    <span style={{ fontSize: '0.72rem', color: 'var(--sage)', fontWeight: 500 }}>
      {mins || 1} min read
    </span>
  );
}

function DateLabel({ ts }) {
  if (!ts) return null;
  return (
    <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>
      {new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  );
}

// ─── Featured (hero) post card ────────────────────────────────────────────────
function FeaturedCard({ post }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: post.hero_image_url ? '1fr 420px' : '1fr',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid rgba(25,37,36,0.08)',
        boxShadow: hovered
          ? '0 12px 40px rgba(25,37,36,0.14)'
          : '0 4px 20px rgba(25,37,36,0.07)',
        cursor: 'pointer',
        transition: 'box-shadow 220ms ease, transform 220ms ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        minHeight: 300,
      }}
    >
      {/* Text side */}
      <div style={{ padding: '2.5rem 2.5rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage)', background: 'rgba(25,37,36,0.05)', padding: '0.2rem 0.55rem', borderRadius: 9999 }}>
              Featured
            </span>
            <CategoryPill cat={post.category} size="sm" />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-blog-display)',
            fontWeight: 500,
            fontSize: 'clamp(1.375rem, 2.5vw, 1.875rem)',
            color: 'var(--ink)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            margin: '0 0 0.875rem',
          }}>
            {post.title}
          </h2>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--slate)',
            lineHeight: 1.7,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {post.excerpt}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ReadTime mins={post.reading_time} />
          <span style={{ color: 'var(--stone)' }}>·</span>
          <DateLabel ts={post.published_at} />
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', opacity: hovered ? 1 : 0.6, transition: 'opacity 180ms' }}>
            Read
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Image side */}
      {post.hero_image_url && (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src={post.hero_image_url}
            alt={post.hero_image_alt || post.title}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              filter: 'grayscale(100%) contrast(1.05)',
              transition: 'transform 400ms ease',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Regular post card ────────────────────────────────────────────────────────
function PostCard({ post }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '1rem',
        overflow: 'hidden',
        background: hovered ? '#fff' : 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(25,37,36,0.08)',
        boxShadow: hovered
          ? '0 8px 32px rgba(25,37,36,0.12)'
          : '0 2px 10px rgba(25,37,36,0.05)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image */}
      <div style={{ height: 200, overflow: 'hidden', background: 'var(--stone)', flexShrink: 0 }}>
        {post.hero_image_url ? (
          <img
            src={post.hero_image_url}
            alt={post.hero_image_alt || post.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: 'grayscale(100%) contrast(1.05)',
              transition: 'transform 400ms ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(60,87,89,0.08) 0%, rgba(209,235,219,0.4) 100%)' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem 1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CategoryPill cat={post.category} />
          <ReadTime mins={post.reading_time} />
        </div>

        <h3 style={{
          fontFamily: 'var(--font-blog-display)',
          fontWeight: 500,
          fontSize: '1.05rem',
          color: 'var(--ink)',
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {post.title}
        </h3>

        <p style={{
          fontSize: '0.82rem',
          color: 'var(--sage)',
          lineHeight: 1.65,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}>
          {post.excerpt}
        </p>

        {(post.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            {(post.tags || []).slice(0, 3).map(tag => (
              <span key={tag} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 9999, background: 'rgba(25,37,36,0.05)', color: 'var(--sage)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.published_at && (
          <DateLabel ts={post.published_at} />
        )}
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ borderRadius: '1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(25,37,36,0.06)' }}>
      <div style={{ height: 200, background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ height: 12, width: '40%', borderRadius: 6, background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: 20, width: '85%', borderRadius: 6, background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: 14, width: '100%', borderRadius: 6, background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: 14, width: '70%', borderRadius: 6, background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  );
}

// ─── Minimal Journal top bar ─────────────────────────────────────────────────
function JournalTopBar() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1.5rem',
      background: 'rgba(245,247,244,0.82)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(25,37,36,0.07)',
    }}>
      <img src={collabnbLogo} alt="Collabnb" width="28" height="28" style={{ display: 'block' }} />
      <a
        href="/"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate)',
          textDecoration: 'none',
          padding: '0.35rem 0.75rem',
          borderRadius: 9999,
          border: '1.5px solid rgba(25,37,36,0.14)',
          background: 'rgba(255,255,255,0.7)',
          transition: 'background 150ms, border-color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(25,37,36,0.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(25,37,36,0.14)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Collabnb
      </a>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
// ─── Cinematic horizontal journal gallery ─────────────────────────────────────
function JournalGallery({ posts }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);   // focused card index
  const [exiting, setExiting] = useState(null);   // slug being opened

  const open = (post) => {
    if (exiting) return;
    setExiting(post.slug);
    // Let the zoom-forward + fade play, then hand off to the reading view
    setTimeout(() => navigate(`/blog/${post.slug}`), 480);
  };

  return (
    <section style={{ marginBottom: '3.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: 'clamp(1.4rem, 2.6vw, 2.1rem)', color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
          Selected <span style={{ fontStyle: 'italic' }}>from the</span> Journal
        </h2>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage)', whiteSpace: 'nowrap' }}>
          Drag / hover to explore
        </span>
      </div>

      <div
        className="no-scrollbar"
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'flex', gap: '1.75rem', alignItems: 'flex-start',
          overflowX: 'auto', overflowY: 'visible',
          padding: '2.25rem 0.5rem 2.75rem',
          scrollSnapType: 'x proximity', scrollbarWidth: 'none',
          perspective: 1600,
        }}
      >
        {posts.map((post, i) => {
          const isHovered = hovered === i;
          const dim = hovered !== null && !isHovered;
          const isExiting = exiting === post.slug;
          const othersExiting = exiting && exiting !== post.slug;
          return (
            <article
              key={post._id}
              onMouseEnter={() => !exiting && setHovered(i)}
              onClick={() => open(post)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && open(post)}
              style={{
                position: 'relative', flex: '0 0 auto',
                width: 'clamp(238px, 30vw, 330px)',
                scrollSnapAlign: 'center',
                cursor: 'pointer', outline: 'none',
                transformOrigin: 'center bottom',
                transform: isExiting
                  ? 'translateY(-40px) scale(1.09)'
                  : isHovered ? 'translateY(-16px) scale(1.05)'
                  : dim ? 'scale(0.94)' : 'scale(1)',
                opacity: othersExiting ? 0 : dim ? 0.5 : 1,
                filter: dim ? 'saturate(0.65) brightness(0.97)' : 'none',
                zIndex: isHovered || isExiting ? 5 : 1,
                transition: 'transform 540ms var(--ease-out-expo), opacity 500ms ease, filter 400ms ease',
                willChange: 'transform, opacity',
              }}
            >
              <span style={{ position: 'absolute', top: -24, left: 2, fontFamily: 'var(--font-blog-body)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--sage)' }}>
                {String(i + 1).padStart(3, '0')}
              </span>

              <div style={{
                position: 'relative', borderRadius: '0.5rem', overflow: 'hidden',
                aspectRatio: '3 / 4', background: 'var(--stone)',
                boxShadow: (isHovered || isExiting)
                  ? '0 34px 64px -22px rgba(25,37,36,0.42)'
                  : '0 10px 26px -14px rgba(25,37,36,0.28)',
                transition: 'box-shadow 540ms var(--ease-out-expo)',
              }}>
                {post.hero_image_url ? (
                  <img
                    src={post.hero_image_url}
                    alt={post.hero_image_alt || post.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: isHovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 760ms var(--ease-out-expo)' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage)', fontSize: '0.75rem' }}>No image</div>
                )}
                <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                  <CategoryPill cat={post.category} />
                </div>
              </div>

              <div style={{ marginTop: '0.9rem' }}>
                <h3 style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: '1.05rem', lineHeight: 1.28, color: 'var(--ink)', margin: '0 0 0.45rem' }}>
                  {post.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ReadTime mins={post.reading_time} />
                  {post.published_at && (
                    <>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--stone)' }} />
                      <DateLabel ts={post.published_at} />
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Blog() {
  const posts = useQuery(api.blog.getPublished, { limit: 50 });
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    if (!posts) return [];
    let list = posts;
    if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [posts, query, activeCategory]);

  // Default view (no search/filter) leads with the cinematic gallery; the rest fall
  // into the "Latest" grid. Searching/filtering shows a plain grid of all matches.
  const isDefault    = !query.trim() && activeCategory === 'all';
  const galleryPosts = isDefault ? filtered.slice(0, 6) : [];
  const gridPosts    = isDefault ? filtered.slice(6) : filtered;

  return (
    <>
    <JournalTopBar />
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '6rem 1.5rem 6rem' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p style={{
          fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--sage)',
          marginBottom: '0.75rem',
        }}>
          Collabnb
        </p>
        <h1 style={{
          fontFamily: 'var(--font-blog-display)',
          fontWeight: 500,
          fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: '0 0 1rem',
        }}>
          The Journal
        </h1>
        <p style={{
          fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
          color: 'var(--sage)',
          maxWidth: 520,
          margin: '0 auto',
          lineHeight: 1.7,
        }}>
          Insights for boutique hosts & UGC creators building the future of content-for-stay.
        </p>

        {/* Divider */}
        <div style={{ width: 48, height: 2, background: 'var(--ink)', margin: '2rem auto 0', borderRadius: 1 }} />
      </div>

      {/* ── Search + filters ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
          <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--sage)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search articles…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              border: '1.5px solid rgba(25,37,36,0.14)',
              borderRadius: 9999,
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--ink)',
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(8px)',
              outline: 'none',
              transition: 'border-color 150ms',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--slate)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(25,37,36,0.14)'; }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontSize: '1rem', lineHeight: 1, padding: '0.25rem' }}
            >
              ×
            </button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATS.map(cat => {
            const cfg = CAT[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: 9999,
                  border: isActive ? `1.5px solid ${cfg?.color || 'var(--ink)'}` : '1.5px solid rgba(25,37,36,0.12)',
                  background: isActive ? (cfg?.bg || 'rgba(25,37,36,0.06)') : 'transparent',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? (cfg?.color || 'var(--ink)') : 'var(--sage)',
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                  letterSpacing: '0.01em',
                  textTransform: cat === 'all' ? 'none' : 'capitalize',
                }}
              >
                {cat === 'all' ? 'All' : (cfg?.label || cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {posts === undefined && (
        <>
          <div style={{ marginBottom: '2.5rem', borderRadius: '1.25rem', overflow: 'hidden', background: 'rgba(255,255,255,0.5)', height: 320, animation: 'pulse 1.5s ease infinite', border: '1px solid rgba(25,37,36,0.06)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.5rem' }}>
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {posts !== undefined && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>
            {query || activeCategory !== 'all' ? 'No matching articles' : 'No posts yet'}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
            {query || activeCategory !== 'all'
              ? 'Try a different search term or category.'
              : 'Check back soon — new content is on its way.'}
          </p>
          {(query || activeCategory !== 'all') && (
            <button
              onClick={() => { setQuery(''); setActiveCategory('all'); }}
              style={{ padding: '0.55rem 1.25rem', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.15)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Cinematic journal gallery (default view) ─────────────────────────── */}
      {galleryPosts.length > 0 && (
        <JournalGallery posts={galleryPosts} />
      )}

      {/* ── Post grid ────────────────────────────────────────────────────────── */}
      {gridPosts.length > 0 && (
        <>
          {isDefault && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage)' }}>
                More from the Journal
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--stone)' }} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.5rem' }}>
            {gridPosts.map(post => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
    </>
  );
}
