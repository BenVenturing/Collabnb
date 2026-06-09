# Collabnb

**A collaboration marketplace connecting boutique hospitality hosts with UGC creators and travel influencers.**

Hosts offer free or discounted stays. Creators deliver content — UGC video, Reels, TikToks, photography. No agencies, no bloated fees.

> Launching July 1, 2026 at [collabnb.com](https://collabnb.com)

---

## What it does

- Hosts list their property and describe the content collaboration they want.
- Creators browse listings, apply, and negotiate deliverables directly.
- The platform handles matching, messaging, and collaboration agreements end-to-end.

## For AI tools

See [`llms.txt`](./llms.txt) for a structured overview of the codebase, tech stack, business rules, and constraints. That file follows the [llms.txt standard](https://llmstxt.org) and is the best starting point for any AI assistant working in this repo.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (HashRouter) |
| Auth | Clerk (Google OAuth) |
| Database | Convex |
| Email | Resend |
| Hosting | Vercel |

## Project structure

```
/           Marketing site (plain HTML + Tailwind)
app/        React SPA — all product UI lives here
  src/
  convex/   Backend functions and schema
```
