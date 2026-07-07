# Explore ranking algorithm

How the app decides which listings each creator sees on `/explore`, in what order, and when the "% match" badge appears. This is the reference doc — the code lives in `app/src/lib/matchScore.js` (the entire engine) and is wired up in `app/src/pages/Explore.jsx`.

Last updated: 2026-07-07

---

## The one-paragraph version

Every listing gets a **match score from 0–100** per creator, computed client-side when Explore loads. The score blends three signals: **location fit (40%)**, **tag similarity (35%)**, and **profile fit (25%)**. Rows on Explore are built from that score: "Picked for You" is everything scoring ≥ 40 sorted by score, "Near {city}" is everything with a strong location signal, "Trending" is still the hosts' `is_featured` flag, and "All Stays" shows everything. Listings scoring ≥ 60 get a visible "% match" badge on the card. Nothing is ever hidden by the algorithm — search and "All Stays" always show every published listing.

---

## The three signals

### 1. Location fit — 40% of the score

Function: `locationScore()` in `app/src/lib/matchScore.js`

Compared against the listing's `location`, `location_full`, `location_city`, `location_country` fields. The **best** (highest) rule wins:

| Rule | Sub-score |
|---|---|
| Listing is in the creator's **home city** (profile `city`) | 1.00 |
| Listing is in their **home state/region** (profile `region`) | 0.85 |
| Listing is somewhere they've **done a collab before** (from the `collaborations` table) | 0.70 |
| Listing is in their **home country** | 0.55 |
| Anywhere else | 0.25 (baseline — never zero, so far-away listings aren't buried) |

US state names and abbreviations are treated as equal ("North Carolina" profile matches "Asheville, NC" listing) via the `US_STATES` map in the same file.

**"Previous locations worked at"** come from the creator's rows in the `collaborations` table (`collaborations.getByCreator` in `app/convex/collaborations.ts`) — both the `location` string stored on the collab and the location of the original listing when it still exists.

### 2. Tag similarity — 35% of the score

Function: `tagScore()` in `app/src/lib/matchScore.js`

The creator's tag set is built from two sources (in `buildCreatorContext()`):

- **Explicit:** the up-to-5 **Content Niches** picked in Edit Profile (`profiles.niches` in Convex — persisted as of 2026-07-07; previously this picker only saved to localStorage).
- **Inferred:** the `vibe_tags` and `collab_type` of listings the creator has **saved** (heart) and **completed collabs on**.

Each niche is expanded into related keywords via the `NICHE_KEYWORDS` table (e.g. the "Wellness" niche also matches listing tags like "spa", "hot tub", "sauna"). That table is the main tuning knob for match quality — edit it there, no other code changes needed.

Scoring: count how many of the listing's tags (`vibe_tags` + `collab_type` + `property_type`) hit any creator keyword; **3 or more matches = full marks** (`min(1, matches / 3)`).

Cold start: a creator with no niches, no saves, and no collab history gets a **neutral 0.5** here so their feed still works.

### 3. Profile fit — 25% of the score

Function: `profileFitScore()` in `app/src/lib/matchScore.js`

Two parts, weighted 60/40 inside this signal:

- **Tier fit (60%):** listing's `creator_tier` vs the creator's `tier`. Exact match = 1.0; listing has no tier requirement = 0.75; mismatch = 0.4.
- **Familiarity (40%):** has the creator completed a collab of this `collab_type` before? Yes = 1.0; no history at all = 0.5 (neutral); history exists but no match = 0.25.

---

## The formula

```
score = round( (0.40 × location + 0.35 × tags + 0.25 × profileFit) × 100 )
```

Weights live in `WEIGHTS` at the top of `app/src/lib/matchScore.js`.

**Worked example — Ben in Asheville, NC with "Cabins & Stays" + "Mountain" niches, looking at a featured cabin in Asheville tagged `["Cozy", "Mountain views", "Hot tub"]`, collab type Photography, no tier requirement:**

- Location: home city match → 1.00 → contributes 40
- Tags: "Cozy" hits *cabins & stays* keywords, "Mountain views" hits *mountain* → 2 matches → 0.67 → contributes 23
- Profile fit: no tier requirement (0.75) + no collab history yet (0.5) → 0.65 → contributes 16
- **Total ≈ 79 → shows in "Picked for You" near the top, card gets a "79% match" badge**

**Cold-start creator (empty profile, no history):** 0.25 location + 0.5 tags + 0.65 profile ≈ **44**. They still get a "Picked for You" row (44 ≥ 40) ordered by whatever weak signals exist, but no badges (44 < 60) — so we never show embarrassing low percentages.

---

## How the rows are built

Wired in `app/src/pages/Explore.jsx` (search for "Personalized ranking"):

| Row | Rule | Sort |
|---|---|---|
| Trending Now | host-set `is_featured` flag (not personalized) | listing order |
| Picked for You | `_match ≥ 40` (`FOR_YOU_MIN_SCORE`) | score desc, then rating |
| Near {city} | location sub-score `≥ 0.55` (`NEAR_ME_MIN_LOCATION`) — i.e. home country or closer, or a past-collab area | location desc, then score |
| All Stays | everything | listing order |

- The "% match" badge renders in `ListingCard` when `_match ≥ 60` (`MATCH_BADGE_THRESHOLD`). Hovering the badge shows the reasons (e.g. "near asheville · 2 matching tags").
- The "Near" row disappears entirely for creators with no location signal — it no longer shows a fake hardcoded NC/TN/SC/VA/GA list.
- **Search always wins:** the Where/What/When filters and property-type chips are applied *before* scoring, so an explicit search is never overridden by personalization.

## Data flow

```
profiles (city/region/country, niches, tier)      ─┐
collaborations.getByCreator (past collab locations)─┼→ buildCreatorContext() ─┐
saved listings via CollabContext (vibe_tags)       ─┘                         ├→ scoreListings() → _match on every listing → rows + badge
listings.getAll / getSamples (all listings)        ───────────────────────────┘
```

All scoring is **client-side** — no Convex writes, no stored scores. Scores are recomputed on every Explore load, so profile edits (e.g. picking niches) take effect immediately.

## Tuning cheat-sheet

All knobs are constants at the top of `app/src/lib/matchScore.js`:

| Want to… | Change |
|---|---|
| Make location matter more/less | `WEIGHTS` |
| Show badges more/less often | `MATCH_BADGE_THRESHOLD` (60) |
| Make "Picked for You" stricter | `FOR_YOU_MIN_SCORE` (40) |
| Widen/narrow "Near You" | `NEAR_ME_MIN_LOCATION` (0.55) |
| Fix a niche not matching obvious listings | add keywords to `NICHE_KEYWORDS` |
| Change what counts as "nearby" | sub-scores inside `locationScore()` |

## Known limitations / future ideas

- Location matching is **string-based**, not distance-based. Listings have `lat`/`lng`, so true radius scoring is possible later, but it would need geocoding of the creator's profile city.
- Pitches (applied-but-not-completed) aren't used as a signal yet — `pitches.getByCreator` exists if we want "you applied to places like this".
- Everything is per-device-load; if listing volume grows past a few hundred, move scoring into a Convex `forYou` query instead of shipping all listings to the client.
- International regions outside the US only match on exact region-name strings.

## Related user-facing copy

- FAQ: "How does Collabnb decide which listings I see?" in `faq.html` (`faq-11`) — keep it in sync with this doc if weights or behavior change.
