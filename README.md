# Collabnb

**A collaboration marketplace connecting boutique hospitality hosts with UGC creators and travel influencers.**

Hosts offer free or discounted stays. Creators deliver content — UGC video, Reels, TikToks, photography. No agencies, no bloated fees.

> Launching July 15, 2026 at [collabnb.com](https://collabnb.com)

---

## What it does

- Hosts list their property and describe the content collaboration they want.
- Creators browse listings, apply, and negotiate deliverables directly.
- The platform handles matching, messaging, and collaboration agreements end-to-end.

## For AI tools

See [`public/llms.txt`](./public/llms.txt) for project background. Some launch and hosting details there are historical; use the source and deployment configuration to confirm current behavior.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (HashRouter) |
| Auth | Clerk (Google OAuth) |
| Database | Convex |
| Email | Resend |
| Hosting | Cloudflare Pages (`wrangler.toml`, `public/_redirects`, `functions/`) |

## Project structure

```
/           Marketing site (plain HTML + Tailwind)
app/        React SPA — all product UI lives here
  src/
  convex/   Backend functions and schema
```

## Quality checks

Run `npm run check` to test the Help Center and product preview accessibility,
build both sites, and check built marketing links/assets, canonical hosts,
sitemap entries, and robots configuration. CI runs the same checks on pushes and
pull requests. Tests mock authentication and backend calls; they never submit
messages or create production data. Layout and contrast still need browser review.

The checks also enforce static JavaScript budgets for How It Works (200 kB) and
the calculator (300 kB), including their shared static imports. Mapbox loads on
request, and the public calculator uses only its English translation namespace.
These are bundle budgets, not measured page-load times; external scripts and
runtime requests such as authentication are outside those totals.

The existing canonical host is `https://www.collabnb.com`. The checks validate
metadata consistency; they do not configure DNS or enforce a live host redirect.
