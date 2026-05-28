import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const FROM = "Collabnb <hello@collabnb.com>";

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
<body style="margin:0;padding:0;background:#0e0e0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2dd4bf22,#7c3aed22);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Collabnb</div>
            <div style="font-size:13px;color:#6b7280;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Creator × Host Marketplace</div>
          </td>
        </tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;font-size:12px;color:#4b5563;">© 2026 Collabnb · <a href="https://www.collabnb.com" style="color:#2dd4bf;text-decoration:none;">collabnb.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function callout(color: string, label: string, text: string) {
  return `<div style="background:${color}14;border:1px solid ${color}33;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    <div style="font-size:13px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${label}</div>
    <p style="margin:0;font-size:15px;color:#d1d5db;line-height:1.6;">${text}</p>
  </div>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:14px 28px;background:linear-gradient(135deg,#2dd4bf,#7c3aed);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${label}</a>`;
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
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">Hey ${firstName} 👋</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        ${isHost
          ? "We're hand-picking a founding group of hosts to list their properties and connect with creators. You're in the queue."
          : "We're hand-picking a founding group of creators to collaborate with top Airbnb hosts. You're in the queue."}
      </p>
      ${callout("#2dd4bf", "What happens next", "We'll reach out personally as we approach launch with early access details. Founding members get priority placement, locked-in rates, and a direct line to the team.")}
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">In the meantime, spread the word — every signup helps us build something worth waiting for.</p>`;

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
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">You're in, ${firstName} 🎉</p>
      <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">
        Your Collabnb ${isHost ? "host" : "creator"} account has been approved. You now have full access to the platform.
      </p>
      ${callout("#2dd4bf", "You're a founding member", `As one of our first ${isHost ? "hosts" : "creators"}, you're locked in at founding rates and get priority visibility as we grow.`)}
      ${button("https://www.collabnb.com", "Go to your account")}`;

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
