// Automated listing-reminder drip for ALREADY-VERIFIED, fully-registered
// hosts who still haven't created a listing. Distinct from
// gates.checkIncompleteApplications, which nudges hosts during the
// application/onboarding phase and stops as soon as they're verified —
// this picks up right where that one leaves off. Off by default; flip the
// "listing_reminders_enabled" admin_settings key to "true" to turn it on
// (see AdminSettings.jsx).
import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminAction } from "./lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
const STEP_DELAYS_MS = [3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS]; // index 0 -> step 1, etc.

function hotelName(p: { business_name?: string | null; full_name?: string | null }): string {
  return (p.business_name || p.full_name || "your property").trim();
}

// Each step's copy, structured (not a single text blob) so reminderEmailHtml
// can render it in the same branded card/highlight-box/CTA-button language
// as sendWelcomeEmail in email.ts, with the same hero photo hostWelcomeEmail
// uses (already deployed to /email/host-outreach/).
export const LISTING_REMINDER_STEPS: {
  step: number;
  subject: (name: string) => string;
  heading: (name: string) => string;
  lead: (name: string) => string;
  highlight: string;
  ctaLabel: string;
}[] = [
  {
    step: 1,
    subject: () => "Finish setting up your Collabnb listing",
    heading: () => "You're almost there!",
    lead: (name) =>
      `We noticed ${name} joined Collabnb as a host but hasn't created a listing yet. It only takes a few minutes, and once it's live, creators can start reaching out for collaborations.`,
    highlight: "📬 Need a hand, or have questions about what to put in it? Just reply to this email and we'll help you get set up.",
    ctaLabel: "Create your listing",
  },
  {
    step: 2,
    subject: (name) => `Still want ${name} listed on Collabnb?`,
    heading: () => "A quick follow-up",
    lead: (name) =>
      `Just floating this back to the top of your inbox in case it got buried — ${name}'s account is all set up, but there's no listing live yet, so creators can't find you.`,
    highlight: "✨ It's free, takes just a few minutes, and you can edit it anytime.",
    ctaLabel: "Finish your listing",
  },
  {
    step: 3,
    subject: () => "Last note about your Collabnb listing",
    heading: () => "No pressure — just leaving the door open",
    lead: (name) =>
      `Totally understand if now isn't the right time. ${name}'s spot on Collabnb is still here whenever it's useful — free, no catch.`,
    highlight: "🙌 Either way, wishing you all the best.",
    ctaLabel: "Create your listing",
  },
];

const CREATE_LISTING_URL = "https://www.collabnb.com/host/listings/create";
const HERO_IMG = "https://www.collabnb.com/email/host-outreach/hero-boutique-stays.jpg";

// Mirrors sendWelcomeEmail's card/highlight/CTA language in email.ts, with
// the hero cover photo hostWelcomeEmail.ts uses up top instead of a plain
// gradient header band.
function reminderEmailHtml(heading: string, lead: string, highlight: string, ctaLabel: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#EFECE9; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(25,37,36,0.07); }
  .hero { display:block; width:100%; height:auto; }
  .body { padding:32px 40px 32px; }
  h1 { font-size:1.4rem; font-weight:800; color:#241F19; margin:0 0 12px; line-height:1.25; }
  p { font-size:0.9375rem; color:#6B6055; line-height:1.65; margin:0 0 16px; }
  .highlight { background:#F7F2EA; border-left:3px solid #B08968; border-radius:0 12px 12px 0; padding:14px 18px; margin:20px 0; }
  .highlight p { margin:0; font-size:0.875rem; color:#6B4F3A; font-weight:500; }
  .btn { display:inline-block; background:linear-gradient(135deg,#241F19,#4A3B2E); color:#fff !important; text-decoration:none; padding:13px 28px; border-radius:12px; font-size:0.9rem; font-weight:700; letter-spacing:0.01em; margin:8px 0 0; }
  .sign { font-size:0.875rem; color:#6B6055; margin:24px 0 0; }
  .footer { padding:20px 40px 28px; text-align:center; }
  .footer p { font-size:0.78rem; color:#9C9182; margin:0; line-height:1.6; }
  @media (max-width:560px) {
    .body, .footer { padding-left:24px; padding-right:24px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <img class="hero" src="${HERO_IMG}" alt="Collabnb" width="560" />
    <div class="body">
      <h1>${heading}</h1>
      <p>${lead}</p>
      <div class="highlight"><p>${highlight}</p></div>
      <a href="${CREATE_LISTING_URL}" class="btn">${ctaLabel} →</a>
      <p class="sign">Benjamin<br/>Founder, Collabnb</p>
    </div>
    <div class="footer">
      <p>Questions? Reply to this email or reach us at <a href="mailto:hello@collabnb.com" style="color:#5C5347;">hello@collabnb.com</a></p>
      <p style="margin-top:6px;">© 2026 Collabnb · You're receiving this because you're a Collabnb host.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

function reminderEmailText(lead: string, highlight: string, ctaLabel: string): string {
  return `${lead}\n\n${highlight}\n\n${ctaLabel}: ${CREATE_LISTING_URL}\n\nBenjamin\nFounder, Collabnb`;
}

// ─── Actual send (Resend) ──────────────────────────────────────────────────
export const sendListingReminderEmail = internalAction({
  args: { to: v.string(), step: v.number(), name: v.string() },
  handler: async (_ctx, { to, step, name }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;
    const def = LISTING_REMINDER_STEPS.find((s) => s.step === step);
    if (!def) return;

    const lead = def.lead(name);
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Collabnb <hello@collabnb.com>",
          to: [to],
          subject: def.subject(name),
          html: reminderEmailHtml(def.heading(name), lead, def.highlight, def.ctaLabel),
          text: reminderEmailText(lead, def.highlight, def.ctaLabel),
        }),
      });
    } catch (err) {
      console.warn("Listing reminder email send failed:", err);
    }
  },
});

// ─── Daily cron entry point ─────────────────────────────────────────────────
// Candidates: verified, fully-registered hosts, no listings yet, haven't
// opted out of marketing mail, next step's day-threshold has passed. Mirrors
// gates.checkIncompleteApplications' scheduler-then-patch shape — the send
// itself runs as a separately-scheduled action since mutations can't fetch().
export const checkListingReminders = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    if (!dryRun) {
      const setting = await ctx.db
        .query("admin_settings")
        .withIndex("by_key", (q) => q.eq("key", "listing_reminders_enabled"))
        .first();
      if (setting?.value !== "true") return { nudged: 0, enabled: false };
    }

    const now = Date.now();
    const [profiles, listings] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("listings").collect(),
    ]);
    const hostIdsWithListings = new Set(listings.map((l) => l.host_id).filter(Boolean));

    const preview: any[] = [];
    let nudged = 0;
    for (const p of profiles) {
      if (p.role !== "host" || p.is_verified !== true || !p.clerk_registered) continue;
      if (!p.email || p.notification_prefs?.marketing === false) continue;
      if (hostIdsWithListings.has(String(p._id))) continue;

      const doneStep = p.listing_reminder_step ?? 0;
      if (doneStep >= STEP_DELAYS_MS.length) continue; // sequence complete

      const age = now - p._creationTime;
      if (age < STEP_DELAYS_MS[doneStep]) continue; // next step not due yet
      const nextStep = doneStep + 1;

      if (dryRun === true) {
        preview.push({ email: p.email, step: nextStep, ageDays: Math.floor(age / DAY_MS) });
        nudged++;
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.listingReminders.sendListingReminderEmail, {
        to: p.email,
        step: nextStep,
        name: hotelName(p),
      });
      await ctx.db.patch(p._id, { listing_reminder_step: nextStep, listing_reminder_last_sent_at: now });
      nudged++;
    }

    return dryRun ? { nudged, preview } : { nudged, enabled: true };
  },
});

// ─── Admin test send — one address, any step, no tracking touched ─────────
export const sendListingReminderTest = action({
  args: { to: v.string(), step: v.number() },
  handler: async (ctx, { to, step }) => {
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);
    const def = LISTING_REMINDER_STEPS.find((s) => s.step === step);
    if (!def) throw new Error(`Unknown step ${step}`);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured in Convex environment.");

    const name = "your property";
    const lead = def.lead(name);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Collabnb <hello@collabnb.com>",
        to: [to],
        subject: `[TEST] ${def.subject(name)}`,
        html: reminderEmailHtml(def.heading(name), lead, def.highlight, def.ctaLabel),
        text: reminderEmailText(lead, def.highlight, def.ctaLabel),
      }),
    });
    if (!res.ok) throw new Error(`Resend returned ${res.status}`);
    return { sent: true };
  },
});
