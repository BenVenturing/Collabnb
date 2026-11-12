---
name: collabnb-find-instagram
description: |
  Finds the real Instagram handle for Collabnb hotel prospects (whose CRM key is a synthetic "hc-…" instagram_handle). It guesses handle variants and checks each profile's og:title from inside Ben's logged-in Chrome tab, then saves confirmed handles as ig_handle. Trigger on "find their Instagram", "find IG handles for these hotels", "match hotels to Instagram accounts".
---

# Collabnb — find a hotel's real Instagram handle

## Prerequisite: the logged-in Chrome

1. Load the claude-in-chrome tools, then call `tabs_context_mcp`.
2. If two browsers are connected, ask Ben which one to use. Or open `instagram.com/ben.vibing/`
   in each one: the right browser shows **"Edit profile"** (the benventuring profile).
3. Keep one instagram.com tab open in that browser. Every fetch runs from inside that tab,
   so it uses the session's cookies.

## Variants per hotel

Build variants from `display_name` and `location`, in lowercase with ASCII only:
- the name with no spaces: `thekayonjungleresort`
- without "the": `kayonjungleresort`
- with "bali" appended: `kayonjungleresortbali`
- without the area word (Ubud, Canggu, Seminyak…): `alila` from "Alila Ubud"
- dotted and underscored versions of the best two: `kayon.jungle.resort`, `kayon_jungle_resort`

Remove duplicates. Use about 5 to 8 variants per hotel.

## Loop (run in the background, then poll)

The browser tool times out at 45 seconds, so never `await` the whole batch in one call.
Start the loop with `javascript_tool`, then poll the results with short follow-up calls.

```js
window.__ig = { done: false, results: [], stopped: null };
(async (jobs) => {                       // jobs: [{key, name, variants:[...]}], max 50 hotels
  for (const j of jobs) for (const v of j.variants) {
    const r = await fetch(`/${v}/`, { credentials: "include" });
    if (r.status === 429) { window.__ig.stopped = "429"; window.__ig.done = true; return; }
    const html = r.ok ? await r.text() : "";
    const t = (html.match(/property="og:title" content="([^"]*)"/) || [])[1] || "";
    window.__ig.results.push({ key: j.key, hotel: j.name, variant: v, status: r.status, title: t });
    await new Promise(s => setTimeout(s, 1500 + Math.random() * 1000));
  }
  window.__ig.done = true;
})(JOBS);
"started";
```

To poll, run `JSON.stringify({done: __ig.done, stopped: __ig.stopped, n: __ig.results.length})`
every 30 seconds or so. When `done` is true, read `__ig.results`.
- Use batches of **50 hotels**. Wait for one batch to finish before starting the next.
- If the loop stops with **429**, stop for this session and tell Ben. Don't retry straight away.

## Accept / reject

og:title looks like `Full Name (@handle) • Instagram photos and videos`.
- **Accept** only if the full name clearly matches the hotel, meaning the distinctive name
  words line up (location words alone are not enough).
- **Reject** these:
  - a 404 or an empty full name
  - a different business
  - a person's account
  - look-alikes: fan pages, "_official" copies, booking agents, a sister property of the same group
- **Uncertain:** a partial match, or two variants that both look plausible. Don't save these.
  List them for Ben as `hotel → @candidate ("Full Name")`.

## Save

Write the accepted handles with **collabnb-crm-fill**, as rows of
`{ instagram_handle: "<hc-… key>", ig_handle: "<real handle>" }`.
Report: hotels checked, accepted, rejected, the uncertain list, and the `updated` count.
