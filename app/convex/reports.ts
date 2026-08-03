import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireOwnerOrAdmin, requireAdmin, canAccessAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

const REPORT_REASONS = [
  "inaccurate_information",
  "poor_communication",
  "failed_collaboration",
  "unprofessional_behavior",
  "other",
] as const;

// ─── Submit a report ────────────────────────────────────────────────────────────
export const submitReport = mutation({
  args: {
    reportedUserId: v.string(),
    reporterId: v.string(),
    reason: v.union(...REPORT_REASONS.map((r) => v.literal(r))),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.reporterId);
    await enforceRateLimit(ctx, `report:${args.reporterId}`, RATE_LIMITS.REPORT);
    const id = await ctx.db.insert("reports", {
      reported_user_id: args.reportedUserId,
      reporter_id: args.reporterId,
      reason: args.reason,
      details: args.details ? cleanPlainText(args.details, 2000) : "",
      status: "pending",
      created_at: Date.now(),
    });
    return id;
  },
});

// ─── Admin: Get all reports ─────────────────────────────────────────────────────
export const getReports = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const reports = await ctx.db.query("reports").order("desc").take(200);
    const profiles = await ctx.db.query("profiles").collect();
    const profileMap = Object.fromEntries(profiles.map((p) => [String(p._id), p]));

    return reports.map((r) => ({
      ...r,
      _id: String(r._id),
      reporterName: profileMap[r.reporter_id]?.full_name ?? "Unknown",
      reportedName: profileMap[r.reported_user_id]?.full_name ?? "Unknown",
      reportedEmail: profileMap[r.reported_user_id]?.email ?? "",
    }));
  },
});

// ─── Admin: Update report status ────────────────────────────────────────────────
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("dismissed"), v.literal("actioned")),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch: Record<string, any> = { status: args.status };
    if (args.adminNote) patch.admin_note = cleanPlainText(args.adminNote, 1000);
    await ctx.db.patch(args.reportId, patch);
  },
});

// ─── Admin: Dismiss all reports against a user ──────────────────────────────────
export const dismissAllForUser = mutation({
  args: { reportedUserId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const reports = await ctx.db.query("reports").collect();
    const pending = reports.filter(
      (r) => r.reported_user_id === args.reportedUserId && r.status === "pending"
    );
    for (const r of pending) {
      await ctx.db.patch(r._id, { status: "dismissed", admin_note: "Bulk dismissed" });
    }
    return { dismissed: pending.length };
  },
});
