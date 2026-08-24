import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Shared article renderer — used by the public BlogPost page AND the admin
// editor preview, so what admins approve is exactly what readers see.
// Expects the `--blog-*` CSS vars (set via [data-blog-theme] wrapper).

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// Full-width editorial figure (replaces the old floated inline images).
function Figure({ img, animate }) {
  const { t } = useTranslation('blogArticle');
  const [loaded, setLoaded] = useState(false);
  if (!img?.url) return null;
  return (
    <figure
      className={animate ? 'blog-reveal' : undefined}
      style={{ margin: '3rem 0', width: '100%' }}
    >
      <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid var(--blog-divider)' }}>
        <img
          src={img.url} alt={img.alt || ''}
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%', display: 'block', aspectRatio: '3/2', objectFit: 'cover',
            filter: 'grayscale(100%) contrast(1.06)',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 400ms ease, transform 600ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.015)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        />
      </div>
      {(img.alt || img.credit) && (
        <figcaption style={{
          display: 'flex', justifyContent: 'space-between', gap: '1rem',
          padding: '0.5rem 0.125rem 0', fontFamily: 'var(--font-blog-body)',
          fontSize: '0.7rem', color: 'var(--blog-sage)', lineHeight: 1.5,
        }}>
          <span style={{ fontStyle: 'italic' }}>{img.alt || ''}</span>
          {img.credit && (
            img.creditUrl
              ? <a href={img.creditUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blog-sage)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('unsplashCredit', { credit: img.credit })}</a>
              : <span style={{ whiteSpace: 'nowrap' }}>{t('unsplashCredit', { credit: img.credit })}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function PullQuote({ text, animate }) {
  if (!text) return null;
  return (
    <div
      className={animate ? 'blog-reveal' : undefined}
      style={{
        margin: '3.5rem 0', padding: '2.5rem 1.5rem', textAlign: 'center',
        borderTop: '1px solid var(--blog-divider)', borderBottom: '1px solid var(--blog-divider)',
      }}
    >
      <p style={{
        fontFamily: 'var(--font-blog-display)', fontStyle: 'italic', fontWeight: 300,
        fontSize: 'clamp(1.2rem, 3vw, 1.625rem)', lineHeight: 1.45,
        color: 'var(--blog-ink)', letterSpacing: '-0.01em', margin: 0,
      }}>
        “{text}”
      </p>
    </div>
  );
}

// Split content into HTML segments and marker tokens, keeping each segment
// well-formed: markers the model wrapped in <p> tags are unwrapped first
// (the old split left dangling <p> fragments across divs).
function prepareSegments(post) {
  let html = post.content || '';
  html = html.replace(/<p>\s*(%%(?:INLINE_IMAGE_[123]|PULL_QUOTE)%%)\s*<\/p>/gi, '\n$1\n');

  // Legacy posts predate the %%PULL_QUOTE%% marker — slot it before the third
  // section so the quote sits mid-article instead of trailing the post.
  if (!html.includes('%%PULL_QUOTE%%') && post.pull_quote) {
    const h2Positions = [...html.matchAll(/<h2[\s>]/gi)].map(m => m.index);
    if (h2Positions.length >= 3) {
      html = html.slice(0, h2Positions[2]) + '%%PULL_QUOTE%%\n' + html.slice(h2Positions[2]);
    } else {
      html += '\n%%PULL_QUOTE%%';
    }
  }
  return html.split(/(%%INLINE_IMAGE_[123]%%|%%PULL_QUOTE%%)/);
}

// `images` lets the admin editor preview unsaved image swaps; falls back to
// the stored post fields. Shape: { hero, inline1..3: { url, alt, credit, creditUrl } }
export default function BlogArticle({ post, images, pullQuote, animate = false }) {
  const { t, i18n } = useTranslation('blogArticle');
  const imgs = {
    hero: images?.hero ?? { url: post.hero_image_url, alt: post.hero_image_alt, credit: post.hero_image_credit, creditUrl: post.hero_image_credit_url },
    '%%INLINE_IMAGE_1%%': images?.inline1 ?? { url: post.inline_image_1_url, alt: post.inline_image_1_alt, credit: post.inline_image_1_credit },
    '%%INLINE_IMAGE_2%%': images?.inline2 ?? { url: post.inline_image_2_url, alt: post.inline_image_2_alt, credit: post.inline_image_2_credit },
    '%%INLINE_IMAGE_3%%': images?.inline3 ?? { url: post.inline_image_3_url, alt: post.inline_image_3_alt, credit: post.inline_image_3_credit },
  };
  const quote = pullQuote ?? post.pull_quote;
  const [heroLoaded, setHeroLoaded] = useState(false);
  const segments = prepareSegments(post);
  const dateStr = new Date(post.published_at || post.generated_at)
    .toLocaleDateString(i18n.language, { month: 'long', day: 'numeric', year: 'numeric' });
  const fade = (delay) => animate
    ? { animation: 'blogFadeUp 600ms ease-out both', animationDelay: `${delay}ms` }
    : {};

  return (
    <div style={{ fontFamily: 'var(--font-blog-body)' }}>
      {/* Kicker — category · read time · date */}
      <div style={{
        ...fade(80),
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem',
        marginBottom: '1.1rem', fontSize: '0.68rem', fontWeight: 600,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blog-sage)',
      }}>
        <span style={{ color: 'var(--blog-slate)', fontWeight: 700 }}>{post.category}</span>
        {post.reading_time && <><span aria-hidden="true">·</span><span>{t('readTime', { count: post.reading_time })}</span></>}
        <span aria-hidden="true">·</span>
        <span>{dateStr}</span>
      </div>

      {/* Title */}
      <h1 style={{
        ...fade(120),
        fontFamily: 'var(--font-blog-display)', fontWeight: 500,
        fontSize: 'clamp(1.875rem, 5vw, 2.875rem)', color: 'var(--blog-ink)',
        letterSpacing: '-0.02em', lineHeight: 1.12, margin: '0 0 1.1rem',
      }}>
        {post.title}
      </h1>

      {/* Deck */}
      {post.excerpt && (
        <p style={{
          ...fade(160),
          fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--blog-slate)',
          margin: '0 0 1.75rem', maxWidth: '38em',
        }}>
          {post.excerpt}
        </p>
      )}

      {/* Author */}
      <div style={{
        ...fade(180),
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        paddingBottom: '1.75rem', marginBottom: '2.25rem',
        borderBottom: '1px solid var(--blog-divider)',
      }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--blog-bg2)', border: '1px solid var(--blog-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--blog-slate)' }}>B</div>
        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--blog-slate)' }}>{post.author || 'Ben Venturing'}</span>
      </div>

      {/* Hero */}
      {imgs.hero.url && (
        <div style={{
          ...(animate ? { animation: 'blogFadeIn 800ms ease-out both', animationDelay: '220ms' } : {}),
          margin: '0 0 3rem', position: 'relative', overflow: 'hidden',
          borderRadius: 4, border: '1px solid var(--blog-divider)',
        }}>
          <img
            src={imgs.hero.url} alt={imgs.hero.alt || post.title}
            onLoad={() => setHeroLoaded(true)}
            style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.05)', opacity: heroLoaded ? 1 : 0, transition: 'opacity 400ms ease' }}
          />
          {imgs.hero.credit && (
            <a href={imgs.hero.creditUrl || '#'} target="_blank" rel="noopener noreferrer"
              style={{ position: 'absolute', bottom: '0.5rem', right: '0.625rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '0.18rem 0.45rem', borderRadius: 3, textDecoration: 'none' }}>
              {t('unsplashCredit', { credit: imgs.hero.credit })}
            </a>
          )}
        </div>
      )}

      {/* Body — HTML segments interleaved with figures + mid-article pull quote */}
      <div className={`blog-content${animate ? ' blog-reveal' : ''}`}>
        {segments.map((seg, i) => {
          if (seg === '%%PULL_QUOTE%%') return <PullQuote key={i} text={quote} animate={animate} />;
          if (imgs[seg]) return <Figure key={i} img={imgs[seg]} animate={animate} />;
          if (!seg.trim()) return null;
          return <div key={i} className="blog-seg" dangerouslySetInnerHTML={{ __html: seg }} />;
        })}
      </div>

      {/* Tags */}
      {(post.tags || []).length > 0 && (
        <div className={animate ? 'blog-reveal' : undefined} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--blog-divider)' }}>
          {(post.tags || []).map(tag => (
            <span key={tag} style={{ fontSize: '0.7rem', padding: '0.22rem 0.65rem', borderRadius: 9999, background: 'var(--blog-bg2)', color: 'var(--blog-sage)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Sources */}
      {(post.sources || []).length > 0 && (
        <div className={animate ? 'blog-reveal' : undefined} style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--blog-divider)' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--blog-sage)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.6rem' }}>{t('sources')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.5rem' }}>
            {(post.sources || []).map((s, i) => (
              <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--blog-accent)', padding: '0.25rem 0.7rem', borderRadius: 9999, border: '1px solid var(--blog-divider)', textDecoration: 'none' }}>
                {domainOf(s)} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
