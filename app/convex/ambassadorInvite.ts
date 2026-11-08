import { v, ConvexError } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminAction } from "./lib/auth";
import { buildAmbassadorInviteHtml, defaultInviteSlots, tzForApplicant } from "./ambassadorInviteHtml";

const FROM = "Collabnb <hello@collabnb.com>";
const REPLY_TO = "hellocollabnb@gmail.com";
const BCC = "hellocollabnb@gmail.com";

export const getApplication = internalQuery({
  args: { id: v.id("ambassador_applications") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// to override sends a "[TEST]" copy to that address only (nothing is marked
// as invited) so the exact email can be previewed before it goes to the
// applicant. Callable from the CLI with `convex run ambassadorInvite:sendInvite`.
export const sendInvite = internalAction({
  args: {
    id: v.id("ambassador_applications"),
    to: v.optional(v.string()),
    slots: v.optional(v.array(v.number())),
  },
  handler: async (ctx, { id, to, slots }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new ConvexError("RESEND_API_KEY not configured.");
    const app: any = await ctx.runQuery(internal.ambassadorInvite.getApplication, { id });
    if (!app) throw new ConvexError("Application not found.");

    const tz = tzForApplicant(app.country, app.based_in);
    const html = buildAmbassadorInviteHtml({
      name: app.full_name,
      hook: undefined,
      tz,
      slots: slots ?? defaultInviteSlots(),
    });
    const subject = "Your Collabnb Ambassador application: let's find a time to chat";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to ?? app.email],
        reply_to: REPLY_TO,
        ...(to ? {} : { bcc: [BCC] }),
        subject: to ? `[TEST] ${subject}` : subject,
        html,
      }),
    });
    if (!res.ok) throw new ConvexError(`Resend returned ${res.status}`);
    return { sent: true, to: to ?? app.email };
  },
});

export const adminSendInvite = action({
  args: { id: v.id("ambassador_applications") },
  handler: async (ctx, { id }) => {
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);
    return await ctx.runAction(internal.ambassadorInvite.sendInvite, { id });
  },
});
