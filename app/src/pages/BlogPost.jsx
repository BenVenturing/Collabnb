import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import BlogArticle from '../components/BlogArticle';

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
  const { t } = useTranslation('blogPost');
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const fn = () => setVis(window.scrollY > 200);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <button
      onClick={toggle}
      aria-label={t('toggleThemeAriaLabel')}
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PostSkeleton({ theme }) {
  const bg = theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(25,37,36,0.06)';
  const S = ({ h, w = '100%', mb = '0.75rem' }) => (
    <div style={{ height: h, width: w, borderRadius: 6, background: bg, animation: 'pulse 1.5s ease infinite', marginBottom: mb }} />
  );
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '5rem 2rem 6rem' }}>
      <S h={14} w="35%" mb="1rem" /><S h={52} mb="0.4rem" /><S h={52} w="65%" mb="1.5rem" />
      <S h={360} mb="2.5rem" /><S h={16} /><S h={16} /><S h={16} w="75%" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BlogPost() {
  const { t }              = useTranslation('blogPost');
  const { slug }          = useParams();
  const navigate          = useNavigate();
  const { theme, toggle } = useBlogTheme();
  const post              = useQuery(api.blog.getBySlug, { slug: slug || '' });
  const articleRef        = useScrollReveal(!!post);

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
        <p style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--blog-ink)', marginBottom: '0.5rem' }}>{t('notFound.title')}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--blog-sage)', marginBottom: '1.5rem', fontFamily: 'var(--font-blog-body)' }}>{t('notFound.body')}</p>
        <button onClick={() => navigate('/blog')} style={{ padding: '0.65rem 1.5rem', borderRadius: 9999, border: 'none', background: 'var(--blog-ink)', color: 'var(--blog-bg)', fontFamily: 'var(--font-blog-body)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          {t('notFound.backButton')}
        </button>
      </div>
    </div>
  );

  return wrap(
    <article
      ref={articleRef}
      style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(3rem, 8vw, 6rem) clamp(1.25rem, 4vw, 2rem) 6rem' }}
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
          {t('theJournal')}
        </button>
      </div>

      <BlogArticle post={post} animate />

      {/* CTA */}
      <div className="blog-reveal" style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--blog-divider)', textAlign: 'center', fontFamily: 'var(--font-blog-body)' }}>
        <p style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--blog-ink)', margin: '0 0 0.625rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {t('cta.heading')}
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--blog-sage)', margin: '0 0 1.75rem', lineHeight: 1.65 }}>
          {t('cta.body')}
        </p>
        <a href="/join.html"
          style={{ display: 'inline-block', padding: '0.8rem 2rem', borderRadius: 9999, background: 'var(--blog-ink)', color: 'var(--blog-bg)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'opacity 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {t('cta.button')}
        </a>
      </div>
    </article>
  );
}
