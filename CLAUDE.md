# Collabnb — Claude Code context

> See `llms.txt` at the project root for the full project overview, tech stack, and design system.

## Quick reference

- **Stack:** React + Vite + Clerk + Convex + Vercel
- **Admin:** `benventuring@gmail.com` → `/app/#/admin`
- **Database:** Convex (NOT Supabase)
- **Convex deploy:** `cd app && npx convex deploy` (does NOT happen on git push)
- **Routing:** HashRouter — all app routes are `/#/...`
- **Hosting:** Vercel at `collabnb.com`; two Vite builds (root `dist/`, app `dist/app/`)

## Collaboration rules

- Fix first, explain after — don't ask before acting on clear requests.
- Short, concise responses. No trailing summaries.
- No unsolicited refactors, abstractions, or feature additions.
- No comments in code unless the WHY is non-obvious.
- Never switch the database to Supabase or the router to BrowserRouter.
