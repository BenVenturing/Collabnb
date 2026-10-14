// Server half of the mobile host Proposals CRM and the creator collab screen
// (apps/mobile). Ported from apps/mobile/convex-drafts/hostCollaborations.js;
// the stage vocabulary matches apps/mobile/src/utils/collabStages.js.
//
// Each mutation receives the WHOLE next contract/submissions state from the
// client, so pipelineRules re-checks that the sending party only changed the
// part they're allowed to change.
//
// NOTE: `contract_draft` is the phone app's negotiated-terms record. It is not
// the `contracts` table row that `contract_id` points at, and signing here
// charges nothing and creates no payment record.
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
// @ts-ignore — plain-JS rules module, shared verbatim with the app repo's tests
import { validateContractTransition, validateSubmissionsTransition } from "./pipelineRules.js";

const CREATOR_STAGES = ["pending", "updated", "accepted", "uploaded_tagged", "closed", "archived"];

export const getByHost = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) =>
    ctx.db
      .query("collaborations")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .collect(),
});

async function ownedBy(ctx: any, id: any, role: "host" | "creator", profileId: string) {
  const collab = await ctx.db.get(id);
  if (!collab) throw new Error("Collaboration not found");
  const owner = role === "host" ? collab.host_id : collab.creator_id;
  if (owner !== profileId) throw new Error("Not your collaboration");
  return collab;
}

// Host moves a proposal between pipeline columns. The client translates the
// CRM stage to these values with creatorPatchFor().
export const setStage = mutation({
  args: {
    id: v.id("collaborations"),
    hostId: v.string(),
    current_stage: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, hostId, current_stage, status }) => {
    const collab = await ownedBy(ctx, id, "host", hostId);
    if (current_stage !== undefined && !CREATOR_STAGES.includes(current_stage)) {
      throw new Error(`Unknown stage: ${current_stage}`);
    }
    let stages: Record<string, any> = {};
    try {
      stages = collab.stages ? JSON.parse(collab.stages) : {};
    } catch {
      stages = {};
    }
    const patch: Record<string, any> = {};
    if (current_stage !== undefined) {
      patch.current_stage = current_stage;
      stages[current_stage] = {
        ...(stages[current_stage] || {}),
        date: new Date().toISOString().slice(0, 10),
      };
      patch.stages = JSON.stringify(stages);
    }
    if (status !== undefined) patch.status = status;
    await ctx.db.patch(id, patch);
  },
});

// Host-private CRM fields. `stay_dates` lands on the existing `dates` column
// rather than a parallel one, so the web app shows the same stay window.
export const saveDetails = mutation({
  args: {
    id: v.id("collaborations"),
    hostId: v.string(),
    host_note: v.optional(v.string()),
    stay_dates: v.optional(v.string()),
    deliverables: v.optional(v.string()),
  },
  handler: async (ctx, { id, hostId, host_note, stay_dates, deliverables }) => {
    await ownedBy(ctx, id, "host", hostId);
    const patch: Record<string, any> = {};
    if (host_note !== undefined) patch.host_note = host_note.slice(0, 2000);
    if (stay_dates !== undefined) patch.dates = stay_dates.slice(0, 200);
    if (deliverables !== undefined) patch.deliverables = deliverables.slice(0, 5000);
    if (Object.keys(patch).length) await ctx.db.patch(id, patch);
  },
});

export const saveContract = mutation({
  args: {
    id: v.id("collaborations"),
    role: v.union(v.literal("host"), v.literal("creator")),
    profileId: v.string(),
    contract: v.string(),
  },
  handler: async (ctx, { id, role, profileId, contract }) => {
    const collab = await ownedBy(ctx, id, role, profileId);
    if (collab.status === "terminated") throw new Error("This collaboration was ended");

    const next = validateContractTransition(collab.contract_draft, contract, role);

    const patch: Record<string, any> = { contract_draft: JSON.stringify(next) };
    if (next.locked) {
      patch.current_stage = "accepted";
    } else if ((next.history || []).length && collab.current_stage === "pending") {
      patch.current_stage = "updated";
    }
    await ctx.db.patch(id, patch);
  },
});

// Creator submits links, host reviews. Opens once terms are agreed.
export const saveDeliverables = mutation({
  args: {
    id: v.id("collaborations"),
    role: v.union(v.literal("host"), v.literal("creator")),
    profileId: v.string(),
    submissions: v.string(),
  },
  handler: async (ctx, { id, role, profileId, submissions }) => {
    const collab = await ownedBy(ctx, id, role, profileId);
    if (collab.status === "terminated") throw new Error("This collaboration was ended");
    if (!["accepted", "updated", "uploaded_tagged"].includes(collab.current_stage)) {
      throw new Error("Deliverables open once the terms are agreed");
    }

    const next = validateSubmissionsTransition(collab.deliverable_submissions, submissions, role);

    const patch: Record<string, any> = { deliverable_submissions: JSON.stringify(next) };
    const allApproved =
      next.order.length > 0 && next.order.every((k: string) => next.items[k].status === "approved");
    if (allApproved) {
      patch.current_stage = "closed";
    } else if (role === "creator" && collab.current_stage !== "uploaded_tagged") {
      patch.current_stage = "uploaded_tagged";
    }
    await ctx.db.patch(id, patch);
  },
});

// Creator withdraws / either party leaves. Writes terminated_at too, so the
// web app's termination checks and the inbox delete guard see it.
export const endCollaboration = mutation({
  args: {
    id: v.id("collaborations"),
    role: v.union(v.literal("host"), v.literal("creator")),
    profileId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, role, profileId, reason }) => {
    const collab = await ownedBy(ctx, id, role, profileId);
    if (collab.status === "terminated") return; // idempotent
    if (["closed", "archived"].includes(collab.current_stage)) {
      throw new Error("This collaboration is already completed");
    }
    await ctx.db.patch(id, {
      status: "terminated",
      is_active: false,
      terminated_at: Date.now(),
      ended_by: role,
      end_reason: (reason || "").slice(0, 500),
    });
  },
});
