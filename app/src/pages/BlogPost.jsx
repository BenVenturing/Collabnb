import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

// ─── Dark / light mode ────────────────────────────────────────────────────────
function useBlogTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('collabnb_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => { localStorage.setItem('collabnb_theme', theme); }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

// ─── Scroll-reveal (IntersectionObserver) ────────────────────────────────────
function useScrollReveal(active) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const els = ref.current.querySelectorAll('.blog-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [active]);
  return ref;
}

// ─── Theme toggle (appears after 200px scroll) ────────────────────────────────
function ThemeToggle({ theme, toggle }) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const fn = () => setVis(window.scrollY > 200);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 200,
        width: 38, height: 38, borderRadius: '50%',
        border: '1px solid var(--blog-divider)', background: 'var(--blog-bg2)',
        color: 'var(--blog-slate)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity: vis ? 1 : 0, transform: vis ? 'scale(1)' : 'scale(0.85)',
        transition: 'opacity 300ms ease, transform 300ms ease, background 300ms ease',
        pointerEvents: vis ? 'auto' : 'none',
      }}
    >
      {theme === 'dark'
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
      }
    </button>
  );
}

// ─── Inline image with float ──────────────────────────────────────────────────
function InlineImage({ url, alt, credit, side }) {
  const [loaded, setLoaded] = useState(false);
  if (!url) return null;
  return (
    <figure
      className="blog-reveal"
      style={{
        float: side,
        width: 'clamp(180px, 42%, 260px)',
        margin: side === 'right' ? '0.25rem 0 1.5rem 2rem' : '0.25rem 2rem 1.5rem 0',
        borderRadius: 4, overflow: 'hidden',
        border: '1px solid var(--blog-divider)',
      }}
    >
      <img
        src={url} alt={alt || ''}
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover',
          filter: 'grayscale(100%) contrast(1.06)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 400ms ease, transform 600ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
      {credit && (
        <figcaption style={{ fontSize: '0.6rem', color: 'var(--blog-sage)', padding: '0.3rem 0.5rem', background: 'var(--blog-bg2)', fontFamily: 'var(--font-blog-body)' }}>
          {credit} / Unsplash
        </figcaption>
      )}
    </figure>
  );
}

// ─── Pull quote ───────────────────────────────────────────────────────────────
function PullQuote({ text }) {
  if (!text) return null;
  return (
    <div className="blog-reveal" style={{ margin: '4rem 0', padding: '0 1.5rem', textAlign: 'center', borderTop: '1px solid var(--blog-divider)', borderBottom: '1px solid var(--blog-divider)', paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
      <p style={{
        fontFamily: 'var(--font-blog-display)', fontStyle: 'italic', fontWeight: 300,
        fontSize: 'clamp(1.2rem, 3vw, 1.625rem)', lineHeight: 1.45,
        color: 'var(--blog-ink)', letterSpacing: '-0.01em', margin: 0,
      }}>
        "{text}"
      </p>
    </div>
  );
}

// ─── Content with inline images injected at markers ───────────────────────────
function BlogBody({ content, post }) {
  const parts = content.split(/(%%INLINE_IMAGE_[123]%%)/);
  const imgs = {
    '%%INLINE_IMAGE_1%%': { url: post.inline_image_1_url, alt: post.inline_image_1_alt, credit: post.inline_image_1_credit, side: 'right' },
    '%%INLINE_IMAGE_2%%': { url: post.inline_image_2_url, alt: post.inline_image_2_alt, credit: post.inline_image_2_credit, side: 'left'  },
    '%%INLINE_IMAGE_3%%': { url: post.inline_image_3_url, alt: post.inline_image_3_alt, credit: post.inline_image_3_credit, side: 'right' },
  };
  return (
    <div className="blog-content blog-reveal">
      {parts.map((p, i) => imgs[p]
        ? <InlineImage key={i} {...imgs[p]} />
        : <div key={i} dangerouslySetInnerHTML={{ __html: p }} />
      )}
      <div style={{ clear: 'both' }} />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PostSkeleton({ theme }) {
  const bg = theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(25,37,36,0.06)';
  const S = ({ h, w = '100%', mb = '0.75rem' }) => (
    <div style={{ height: h, width: w, borderRadius: 6, background: bg, animation: 'pulse 1.5s ease infinite', marginBottom: mb }} />
  );
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '5rem 2rem 6rem' }}>
      <S h={360} mb="2.5rem" /><S h={20} w="28%" mb="0.5rem" /><S h={52} mb="0.4rem" />
      <S h={52} w="65%" mb="2rem" /><S h={16} /><S h={16} /><S h={16} w="75%" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BlogPost() {
  const { slug }          = useParams();
  const navigate          = useNavigate();
  const { theme, toggle } = useBlogTheme();
  const post              = useQuery(api.blog.getBySlug, { slug: slug || '' });
  const articleRef        = useScrollReveal(!!post);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const wrap = (content) => (
    <div data-blog-theme={theme} style={{ background: 'var(--blog-bg)', minHeight: '100dvh', transition: 'background 300ms ease, color 300ms ease' }}>
      <ThemeToggle theme={theme} toggle={toggle} />
      {content}
    </div>
  );

  if (post === undefined) return wrap(<PostSkeleton theme={theme} />);

  if (!post) return wrap(
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '0 1.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--blog-ink)', marginBottom: '0.5rem' }}>Article not found</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--blog-sage)', marginBottom: '1.5rem', fontFamily: 'var(--font-blog-body)' }}>This post may have been moved or removed.</p>
        <button onClick={() => navigate('/blog')} style={{ padding: '0.65rem 1.5rem', borderRadius: 9999, border: 'none', background: 'var(--blog-ink)', color: 'var(--blog-bg)', fontFamily: 'var(--font-blog-body)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          Back to the Journal
        </button>
      </div>
    </div>
  );

  const dateStr = new Date(post.published_at || post.generated_at)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return wrap(
    <article
      ref={articleRef}
      style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(3rem, 8vw, 6rem) clamp(1.25rem, 4vw, 2rem) 6rem', fontFamily: 'var(--font-blog-body)' }}
    >
      {/* Back */}
      <div style={{ animation: 'blogFadeUp 600ms ease-out both', marginBottom: '3rem' }}>
        <button
          onClick={() => navigate('/blog')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0', border: 'none', background: 'none', fontFamily: 'var(--font-blog-body)', fontSize: '0.75rem', fontWeight: 500, color: 'var(--blog-sage)', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 140ms' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--blog-ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--blog-sage)'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          The Journal
        </button>
      </div>

      {/* Meta row */}
      <div style={{ animation: 'blogFadeUp 600ms ease-out both', animationDelay: '80ms', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-blog-body)', padding: '0.22rem 0.65rem', borderRadius: 9999, background: 'var(--blog-bg2)', color: 'var(--blog-slate)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {post.category}
        </span>
        {post.reading_time && <span style={{ fontSize: '0.7rem', color: 'var(--blog-sage)', fontFamily: 'var(--font-blog-body)' }}>{post.reading_time} min read</span>}
        <span style={{ color: 'var(--blog-sage)', fontSize: '0.7rem' }}>·</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--blog-sage)', fontFamily: 'var(--font-blog-body)' }}>{dateStr}</span>
      </div>

      {/* Title */}
      <h1 style={{ animation: 'blogFadeUp 600ms ease-out both', animationDelay: '120ms', fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: 'clamp(1.875rem, 5vw, 2.875rem)', color: 'var(--blog-ink)', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 1.25rem' }}>
        {post.title}
      </h1>

      {/* Excerpt */}
      {post.excerpt && (
        <p style={{ animation: 'blogFadeUp 600ms ease-out both', animationDelay: '160ms', fontSize: '1.0625rem', fontStyle: 'italic', lineHeight: 1.65, color: 'var(--blog-slate)', margin: '0 0 2rem', fontFamily: 'var(--font-blog-body)', paddingBottom: '2rem', borderBottom: '1px solid var(--blog-divider)' }}>
          {post.excerpt}
        </p>
      )}

      {/* Author */}
      <div style={{ animation: 'blogFadeUp 500ms ease-out both', animationDelay: '180ms', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--blog-bg2)', border: '1px solid var(--blog-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--blog-slate)', fontFamily: 'var(--font-blog-body)' }}>B</div>
        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--blog-slate)', fontFamily: 'var(--font-blog-body)' }}>{post.author || 'Ben Venturing'}</span>
      </div>

      {/* Hero image */}
      {post.hero_image_url && (
        <div style={{ animation: 'blogFadeIn 800ms ease-out both', animationDelay: '220ms', marginBottom: '3.5rem', position: 'relative', overflow: 'hidden', borderRadius: 4, border: '1px solid var(--blog-divider)' }}>
          <img
            src={post.hero_image_url} alt={post.hero_image_alt || post.title}
            onLoad={() => setHeroLoaded(true)}
            style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.05)', opacity: heroLoaded ? 1 : 0, transition: 'opacity 400ms ease, transform 600ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
          {post.hero_image_credit && (
            <a href={post.hero_image_credit_url || '#'} target="_blank" rel="noopener noreferrer"
              style={{ position: 'absolute', bottom: '0.5rem', right: '0.625rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '0.18rem 0.45rem', borderRadius: 3, textDecoration: 'none', fontFamily: 'var(--font-blog-body)' }}>
              {post.hero_image_credit} / Unsplash
            </a>
          )}
        </div>
      )}

      {/* Body content */}
      <BlogBody content={post.content} post={post} />

      {/* Pull quote */}
      <PullQuote text={post.pull_quote} />

      {/* Tags */}
      {(post.tags || []).length > 0 && (
        <div className="blog-reveal" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--blog-divider)' }}>
          {(post.tags || []).map(tag => (
            <span key={tag} style={{ fontSize: '0.7rem', padding: '0.22rem 0.65rem', borderRadius: 9999, background: 'var(--blog-bg2)', color: 'var(--blog-sage)', fontFamily: 'var(--font-blog-body)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Sources */}
      {(post.sources || []).length > 0 && (
        <div className="blog-reveal" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--blog-divider)' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--blog-sage)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem', fontFamily: 'var(--font-blog-body)' }}>Sources</p>
          {(post.sources || []).map((s, i) => (
            <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--blog-accent)', marginBottom: '0.3rem', wordBreak: 'break-all', textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'var(--font-blog-body)' }}>{s}</a>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="blog-reveal" style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--blog-divider)', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--blog-ink)', margin: '0 0 0.625rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          Ready to collab?
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--blog-sage)', margin: '0 0 1.75rem', lineHeight: 1.65, fontFamily: 'var(--font-blog-body)' }}>
          Early access to content-for-stay partnerships is open now.
        </p>
        <a href="/join.html"
          style={{ display: 'inline-block', padding: '0.8rem 2rem', borderRadius: 9999, background: 'var(--blog-ink)', color: 'var(--blog-bg)', fontFamily: 'var(--font-blog-body)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'opacity 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Join the waitlist →
        </a>
      </div>
    </article>
  );
}
