// Native push via Expo's push service — the mobile app's counterpart to
// googleWallet.ts / appleWallet.ts's lock-screen pushes. registerToken is
// called from the mobile app once notification permission is granted;
// pushForUser is fired from notifications.create alongside the other two
// channels for every in-app notification, gated by the same Settings >
// Notifications category toggles they use. Unlike the wallet channels this
// has no per-type allowlist or rate cap — those exist there only because of
// Google's/Apple's pass-notify limits, which don't apply to a real push.
import { v } from "convex/values";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireOwnerOrAdmin } from "./lib/auth";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const registerToken = mutation({
  args: { userId: v.string(), token: v.string() },
  handler: async (ctx, { userId, token }) => {
    await requireOwnerOrAdmin(ctx, userId);
    const profile: any = await ctx.db.get(userId as any);
    if (!profile) return;
    const tokens: string[] = profile.expo_push_tokens ?? [];
    if (!tokens.includes(token)) {
      await ctx.db.patch(userId as any, { expo_push_tokens: [...tokens, token] });
    }
  },
});

// Called on sign-out so a shared/reset device stops receiving this user's
// pushes without waiting for Expo to report it undeliverable.
export const unregisterToken = mutation({
  args: { userId: v.string(), token: v.string() },
  handler: async (ctx, { userId, token }) => {
    await requireOwnerOrAdmin(ctx, userId);
    const profile: any = await ctx.db.get(userId as any);
    if (!profile) return;
    const tokens: string[] = profile.expo_push_tokens ?? [];
    await ctx.db.patch(userId as any, { expo_push_tokens: tokens.filter((t) => t !== token) });
  },
});

const PREF_KEY_BY_TYPE: Record<string, "messages" | "contractUpdates" | "collabReminders"> = {
  new_message: "messages",
  host_reply: "messages",
  new_application: "contractUpdates",
  pitch_approved: "contractUpdates",
  pitch_declined: "contractUpdates",
  contract_reminder: "collabReminders",
  application_reminder: "collabReminders",
  collab_reminder: "collabReminders",
  awaiting_reply: "collabReminders",
  host_unresponsive: "collabReminders",
};

export const pushForUser = internalAction({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile: any = await ctx.runQuery(api.profiles.getById, { id: args.userId });
    const tokens: string[] = profile?.expo_push_tokens ?? [];
    if (tokens.length === 0) return;

    const prefKey = PREF_KEY_BY_TYPE[args.type] ?? "contractUpdates";
    if (profile.notification_prefs?.[prefKey] === false) return;

    const messages = tokens.map((to) => ({
      to,
      title: args.title,
      body: args.body,
      data: { type: args.type, link: args.link },
      sound: "default",
    }));

    let tickets: any[] = [];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      const json: any = await res.json();
      tickets = json?.data ?? [];
    } catch (err) {
      console.error("Expo push send failed for", args.userId, err);
      return;
    }

    // A device that uninstalled or reset its push credentials reports back
    // this way — prune it so future sends don't keep paying for it.
    const stale: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
        stale.push(tokens[i]);
      }
    });
    if (stale.length > 0) {
      await ctx.runMutation(internal.expoPush.pruneTokens, { userId: args.userId, tokens: stale });
    }
  },
});

export const pruneTokens = internalMutation({
  args: { userId: v.string(), tokens: v.array(v.string()) },
  handler: async (ctx, { userId, tokens }) => {
    const profile: any = await ctx.db.get(userId as any);
    if (!profile) return;
    const remaining = (profile.expo_push_tokens ?? []).filter((t: string) => !tokens.includes(t));
    await ctx.db.patch(userId as any, { expo_push_tokens: remaining });
  },
});
