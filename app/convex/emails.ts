import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { BASE_URL, TRUSTPILOT_BCC, renderTemplate, sendViaResend, layout, callout, button, heroChip } from "./emailCopy";
import { requireAdminAction } from "./lib/auth";
import { sanitizeRichHtml } from "./lib/sanitize";

// All copy below is editable in Admin → Emails → Templates (overrides stored in
// the email_templates table); defaults live in emailCopy.ts.

async function sendFromTemplate(
  ctx: any,
  templateId: string,
  to: string,
  vars: Record<string, string>,
  buttonHref?: string,
  bcc?: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const t = await ctx.runQuery(internal.emailTemplates.getCopy, { templateId });
  const { subject, html } = renderTemplate(t, vars, buttonHref);
  await sendViaResend(apiKey, to, subject, html, bcc);
}

// ─── Welcome (waitlist signup) ────────────────────────────────────────────────

export const sendWelcomeEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string() },
  handler: async (ctx, { email, full_name, role }) => {
    const firstName = full_name.split(" ")[0];
    const templateId = role === "host" ? "welcome_host" : "welcome_creator";
    await sendFromTemplate(ctx, templateId, email, { firstName });
  },
});

// ─── Finish signup nudge (email-only account, no login yet) ───────────────────

export const sendFinishSignupEmail = internalAction({
  args: { email: v.string(), full_name: v.string() },
  handler: async (ctx, { email, full_name }) => {
    const firstName = full_name.split(" ")[0];
    await sendFromTemplate(ctx, "finish_signup", email, { firstName });
  },
});

export const sendFinishSignupFollowupEmail = internalAction({
  args: { email: v.string(), full_name: v.string() },
  handler: async (ctx, { email, full_name }) => {
    const firstName = full_name.split(" ")[0];
    await sendFromTemplate(ctx, "finish_signup_followup", email, { firstName });
  },
});

// ─── Add/fix socials nudge (pending creator, socials missing or unverifiable) ──

export const sendAddSocialsEmail = internalAction({
  args: { email: v.string(), full_name: v.string() },
  handler: async (ctx, { email, full_name }) => {
    const firstName = full_name.split(" ")[0];
    await sendFromTemplate(ctx, "add_socials", email, { firstName });
  },
});

// ─── Incomplete application nudge (has an account, profile/listing unfinished) ─

export const sendApplicationIncompleteEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string() },
  handler: async (ctx, { email, full_name, role }) => {
    const firstName = full_name.split(" ")[0];
    const templateId = role === "host" ? "application_incomplete_host" : "application_incomplete_creator";
    await sendFromTemplate(ctx, templateId, email, { firstName });
  },
});

// ─── Early access granted ─────────────────────────────────────────────────────

export const sendAccessGrantedEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string() },
  handler: async (ctx, { email, full_name, role }) => {
    const firstName = full_name.split(" ")[0];
    const templateId = role === "host" ? "access_granted_host" : "access_granted_creator";
    await sendFromTemplate(ctx, templateId, email, { firstName });
  },
});

// ─── Role-switch approved — finish the new role's profile ────────────────────
// Sent instead of sendAccessGrantedEmail when the approval flipped the
// person's role (signup-time admin correction, or a self-serve switch
// request): they're verified, but still need the new role's delta fields
// before the core action (publish / apply) unlocks.

export const sendRoleSwitchInviteEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string(), token: v.string() },
  handler: async (ctx, { email, full_name, role, token }) => {
    const firstName = full_name.split(" ")[0];
    const templateId = role === "host" ? "role_switch_invite_host" : "role_switch_invite_creator";
    const href = `${BASE_URL}/finish-role.html?token=${encodeURIComponent(token)}`;
    await sendFromTemplate(ctx, templateId, email, { firstName }, href);
  },
});

// ─── Account rejected ─────────────────────────────────────────────────────────

export const sendRejectionEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, { email, full_name, reason }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;
    const firstName = full_name.split(" ")[0];
    const t = await ctx.runQuery(internal.emailTemplates.getCopy, { templateId: "rejection" });
    // Feedback callout only renders when a reason was given.
    const copy = reason ? t : { ...t, calloutText: undefined };
    const { subject, html } = renderTemplate(copy, { firstName, reason: reason || "" });
    await sendViaResend(apiKey, email, subject, html);
  },
});

// ─── New collab application (notify host) ────────────────────────────────────

export const sendApplicationReceivedEmail = internalAction({
  args: {
    hostEmail: v.string(),
    hostName: v.string(),
    creatorName: v.string(),
    listingTitle: v.string(),
    applicationId: v.string(),
  },
  handler: async (ctx, { hostEmail, hostName, creatorName, listingTitle, applicationId }) => {
    const firstName = hostName.split(" ")[0];
    await sendFromTemplate(
      ctx,
      "application_received",
      hostEmail,
      { firstName, creatorName, listingTitle },
      `${BASE_URL}/inbox?application=${applicationId}`
    );
  },
});

// ─── Nudge: applications the host hasn't decided on ──────────────────────────

export const sendStaleApplicationsEmail = internalAction({
  args: {
    hostEmail: v.string(),
    hostName: v.string(),
    applicationsLabel: v.string(),
    oldestListing: v.string(),
    waitingDays: v.string(),
  },
  handler: async (ctx, { hostEmail, hostName, applicationsLabel, oldestListing, waitingDays }) => {
    const firstName = hostName.split(" ")[0];
    await sendFromTemplate(
      ctx,
      "host_stale_applications",
      hostEmail,
      { firstName, applicationsLabel, oldestListing, waitingDays },
      `${BASE_URL}/host/proposals`
    );
  },
});

// ─── Nudge: creator messages the host hasn't replied to ──────────────────────

export const sendAwaitingReplyEmail = internalAction({
  args: {
    hostEmail: v.string(),
    hostName: v.string(),
    conversationsLabel: v.string(),
    creatorNames: v.string(),
  },
  handler: async (ctx, { hostEmail, hostName, conversationsLabel, creatorNames }) => {
    const firstName = hostName.split(" ")[0];
    await sendFromTemplate(
      ctx,
      "host_awaiting_reply",
      hostEmail,
      { firstName, conversationsLabel, creatorNames },
      `${BASE_URL}/inbox`
    );
  },
});

export const sendCreatorAwaitingReplyEmail = internalAction({
  args: {
    creatorEmail: v.string(),
    creatorName: v.string(),
    conversationsLabel: v.string(),
    hostNames: v.string(),
  },
  handler: async (ctx, { creatorEmail, creatorName, conversationsLabel, hostNames }) => {
    const firstName = creatorName.split(" ")[0];
    await sendFromTemplate(
      ctx,
      "creator_awaiting_reply",
      creatorEmail,
      { firstName, conversationsLabel, hostNames },
      `${BASE_URL}/inbox`
    );
  },
});

// ─── Nudge: host never answered the creator's application ────────────────────

export const sendHostUnresponsiveEmail = internalAction({
  args: {
    creatorEmail: v.string(),
    creatorName: v.string(),
    listingTitle: v.string(),
    waitingDays: v.string(),
  },
  handler: async (ctx, { creatorEmail, creatorName, listingTitle, waitingDays }) => {
    const firstName = creatorName.split(" ")[0];
    await sendFromTemplate(
      ctx,
      "creator_host_unresponsive",
      creatorEmail,
      { firstName, listingTitle, waitingDays },
      `${BASE_URL}/explore`
    );
  },
});

// ─── Application accepted (notify creator) ───────────────────────────────────

export const sendApplicationAcceptedEmail = internalAction({
  args: {
    creatorEmail: v.string(),
    creatorName: v.string(),
    hostName: v.string(),
    listingTitle: v.string(),
  },
  handler: async (ctx, { creatorEmail, creatorName, hostName, listingTitle }) => {
    const firstName = creatorName.split(" ")[0];
    await sendFromTemplate(ctx, "application_accepted", creatorEmail, { firstName, hostName, listingTitle });
  },
});

// ─── Application declined (notify creator) ───────────────────────────────────

export const sendApplicationDeclinedEmail = internalAction({
  args: {
    creatorEmail: v.string(),
    creatorName: v.string(),
    hostName: v.string(),
    listingTitle: v.string(),
  },
  handler: async (ctx, { creatorEmail, creatorName, hostName, listingTitle }) => {
    const firstName = creatorName.split(" ")[0];
    await sendFromTemplate(ctx, "application_declined", creatorEmail, { firstName, hostName, listingTitle });
  },
});

// ─── Collaboration terminated by admin (notify creator + host) ───────────────

export const sendCollabTerminatedEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    counterpartyName: v.string(),
    listingTitle: v.string(),
  },
  handler: async (ctx, { to, name, counterpartyName, listingTitle }) => {
    const firstName = name.split(" ")[0];
    await sendFromTemplate(ctx, "collab_terminated", to, { firstName, counterpartyName, listingTitle });
  },
});

// ─── Contract lifecycle (sent / signed / fully signed / paid) ────────────────
// Copy is provided by the caller (contracts.ts / pitches.ts); the completion +
// fee receipt callers pull their copy from the editable template registry.

export const sendContractEmail = internalAction({
  args: {
    to: v.string(),
    recipientName: v.string(),
    subject: v.string(),
    heading: v.string(),
    message: v.string(),
    calloutLabel: v.optional(v.string()),
    calloutText: v.optional(v.string()),
  },
  handler: async (_ctx, { to, recipientName, subject, heading, message, calloutLabel, calloutText }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = (recipientName || "there").split(" ")[0];

    const body = `
      <p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#241F19;">${heading.replace("{name}", firstName)}</p>
      ${heroChip(message)}
      ${calloutLabel ? callout("#8B6F52", calloutLabel, calloutText || "") : ""}
      ${button(`${BASE_URL}/contract`, "View contract")}`;

    await sendViaResend(apiKey, to, subject, layout(body));
  },
});

// ─── Trial ending soon ─────────────────────────────────────────────────────────

export const sendTrialEndingEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), daysLeft: v.number() },
  handler: async (ctx, { email, full_name, daysLeft }) => {
    const firstName = full_name.split(" ")[0];
    const days = `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    await sendFromTemplate(ctx, "trial_ending", email, { firstName, days });
  },
});

// ─── Trial ended ──────────────────────────────────────────────────────────────

export const sendTrialEndedEmail = internalAction({
  args: { email: v.string(), full_name: v.string() },
  handler: async (ctx, { email, full_name }) => {
    const firstName = full_name.split(" ")[0];
    await sendFromTemplate(ctx, "trial_ended", email, { firstName });
  },
});

// ─── Trustpilot review invite (after in-app rating at collab close-out) ──────
// BCC'd to Trustpilot's Automatic Feedback Service, which then sends the
// recipient an official Trustpilot review invitation.

export const sendReviewRequestEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), propertyLabel: v.string() },
  handler: async (ctx, { email, full_name, propertyLabel }) => {
    const firstName = (full_name || "there").split(" ")[0];
    await sendFromTemplate(ctx, "review_request", email, { firstName, propertyLabel }, undefined, TRUSTPILOT_BCC);
  },
});

// ─── New message notification ─────────────────────────────────────────────────

export const sendNewMessageEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    recipientName: v.string(),
    senderName: v.string(),
    preview: v.string(),
  },
  handler: async (ctx, { recipientEmail, recipientName, senderName, preview }) => {
    const firstName = recipientName.split(" ")[0];
    const trimmed = preview.length > 200 ? preview.slice(0, 200) + "…" : preview;
    await sendFromTemplate(ctx, "new_message", recipientEmail, { firstName, senderName, preview: trimmed });
  },
});

// ─── Stay alerts (creator "tell me when a stay like this goes live") ─────────
// Listing titles and locations are host-authored, and emailCopy's `fill` drops
// variables straight into HTML, so everything interpolated here is escaped.
function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Small cover-photo thumbnail beside a listing's details — table-based (not
// flex/grid, which Outlook mangles) so the image and text stay aligned.
// `title`, if given, renders bold as the first line; `lines` (pre-escaped
// HTML, may contain inline tags) stack underneath it. Falls back to a plain
// tinted square instead of a broken-image icon when there's no cover photo.
function listingThumbRow(image: string | undefined, title: string | undefined, lines: string[]): string {
  const thumb = image
    ? `<img src="${image}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:10px;object-fit:cover;border:0;outline:none;" />`
    : "";
  const titleHtml = title ? `<strong style="display:block;font-size:15px;color:#241F19;">${title}</strong>` : "";
  const linesHtml = lines.map((l) => `<span style="display:block;font-size:13px;color:#5C5347;line-height:1.5;margin-top:2px;">${l}</span>`).join("");
  return (
    `<table width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td width="56" valign="top" bgcolor="#F0EDE7" style="width:56px;height:56px;border-radius:10px;overflow:hidden;">${thumb}</td>` +
    `<td width="14" style="width:14px;">&nbsp;</td>` +
    `<td valign="top">${titleHtml}${linesHtml}</td>` +
    `</tr></table>`
  );
}

export const sendStayAlertMatchEmail = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    alertName: v.string(),
    alertSummary: v.string(),
    listingId: v.string(),
    listingTitle: v.string(),
    listingLocation: v.string(),
    listingImage: v.optional(v.string()),
    compLine: v.string(),
    deliverablesLine: v.string(),
    datesLine: v.string(),
  },
  handler: async (ctx, a) => {
    // Category illustration stays as the email's header art; the listing's
    // own cover photo shows as a small thumbnail next to its details instead.
    const collabHtml = listingThumbRow(a.listingImage, undefined, [
      esc(a.compLine),
      esc(a.deliverablesLine),
      esc(a.datesLine),
    ]);
    await sendFromTemplate(
      ctx,
      "stay_alert_match",
      a.email,
      {
        firstName: esc(a.fullName.split(" ")[0] || "there"),
        alertName: esc(a.alertName),
        alertSummary: esc(a.alertSummary),
        listingTitle: esc(a.listingTitle),
        listingLocation: esc(a.listingLocation),
        collabHtml,
      },
      `${BASE_URL}/listing/${a.listingId}`
    );
  },
});

export const sendStayAlertDigestEmail = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    alertNames: v.array(v.string()),
    matches: v.array(v.object({
      listingId: v.string(),
      title: v.string(),
      location: v.string(),
      image: v.optional(v.string()),
      compLine: v.string(),
      deliverablesLine: v.string(),
    })),
  },
  handler: async (ctx, { email, fullName, alertNames, matches }) => {
    if (matches.length === 0) return;
    const listingsHtml = matches
      .map((m) => {
        const row = listingThumbRow(m.image, esc(m.title), [
          `${esc(m.location)} · ${esc(m.compLine)}`,
          esc(m.deliverablesLine),
        ]);
        return `<a href="${BASE_URL}/listing/${m.listingId}" style="display:block;margin:0 0 16px;text-decoration:none;color:#241F19;">${row}</a>`;
      })
      .join("");
    await sendFromTemplate(ctx, "stay_alert_digest", email, {
      firstName: esc(fullName.split(" ")[0] || "there"),
      matchCount: String(matches.length),
      listingsHtml,
      alertNames: esc(alertNames.join(", ")),
    });
  },
});

// ─── Stripe Services Agreement notice (connected accounts) ───────────────────
// One-time compliance send, admin-triggered only (via `npx convex run
// emails:sendStripeServicesAgreementNotice '{"noticeText":"..."}'` or an
// admin UI action). Stripe requires platforms to notify every connected
// account without full Dashboard access about Services Agreement updates —
// see the "Corrected Dashboard links for connected accounts" email and its
// linked support page for the official required wording. `noticeText` must
// be that official copy, pasted in as plain text/HTML paragraphs — this
// function does not supply or guess at legally-required language.
export const sendStripeServicesAgreementNotice = action({
  args: { noticeText: v.string(), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { noticeText, dryRun }) => {
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set in Convex environment variables");

    const recipients: { email: string; full_name: string; stripe_connect_account_id: string }[] =
      await ctx.runQuery(internal.profiles.listWithStripeConnect, {});

    if (dryRun) {
      return { total: recipients.length, sent: 0, failed: 0, dryRun: true, recipients: recipients.map((r) => r.email) };
    }

    let sent = 0;
    const failures: { email: string; error: string }[] = [];
    // Admin-trusted, but this still goes out verbatim to real inboxes — strip
    // script/style/event-handler vectors the same way blog post content does
    // (see lib/sanitize.ts) rather than trusting the textarea input raw.
    const safeNoticeText = sanitizeRichHtml(noticeText, 20000);

    for (const r of recipients) {
      if (!r.email) continue;
      const firstName = (r.full_name || "there").split(" ")[0];
      const body = `
        <p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#241F19;">Update to the Stripe Services Agreement</p>
        ${heroChip(`Hi ${firstName} — Stripe, our payment processor, has updated its Services Agreement for connected accounts like yours.`)}
        <div style="margin:0 0 24px;font-size:14px;color:#5C5347;line-height:1.65;">${safeNoticeText}</div>
      `;
      try {
        await sendViaResend(apiKey, r.email, "Update to the Stripe Services Agreement", layout(body));
        sent += 1;
      } catch (err: any) {
        failures.push({ email: r.email, error: err?.message || String(err) });
      }
    }

    return { total: recipients.length, sent, failed: failures.length, failures };
  },
});
