import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { recordEarningForContract } from "./ambassadors";
import { mergedCopy, fill } from "./emailCopy";
import { requireAdmin, requireOwnerOrAdmin, requireAuthedProfile, canAccessAdmin, canAccessOwner } from "./lib/auth";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    return await ctx.db.query("contracts").collect();
  },
});

// Admin: permanently delete a contract.
export const remove = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, { contractId }) => {
    await requireAdmin(ctx);
    const contract = await ctx.db.get(contractId);
    if (!contract) return { deleted: false, reason: "not_found" };
    await ctx.db.delete(contractId);
    return { deleted: true };
  },
});

// Admin: mark/unmark a contract as handled, hiding it from the Overview
// "awaiting signatures" count without deleting the record.
export const setHandled = mutation({
  args: { contractId: v.id("contracts"), handled: v.boolean() },
  handler: async (ctx, { contractId, handled }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(contractId, {
      admin_dismissed: handled,
      admin_dismissed_at: handled ? Date.now() : undefined,
    });
    return { ok: true };
  },
});

export const getByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    if (!(await canAccessOwner(ctx, args.ownerId))) return [];
    return await ctx.db
      .query("contracts")
      .withIndex("by_owner", (q) => q.eq("owner_id", args.ownerId))
      .collect();
  },
});

// Contracts where the user is the owner, the host, or the creator (de-duped).
export const getForParty = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!(await canAccessOwner(ctx, userId))) return [];
    const [owned, asHost, asCreator] = await Promise.all([
      ctx.db.query("contracts").withIndex("by_owner", (q) => q.eq("owner_id", userId)).collect(),
      ctx.db.query("contracts").withIndex("by_host", (q) => q.eq("host_id", userId)).collect(),
      ctx.db.query("contracts").withIndex("by_creator", (q) => q.eq("creator_id", userId)).collect(),
    ]);
    const byId = new Map<string, any>();
    for (const c of [...owned, ...asHost, ...asCreator]) byId.set(String(c._id), c);
    return Array.from(byId.values());
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
    checkIn: v.optional(v.number()),
    checkOut: v.optional(v.number()),
    deliverables: v.optional(v.string()),
    currency: v.optional(v.string()),
    payment: v.optional(v.string()),
    cashValue: v.optional(v.number()),
    payoutHandling: v.optional(v.union(v.literal("platform"), v.literal("in_person"))),
    usageRights: v.optional(v.string()),
    status: v.string(),
    creatorSigned: v.optional(v.boolean()),
    hostSigned: v.optional(v.boolean()),
    summaryNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.ownerId) await requireOwnerOrAdmin(ctx, args.ownerId);
    return await ctx.db.insert("contracts", {
      owner_id: args.ownerId,
      host_id: args.hostId,
      creator_id: args.creatorId,
      creator_name: args.creatorName,
      host_name: args.hostName,
      property_name: args.propertyName,
      location: args.location,
      dates: args.dates,
      check_in: args.checkIn,
      check_out: args.checkOut,
      deliverables: args.deliverables,
      currency: args.currency,
      payment: args.payment,
      cash_value: args.cashValue,
      payout_handling: args.payoutHandling,
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
      check_in: v.optional(v.number()),
      check_out: v.optional(v.number()),
      deliverables: v.optional(v.string()),
      currency: v.optional(v.string()),
      payment: v.optional(v.string()),
      cash_value: v.optional(v.number()),
      payout_handling: v.optional(v.union(v.literal("platform"), v.literal("in_person"))),
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
    const before = await ctx.db.get(args.id as any);
    if (before) {
      const b = before as any;
      const caller = await requireAuthedProfile(ctx);
      const me = String(caller._id);
      const isParty = [b.owner_id, b.host_id, b.creator_id].some((p) => p === me);
      if (caller.is_admin !== true && !isParty) {
        throw new Error("You don't have permission to do that.");
      }
      // A party to the contract may only sign their own side — being a party
      // (owner/host/creator) grants edit access to the shared fields above,
      // not the ability to sign on the other party's behalf.
      if (caller.is_admin !== true) {
        if (args.updates.creator_signed !== undefined && caller.role === "host") {
          throw new Error("Only the creator can sign as creator.");
        }
        if (args.updates.host_signed !== undefined && caller.role !== "host") {
          throw new Error("Only the host can sign as host.");
        }
      }
    }
    const cleanUpdates: Record<string, any> = Object.fromEntries(
      Object.entries(args.updates).filter(([, val]) => val !== undefined)
    );

    // Stamp signature timestamps on the transition false → true.
    const nowIso = new Date().toISOString();
    if (before) {
      if (cleanUpdates.creator_signed && !(before as any).creator_signed && !cleanUpdates.creator_signed_at) {
        cleanUpdates.creator_signed_at = nowIso;
      }
      if (cleanUpdates.host_signed && !(before as any).host_signed && !cleanUpdates.host_signed_at) {
        cleanUpdates.host_signed_at = nowIso;
      }
    }

    await ctx.db.patch(args.id as any, cleanUpdates);

    if (!before) return;
    const after = { ...(before as any), ...cleanUpdates };
    const propertyLabel = after.property_name || after.location || "your collab";

    const creatorJustSigned = !(before as any).creator_signed && after.creator_signed;
    const hostJustSigned = !(before as any).host_signed && after.host_signed;
    const wasFullySigned = (before as any).creator_signed && (before as any).host_signed;
    const isFullySigned = after.creator_signed && after.host_signed;

    if (creatorJustSigned || hostJustSigned) await linkContractToCollab(ctx, after);

    if (isFullySigned && !wasFullySigned) {
      for (const party of ["host", "creator"] as const) {
        await notifyParty(ctx, after, party, {
          type: "contract_signed",
          title: "Contract fully signed 🎉",
          body: `Your contract for ${propertyLabel} is now signed by both parties.`,
          email: {
            subject: "Your contract is fully signed 🎉",
            heading: "Nice work, {name} 🎉",
            message: `Both parties have signed the contract for <strong>${propertyLabel}</strong>. You're all set to move ahead with the collab.`,
            calloutLabel: "What's next",
            calloutText: "Review the signed agreement and coordinate the details in Collabnb.",
          },
        });
      }
    } else if (creatorJustSigned) {
      await notifyParty(ctx, after, "host", {
        type: "contract_signed",
        title: "The creator signed — your turn",
        body: `${after.creator_name || "The creator"} signed the contract for ${propertyLabel}. Sign to finalize it.`,
        email: {
          subject: "The creator signed your contract",
          heading: "Hey {name} 👋",
          message: `${after.creator_name || "The creator"} just signed the contract for <strong>${propertyLabel}</strong>. Add your signature to finalize it.`,
          calloutLabel: "Action needed",
          calloutText: "Open Collabnb to review and sign.",
        },
      });
    } else if (hostJustSigned) {
      await notifyParty(ctx, after, "creator", {
        type: "contract_signed",
        title: "The host signed — your turn",
        body: `${after.host_name || "The host"} signed the contract for ${propertyLabel}. Sign to finalize it.`,
        email: {
          subject: "The host signed your contract",
          heading: "Hey {name} 👋",
          message: `${after.host_name || "The host"} just signed the contract for <strong>${propertyLabel}</strong>. Add your signature to finalize it.`,
          calloutLabel: "Action needed",
          calloutText: "Open Collabnb to review and sign.",
        },
      });
    }
  },
});

export const markSent = mutation({
  args: { id: v.string(), recipientParty: v.optional(v.string()) },
  handler: async (ctx, { id, recipientParty }) => {
    const existing = await ctx.db.get(id as any);
    if (existing) {
      const b = existing as any;
      const caller = await requireAuthedProfile(ctx);
      const me = String(caller._id);
      const isParty = [b.owner_id, b.host_id, b.creator_id].some((p) => p === me);
      if (caller.is_admin !== true && !isParty) {
        throw new Error("You don't have permission to do that.");
      }
    }
    await ctx.db.patch(id as any, { sent_at: Date.now() });

    const contract = await ctx.db.get(id as any);
    if (!contract) return;

    await linkContractToCollab(ctx, contract);

    // The recipient is the party the contract was sent to. When the caller
    // doesn't say, infer from ownership: if the owner is the host, it went to
    // the creator; otherwise it went to the host.
    const party =
      recipientParty ||
      ((contract as any).owner_id && (contract as any).owner_id === (contract as any).host_id
        ? "creator"
        : "host");

    const propertyLabel = (contract as any).property_name || (contract as any).location || "your collab";
    const senderName = party === "creator" ? (contract as any).host_name : (contract as any).creator_name;

    await notifyParty(ctx, contract, party, {
      type: "contract_sent",
      title: "A contract is waiting for your signature",
      body: `${senderName || "A collaborator"} sent you a contract for ${propertyLabel}. Review and sign it.`,
      email: {
        subject: "You've got a contract to sign",
        heading: "Hey {name} 👋",
        message: `${senderName || "A collaborator"} sent you a contract for <strong>${propertyLabel}</strong>. Review the terms and add your signature to move things forward.`,
        calloutLabel: "Action needed",
        calloutText: "Open Collabnb to review and sign your contract.",
      },
    });
  },
});

// ─── Reminder / prompt helpers ───────────────────────────────────────────────

// Resolve the recipient profile id for a party ("host" | "creator"), caching the
// resolved id back onto the contract when found by name match.
async function resolvePartyId(ctx: any, contract: any, party: string): Promise<string | null> {
  if (party === "creator") {
    if (contract.creator_id) return contract.creator_id;
    // owner_id is only a valid creator fallback when the owner isn't the host
    if (contract.owner_id && contract.owner_id !== contract.host_id) return contract.owner_id;
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

// Best-effort: associate a contract with the creator's matching collaboration so
// inbox thread messages have a thread to post into. No-op if already linked or no
// confident match (same creator + same property/location).
// Returns the linked collaboration doc, establishing/backfilling the link
// (both directions) if it can, or null if no confident match exists yet.
// Safe to call repeatedly — cheap no-ops once linked, and callers that only
// need the id can skip straight to contract.linked_collaboration_id without
// paying for the scan below.
async function linkContractToCollab(ctx: any, contract: any): Promise<any | null> {
  if (contract.linked_collaboration_id) {
    const existing = await ctx.db.get(contract.linked_collaboration_id as any);
    if (existing) return existing;
    // Stale reference (collab deleted) — fall through and try to re-resolve.
  }

  const collabs = await ctx.db.query("collaborations").collect();
  const byContractId = collabs.find((cl: any) => String(cl.contract_id) === String(contract._id));
  if (byContractId) {
    if (contract.linked_collaboration_id !== String(byContractId._id)) {
      await ctx.db.patch(contract._id, { linked_collaboration_id: String(byContractId._id) });
    }
    return byContractId;
  }

  const creatorId =
    contract.creator_id ||
    (contract.owner_id && contract.owner_id !== contract.host_id ? contract.owner_id : null);
  const creatorName = (contract.creator_name || "").toLowerCase().trim();
  const prop = (contract.property_name || "").toLowerCase().trim();
  const loc = (contract.location || "").toLowerCase().trim();

  const match = collabs.find((cl: any) => {
    if (cl.contract_id) return false;
    const creatorMatch =
      (creatorId && String(cl.creator_id) === String(creatorId)) ||
      (!!creatorName && (cl.creator_name || "").toLowerCase().trim() === creatorName);
    if (!creatorMatch) return false;
    const propMatch = !!prop && (cl.property_name || "").toLowerCase().trim() === prop;
    const locMatch = !!loc && (cl.location || "").toLowerCase().trim() === loc;
    return propMatch || locMatch;
  });

  if (match) {
    await ctx.db.patch(match._id, { contract_id: String(contract._id) });
    await ctx.db.patch(contract._id, { linked_collaboration_id: String(match._id) });
    return match;
  }
  return null;
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

// Notify one party: in-app notification + (best-effort) inbox thread message + email.
// Returns false when no linked profile could be resolved (degrades silently).
async function notifyParty(
  ctx: any,
  contract: any,
  party: string,
  opts: {
    type: string;
    title: string;
    body: string;
    email?: { subject: string; heading: string; message: string; calloutLabel?: string; calloutText?: string };
  }
): Promise<boolean> {
  const recipientId = await resolvePartyId(ctx, contract, party);
  if (!recipientId) return false;

  await ctx.runMutation(internal.notifications.create, {
    userId: recipientId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: `/contract?open=${String(contract._id)}`,
  });

  await postContractThreadMessage(ctx, contract, party, opts.body);

  if (opts.email) {
    const profile = await ctx.db.get(recipientId as any);
    // Settings > Notifications > Contract updates — gates the email only;
    // the in-app notification + thread message above still fire either way.
    if (profile?.email && (profile as any)?.notification_prefs?.contractUpdates !== false) {
      await ctx.scheduler.runAfter(0, internal.emails.sendContractEmail, {
        to: profile.email,
        recipientName:
          profile.full_name ||
          (party === "creator" ? contract.creator_name : contract.host_name) ||
          "there",
        subject: opts.email.subject,
        heading: opts.email.heading,
        message: opts.email.message,
        calloutLabel: opts.email.calloutLabel,
        calloutText: opts.email.calloutText,
      });
    }
  }
  return true;
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
    await requireAdmin(ctx);
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
      link: `/contract?open=${String(contract._id)}`,
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
          link: `/contract?open=${String(c._id)}`,
        });
        await postContractThreadMessage(ctx, c, party, body);
        sentAny = true;
      }

      if (sentAny) await ctx.db.patch(c._id, { last_reminder_at: now });
    }
  },
});

// Used only when a contract can't be linked to a collaboration/listing at
// all (see the fallback branch below) — a reasonable generic UGC turnaround,
// not meant to be precise.
const DEFAULT_TURNAROUND_DAYS = 7;

// Cron: nudge the creator ~3 days before their deliverable deadline. Fires
// once per contract. Deadline = later signature date + the linked listing's
// turnaround_days — neither contracts nor collaborations store a deadline
// directly, so this walks contract -> collaboration (fuzzy-linked at
// signing, see linkContractToCollab) -> listing to find it.
//
// Safety net: the contract<->collaboration link is best-effort fuzzy
// matching, not a hard foreign key, so it can fail to form at signing time
// (e.g. the collaboration row didn't exist yet). Rather than silently never
// reminding those contracts, this retries the link on every run (cheap,
// idempotent — see linkContractToCollab), and if it still can't resolve a
// listing/turnaround_days, falls back to DEFAULT_TURNAROUND_DAYS from the
// signing date so the creator still gets *a* reminder. collab_reminder_used_fallback
// records which reminders were estimates so it's visible, not hidden.
export const checkCollabReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const reminderWindow = 3 * day;
    const staleCutoff = 14 * day; // don't keep nudging long-abandoned contracts

    const contracts = await ctx.db.query("contracts").collect();

    for (const c of contracts) {
      const status = (c.status || "").toLowerCase();
      if (status === "completed" || status === "cancelled" || status === "draft") continue;
      if (!c.creator_signed || !c.host_signed) continue;
      if (c.collab_reminder_sent_at) continue;
      if (!c.creator_signed_at || !c.host_signed_at) continue;

      const collab = await linkContractToCollab(ctx, c);
      let turnaroundDays: number | undefined;
      let usedFallback = false;

      if (collab) {
        if (collab.is_active === false || collab.current_stage === "completed") continue; // already wrapped up
        const listing = collab.listing_id ? await ctx.db.get(collab.listing_id as any) : null;
        turnaroundDays = (listing as any)?.turnaround_days;
      }
      if (!turnaroundDays || turnaroundDays <= 0) {
        // No collab match, no listing, or no turnaround set on the listing —
        // can't get a precise deadline. Fall back rather than skip silently.
        turnaroundDays = DEFAULT_TURNAROUND_DAYS;
        usedFallback = true;
      }

      const signedAt = Math.max(new Date(c.creator_signed_at).getTime(), new Date(c.host_signed_at).getTime());
      if (Number.isNaN(signedAt)) continue;
      const deadline = signedAt + turnaroundDays * day;

      if (now < deadline - reminderWindow) continue; // not yet time
      if (now > deadline + staleCutoff) continue; // too stale, don't bother

      const recipientId = await resolvePartyId(ctx, c, "creator");
      if (!recipientId) continue;
      const propertyLabel = c.property_name || c.location || "your collab";
      const daysLeft = Math.max(0, Math.ceil((deadline - now) / day));
      const dueLabel = daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
      const body = usedFallback
        ? `Your deliverables for ${propertyLabel} may be due around ${dueLabel === "today" ? "now" : dueLabel} — double check the agreed turnaround.`
        : `Your deliverables for ${propertyLabel} are due ${dueLabel}.`;

      await ctx.runMutation(internal.notifications.create, {
        userId: recipientId,
        type: "collab_reminder",
        title: usedFallback ? "Deliverables may be due soon" : "Deliverables due soon",
        body,
        link: `/contract?open=${String(c._id)}`,
      });
      await postContractThreadMessage(ctx, c, "creator", body);

      const profile = await ctx.db.get(recipientId as any);
      // Settings > Notifications > Collab reminders — gates the email only;
      // the in-app notification + thread message above still fire either way.
      if ((profile as any)?.email && (profile as any)?.notification_prefs?.collabReminders !== false) {
        await ctx.scheduler.runAfter(0, internal.emails.sendContractEmail, {
          to: (profile as any).email,
          recipientName: (profile as any).full_name || c.creator_name || "there",
          subject: usedFallback ? `Deliverables check-in — ${propertyLabel}` : `Deliverables due ${dueLabel} — ${propertyLabel}`,
          heading: "Hey {name} 👋",
          message: usedFallback
            ? `Just a heads up — based on a typical turnaround, your deliverables for <strong>${propertyLabel}</strong> may be coming due soon. Check the terms you agreed on to confirm the exact date.`
            : `Just a heads up — your deliverables for <strong>${propertyLabel}</strong> are due ${dueLabel}, based on the turnaround time for this collab.`,
          calloutLabel: "Wrap up",
          calloutText: "Open Collabnb to upload or confirm your deliverables.",
        });
      }

      await ctx.db.patch(c._id, { collab_reminder_sent_at: now, collab_reminder_used_fallback: usedFallback });
    }
  },
});

// ─── Deferred platform-fee charging (save card at signing, charge on completion) ──

// Stores the host's saved Stripe card + the fee to charge later.
// Internal-only: reachable solely from the Stripe verify action and webhook,
// so a client can never overwrite the card or fee on someone's contract.
export const setHostPayment = internalMutation({
  args: {
    contractId: v.string(),
    customerId: v.string(),
    paymentMethodId: v.string(),
    feeAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.contractId as any);
    if (!exists) return;
    await ctx.db.patch(args.contractId as any, {
      host_stripe_customer_id: args.customerId,
      host_payment_method_id: args.paymentMethodId,
      fee_amount: args.feeAmount,
    });
  },
});

// Read a contract from an action context (the off-session fee charge).
export const getByIdInternal = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as any);
  },
});

// Records a successful fee charge (off-session, checkout, or webhook backstop).
// Idempotent, and the only way a contract can be marked paid — always behind a
// verified Stripe event or a server-side Stripe API check.
export const recordPaymentInternal = internalMutation({
  args: {
    id: v.string(),
    paymentAmount: v.number(),
    paymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const before = await ctx.db.get(args.id as any);
    if (!before || (before as any).paid) return; // already paid → no-op
    const patch: Record<string, any> = {
      paid: true,
      payment_amount: args.paymentAmount,
      fee_charge_failed: false,
    };
    if (args.paymentIntentId !== undefined) patch.payment_intent_id = args.paymentIntentId;
    if (args.stripeSessionId !== undefined) patch.stripe_session_id = args.stripeSessionId;
    await ctx.db.patch(args.id as any, patch);

    const contract = await ctx.db.get(args.id as any);
    if (!contract) return;

    // Ambassador program: credit the regional ambassador their share of this fee.
    try {
      await recordEarningForContract(ctx, contract, args.paymentAmount);
    } catch (err) {
      console.error("ambassador earning failed (payment still recorded):", err);
    }

    const propertyLabel = (contract as any).property_name || (contract as any).location || "your collab";
    const cashValue = parseFloat(String((contract as any).payment ?? "").replace(/[^0-9.]/g, "")) || 0;
    const feeMethod = cashValue >= 500 ? `5% of $${cashValue.toFixed(0)}` : "flat $20 fee";

    // Email copy is editable in Admin → Emails → Templates ({name} filled at send time).
    const vars = { propertyLabel, amount: args.paymentAmount.toFixed(2), feeMethod };
    const creatorCopy = await mergedCopy(ctx.db, "collab_complete_creator");
    const hostCopy = await mergedCopy(ctx.db, "fee_receipt_host");

    await notifyParty(ctx, contract, "creator", {
      type: "contract_paid",
      title: "Collaboration wrapped 🎉",
      body: `The ${propertyLabel} collaboration is complete and the platform fee has been settled.`,
      email: {
        subject: fill(creatorCopy.subject, vars),
        heading: fill(creatorCopy.heading, vars),
        message: fill(creatorCopy.body, vars),
        calloutLabel: fill(creatorCopy.calloutLabel, vars) || undefined,
        calloutText: fill(creatorCopy.calloutText, vars) || undefined,
      },
    });

    await notifyParty(ctx, contract, "host", {
      type: "contract_paid",
      title: "Fee receipt 💸",
      body: `Platform fee of $${args.paymentAmount.toFixed(2)} charged for the completed ${propertyLabel} collaboration.`,
      email: {
        subject: fill(hostCopy.subject, vars),
        heading: fill(hostCopy.heading, vars),
        message: fill(hostCopy.body, vars),
        calloutLabel: fill(hostCopy.calloutLabel, vars) || undefined,
        calloutText: fill(hostCopy.calloutText, vars) || undefined,
      },
    });
  },
});

// Flags a contract whose auto-charge failed, so the host can pay manually.
export const markFeeChargeFailed = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.id as any);
    if (!exists || (exists as any).paid) return;
    await ctx.db.patch(args.id as any, { fee_charge_failed: true });
  },
});

// Records the split of a successful collect-and-forward host charge.
export const setGrossCharge = internalMutation({
  args: {
    id: v.string(),
    grossChargeAmount: v.number(),
    creatorPayoutAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.id as any);
    if (!exists) return;
    await ctx.db.patch(args.id as any, {
      gross_charge_amount: args.grossChargeAmount,
      creator_payout_amount: args.creatorPayoutAmount,
    });
  },
});

// Tracks the state of forwarding the creator's net payout — set after the
// host charge succeeds (stripe.js forwardCreatorPayout / admin Wise payout).
export const setPayoutStatus = internalMutation({
  args: {
    id: v.string(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("paid"), v.literal("failed")),
    method: v.optional(v.union(v.literal("stripe_connect"), v.literal("wise"))),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.id as any);
    if (!exists) return;
    const patch: Record<string, any> = { creator_payout_status: args.status };
    if (args.method !== undefined) patch.creator_payout_method = args.method;
    if (args.reference !== undefined) patch.creator_payout_reference = args.reference;
    if (args.status === "paid") patch.creator_payout_paid_at = Date.now();
    await ctx.db.patch(args.id as any, patch);
  },
});

// Records that the creator's forward has been scheduled (not yet sent) —
// the dispute-resolution hold window before the payout actually fires.
export const schedulePayoutHold = internalMutation({
  args: { id: v.string(), releaseAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, {
      creator_payout_status: "pending",
      creator_payout_release_at: args.releaseAt,
    });
  },
});

// Admin toggle: pause (or resume) a scheduled payout ahead of its release
// time, e.g. because the host/creator raised a dispute.
export const setPayoutHold = mutation({
  args: { contractId: v.string(), held: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.contractId as any, { creator_payout_held: args.held });
  },
});

// Called from the Wise webhook when a previously-"paid" transfer later
// bounces/reverses — reality overriding the optimistic status set right
// after sendWisePayout's synchronous quote→transfer→fund calls succeeded.
export const markPayoutFailedByReference = internalMutation({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_payout_reference", (q) => q.eq("creator_payout_reference", args.reference))
      .unique();
    if (!contract) return;
    await ctx.db.patch(contract._id, { creator_payout_status: "failed" });
  },
});

export const markHostReceiptSent = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { host_receipt_sent_at: Date.now() });
  },
});

export const markCreatorReceiptSent = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { creator_receipt_sent_at: Date.now() });
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
