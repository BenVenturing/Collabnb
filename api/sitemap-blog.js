import { ConvexHttpClient } from 'convex/browser';

export default async function handler(req, res) {
  let posts = [];
  try {
    const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
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

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
