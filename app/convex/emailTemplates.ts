import { v } from "convex/values";
import { query, mutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { TEMPLATE_DEFAULTS, SAMPLE_VARS, mergedCopy, renderTemplate, sendViaResend } from "./emailCopy";

const COPY_FIELDS = [
  "subject", "heading", "body",
  "calloutLabel", "calloutText",
  "callout2Label", "callout2Text",
  "buttonLabel", "footnote",
] as const;

const copyArgs = {
  subject: v.optional(v.string()),
  heading: v.optional(v.string()),
  body: v.optional(v.string()),
  calloutLabel: v.optional(v.string()),
  calloutText: v.optional(v.string()),
  callout2Label: v.optional(v.string()),
  callout2Text: v.optional(v.string()),
  buttonLabel: v.optional(v.string()),
  footnote: v.optional(v.string()),
};

// ─── Admin UI: all templates with defaults, current values, and customized flag ──
export const list = query({
  args: {},
  handler: async (ctx) => {
    const overrides = await ctx.db.query("email_templates").collect();
    const byId = new Map(overrides.map((o) => [o.template_id, o]));
    return Object.entries(TEMPLATE_DEFAULTS).map(([id, def]) => {
      const override = byId.get(id);
      const current: Record<string, string> = {};
      for (const k of Object.keys(def.copy)) {
        const ov = override ? (override as any)[k] : undefined;
        current[k] = typeof ov === "string" && ov.trim() !== "" ? ov : (def.copy as any)[k];
      }
      return {
        id,
        name: def.name,
        trigger: def.trigger,
        category: def.category,
        vars: def.vars,
        defaults: def.copy,
        current,
        customized: !!override,
        updatedAt: override?.updated_at ?? null,
      };
    });
  },
});

// ─── Admin UI: save copy overrides for one template ─────────────────────────────
export const save = mutation({
  args: { templateId: v.string(), ...copyArgs },
  handler: async (ctx, { templateId, ...copy }) => {
    if (!TEMPLATE_DEFAULTS[templateId]) throw new Error(`Unknown template: ${templateId}`);
    const existing = await ctx.db
      .query("email_templates")
      .withIndex("by_template", (q) => q.eq("template_id", templateId))
      .unique();
    const patch: Record<string, any> = { updated_at: Date.now() };
    for (const k of COPY_FIELDS) patch[k] = copy[k];
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("email_templates", { template_id: templateId, ...patch });
    }
  },
});

// ─── Admin UI: reset a template back to the code defaults ───────────────────────
export const reset = mutation({
  args: { templateId: v.string() },
  handler: async (ctx, { templateId }) => {
    const existing = await ctx.db
      .query("email_templates")
      .withIndex("by_template", (q) => q.eq("template_id", templateId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── Send-time: merged copy for one template (used by emails.ts actions) ────────
export const getCopy = internalQuery({
  args: { templateId: v.string() },
  handler: async (ctx, { templateId }) => {
    return await mergedCopy(ctx.db, templateId);
  },
});

// ─── Admin UI: send a test email with sample data ───────────────────────────────
export const sendTest = action({
  args: { templateId: v.string(), to: v.string() },
  handler: async (ctx, { templateId, to }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set in Convex.");
    const t: any = await ctx.runQuery(internal.emailTemplates.getCopy, { templateId });
    const { subject, html } = renderTemplate(t, SAMPLE_VARS);
    // Contract emails use {name} (single braces) — filled by sendContractEmail in prod.
    const finalSubject = `[TEST] ${subject.replace("{name}", SAMPLE_VARS.name)}`;
    await sendViaResend(apiKey, to, finalSubject, html.replace(/\{name\}/g, SAMPLE_VARS.name));
    return { sent: true };
  },
});
