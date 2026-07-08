import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const FROM = "Collabnb <hello@collabnb.com>";
const BASE_URL = "https://www.collabnb.com";

async function send(apiKey: string, to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
}

function layout(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E8E4DF;box-shadow:0 4px 24px rgba(25,37,36,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#192524,#2d4a3e);padding:36px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Collabnb</div>
            <div style="font-size:11px;color:#7ecfc4;margin-top:5px;letter-spacing:2px;text-transform:uppercase;">Creator-First Hospitality Marketing</div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#F7F5F2;border-top:1px solid #E8E4DF;text-align:center;">
            <p style="margin:0;font-size:12px;color:#959D90;">© 2026 Collabnb · <a href="${BASE_URL}" style="color:#2dd4bf;text-decoration:none;">collabnb.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function callout(color: string, label: string, text: string) {
  return `<div style="background:${color}12;border:1px solid ${color}30;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
    <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div>
    <p style="margin:0;font-size:14px;color:#3C5759;line-height:1.65;">${text}</p>
  </div>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:14px 32px;background:linear-gradient(135deg,#192524,#2d4a3e);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:-0.1px;">${label}</a>`;
}

// ─── Welcome (waitlist signup) ────────────────────────────────────────────────

export const sendWelcomeEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string() },
  handler: async (_ctx, { email, full_name, role }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = full_name.split(" ")[0];
    const isHost = role === "host";

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#192524;">Hey ${firstName} 👋</p>
      <p style="margin:0 0 24px;font-size:15px;color:#3C5759;line-height:1.65;">
        ${isHost
          ? "We're hand-picking a founding group of hosts to list their properties and connect with creators. You're in the queue."
          : "We're hand-picking a founding group of creators to partner with boutique hospitality brands. You're in the queue."}
      </p>
      ${callout("#2dd4bf", "What happens next", "We'll reach out personally as we approach launch with early access details. Founding members get priority placement, locked-in rates, and a direct line to the team.")}
      <p style="margin:0;font-size:14px;color:#959D90;line-height:1.65;">In the meantime, spread the word — every signup helps us build something worth waiting for.</p>`;

    await send(
      apiKey,
      email,
      isHost ? "You're on the Collabnb host waitlist 🏡" : "You're on the Collabnb creator waitlist 🎬",
      layout(body)
    );
  },
});

// ─── Early access granted ─────────────────────────────────────────────────────

export const sendAccessGrantedEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), role: v.string() },
  handler: async (_ctx, { email, full_name, role }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = full_name.split(" ")[0];
    const isHost = role === "host";

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#192524;">You're in, ${firstName} 🎉</p>
      <p style="margin:0 0 24px;font-size:15px;color:#3C5759;line-height:1.65;">
        Your Collabnb ${isHost ? "host" : "creator"} account has been approved. Create your login below to access the platform.
      </p>
      ${callout("#2dd4bf", "You're a founding member", `As one of our first ${isHost ? "hosts" : "creators"}, you're a Founding Member — lifetime free access as part of the inaugural cohort.`)}
      ${callout("#f59e0b", "Full launch is July 15", isHost ? "In the meantime, log in and start building your listing so you're ready to go live on day one." : "In the meantime, log in and complete your creator profile so hosts can find you on launch day.")}
      ${button(`${BASE_URL}/login.html`, "Create your account")}
      <p style="margin:12px 0 0;font-size:12px;color:#959D90;">Sign up with email or continue with Google — takes 30 seconds.</p>`;

    await send(apiKey, email, "You've been granted access to Collabnb ✅", layout(body));
  },
});

// ─── Account rejected ─────────────────────────────────────────────────────────

export const sendRejectionEmail = internalAction({
  args: { email: v.string(), full_name: v.string(), reason: v.optional(v.string()) },
  handler: async (_ctx, { email, full_name, reason }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = full_name.split(" ")[0];

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">Hey ${firstName},</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        Thank you for applying to Collabnb. After reviewing your application, we're not able to offer access at this time.
      </p>
      ${reason ? callout("#f59e0b", "Feedback", reason) : ""}
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">We're being selective with our founding cohort to keep quality high for everyone on the platform. We appreciate your interest and wish you the best.</p>`;

    await send(apiKey, email, "Your Collabnb application", layout(body));
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
  handler: async (_ctx, { hostEmail, hostName, creatorName, listingTitle, applicationId }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = hostName.split(" ")[0];

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">New application, ${firstName}</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        <strong style="color:#ffffff;">${creatorName}</strong> just applied to collaborate on <strong style="color:#ffffff;">${listingTitle}</strong>.
      </p>
      ${callout("#7c3aed", "Next step", "Review their profile and pitch in your dashboard, then accept or decline.")}
      ${button(`https://www.collabnb.com/inbox?application=${applicationId}`, "Review application")}`;

    await send(apiKey, hostEmail, `New application from ${creatorName}`, layout(body));
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
  handler: async (_ctx, { creatorEmail, creatorName, hostName, listingTitle }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = creatorName.split(" ")[0];

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">You got the collab, ${firstName} 🙌</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        <strong style="color:#ffffff;">${hostName}</strong> accepted your application for <strong style="color:#ffffff;">${listingTitle}</strong>.
      </p>
      ${callout("#2dd4bf", "What's next", "Head to your inbox to connect with your host and align on dates, deliverables, and logistics.")}
      ${button("https://www.collabnb.com/inbox", "Open your inbox")}`;

    await send(apiKey, creatorEmail, `${hostName} accepted your application 🎉`, layout(body));
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
  handler: async (_ctx, { creatorEmail, creatorName, hostName, listingTitle }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = creatorName.split(" ")[0];

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">Hey ${firstName},</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        ${hostName} passed on your application for <strong style="color:#ffffff;">${listingTitle}</strong> this time.
      </p>
      ${callout("#6b7280", "Keep going", "There are more listings waiting. Browse other hosts and keep pitching — the right collab is out there.")}
      ${button("https://www.collabnb.com", "Browse listings")}`;

    await send(apiKey, creatorEmail, `Update on your application to ${hostName}`, layout(body));
  },
});

// ─── Contract lifecycle (sent / signed / fully signed / paid) ────────────────

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
      <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#192524;">${heading.replace("{name}", firstName)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#3C5759;line-height:1.65;">${message}</p>
      ${calloutLabel ? callout("#2dd4bf", calloutLabel, calloutText || "") : ""}
      ${button(`${BASE_URL}/contract`, "View contract")}`;

    await send(apiKey, to, subject, layout(body));
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
  handler: async (_ctx, { recipientEmail, recipientName, senderName, preview }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = recipientName.split(" ")[0];

    const body = `
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">New message, ${firstName}</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        <strong style="color:#ffffff;">${senderName}</strong> sent you a message.
      </p>
      ${callout("#2dd4bf", "Message preview", preview.length > 200 ? preview.slice(0, 200) + "…" : preview)}
      ${button("https://www.collabnb.com/inbox", "Reply in inbox")}`;

    await send(apiKey, recipientEmail, `${senderName} sent you a message`, layout(body));
  },
});
