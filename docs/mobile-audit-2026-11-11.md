# Collabnb mobile audit

Reviewed November 9–11, 2026. Scope: mobile web host/creator navigation, login, listing creation, contracts, and loading. This is a code audit with browser spot checks, not certification of every production workflow. Original findings: **6 P1 and 5 P2 issues**. After the local listing-layout follow-up, **5 P1 and 4 P2 issues remain**; physical-device verification is still pending.

## Requested change completed locally

The host dashboard statistics now have monochrome icons, 20px numbers and 11px labels on phones, reduced padding, and four equal columns that can shrink. Each statistic is a native button with a visible keyboard focus state. Loading placeholders use the same compact dimensions.

- `app/src/pages/HostDashboard.jsx:1095`
- `app/src/index.css:783`
- Safari preview of the actual statistics markup/styles with fixture counts: labels fit at 320px, 390px and 430px. The preview isolates layout; it does not test live dashboard queries.
- App production build passed; scoped `git diff --check` passed. No deployment performed.

## Listing-layout follow-up

Applied locally after the screenshot review:

- Removed the inspiration rail from mobile/tablet rendering, giving all five forms full width.
- Stacked city/country inputs on narrow phones; placed the map behind an optional disclosure and lazy-loaded it on demand.
- Used a viewport-height shell with a separate footer row, safe-area spacing and a scrollable form; simplified the phone background and primary action.
- Added named 44px Back/Help targets and tap/Escape behavior for help.
- Deferred the cookie notice until leaving listing creation so it cannot cover the form or footer.
- Safari confirmed the basics layout at 320/390/430px and optional map/help interaction. Offer, Deliverables and Review were inspected at 390px using local mock authentication. The Safari window closed before the final Payment screenshot; payment completion remains untested.
- Production build and scoped whitespace checks pass. No deployment or payment/publishing action performed.

Findings 1 and 10 below describe the original state and are now addressed locally. The other findings remain open. The score below records the original audit, not a full post-fix reassessment.

## Coverage and limits

| Area | Evidence | Result |
|---|---|---|
| Host dashboard | Existing Benjamin Graeff session, Chrome 400px viewport | Rightmost statistic clipped before the local fix |
| Updated statistics | Safari, isolated source markup, 320/390/430px | All four labels visible |
| Listing builder | All five step components, shared shell, draft context and server validation reviewed; local Safari 390px basics rendered | Inspiration rail visibly squeezes form into half-width |
| Creator and host contracts | Shared builder, role branches, save/send context reviewed; local creator builder rendered at 390px | False success on failed persistence; live transactions not exercised |
| Creator Explore | Local Safari 390px, mock authentication | Search, listing cards and bottom navigation render; complete application/navigation journey not exercised |
| Login | Login/reset/MFA/OAuth code and auth bootstrap reviewed; existing live session opened | Fresh login, MFA and password-reset completion not exercised |
| Performance | Production build output and loading paths | Bundle/precache risks identified; no measured mobile LCP/INP/CLS or cellular timing |
| Live listing route | Chrome session reached a blank page during browser testing | Cause unresolved; do not count this as a confirmed application defect |

No contracts were sent or signed, no listings published, and no payment transactions performed. Localhost uses mock authentication and cannot validate real Clerk login. The existing account has privileged paths, so it cannot establish that ordinary host/creator permissions and billing gates work. Physical iPhone/Android keyboard, notch and background/resume behavior remain untested.

## Provisional technical score

| Dimension | Score / 4 | Reason |
|---|---:|---|
| Accessibility | 1 | Unassociated form labels, unnamed controls and hidden navigation exposed to assistive technology |
| Performance | 2 | Route splitting exists; large entry bundle and broad precache remain |
| Responsive layout | 2 | Dashboard strip fixed locally; listing shell has a responsive cascade defect |
| Theming | 3 | Shared tokens exist; numerous inline colors and effects remain |
| Product anti-patterns | 2 | Repeated glass surfaces, heavy effects and competing floating controls |
| Total | **10 / 20** | Significant work remains before calling mobile seamless |

The visual concern is excess layering and effects in task flows. Preserve the existing identity while simplifying components that obscure controls or cost rendering work. This score is a prioritization aid, not a WCAG conformance result.

## Findings, in priority order

### 1. P1 — Addressed locally: listing form keeps its desktop inspiration column on phones

`app/src/components/host/WizardShell.jsx:174`: `.wizard-rail` has inline `display: flex`, which overrides the stylesheet's `display: none`. The two flex children continue sharing the phone width. All five steps use this shell.

Impact: the main form is squeezed into approximately half the available width, reproduced in local Safari at 390px. Move the display rule entirely into CSS, hide/unmount the rail below the desktop breakpoint, and retest all five steps at 320–430px. Suggested action: `$impeccable adapt`.

### 2. P1 — Contract save/send success does not mean the server accepted it

`app/src/contexts/CollabContext.jsx:360`, `:402`, `:435`; `app/src/components/ContractBuilder.jsx:358`, `:614`: mutations run without being awaited by the UI, failures are caught and discarded, and the builder immediately shows saved/sent success. This affects both role branches.

Impact: a phone losing connectivity can appear to save or send a contract that the other party never receives. Return/await mutation promises, retain a retryable draft, and show explicit pending/error state. Only clear the draft and show send success after confirmed delivery. Verify with rejected mutations and a network interruption; never test by sending to a real counterparty. Suggested action: `$impeccable harden`.

### 3. P1 — Early “Save & exit” drafts fail compensation validation

`app/src/components/host/WizardShell.jsx:38`; `app/convex/listings.ts:493`: the initial draft has zero cash, which the shell sends as undefined. `create` invokes `validateListingFields(..., { requireCompensation: true })` even for `status: "draft"`.

Confirmed by executing the actual extracted validator locally: a draft without compensation throws “Compensation amount is required”; a positive-cash control passes this validator. No database mutation was made.

Impact: a host cannot reliably save an early unfinished listing to the dashboard. Use partial validation for drafts and complete validation for publishing. Preserve browser recovery until server save succeeds. Suggested action: `$impeccable harden`.

### 4. P1 — Production profile-load errors fall back to the demo creator

`app/src/contexts/AuthContext.jsx:227`: missing/failed profile retrieval substitutes `MOCK_CREATOR` in the real Clerk provider.

Impact: a successfully authenticated host can see an incorrect creator identity/role after a backend failure. Keep mock data confined to development; show a recoverable profile-loading error and retry. This finding concerns incorrect client identity/state; it does not establish an authorization bypass. Suggested action: `$impeccable harden`.

### 5. P1 — Card-setup return can leave the listing button asking for another card

`app/src/pages/host/Step5Payment.jsx:83`, `:91`, `:169`: successful verification sets `cardJustSaved`, but `needsCard` continues reading the profile fetched before verification. There is no profile refresh after verification. The success flag hides the note but does not change the action's guard.

Impact: when the profile loads before card verification updates it, a host may see confirmation and still be sent back to card setup. Refresh the profile after successful verification, wait for that result, and derive the action from verified payment-method state. This race is established by code review; no live card setup was run. Suggested action: `$impeccable harden`.

### 6. P1 — Form and navigation accessibility gaps

`app/src/components/ContractBuilder.jsx:724`: visible labels are not associated with their inputs. `app/src/components/host/Step1Basics.jsx:41`: labels are plain divs. `app/src/components/host/WizardShell.jsx:116`: icon controls lack names. `app/src/components/AppNav.jsx:400`: the closed menu retains dialog semantics and links while CSS hides it visually through opacity/pointer events.

Impact: screen-reader and keyboard users encounter unnamed inputs and hidden navigation. Add associated labels, accessible control names, focus indicators, and conditionally render or make closed menus inert. Check WCAG 1.3.1, 2.4.3 and 4.1.2 with actual assistive technology. Review checklist: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Suggested action: `$impeccable harden`.

### 7. P2 — Phone photo uploads require manual conversion/compression

`app/src/pages/host/Step1Basics.jsx:79`: the listing uploader rejects HEIC and files above the limit before any conversion. The existing `app/src/lib/imagePrep.js` helper is not used here.

Impact: some iPhone library photos and large camera photos cannot be added directly. Integrate supported conversion/resizing, preserve per-file errors, and provide a clear fallback where HEIC decoding is unavailable. Also disable advancing while upload work is in progress so navigation does not strand the upload UI. Suggested action: `$impeccable harden`.

### 8. P2 — Login loses the intended destination and sends ordinary hosts to Explore

`scripts/login.js:39`: non-admin login returns `/explore`; Google sign-in also specifies `/explore`. `app/src/App.jsx:244`: the signed-out redirect does not preserve the requested route.

Impact: hosts land in the creator marketplace, and contract/listing deep links lose their destination after login. Preserve a validated same-origin return path, otherwise route by the authenticated profile's role. Suggested action: `$impeccable onboard`.

### 9. P2 — Loading is split by route but still expensive on mobile

November 11 app build: entry JS **1,353.23 kB / 427.26 kB gzip**, Mapbox chunk **1,866.88 kB / 518.42 kB gzip**, service-worker precache **82 entries / 6,786.83 KiB**. These are build sizes, not measured transfer times or all first-render requests.

`app/src/i18n/index.js:9` eagerly includes all language namespaces; `app/vite.config.js` uses broad default precaching. Lazy-load nonselected translations and expensive optional tools, review precache contents, and measure production cold/warm loads on throttled mobile hardware. Suggested action: `$impeccable optimize`.

### 10. P2 — Addressed locally: wizard help and footer need touch-specific treatment

`app/src/components/host/WizardShell.jsx:128`: help opens through mouse enter/leave, with an 18px button and no explicit click toggle. The shell uses `100vh` and the fixed footer has no safe-area inset.

Impact: help is unreliable with touch; browser chrome, keyboards and home indicators need explicit verification. Use tap/focus controls, accessible names, 44px hit regions, `100dvh`, and safe-area-aware footer spacing. Suggested action: `$impeccable adapt`.

### 11. P2 — Reduced motion is incomplete in core app flows

`app/src/App.jsx:133` and loading-screen keyframes: confetti/typewriter and recurring loader motion lack a reduced-motion alternative. The global reduced-motion rule in `app/src/index.css` is limited to blog reveals.

Impact: the preference does not protect motion-sensitive users across login/loading flows. Provide immediate or static alternatives and avoid delaying access for a celebration. Suggested action: `$impeccable animate`.

## Existing strengths

- Route pages and PDF tooling are lazy-loaded.
- Mobile navigation has role-specific destinations and safe-area positioning.
- Listing fields persist locally; listing publish errors have visible feedback.
- Login uses email/password autocomplete, password visibility controls and one-time-code inputs.
- Upload batches preserve successful files when another file fails.
- Contract updates synchronize server-side signature resets into the builder.

## Next verification pass

Fix listing-shell layout and draft saving first, then contract persistence and profile/card-return error handling. Finish with `$impeccable polish` and repeat the audit. Use ordinary host and creator test accounts for fresh login, expiry/relogin, role switching, all five listing steps, creator listing preview/application, contract draft/reload and simulated send failures. Include real iPhone Safari and Android Chrome, slow/offline transitions, keyboard appearance and text scaling.
