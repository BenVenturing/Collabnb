# Collabnb — Claude Code context

> See `llms.txt` at the project root for the full project overview, tech stack, and design system.

## Quick reference

- **Stack:** React + Vite + Clerk + Convex + Cloudflare Pages
- **Admin:** `benventuring@gmail.com` → `/admin`
- **Database:** Convex (NOT Supabase)
- **Convex deploy:** `cd app && npx convex deploy` (does NOT happen on git push)
- **Routing:** BrowserRouter — all app routes are `/path` (e.g. `/blog`, `/explore`, `/admin`)
- **Hosting:** Cloudflare Pages at `collabnb.com` (migrated off Vercel) — build with `npm run build` from repo root — this is a TWO-stage build (`vite build` for the marketing site → `dist/`, then `cd app && vite build --outDir ../dist/app` for the React app). Running bare `npx vite build` skips stage 2, ships a `dist/` with no `app/` directory, and every route `_redirects` rewrites to `/app/` (`/admin`, `/explore`, `/profile`, `/inbox`, `/settings`, `/listing/*`, …) dies on the SPA fallback. Deploy with `npx wrangler pages deploy dist --project-name=collabnb` (does NOT happen on git push)

## Collaboration rules

- Fix first, explain after — don't ask before acting on clear requests.
- Short, concise responses. No trailing summaries.
- No unsolicited refactors, abstractions, or feature additions.
- No comments in code unless the WHY is non-obvious.
- Never switch the database to Supabase.
