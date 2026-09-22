import { ConvexHttpClient } from 'convex/browser';

export async function onRequestGet(context) {
  const { env } = context;

  let posts = [];
  try {
    const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
    posts = await client.query('blog:getPublished', { limit: 1000 });
  } catch (err) {
    console.error('sitemap-blog fetch failed:', err.message);
  }

  const urls = posts
    .map((post) => {
      const lastmod = new Date(post.published_at || post.generated_at).toISOString().slice(0, 10);
      return `  <url>\n    <loc>https://www.collabnb.com/blog/${post.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
