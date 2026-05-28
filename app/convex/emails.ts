import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    full_name: v.string(),
    role: v.string(),
  },
  handler: async (_ctx, { email, full_name, role }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = full_name.split(" ")[0];
    const isHost = role === "host";

    const subject = isHost
      ? "You're on the Collabnb host waitlist 🏡"
      : "You're on the Collabnb creator waitlist 🎬";

    const roleBlurb = isHost
      ? "We're hand-picking a founding group of hosts to list their properties and connect with creators. You're in the queue."
      : "We're hand-picking a founding group of creators to collaborate with top Airbnb hosts. You're in the queue.";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2dd4bf22,#7c3aed22);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Collabnb</div>
            <div style="font-size:13px;color:#6b7280;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Creator × Host Marketplace</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">Hey ${firstName} 👋</p>
            <p style="margin:0 0 24px;font-size:16px;color:#9ca3af;line-height:1.6;">${roleBlurb}</p>

            <div style="background:rgba(45,212,191,0.08);border:1px solid rgba(45,212,191,0.2);border-radius:12px;padding:20px 24px;margin-bottom:28px;">
              <div style="font-size:13px;color:#2dd4bf;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">What happens next</div>
              <p style="margin:0;font-size:15px;color:#d1d5db;line-height:1.6;">We'll reach out personally as we approach launch with early access details. Founding members get priority placement, locked-in rates, and a direct line to the team.</p>
            </div>

            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">In the meantime, follow us and spread the word — every signup helps us build something worth waiting for.</p>
          </td>
        </tr>

        <!-- Footer -->
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

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Collabnb <hello@collabnb.com>",
        to: [email],
        subject,
        html,
      }),
    });
  },
});
