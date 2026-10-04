# Collabnb — Claude Code context

> See `llms.txt` at the project root for the full project overview, tech stack, and design system.

## Quick reference

- **Stack:** React + Vite + Clerk + Convex + Cloudflare Pages
- **Admin:** `benventuring@gmail.com` → `/admin`
- **Database:** Convex (NOT Supabase)
- **Convex deploy:** `cd app && npx convex deploy` (does NOT happen on git push)
- **Routing:** BrowserRouter — all app routes are `/path` (e.g. `/blog`, `/explore`, `/admin`)
- **Hosting:** Cloudflare Pages at `collabnb.com` (migrated off Vercel) — build with `npx vite build` from repo root (outputs `dist/`), deploy with `npx wrangler pages deploy dist --project-name=collabnb` (does NOT happen on git push)

## Collaboration rules

- Fix first, explain after — don't ask before acting on clear requests.
- Short, concise responses. No trailing summaries.
- No unsolicited refactors, abstractions, or feature additions.
- No comments in code unless the WHY is non-obvious.
- Never switch the database to Supabase.
