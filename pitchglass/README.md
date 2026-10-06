# Pitchglass (MVP)

Your pitching agent for creators: finds projects, drafts pitches in your voice, sends only what you approve.

This MVP is the web app only — no backend, no login. Data lives in your browser (localStorage).

## Run it

```bash
cd pitchglass
npm install
npm run dev        # http://localhost:5190
```

## What works

- **Opportunities** — "Run agent" pulls sample briefs (fictional, labelled "Sample"); paste any real link to add it.
- **Fit score** — matches each brief against the niches and location in your profile.
- **Approvals** — template draft in your details, edit it, voice check flags banned words and unfilled placeholders.
- **Tracker** — Found → Drafted → Approved → Sent → Replied → Booked.
- **Profile & voice** — the only source of facts for drafts.
- **Connect** — shows the Claude Code + MCP flow for production (not live yet).

## Not in the MVP

Real sources (Collabnb, Instagram, Reddit, X, casting sites), Claude-written drafts, sending, the hosted MCP server, accounts.
