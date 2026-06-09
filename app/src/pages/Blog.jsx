import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';

const CAT_COLORS = {
  creators: '#7B68C8',
  hosts:    '#4A9B7F',
  industry: '#3C5759',
  stats:    '#D4A843',
};

function PostCard({ post }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      style={{
        borderRadius: '1rem', overflow: 'hidden',
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 2px 12px rgba(25,37,36,0.07)',
        cursor: 'pointer', transition: 'transform 180ms, box-shadow 180ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(25,37,36,0.13)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(25,37,36,0.07)'; }}
    >
      {post.hero_image_url && (
        <img src={post.hero_image_url} alt={post.hero_image_alt || ''} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 9999, background: `${CAT_COLORS[post.category] || '#3C5759'}18`, color: CAT_COLORS[post.category] || '#3C5759', textTransform: 'capitalize' }}>
            {post.category}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--stone)' }}>
            {post.reading_time || 1} min read
          </span>
          {post.published_at && (
            <span style={{ fontSize: '0.68rem', color: 'var(--stone)' }}>
              · {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)', margin: '0 0 0.5rem', lineHeight: 1.3 }}>{post.title}</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--sage)', margin: 0, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.excerpt}
        </p>
        {(post.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.875rem' }}>
            {(post.tags || []).slice(0, 3).map(tag => (
              <span key={tag} style={{ fontSize: '0.62rem', padding: '0.12rem 0.45rem', borderRadius: 9999, background: 'rgba(25,37,36,0.05)', color: 'var(--sage)' }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Blog() {
  const posts = useQuery(api.blog.getPublished, { limit: 30 });

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', color: 'var(--ink)', margin: '0 0 0.75rem', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          The Collabnb Journal
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--sage)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
          Insights for boutique hosts and UGC creators building the future of content-for-stay partnerships.
        </p>
      </div>

      {/* Loading */}
      {posts === undefined && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.25rem' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ borderRadius: '1rem', background: 'rgba(255,255,255,0.5)', height: 340, animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {posts !== undefined && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>No posts yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>Check back soon — new content drops daily.</p>
        </div>
      )}

      {/* Grid */}
      {posts && posts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.25rem' }}>
          {posts.map(post => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
