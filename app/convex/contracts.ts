import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contracts").collect();
  },
});

export const getByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contracts")
      .withIndex("by_owner", (q) => q.eq("owner_id", args.ownerId))
      .collect();
  },
});

export const save = mutation({
  args: {
    ownerId: v.optional(v.string()),
    hostId: v.optional(v.string()),
    creatorId: v.optional(v.string()),
    creatorName: v.string(),
    hostName: v.string(),
    propertyName: v.optional(v.string()),
    location: v.optional(v.string()),
    dates: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    currency: v.optional(v.string()),
    payment: v.optional(v.string()),
    usageRights: v.optional(v.string()),
    status: v.string(),
    creatorSigned: v.optional(v.boolean()),
    hostSigned: v.optional(v.boolean()),
    summaryNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contracts", {
      owner_id: args.ownerId,
      host_id: args.hostId,
      creator_id: args.creatorId,
      creator_name: args.creatorName,
      host_name: args.hostName,
      property_name: args.propertyName,
      location: args.location,
      dates: args.dates,
      deliverables: args.deliverables,
      currency: args.currency,
      payment: args.payment,
      usage_rights: args.usageRights,
      status: args.status,
      creator_signed: args.creatorSigned,
      host_signed: args.hostSigned,
      summary_note: args.summaryNote,
    });
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    updates: v.object({
      host_id: v.optional(v.string()),
      creator_id: v.optional(v.string()),
      creator_name: v.optional(v.string()),
      host_name: v.optional(v.string()),
      property_name: v.optional(v.string()),
      location: v.optional(v.string()),
      dates: v.optional(v.string()),
      deliverables: v.optional(v.string()),
      currency: v.optional(v.string()),
      payment: v.optional(v.string()),
      usage_rights: v.optional(v.string()),
      status: v.optional(v.string()),
      creator_signed: v.optional(v.boolean()),
      host_signed: v.optional(v.boolean()),
      creator_signed_at: v.optional(v.string()),
      host_signed_at: v.optional(v.string()),
      summary_note: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(args.updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(args.id as any, cleanUpdates);
  },
});

export const recordPayment = mutation({
  args: {
    id: v.string(),
    paid: v.boolean(),
    paymentAmount: v.number(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, {
      paid: args.paid,
      payment_amount: args.paymentAmount,
      stripe_session_id: args.stripeSessionId,
    });
  },
});

export const markSent = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { sent_at: Date.now() });
  },
});

// ─── Reminder / prompt helpers ───────────────────────────────────────────────

// Resolve the recipient profile id for a party ("host" | "creator"), caching the
// resolved id back onto the contract when found by name match.
async function resolvePartyId(ctx: any, contract: any, party: string): Promise<string | null> {
  if (party === "creator") {
    if (contract.creator_id) return contract.creator_id;
    if (contract.owner_id) return contract.owner_id;
  } else if (contract.host_id) {
    return contract.host_id;
  }
  const name = party === "creator" ? contract.creator_name : contract.host_name;
  if (!name) return null;
  const profiles = await ctx.db.query("profiles").collect();
  const match = profiles.find(
    (p: any) => p.full_name?.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (!match) return null;
  const id = String(match._id);
  await ctx.db.patch(contract._id, party === "creator" ? { creator_id: id } : { host_id: id });
  return id;
}

// Best-effort: drop a message into the contract's inbox thread (via the linked collab).
async function postContractThreadMessage(ctx: any, contract: any, party: string, text: string) {
  const collabs = await ctx.db.query("collaborations").collect();
  const collab = collabs.find((cl: any) => String(cl.contract_id) === String(contract._id));
  if (!collab || !collab.listing_id || !collab.creator_id) return;
  const threadKey = `thread_${collab.listing_id}_${collab.creator_id}`;
  // The "sender" is the party still waiting on the nudged party.
  const senderRole = party === "host" ? "creator" : "host";
  const senderName = party === "host" ? contract.creator_name : contract.host_name;
  await ctx.db.insert("thread_messages", {
    thread_key: threadKey,
    sender_id: "system",
    sender_name: senderName || "Collabnb",
    sender_avatar: undefined,
    sender_role: senderRole,
    text,
    created_at: Date.now(),
  });
}

function reminderCopy(party: string, propertyLabel: string) {
  if (party === "host") {
    return {
      title: "A contract is waiting for your signature",
      body: `The creator is waiting for you to sign the contract for ${propertyLabel} or send a proposal back in response.`,
    };
  }
  return {
    title: "A contract is waiting for your signature",
    body: `The host is waiting for you to sign the contract for ${propertyLabel}.`,
  };
}

// Admin-triggered manual nudge to one party.
export const promptParty = mutation({
  args: { contractId: v.string(), party: v.string() },
  handler: async (ctx, { contractId, party }) => {
    const contract = await ctx.db.get(contractId as any);
    if (!contract) return { ok: false, reason: "not_found" };
    const recipientId = await resolvePartyId(ctx, contract, party);
    if (!recipientId) return { ok: false, reason: "no_account" };

    const propertyLabel = (contract as any).property_name || (contract as any).location || "your collab";
    const { title, body } = reminderCopy(party, propertyLabel);

    await ctx.runMutation(internal.notifications.create, {
      userId: recipientId,
      type: "contract_reminder",
      title,
      body,
      link: "#/collabs",
    });
    await postContractThreadMessage(ctx, contract, party, body);
    return { ok: true };
  },
});

// Cron: nudge unsigned parties on contracts that have been waiting 3+ days,
// recurring every ~3 days via the last_reminder_at gate.
export const checkContractReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const contracts = await ctx.db.query("contracts").collect();

    for (const c of contracts) {
      const status = (c.status || "").toLowerCase();
      if (status === "completed" || status === "cancelled" || status === "draft") continue;
      const bothSigned = c.creator_signed && c.host_signed;
      if (bothSigned) continue;

      const baseline = c.last_reminder_at || c.sent_at || c._creationTime;
      if (now - baseline < threeDays) continue;

      const propertyLabel = c.property_name || c.location || "your collab";
      let sentAny = false;

      for (const party of ["host", "creator"] as const) {
        const alreadySigned = party === "host" ? c.host_signed : c.creator_signed;
        if (alreadySigned) continue;
        const recipientId = await resolvePartyId(ctx, c, party);
        if (!recipientId) continue;
        const { title, body } = reminderCopy(party, propertyLabel);
        await ctx.runMutation(internal.notifications.create, {
          userId: recipientId,
          type: "contract_reminder",
          title,
          body,
          link: "#/collabs",
        });
        await postContractThreadMessage(ctx, c, party, body);
        sentAny = true;
      }

      if (sentAny) await ctx.db.patch(c._id, { last_reminder_at: now });
    }
  },
});

// One-time backfill: fill host_id / creator_id from name matches.
export const backfillContractParties = internalMutation({
  args: {},
  handler: async (ctx) => {
    const contracts = await ctx.db.query("contracts").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const byName = new Map<string, string>();
    for (const p of profiles) {
      if (p.full_name) byName.set(p.full_name.toLowerCase().trim(), String(p._id));
    }
    let filled = 0;
    for (const c of contracts) {
      const updates: Record<string, string> = {};
      if (!c.creator_id) {
        const id = c.owner_id || byName.get((c.creator_name || "").toLowerCase().trim());
        if (id) updates.creator_id = id;
      }
      if (!c.host_id) {
        const id = byName.get((c.host_name || "").toLowerCase().trim());
        if (id) updates.host_id = id;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(c._id, updates);
        filled++;
      }
    }
    return { filled, total: contracts.length };
  },
});
