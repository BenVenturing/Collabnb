# Collabnb Journal — Blog Design Spec

> Editorial-minimal design system for The Collabnb Journal.
> Audience: boutique hotel owners, Airbnb superhosts, UGC travel creators.
> Reference aesthetic: UNO Editorial, Farnam Street, The Marginalian — restraint, whitespace, content-first.

---

## Writing Voice & Rules (non-negotiable)

These rules govern every generated journal post. They are enforced in the generation
prompt (`app/convex/blog.ts` → `generatePost`) and must stay in sync with this file.

1. **Never first person.** No "I", "we", "me", "my", "us", "our", "ours" — anywhere.
   The author has not personally stayed anywhere; never invent personal experience.
2. **Third-person overview, not a diary.** Every post is written as an editorial
   overview, analysis, or highlight *about* boutique hotels and small luxury stays in
   general — observing the category, never narrating a personal trip. Writing it as a
   personal blog is dishonest and wrong.
3. **Title is Title Case.** Capitalize the first word and every major word
   (e.g. "Why Small Luxury Stays Win on Trust"). Section `h2` headers stay sentence case.
   A deterministic `toTitleCase()` backstop also runs on the title before saving.
4. **Banned words & phrases** — never use these or close variants; they read as
   low-quality AI filler:
   - Summary crutches: *in summary, in conclusion, to summarize, as a final thought,
     at the end of the day, all in all, in essence, ultimately* (as a paragraph opener)
   - Empathy filler: *sympathize, empathize, resonate with, speaks to*
   - AI tells: *delve, dive into, navigate the world/landscape of, tapestry, realm,
     elevate, embark, unleash, unlock, harness, leverage, seamless, game-changer,
     testament to, in today's fast-paced world, when it comes to, look no further,
     it's worth noting, needless to say*
   - Stacked hype: *stunning, breathtaking, must-have, ultimate guide*

   Write plainly and concretely. If a sentence only works with a banned word, rewrite it.

---

## Design Principles

1. **Content first** — typography does the work; ornament only where it earns its keep
2. **Generous whitespace** — let the eye rest; sections breathe
3. **Hierarchy is everything** — one focal element per viewport
4. **Warm minimalism** — bone/cream (#EFECE9) grounds every surface; never cold white
5. **Credibility through restraint** — no gradients on body copy, no shadow stacking, no emoji in headings

---

## Color Palette

All tokens inherit from the HAZY design system.

| Role            | Token        | Hex       |
|-----------------|--------------|-----------|
| Background      | `--bone`     | #EFECE9   |
| Primary text    | `--ink`      | #192524   |
| Secondary text  | `--slate`    | #3C5759   |
| Muted text      | `--sage`     | #959D90   |
| Hairline        | `--stone`    | #D0D5CE   |
| Mint accent     | `--mint`     | #D1EBDB   |

### Category Colors

| Category  | Hex     | Use                    |
|-----------|---------|------------------------|
| creators  | #7B68C8 | Creators / UGC         |
| hosts     | #4A9B7F | Hosts / property       |
| industry  | #3C5759 | Industry / trends      |
| stats     | #D4A843 | Platform data / stats  |

---

## Typography

Fonts: **Cabinet Grotesk** (display/headings) + **Satoshi** (body/UI)

| Element              | Font             | Size              | Weight | Notes                  |
|----------------------|------------------|-------------------|--------|------------------------|
| Journal title        | Cabinet Grotesk  | clamp(2.5rem,5vw,4rem) | 900 | letter-spacing -0.03em |
| Featured post title  | Cabinet Grotesk  | clamp(1.75rem,3vw,2.5rem) | 800 | |
| Card title           | Cabinet Grotesk  | 1.1rem            | 700    | |
| Post h1              | Cabinet Grotesk  | clamp(2rem,4vw,3rem) | 900 | |
| Post h2              | Cabinet Grotesk  | 1.5rem            | 800    | margin-top 2.5rem      |
| Body / excerpt       | Satoshi          | 1rem              | 400    | line-height 1.8        |
| Meta / labels        | Satoshi          | 0.72rem           | 600    | UPPERCASE, tracked     |
| Tags                 | Satoshi          | 0.7rem            | 400    | |

---

## Spacing

- Max content width: **1100px** (blog index), **700px** (post reading column)
- Section padding: **4rem 1.5rem** mobile → **5rem 2rem** desktop
- Card gap: **1.5rem**
- Between featured and grid: **3rem**

---

## Components

### Blog Index Page

```
┌─────────────────────────────────────────────────────────┐
│  THE COLLABNB JOURNAL                                   │
│  Insights for hosts & creators building the future...   │
│  ─────────────────────────────────────────────────────  │
│  [ Search posts... ]  All · Creators · Hosts · Industry │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ FEATURED                          [LARGE IMAGE]   │  │
│  │ Category pill                                     │  │
│  │ Big Title                                         │  │
│  │ Excerpt text                      X min read →   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ [Image]  │  │ [Image]  │  │ [Image]  │             │
│  │ Category │  │ Category │  │ Category │             │
│  │ Title    │  │ Title    │  │ Title    │             │
│  │ Excerpt  │  │ Excerpt  │  │ Excerpt  │             │
│  │ X min    │  │ X min    │  │ X min    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Post Card

- Border-radius: 1rem
- Background: rgba(255,255,255,0.7) with glass blur
- Image: 100% width, 200px tall, object-fit cover
- Category pill: 0.65rem, uppercase, colored bg tint
- Title: Cabinet Grotesk 700, 1.05rem
- Excerpt: 2-line clamp, Satoshi 0.82rem, `--sage`
- Hover: translateY(-3px), shadow deepens

### Featured Post Card

- Background: white
- Two-column on desktop (text left, image right)
- Image: right side, full height of card, object-cover
- "FEATURED" label above category pill
- Title: larger (~1.75rem)
- Excerpt: longer (3 lines)
- Arrow → button on hover

### Blog Post

```
┌─────────────────────────────────────────────────────────┐
│  ← The Journal                                          │
│  Category  ·  X min read  ·  Date                      │
│                                                         │
│  BIG TITLE                                              │
│  GOING HERE                                             │
│                                                         │
│  Excerpt in a slightly larger italic tone...            │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           HERO IMAGE (full-width)               │   │
│  │                            Photo: Name/Unsplash  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Body content (65ch max, generous line-height)          │
│                                                         │
│  ## Section heading                                     │
│                                                         │
│  Paragraph text reads at exactly the right width        │
│  for sustained reading without fatigue.                 │
│                                                         │
│  #tag  #tag  #tag                                      │
│  ─────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Ready to collab?    [Join the Waitlist →]      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Search + Filter

- Search: live client-side filter on title + excerpt + tags (no API round-trip)
- Filter pills: All / Creators / Hosts / Industry / Stats — toggle active state
- Combined: search within the active category
- Empty state: warm message + "clear filters" link

---

## Animation

- Page entrance: `opacity 0→1, translateY 16px→0` over 400ms `ease-out-expo`
- Card hover: 180ms `ease-out`
- Category pill: 120ms background crossfade
- No parallax, no scroll-triggered animations — content loads complete

---

## Marketing Site Integration

- Nav link: "Journal" added between FAQ and Pricing on all marketing HTML pages
- Points to: `/blog`
- Mobile overlay nav: same insertion point
