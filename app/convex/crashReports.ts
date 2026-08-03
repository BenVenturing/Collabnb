import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, canAccessAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

// ─── Submit a crash report ──────────────────────────────────────────────────────
// Fired from the ErrorBoundary's "Send to dev team" button. No auth required —
// a crash can happen for a signed-out visitor too — so this is keyed for rate
// limiting by whatever identity is available, falling back to a shared bucket.
export const submitCrashReport = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    componentStack: v.optional(v.string()),
    url: v.string(),
    userAgent: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userEmail = identity?.email;
    await enforceRateLimit(ctx, `crash:${userEmail ?? "anon"}`, RATE_LIMITS.CRASH_REPORT);

    const message = cleanPlainText(args.message, 2000) || "(no message)";
    const id = await ctx.db.insert("crashReports", {
      message,
      stack: args.stack ? cleanPlainText(args.stack, 8000) : undefined,
      componentStack: args.componentStack ? cleanPlainText(args.componentStack, 4000) : undefined,
      url: cleanPlainText(args.url, 500),
      userAgent: cleanPlainText(args.userAgent, 300),
      userEmail,
      status: "new",
      created_at: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "crash",
      subject: `App crash reported${userEmail ? ` by ${userEmail}` : ""}`,
      body: `${message}\n\nURL: ${args.url}\nUser: ${userEmail || "signed out"}\n\n${args.stack || ""}\n\nView in admin: https://collabnb.com/#/admin`,
    });

    return id;
  },
});

// ─── Admin: get all crash reports ───────────────────────────────────────────────
export const getCrashReports = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const reports = await ctx.db.query("crashReports").order("desc").take(200);
    return reports.map((r) => ({ ...r, _id: String(r._id) }));
  },
});

// ─── Admin: unresolved count, for the sidebar badge ─────────────────────────────
export const unresolvedCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return 0;
    const newReports = await ctx.db
      .query("crashReports")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .collect();
    return newReports.length;
  },
});

// ─── Admin: mark resolved ───────────────────────────────────────────────────────
export const resolveCrashReport = mutation({
  args: { reportId: v.id("crashReports") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.reportId, { status: "resolved" });
  },
});
