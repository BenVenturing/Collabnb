---
name: project-apply
description: Apply to creator/brand projects — casting calls (projectcasting.com, Backstage, etc.), influencer/UGC campaign briefs, Google Forms, Typeform/Tally, and Instagram DMs — by reading the brief, writing answers from the applicant profile in their brand voice, and filling them in the user's own logged-in browser. Always stops for approval before submitting or sending. Trigger on "apply to this", "apply for this project/casting/campaign", "fill this form", "DM them about this", or a pasted casting/job/reel link with intent to apply.
---

# project-apply

Reads a project brief, drafts an application in the applicant's voice, fills it
in the user's real browser session, and hands back for approval before anything
is sent.

## Requirements

Browser control runs on the user's machine, not in a cloud sandbox (casting
sites and Instagram need the user's logins, and cloud egress usually blocks them).

- Preferred: the **ego-browser** skill from
  [citrolabs/ego-lite](https://github.com/citrolabs/ego-lite) — shares the user's
  logged-in Chrome state. User installs with `npx skills add citrolabs/ego-lite`
  (macOS). Follow that skill's API for every browser action.
- Fallback: Claude in Chrome, or any browser MCP the session has.
- No browser available → run steps 1–4 only and return the drafts as copy-paste text.

## Files

- `profile.md` (this folder) — applicant facts: name, handles, follower counts,
  niches, audience, locations/availability, rates, portfolio links, past brand
  work, measurements/sizes if casting asks. **Only source of facts.**
- `voice.md` (this folder) — brand voice rules and sample lines.

If either is missing or a field a form needs is blank, ask the user once for
the missing facts, then save them to the file so it is never asked again.

## Workflow

1. **Read the brief.** Open the link in the browser (or take pasted text).
   Extract: brand, project type, deliverables, dates, location, pay/comp,
   requirements (followers, niche, age, location), deadline, and *how to apply*
   (on-site form, external Google Form, email, "DM us", comment keyword).
   For an Instagram post/reel: poster handle, caption, the call to action.
2. **Fit check.** Compare requirements to `profile.md`. If there is a hard
   mismatch (location, follower floor, dates), tell the user before drafting.
3. **Draft.** Write every answer from `profile.md` in `voice.md`'s voice.
   - Lead with why *this* project fits — reference a specific detail of the brief.
   - Concrete numbers and past work over adjectives.
   - Match the channel: form answers are complete but tight; IG DMs are 3–5
     short lines, no links unless asked, one clear ask.
   - Never invent stats, clients, or availability.
4. **Show the drafts** to the user as a single list: field → answer, plus the DM.
5. **Fill.** In the browser, fill each field, upload media from paths in
   `profile.md` when asked, screenshot the filled form.
6. **Stop before submit/send.** Show the screenshot and wait for an explicit
   "send"/"submit". Only then click submit or send the DM.
7. **Log.** Append a line to `applications.md` in this folder:
   `YYYY-MM-DD | brand | project | link | channel | status`.

## Rules

- One application per project; check `applications.md` for a prior entry first.
- Never submit, send, pay, or accept terms without the user's explicit go-ahead
  for that specific application.
- Never enter passwords or payment details; if a login wall appears, hand the
  browser to the user.
- Stop if a site shows a CAPTCHA or rate-limit warning — do not retry in a loop.
