import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useParams, useNavigate } from 'react-router-dom';

const CAT = {
  creators: { label: 'Creators', color: '#7B68C8', bg: 'rgba(123,104,200,0.1)' },
  hosts:    { label: 'Hosts',    color: '#4A9B7F', bg: 'rgba(74,155,127,0.1)' },
  industry: { label: 'Industry', color: '#3C5759', bg: 'rgba(60,87,89,0.1)'   },
  stats:    { label: 'Stats',    color: '#D4A843', bg: 'rgba(212,168,67,0.1)' },
};

function CategoryPill({ cat }) {
  const cfg = CAT[cat] || { label: cat, color: '#3C5759', bg: 'rgba(60,87,89,0.1)' };
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, padding: '0.25rem 0.7rem',
      borderRadius: 9999, background: cfg.bg, color: cfg.color,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {cfg.label || cat}
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      <div style={{ height: 360, borderRadius: '1.25rem', background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite', marginBottom: '2.5rem' }} />
      {[80, 60, 100, 90, 75].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 32 : 16, width: `${w}%`, borderRadius: 8, background: 'rgba(25,37,36,0.06)', animation: 'pulse 1.5s ease infinite', marginBottom: i === 0 ? '1rem' : '0.6rem' }} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = useQuery(api.blog.getBySlug, { slug: slug || '' });

  if (post === undefined) return <PostSkeleton />;

  if (!post) {
    return (
      <div style={{ maxWidth: 720, margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          Article not found
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--sage)', marginBottom: '1.5rem' }}>
          This post may have been moved or removed.
        </p>
        <button
          onClick={() => navigate('/blog')}
          style={{ padding: '0.65rem 1.5rem', borderRadius: 9999, border: 'none', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Back to the Journal
        </button>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

      {/* ── Back button ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/blog')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          marginBottom: '2.5rem',
          padding: '0.45rem 1rem',
          borderRadius: 9999,
          border: '1.5px solid rgba(25,37,36,0.12)',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--sage)',
          cursor: 'pointer',
          transition: 'border-color 140ms, color 140ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--slate)'; e.currentTarget.style.color = 'var(--slate)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(25,37,36,0.12)'; e.currentTarget.style.color = 'var(--sage)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        The Journal
      </button>

      {/* ── Meta row ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <CategoryPill cat={post.category} />
        {post.reading_time && (
          <span style={{ fontSize: '0.72rem', color: 'var(--sage)', fontWeight: 500 }}>
            {post.reading_time} min read
          </span>
        )}
        {post.published_at && (
          <>
            <span style={{ color: 'var(--stone)', fontSize: '0.72rem' }}>·</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>
              {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </>
        )}
      </div>

      {/* ── Title ─────────────────────────────────────────────────────────────── */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
        color: 'var(--ink)',
        letterSpacing: '-0.03em',
        lineHeight: 1.15,
        margin: '0 0 1.25rem',
      }}>
        {post.title}
      </h1>

      {/* ── Excerpt ───────────────────────────────────────────────────────────── */}
      <p style={{
        fontSize: '1.05rem',
        color: 'var(--slate)',
        lineHeight: 1.75,
        fontStyle: 'italic',
        margin: '0 0 2rem',
        paddingBottom: '2rem',
        borderBottom: '1px solid rgba(25,37,36,0.1)',
      }}>
        {post.excerpt}
      </p>

      {/* ── Hero image ────────────────────────────────────────────────────────── */}
      {post.hero_image_url && (
        <div style={{ borderRadius: '1rem', overflow: 'hidden', position: 'relative', marginBottom: '2.5rem', background: 'var(--stone)' }}>
          <img
            src={post.hero_image_url}
            alt={post.hero_image_alt || post.title}
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
          />
          {post.hero_image_credit && (
            <a
              href={post.hero_image_credit_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'absolute', bottom: '0.625rem', right: '0.75rem',
                fontSize: '0.62rem', color: 'rgba(255,255,255,0.85)',
                background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)',
                padding: '0.2rem 0.5rem', borderRadius: 4,
                textDecoration: 'none', letterSpacing: '0.01em',
              }}
            >
              Photo: {post.hero_image_credit} / Unsplash
            </a>
          )}
        </div>
      )}

      {/* ── Body content ──────────────────────────────────────────────────────── */}
      <div
        className="blog-content"
        style={{ fontSize: '1rem', lineHeight: 1.85, color: 'var(--ink)' }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* ── Instagram embed ───────────────────────────────────────────────────── */}
      {post.instagram_embed_url && (
        <div style={{ margin: '2.5rem 0', padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.6)', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.08)' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>Featured Post</p>
          <a href={post.instagram_embed_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#7B68C8', wordBreak: 'break-all', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {post.instagram_embed_url}
          </a>
        </div>
      )}

      {/* ── Tags ──────────────────────────────────────────────────────────────── */}
      {(post.tags || []).length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '2.5rem 0 0', paddingTop: '2rem', borderTop: '1px solid rgba(25,37,36,0.08)' }}>
          {(post.tags || []).map(tag => (
            <span key={tag} style={{ fontSize: '0.72rem', padding: '0.22rem 0.65rem', borderRadius: 9999, background: 'rgba(25,37,36,0.05)', color: 'var(--sage)', letterSpacing: '0.01em' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Sources ───────────────────────────────────────────────────────────── */}
      {(post.sources || []).length > 0 && (
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(25,37,36,0.08)' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.625rem' }}>Sources</p>
          {(post.sources || []).map((s, i) => (
            <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: '#7B68C8', marginBottom: '0.3rem', wordBreak: 'break-all', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {s}
            </a>
          ))}
        </div>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: '4rem',
        padding: '2.5rem',
        borderRadius: '1.25rem',
        background: 'rgba(25,37,36,0.04)',
        border: '1px solid rgba(25,37,36,0.1)',
        textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ink)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          Ready to collab?
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--sage)', margin: '0 0 1.5rem', lineHeight: 1.65 }}>
          Join Collabnb's waitlist and get early access to content-for-stay partnerships.
        </p>
        <a
          href="/join.html"
          style={{
            display: 'inline-block',
            padding: '0.8rem 2rem',
            borderRadius: 9999,
            background: 'var(--ink)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.01em',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Join the Waitlist →
        </a>
      </div>
    </article>
  );
}
