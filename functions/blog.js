import { ConvexHttpClient } from 'convex/browser';

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  let posts = [];
  try {
    const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
    posts = await client.query('blog:getPublished', { limit: 20 });
  } catch (err) {
    console.error('blog-list meta fetch failed:', err.message);
  }

  let html;
  try {
    const shellRes = await fetch(`${origin}/app/index.html`);
    html = await shellRes.text();
  } catch (err) {
    console.error('blog-list shell fetch failed:', err.message);
    return new Response('Bad gateway', { status: 502 });
  }

  const title = 'The Journal — Collabnb';
  const description = 'Stories, guides, and industry notes on content-for-stay collaborations between creators and boutique hospitality hosts.';
  const url = 'https://www.collabnb.com/blog';
  const image = 'https://www.collabnb.com/og-image.png';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${url}#blog`,
    name: title,
    description,
    url,
    publisher: { '@type': 'Organization', name: 'Collabnb' },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `https://www.collabnb.com/blog/${post.slug}`,
      datePublished: new Date(post.published_at || post.generated_at).toISOString(),
    })),
  };

  const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>`;

  html = html
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta name="description"[^>]*>/s, '')
    .replace('</head>', metaTags);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
