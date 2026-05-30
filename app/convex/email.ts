import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

const ADMIN_TO = "hellocollabnb@gmail.com";
const FROM = "Collabnb <hello@collabnb.com>";

// ─── Internal action — sends welcome email to a new waitlist member ───────────
export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (_ctx, { to, name, role }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = name.split(" ")[0];
    const roleLabel = role === "host" ? "host" : "creator";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#EFECE9; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(25,37,36,0.07); }
  .header { background:linear-gradient(135deg,#192524,#2d4a3e); padding:36px 40px 28px; text-align:center; }
  .header-inner { display:inline-flex; align-items:center; gap:12px; }
  .logo-text { color:#fff; font-size:1.35rem; font-weight:800; letter-spacing:-0.02em; vertical-align:middle; }
  .body { padding:36px 40px 32px; }
  h1 { font-size:1.55rem; font-weight:800; color:#192524; margin:0 0 12px; line-height:1.2; }
  p { font-size:0.9375rem; color:#4a6670; line-height:1.65; margin:0 0 16px; }
  .highlight { background:#f0faf5; border-left:3px solid #4ecdc4; border-radius:0 12px 12px 0; padding:14px 18px; margin:24px 0; }
  .highlight p { margin:0; font-size:0.875rem; color:#2d7a6a; font-weight:500; }
  .steps { margin:24px 0; }
  .step { display:flex; gap:14px; margin-bottom:16px; align-items:flex-start; }
  .step-num { width:28px; height:28px; min-width:28px; border-radius:50%; background:#192524; color:#fff; font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
  .step p { margin:0; font-size:0.875rem; }
  .btn { display:inline-block; background:#192524; color:#fff !important; text-decoration:none; padding:13px 28px; border-radius:12px; font-size:0.9rem; font-weight:700; letter-spacing:0.01em; margin:8px 0 0; }
  .footer { padding:20px 40px 28px; text-align:center; }
  .footer p { font-size:0.78rem; color:#8faea6; margin:0; line-height:1.6; }
  @media (max-width:560px) {
    .body, .footer { padding-left:24px; padding-right:24px; }
    .header { padding:28px 24px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="header-inner">
        <img src="https://collabnb.com/assets/collabnb-logo.png" alt="Collabnb" width="40" height="40" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
        <span class="logo-text">Collabnb</span>
      </div>
    </div>
    <div class="body">
      <h1>You're on the list, ${firstName}! 🎉</h1>
      <p>Thanks for joining Collabnb as a <strong>${roleLabel}</strong>. Your application is now in review — our team manually verifies every new member to keep the community high quality.</p>

      <div class="highlight">
        <p>📬 We'll email you at this address once you're approved. Usually within <strong>1–2 business days</strong>.</p>
      </div>

      <p style="font-weight:700;color:#192524;margin-bottom:10px;">What happens next:</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <p>Our team reviews your application and verifies your profile.</p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <p>You'll receive an approval email with a link to access the platform.</p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <p>Full listings go live <strong>July 1st</strong> — early members get first pick.</p>
        </div>
      </div>

      <a href="https://collabnb.com" class="btn">Preview the platform →</a>
    </div>
    <div class="footer">
      <p>Questions? Reply to this email or reach us at <a href="mailto:hello@collabnb.com" style="color:#3C5759;">hello@collabnb.com</a></p>
      <p style="margin-top:6px;">© 2026 Collabnb · You're receiving this because you joined the waitlist.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [to],
          subject: `You're on the Collabnb waitlist, ${firstName}!`,
          html,
        }),
      });
    } catch (err) {
      console.warn("Welcome email send failed:", err);
    }
  },
});

// ─── Internal action — sends admin notification email via Resend ──────────────
// Requires RESEND_API_KEY in Convex environment variables.
// Set it with: npx convex env set RESEND_API_KEY re_xxxxxxxxxxxx
export const sendAdminNotification = internalAction({
  args: {
    type: v.union(v.literal("signup"), v.literal("message"), v.literal("collab")),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { type, subject, body }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // silently skip until API key is configured

    // Respect the admin notification toggles
    const settings = await ctx.runQuery(api.admin.getSettings);
    if (settings?.[`notify_${type}`] !== "true") return;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Collabnb <onboarding@resend.dev>",
          to: [ADMIN_TO],
          subject: `[Collabnb] ${subject}`,
          text: body,
        }),
      });
    } catch (err) {
      console.warn("Email send failed:", err);
    }
  },
});
