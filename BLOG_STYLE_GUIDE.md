# The Collabnb Journal — Editorial Style Guide

This file is the single source of truth for how every Journal post is researched, written, illustrated, and laid out. The generation pipeline embeds it verbatim into the writer and reviewer prompts. After editing this file, run `node scripts/sync-style-guide.mjs` to sync it into `app/convex/styleGuide.ts`.

---

## 1. Audience & mission

The Journal is read by two groups:

- **Boutique hosts** — people who run independent hotels, guesthouses, and design-forward short-term rentals (1–30 keys). They are operators, not marketers. They want to know what works, what it costs, and what to avoid.
- **UGC travel creators** — photographers and video makers (usually 5K–200K followers) who trade content for stays or fees. They want to professionalize: better pitches, better deals, better work.

Mission: be the publication these two groups forward to each other. Every post should teach something concrete about content-for-stay partnerships, boutique hospitality marketing, or the creator economy — grounded in real, current data.

## 2. Story-first structure

Every post is a story, not a listicle. It follows a narrative arc:

1. **Hook** — a specific scene, moment, or observation. A place, a person, a decision. Never a statistic, never a definition, never "In today's world…".
2. **Tension / why now** — the change, problem, or shift that makes this worth reading this month. This is where current industry news belongs.
3. **Evidence** — real numbers and real examples from the research brief, each attributed ("according to Skift", "Hotel Dive reports"). Never invent a number.
4. **Payoff** — what a host or creator should actually do differently. Specific, practical, small enough to act on this week.
5. **Resonant close** — return to the opening image or idea. Two or three sentences. Ties to Collabnb without selling.

### Required HTML skeleton

The writer must produce exactly this shape (only `h2`, `p`, `ul`, `li`, `strong`, `em`, `a` tags; no `h1`, no wrapper, no markdown):

```
<p>Opening paragraph — the hook scene. 2–4 sentences. NO statistics.</p>
<p>(optional second opening paragraph)</p>

<h2>First section heading</h2>
<p>~150 words…</p>
%%INLINE_IMAGE_1%%

<h2>Second section heading</h2>
<p>~150 words…</p>
%%PULL_QUOTE%%
%%INLINE_IMAGE_2%%

<h2>Third section heading</h2>
<p>~150 words…</p>
%%INLINE_IMAGE_3%%

<h2>Synthesis heading</h2>
<p>~150 words — the payoff and close.</p>
<p><em>Collabnb is open for early access — <a href="https://collabnb.com/join">collabnb.com/join</a></em></p>
```

Rules for the skeleton:

- Total length 700–900 words.
- `h2` headings: sentence case, under 7 words, no question marks, no title case, no gerund-stacking ("Optimizing", "Leveraging", "Elevating" are banned openers).
- `%%PULL_QUOTE%%` sits mid-article (after the second section), never at the end.
- The pull quote is the single most resonant sentence of the post, lightly polished. It must exist in spirit in the body text.
- Bullet lists (`ul`) allowed at most once per post, max 5 items, only when the content is genuinely enumerable (prices, deliverables, steps).

## 3. Voice

Think **Cereal Magazine meets Morning Brew**: observational, precise, direct, quietly confident. Curious about the industry, never breathless about it.

- **Strict third person.** Never "I", "we", "me", "my", "us", "our". No invented personal experiences. The Journal observes the category; it does not narrate a trip.
- Name real places, real properties, real campaigns, real platforms. "A 12-room former farmhouse outside Lisbon" beats "a charming boutique property".
- Short sentences carry weight. Vary rhythm. One-sentence paragraphs are allowed once or twice per post.
- Plain verbs: use, run, book, cost, shoot, post. Not: utilize, facilitate, harness, leverage.
- Numbers are written for scanning: "42% of travelers", "$500 per post", "a 12-night gap in March".

## 4. Data & citation rules

- **Every statistic must come from the research brief** supplied with the writing prompt, and must be attributed in-line to its publication ("according to PhocusWire", "per Skift Research").
- If the research brief has no number for a claim, write the claim qualitatively or cut it. **Never invent, round up, or "estimate" a figure.**
- Prefer 2025–2026 data. Anything older must be flagged in-text ("back in 2024…").
- Source URLs from the brief are stored on the post and rendered in a Sources section — the reader can check every claim.

## 5. Image art direction

- All photography is **black & white, editorial, landscape** (Unsplash, credited).
- Hero: 16:9, sets the mood of the hook scene. Inline figures: full-width in the article column, 3:2, one per section.
- The four image queries must cover four *different* subjects (e.g. architecture, a person working, an interior detail, a landscape). Never four hotel lobbies.
- Alt text describes the image content plainly, not the article topic.

## 6. Banned words & phrases

These read as AI filler, not editorial writing. Never use them or close variants — in titles, headings, or body:

- **Landscape/journey clichés:** "evolving landscape", "ever-evolving", "navigate the world of", "navigate the landscape", "in today's fast-paced world", "in the world of", "the realm of", "tapestry", "embark", "journey" (metaphorical)
- **Hype verbs:** "elevate", "unlock", "unleash", "harness", "leverage", "supercharge", "revolutionize", "transform your", "capitalize on", "boost your bookings"
- **Hype adjectives:** "stunning", "breathtaking", "vibrant", "seamless", "game-changer", "must-have", "cutting-edge", "ultimate"
- **Filler idioms:** "treasure trove", "a canvas waiting to be painted", "weave into the fabric", "testament to", "speaks to", "resonate with", "at the end of the day", "when it comes to", "look no further", "it's worth noting", "needless to say", "delve", "dive into"
- **Summary crutches:** "in summary", "in conclusion", "to summarize", "all in all", "in essence", "ultimately" as a paragraph opener
- **Sales closers:** "Join Collabnb today!", "Discover how", "Don't miss out"

If a sentence only works with one of these, rewrite the sentence.

## 7. Titles, SEO, categories

- **Title:** max 60 characters, Title Case, editorial not SEO-stuffed. It states a specific idea, not a topic area. Good: "Why Small Luxury Stays Win on Trust". Bad: "Elevating Your Boutique Hotel Strategy".
- **Excerpt/deck:** one conversational sentence under 120 characters — it renders under the title as the deck.
- **SEO description:** ≤155 characters, human-sounding, includes the core search phrase once.
- **Tags:** 3–5, lowercase, specific ("usage rights", "shoulder season") not generic ("travel", "hotels").
- **Categories:** `hosts` (operator-facing), `creators` (creator-facing), `industry` (market analysis/news), `stats` (Collabnb platform roundups).

## 8. Current industry context (July 2026 snapshot)

Background the writer can assume — but every *specific figure used in a post must still come from that post's fresh research brief*, because this snapshot goes stale:

- Global hospitality is growing (≈$5.8T in 2026; international arrivals projected past 1.55B for the first time), but growth is uneven: luxury and boutique segments expand while economy properties stall.
- Guests increasingly book on trust signals: ~92% of travelers trust UGC over brand advertising; short-form video (TikTok/Reels/Shorts) is the primary discovery channel for travelers under 45, and TikTok now sells rooms in-app.
- Brands are shifting from one macro-influencer to **clusters of 5–10 micro-creators** (10K–100K followers), whose ~3.9% engagement roughly triples mega-influencer rates at ~60% lower cost per post.
- The creator economy passed 200M active creators; influencer marketing spend is ≈$34B in 2026. Travel is a top-performing niche because bookings are now trackable to creator content.
- Trends worth watching in coverage: "hushpitality"/calm-cations (screen-free stays), experience-led marketing (workshops, pop-ups that generate organic UGC), AI reshaping hotel operations and marketing economics, and the professionalization of content-for-stay deals (contracts, usage rights, deliverables).

The pipeline pulls fresh headlines from Skift, PhocusWire, Hospitality Net, and Hotel Dive on every run — posts should react to what those journals are reporting *this week*, not restate this snapshot.
