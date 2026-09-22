import { ConvexHttpClient } from 'convex/browser';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || '');
  const origin = new URL(request.url).origin;

  let post = null;
  try {
    const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
    post = await client.query('blog:getBySlug', { slug });
  } catch (err) {
    console.error('blog-post meta fetch failed:', err.message);
  }

  let html;
  try {
    const shellRes = await fetch(`${origin}/app/index.html`);
    html = await shellRes.text();
  } catch (err) {
    console.error('blog-post shell fetch failed:', err.message);
    return new Response('Bad gateway', { status: 502 });
  }

  let status = 200;

  if (post && post.status === 'published') {
    const title = `${post.title} — Collabnb Journal`;
    const description = post.seo_description || post.excerpt || '';
    const url = `https://www.collabnb.com/blog/${post.slug}`;
    const image = post.hero_image_url || 'https://www.collabnb.com/og-image.png';
    const publishedTime = post.published_at
      ? new Date(post.published_at).toISOString()
      : new Date(post.generated_at).toISOString();

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      image,
      datePublished: publishedTime,
      author: { '@type': 'Organization', name: post.author || 'Collabnb' },
      publisher: {
        '@type': 'Organization',
        name: 'Collabnb',
        logo: { '@type': 'ImageObject', url: 'https://www.collabnb.com/assets/favicon.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    };

    const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>`;

    html = html
      .replace(/<title>.*?<\/title>/s, '')
      .replace(/<meta name="description"[^>]*>/s, '')
      .replace('</head>', metaTags);
  } else {
    status = 404;
  }

  const headers = { 'Content-Type': 'text/html; charset=utf-8' };
  if (status === 200) {
    headers['Cache-Control'] = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
  }

  return new Response(html, { status, headers });
}
