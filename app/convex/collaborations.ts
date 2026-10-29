import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwnerOrAdmin, requireAuthedProfile, canAccessOwner, getAuthedProfile } from "./lib/auth";

export const getByCreator = query({
  args: { creatorId: v.string() },
  handler: async (ctx, args) => {
    if (!(await canAccessOwner(ctx, args.creatorId))) return [];
    return await ctx.db
      .query("collaborations")
      .withIndex("by_creator", (q) => q.eq("creator_id", args.creatorId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!(await getAuthedProfile(ctx))) return null;
    return await ctx.db
      .query("collaborations")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
  },
});

export const getByHost = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) => {
    if (!(await canAccessOwner(ctx, hostId))) return [];
    // Primary: collaborations that already have host_id stamped
    const byHostId = await ctx.db
      .query("collaborations")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .collect();

    // Fallback: find collaborations via the host's listings (covers rows
    // created before host_id was stamped on the collaboration itself)
    const hostListings = await ctx.db
      .query("listings")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .collect();

    if (hostListings.length === 0) return byHostId;

    const seen = new Set(byHostId.map((c) => String(c._id)));
    const extra: (typeof byHostId[0])[] = [];

    for (const listing of hostListings) {
      const collabs = await ctx.db
        .query("collaborations")
        .withIndex("by_listing", (q) => q.eq("listing_id", String(listing._id)))
        .collect();
      collabs.forEach((c) => {
        if (!seen.has(String(c._id))) { seen.add(String(c._id)); extra.push(c); }
      });
    }

    return [...byHostId, ...extra];
  },
});

export const create = mutation({
  args: {
    listingId: v.string(),
    propertyName: v.optional(v.string()),
    location: v.optional(v.string()),
    hostName: v.optional(v.string()),
    image: v.optional(v.string()),
    creatorId: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    listingDescription: v.optional(v.string()),
    pitchMessage: v.optional(v.string()),
    hostId: v.optional(v.string()),
    pitchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = args.creatorId
      ? await requireOwnerOrAdmin(ctx, args.creatorId)
      : await requireAuthedProfile(ctx);
    const creatorId = args.creatorId ?? String(caller._id);
    const creatorDocId = ctx.db.normalizeId("profiles", creatorId);
    const creator = creatorId === String(caller._id)
      ? caller
      : creatorDocId ? await ctx.db.get(creatorDocId) : null;
    const hostDocId = args.hostId ? ctx.db.normalizeId("profiles", args.hostId) : null;
    const host = hostDocId ? await ctx.db.get(hostDocId) : null;

    const now = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const stages: Record<string, any> = {
      pending: { completed: true, date: now, note: "Application sent" },
      accepted: { completed: false, date: null, note: "" },
      updated: { completed: false, date: null, note: "" },
      uploaded_tagged: { completed: false, date: null, note: "" },
      closed: { completed: false, date: null, note: "" },
      archived: { completed: false, date: null, note: "" },
    };

    const collabId = await ctx.db.insert("collaborations", {
      listing_id: args.listingId,
      property_name: args.propertyName,
      location: args.location,
      host_name: host?.full_name || args.hostName,
      image: args.image,
      status: "pending",
      status_text: "Application Sent",
      deliverables: args.deliverables,
      days_left: 30,
      is_active: true,
      current_stage: "pending",
      stages: JSON.stringify(stages),
      creator_id: creatorId,
      creator_name: creator?.full_name,
      listing_description: args.listingDescription,
      host_id: args.hostId,
      pitch_id: args.pitchId,
    });

    return collabId;
  },
});

// Shared by the creator's close flow (markCompleted) and the host's "Mark
// Completed" (pitches.updateStatus) — previously only the creator path billed,
// so a host completing a collab never triggered the charge or the payout.
export async function completeCollaboration(
  ctx: any,
  { collabId, contractId, creatorId }: { collabId?: string; contractId?: string; creatorId?: string },
) {
  if (collabId) {
    const collab = await ctx.db.get(collabId as any).catch(() => null);
    // Idempotent: completing twice must not create a second fee record.
    if ((collab as any)?.status === 'completed') return;
    // Move to the Closed stage — that's where both sides rate each other.
    const stages = (() => { try { return JSON.parse((collab as any)?.stages || '{}'); } catch { return {}; } })();
    const stage = (collab as any)?.current_stage;
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (stage !== 'closed' && stage !== 'archived') {
      for (const k of ['pending', 'accepted', 'updated', 'uploaded_tagged']) {
        if (!stages[k]?.completed) stages[k] = { ...(stages[k] || {}), completed: true, date: stages[k]?.date || date };
      }
    }
    await ctx.db.patch(collabId as any, {
      status: 'completed',
      status_text: 'Completed',
      is_active: false,
      ...(stage !== 'closed' && stage !== 'archived' ? { current_stage: 'closed', stages: JSON.stringify(stages) } : {}),
    });
  }

  // ── Fee record + charge at completion ─────────────────────────────────
  // Founding hosts get a $0 waived fee record, but chargeContractFee still runs:
  // it waives the platform fee itself and collects the creator's cash payout.
  const contract = contractId
    ? await ctx.db.query("contracts").filter((q: any) => q.eq(q.field("_id"), contractId)).first()
    : null;

  if (contractId && contract) {
    const cashValue = parseFloat(String(contract.payment ?? '').replace(/[^0-9.]/g, '')) || 0;

    let isFoundingHost = false;
    if (contract.host_id) {
      const host = await ctx.db.get(contract.host_id as any);
      isFoundingHost = host?.is_founder === true || host?.is_lifetime === true;
    }

    await ctx.runMutation(internal.fees.recordCompletionFee, {
      collaborationId: collabId as any,
      contractId,
      cashValue,
      isFoundingHost,
    });
  }

  const creator = creatorId ?? contract?.creator_id;
  if (!creator) return;
  const profile = await ctx.db.get(creator as any);
  if (profile && !profile.first_collab_completed) {
    await ctx.db.patch(profile._id, { first_collab_completed: true });
  }
}

export const markCompleted = mutation({
  args: {
    // Optional: the local collab layer (CollabContext) doesn't always hold the
    // Convex collab _id, so completion can be recorded by creatorId alone.
    id: v.optional(v.string()),
    creatorId: v.optional(v.string()),
    // Optional linked contract — schedules the host platform-fee charge on completion.
    contractId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.creatorId) await requireOwnerOrAdmin(ctx, args.creatorId);
    await completeCollaboration(ctx, { collabId: args.id, contractId: args.contractId, creatorId: args.creatorId });
  },
});

const STAGE_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  updated: "Adjustments",
  uploaded_tagged: "Uploaded",
  closed: "Closed",
  archived: "Archived",
};

export const advanceStage = mutation({
  args: {
    id: v.string(),
    nextStage: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuthedProfile(ctx);
    const collab = await ctx.db
      .query("collaborations")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
    if (!collab) return;

    const isParty = String(profile._id) === String(collab.creator_id)
      || (collab.host_id && String(profile._id) === String(collab.host_id));
    if (profile.is_admin !== true && !isParty) {
      throw new ConvexError("You don't have permission to do that.");
    }

    const now = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const stages = collab.stages ? JSON.parse(collab.stages) : {};
    stages[args.nextStage] = {
      ...(stages[args.nextStage] || {}),
      completed: true,
      date: now,
    };

    await ctx.db.patch(collab._id, {
      current_stage: args.nextStage,
      stages: JSON.stringify(stages),
    });

    // The Accepted move already sends pitch_approved from the pitch decision.
    if (args.nextStage !== "accepted") {
      const isCreator = String(profile._id) === String(collab.creator_id);
      const recipientId = isCreator ? collab.host_id : collab.creator_id;
      if (recipientId) {
        const label = STAGE_LABELS[args.nextStage] || args.nextStage;
        await ctx.runMutation(internal.notifications.create, {
          userId: String(recipientId),
          type: "collab_stage_changed",
          title: `Collab moved to ${label}`,
          body: `${profile.full_name || "Your collaborator"} moved ${collab.property_name || "your collab"} to ${label}.`,
          link: isCreator ? "/host/proposals" : "/collabs",
        });
      }
    }
  },
});

// Per-stage data a party records without advancing (the creator's deliverables
// link, revision notes). Persisted here so the other party actually sees it.
export const updateStageData = mutation({
  args: {
    id: v.string(),
    stageKey: v.string(),
    driveUrl: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile, collab, party } = await loadCollabAsParty(ctx, args.id);
    const stages = collab.stages ? JSON.parse(collab.stages) : {};
    stages[args.stageKey] = {
      ...(stages[args.stageKey] || {}),
      ...(args.note !== undefined ? { note: args.note } : {}),
      ...(args.driveUrl !== undefined ? { drive_url: args.driveUrl } : {}),
    };
    const linkChanged = args.driveUrl !== undefined && args.driveUrl !== (collab.drive_url || "");
    await ctx.db.patch(collab._id, {
      stages: JSON.stringify(stages),
      ...(args.driveUrl !== undefined ? { drive_url: args.driveUrl } : {}),
    });

    if (linkChanged && args.driveUrl) {
      const recipientId = party === "creator" ? collab.host_id : collab.creator_id;
      if (recipientId) {
        await ctx.runMutation(internal.notifications.create, {
          userId: String(recipientId),
          type: "deliverables_submitted",
          title: party === "creator" ? "Deliverables ready to review" : "Deliverables link updated",
          body: `${profile.full_name || "Your collaborator"} shared the deliverables for ${collab.property_name || "your collab"}.`,
          link: party === "creator" ? "/host/proposals" : "/collabs",
        });
      }
    }
  },
});

// ─── Termination (mutual consent) ─────────────────────────────────────────────
// Once a collab is accepted neither side can end it alone: one party requests,
// the other confirms. Either party may withdraw their own pending request.
async function loadCollabAsParty(ctx: any, id: string) {
  const profile = await requireAuthedProfile(ctx);
  const collab = await ctx.db
    .query("collaborations")
    .filter((q: any) => q.eq(q.field("_id"), id))
    .first();
  if (!collab) throw new ConvexError("Collaboration not found.");

  const isCreator = String(profile._id) === String(collab.creator_id);
  const isHost = !!collab.host_id && String(profile._id) === String(collab.host_id);
  if (profile.is_admin !== true && !isCreator && !isHost) {
    throw new ConvexError("You don't have permission to do that.");
  }
  return { profile, collab, party: isHost ? "host" : "creator" };
}

export const requestTermination = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const { collab, party } = await loadCollabAsParty(ctx, id);
    if (collab.termination_requested_by) return; // already pending
    await ctx.db.patch(collab._id, {
      termination_requested_by: party,
      termination_requested_at: Date.now(),
    });
  },
});

export const cancelTermination = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const { collab, party } = await loadCollabAsParty(ctx, id);
    // Only the side that asked can withdraw the request.
    if (collab.termination_requested_by !== party) {
      throw new ConvexError("Only the party who requested termination can withdraw it.");
    }
    await ctx.db.patch(collab._id, {
      termination_requested_by: undefined,
      termination_requested_at: undefined,
    });
  },
});

export const confirmTermination = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const { collab, party } = await loadCollabAsParty(ctx, id);
    if (!collab.termination_requested_by) {
      throw new ConvexError("No termination has been requested for this collaboration.");
    }
    // The confirming party must be the *other* side — you can't approve your own request.
    if (collab.termination_requested_by === party) {
      throw new ConvexError("The other party still needs to confirm this termination.");
    }
    const stages = collab.stages ? JSON.parse(collab.stages) : {};
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    stages.archived = { ...(stages.archived || {}), completed: true, date: now, note: "Collaboration terminated by mutual agreement" };

    await ctx.db.patch(collab._id, {
      current_stage: "archived",
      status: "terminated",
      status_text: "Terminated",
      is_active: false,
      stages: JSON.stringify(stages),
      terminated_at: Date.now(),
      termination_requested_by: undefined,
      termination_requested_at: undefined,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuthedProfile(ctx);
    const collab = await ctx.db
      .query("collaborations")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
    if (!collab) return;

    const isParty = String(profile._id) === String(collab.creator_id)
      || (collab.host_id && String(profile._id) === String(collab.host_id));
    if (profile.is_admin !== true && !isParty) {
      throw new ConvexError("You don't have permission to do that.");
    }

    await ctx.db.delete(collab._id);
  },
});

// Creator's private CRM metadata: pin, note, archive. Only touches creator_*
// fields, so the host's view of the collab is unchanged.
export const setCreatorCrm = mutation({
  args: {
    id: v.id("collaborations"),
    pinned: v.optional(v.boolean()),
    note: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, pinned, note, archived }) => {
    const collab = await ctx.db.get(id);
    if (!collab) throw new ConvexError("Collaboration not found.");
    await requireOwnerOrAdmin(ctx, collab.creator_id);
    const patch: Record<string, any> = {};
    if (pinned !== undefined) patch.creator_pinned = pinned;
    if (note !== undefined) patch.creator_note = note.trim().slice(0, 500) || undefined;
    if (archived !== undefined) patch.creator_archived = archived;
    await ctx.db.patch(id, patch);
  },
});
