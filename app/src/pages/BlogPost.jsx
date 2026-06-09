import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useParams, useNavigate } from 'react-router-dom';

const CAT_COLORS = {
  creators: '#7B68C8',
  hosts:    '#4A9B7F',
  industry: '#3C5759',
  stats:    '#D4A843',
};

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = useQuery(api.blog.getBySlug, { slug: slug || '' });

  if (post === undefined) {
    return (
      <div style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.25rem' }}>
        <div style={{ height: 320, borderRadius: '1rem', background: 'rgba(255,255,255,0.5)', animation: 'pulse 1.5s ease infinite', marginBottom: '1.5rem' }} />
        <div style={{ height: 32, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)', animation: 'pulse 1.5s ease infinite', marginBottom: '0.75rem', width: '80%' }} />
        <div style={{ height: 20, borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)', animation: 'pulse 1.5s ease infinite', width: '60%' }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ maxWidth: 720, margin: '6rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>Post not found</p>
        <button onClick={() => navigate('/blog')} style={{ marginTop: '1rem', padding: '0.65rem 1.5rem', borderRadius: 9999, border: 'none', background: '#192524', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          Back to Journal
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>

      {/* Back */}
      <button
        onClick={() => navigate('/blog')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem', padding: '0.45rem 0.875rem', borderRadius: 9999, border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)', cursor: 'pointer' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        The Journal
      </button>

      {/* Hero image */}
      {post.hero_image_url && (
        <div style={{ borderRadius: '1rem', overflow: 'hidden', position: 'relative', marginBottom: '2rem' }}>
          <img src={post.hero_image_url} alt={post.hero_image_alt || ''} style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
          {post.hero_image_credit && (
            <a
              href={post.hero_image_credit_url || '#'}
              target="_blank" rel="noopener noreferrer"
              style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', fontSize: '0.62rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.35)', padding: '0.2rem 0.5rem', borderRadius: 4, textDecoration: 'none' }}
            >
              Photo: {post.hero_image_credit} / Unsplash
            </a>
          )}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 9999, background: `${CAT_COLORS[post.category] || '#3C5759'}18`, color: CAT_COLORS[post.category] || '#3C5759', textTransform: 'capitalize' }}>{post.category}</span>
        {post.reading_time && <span style={{ fontSize: '0.7rem', color: 'var(--stone)' }}>{post.reading_time} min read</span>}
        {post.published_at && <span style={{ fontSize: '0.7rem', color: 'var(--stone)' }}>· {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
      </div>

      {/* Title */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.25rem)', color: 'var(--ink)', margin: '0 0 0.875rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
        {post.title}
      </h1>

      {/* Excerpt */}
      <p style={{ fontSize: '1.05rem', color: 'var(--sage)', margin: '0 0 2rem', lineHeight: 1.7, fontStyle: 'italic' }}>
        {post.excerpt}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(25,37,36,0.1)', marginBottom: '2rem' }} />

      {/* Body */}
      <div
        className="blog-content"
        style={{ fontSize: '1rem', lineHeight: 1.85, color: 'var(--ink)' }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Instagram embed */}
      {post.instagram_embed_url && (
        <div style={{ margin: '2.5rem 0', padding: '1.25rem', background: 'rgba(255,255,255,0.6)', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.08)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>Featured Post</p>
          <a href={post.instagram_embed_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#7B68C8', wordBreak: 'break-all' }}>{post.instagram_embed_url}</a>
        </div>
      )}

      {/* Tags */}
      {(post.tags || []).length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '2.5rem 0 0' }}>
          {(post.tags || []).map(tag => (
            <span key={tag} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 9999, background: 'rgba(25,37,36,0.06)', color: 'var(--sage)' }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Sources */}
      {(post.sources || []).length > 0 && (
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(25,37,36,0.08)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Sources</p>
          {(post.sources || []).map((s, i) => (
            <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: '#7B68C8', marginBottom: '0.35rem', wordBreak: 'break-all' }}>{s}</a>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: '3.5rem', padding: '2rem', borderRadius: '1.25rem', background: 'rgba(60,87,89,0.07)', border: '1px solid rgba(60,87,89,0.12)', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>Ready to collab?</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--sage)', margin: '0 0 1.25rem' }}>Join Collabnb's waitlist and get early access to content-for-stay partnerships.</p>
        <a href="/join.html" style={{ display: 'inline-block', padding: '0.75rem 1.75rem', borderRadius: 9999, background: '#192524', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none' }}>
          Join the Waitlist
        </a>
      </div>
    </div>
  );
}
