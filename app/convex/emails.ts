import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { BASE_URL, TRUSTPILOT_BCC, renderTemplate, sendViaResend, layout, callout, button, heroChip } from "./emailCopy";

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

// ─── Early access granted ─────────────────────────────────────────────────────

export const sendAccessGrantedEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string() },
  handler: async (ctx, { email, full_name, role }) => {
    const firstName = full_name.split(" ")[0];
    const templateId = role === "host" ? "access_granted_host" : "access_granted_creator";
    await sendFromTemplate(ctx, templateId, email, { firstName });
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
      <p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#192524;">${heading.replace("{name}", firstName)}</p>
      ${heroChip(message)}
      ${calloutLabel ? callout("#4A9B7F", calloutLabel, calloutText || "") : ""}
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
