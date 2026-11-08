// Tracked auto-DM links (autoreply.ts): Convex logs the click and picks the page, so visitors only ever see collabnb.com.
export async function onRequestGet({ params, env }) {
  const site = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site');
  const res = await fetch(`${site}/go/${encodeURIComponent(params.token)}`, { redirect: 'manual' });
  const location = res.headers.get('location') || 'https://collabnb.com/join';
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
}
