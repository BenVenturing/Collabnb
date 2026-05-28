import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

const ADMIN_TO = "hellocollabnb@gmail.com";

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
