import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { totalPoints, normalizeTierId, calcMidpoint, calcHardFloor, evaluateZone } from "./lib/compensationPoints";
import { requireOwnerOrAdmin, canAccessOwner } from "./lib/auth";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const checkAndIncrement = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireOwnerOrAdmin(ctx, userId);
    const monthKey = currentMonthKey();
    const existing = await ctx.db
      .query("pitch_counts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!existing) {
      await ctx.db.insert("pitch_counts", { user_id: userId, month_key: monthKey, count: 1 });
      return { allowed: true, count: 1 };
    }

    if (existing.month_key !== monthKey) {
      await ctx.db.patch(existing._id, { month_key: monthKey, count: 1 });
      return { allowed: true, count: 1 };
    }

    if (existing.count >= 10) {
      return { allowed: false, count: existing.count };
    }

    const count = existing.count + 1;
    await ctx.db.patch(existing._id, { count });
    return { allowed: true, count };
  },
});

export const getCount = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!(await canAccessOwner(ctx, userId))) return 0;
    const monthKey = currentMonthKey();
    const existing = await ctx.db
      .query("pitch_counts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!existing || existing.month_key !== monthKey) return 0;
    return existing.count;
  },
});

export const create = mutation({
  args: {
    listingId: v.string(),
    listingTitle: v.optional(v.string()),
    hostId: v.optional(v.string()),
    creatorId: v.string(),
    creatorName: v.string(),
    creatorUsername: v.optional(v.string()),
    creatorAvatar: v.optional(v.string()),
    creatorTier: v.optional(v.string()),
    creatorFollowers: v.optional(v.number()),
    creatorEngagement: v.optional(v.number()),
    creatorPlatforms: v.optional(v.array(v.string())),
    message: v.string(),
    type: v.optional(v.string()),
    threadKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.creatorId);
    // Server-side access gate — mirrors the canViewFull rule in listings.ts.
    // The UI hides Apply for locked-out creators, but that's bypassable via a
    // direct mutation call, so it must also be enforced here.
    const creator = await ctx.db.get(args.creatorId as any);
    if (creator && (creator as any).role === "creator" && !(creator as any).is_admin) {
      if ((creator as any).is_verified !== true) {
        throw new Error("Your account must be verified before you can apply to listings.");
      }
      const isFounder = (creator as any).is_founder === true;
      const state = (creator as any).access_state ?? "active";
      if (!(isFounder || state === "trial" || state === "active")) {
        throw new Error("Your trial has ended — subscribe to Creator Plus to keep applying to listings.");
      }
    }

    // Prevent duplicate applications (same creator + listing)
    const existing = await ctx.db
      .query("pitches")
      .withIndex("by_listing", (q) => q.eq("listing_id", args.listingId))
      .filter((q) => q.eq(q.field("creator_id"), args.creatorId))
      .first();
    if (existing) return existing._id;

    const id = await ctx.db.insert("pitches", {
      listing_id: args.listingId,
      listing_title: args.listingTitle,
      host_id: args.hostId,
      creator_id: args.creatorId,
      creator_name: args.creatorName,
      creator_username: args.creatorUsername,
      creator_avatar: args.creatorAvatar,
      creator_tier: args.creatorTier,
      creator_followers: args.creatorFollowers,
      creator_engagement: args.creatorEngagement,
      creator_platforms: args.creatorPlatforms,
      message: args.message,
      status: "pending",
      type: args.type ?? "application",
      created_at: Date.now(),
      thread_key: args.threadKey,
    });

    // Notify host of new application (in-app + email)
    if (args.hostId && args.hostId !== args.creatorId) {
      await ctx.runMutation(internal.notifications.create, {
        userId: args.hostId,
        type: "new_application",
        title: `New application from ${args.creatorName}`,
        body: args.message.length > 80 ? args.message.slice(0, 80) + "…" : args.message,
        link: `#/host/proposals?pitch=${String(id)}`,
      });

      const host = await ctx.db.get(args.hostId as any);
      if ((host as any)?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendApplicationReceivedEmail, {
          hostEmail: (host as any).email,
          hostName: (host as any).full_name || "there",
          creatorName: args.creatorName,
          listingTitle: args.listingTitle || "your listing",
          applicationId: String(id),
        });
      }
    }

    return id;
  },
});

export const getByHost = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) => {
    if (!(await canAccessOwner(ctx, hostId))) return [];
    // Primary: pitches that already have host_id stamped
    const byHostId = await ctx.db
      .query("pitches")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .order("desc")
      .collect();

    // Fallback: find pitches via the host's listings (covers seeded/imported listings
    // that were created before host_id was stamped on the listing itself)
    const hostListings = await ctx.db
      .query("listings")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .collect();

    if (hostListings.length === 0) return byHostId;

    const seen = new Set(byHostId.map((p) => String(p._id)));
    const extra: (typeof byHostId[0])[] = [];

    for (const listing of hostListings) {
      const pitches = await ctx.db
        .query("pitches")
        .withIndex("by_listing", (q) => q.eq("listing_id", String(listing._id)))
        .order("desc")
        .collect();
      pitches.forEach((p) => {
        if (!seen.has(String(p._id))) { seen.add(String(p._id)); extra.push(p); }
      });
    }

    return [...byHostId, ...extra].sort((a, b) => b.created_at - a.created_at);
  },
});

export const getByListing = query({
  args: { listingId: v.string() },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId as any);
    if (!(await canAccessOwner(ctx, (listing as any)?.host_id))) return [];
    return ctx.db
      .query("pitches")
      .withIndex("by_listing", (q) => q.eq("listing_id", listingId))
      .order("desc")
      .collect();
  },
});

export const getByCreator = query({
  args: { creatorId: v.string() },
  handler: async (ctx, { creatorId }) => {
    if (!(await canAccessOwner(ctx, creatorId))) return [];
    return ctx.db
      .query("pitches")
      .withIndex("by_creator", (q) => q.eq("creator_id", creatorId))
      .order("desc")
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("pitches"),
    status: v.string(),
    hostNote: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, hostNote }) => {
    const pitch = await ctx.db.get(id);
    if (!pitch) return;
    await requireOwnerOrAdmin(ctx, pitch.host_id);

    const updates: Record<string, unknown> = { status };
    if (hostNote !== undefined) updates.host_note = hostNote;
    await ctx.db.patch(id, updates);

    if (status === "approved" || status === "declined") {
      const title = status === "approved"
        ? `Your application was approved!`
        : `Application update for ${pitch.listing_title || "your listing"}`;
      const body = status === "approved"
        ? `Congrats! Your pitch for "${pitch.listing_title || "a listing"}" was accepted.`
        : hostNote || "Your application wasn't selected this time.";
      await ctx.runMutation(internal.notifications.create, {
        userId: pitch.creator_id,
        type: status === "approved" ? "pitch_approved" : "pitch_declined",
        title,
        body,
        link: `#/collabs?open=${String(pitch.listing_id)}`,
      });

      const creator = await ctx.db.get(pitch.creator_id as any);
      if ((creator as any)?.email) {
        const host = pitch.host_id ? await ctx.db.get(pitch.host_id as any) : null;
        const hostName = (host as any)?.full_name || "your host";
        const listingTitle = pitch.listing_title || "the listing";
        const creatorName = pitch.creator_name || (creator as any).full_name || "there";
        await ctx.scheduler.runAfter(
          0,
          status === "approved"
            ? internal.emails.sendApplicationAcceptedEmail
            : internal.emails.sendApplicationDeclinedEmail,
          { creatorEmail: (creator as any).email, creatorName, hostName, listingTitle }
        );
      }
    }
  },
});

// ─── Contract negotiation (counter-offers + signatures) ──────────────────────

function emptySignatures() {
  return {
    hostSignature: null, hostSignedAt: null, hostSignedVersion: null,
    creatorSignature: null, creatorSignedAt: null, creatorSignedVersion: null,
  };
}

function parseJSON<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// Look up a recipient profile and schedule a contract email (best-effort; no-op
// without an email address or RESEND_API_KEY).
async function scheduleProposalEmail(
  ctx: any,
  recipientId: string,
  content: { subject: string; heading: string; message: string; calloutLabel?: string; calloutText?: string }
) {
  const profile = await ctx.db.get(recipientId as any);
  if (!(profile as any)?.email) return;
  await ctx.scheduler.runAfter(0, internal.emails.sendContractEmail, {
    to: (profile as any).email,
    recipientName: (profile as any).full_name || "there",
    ...content,
  });
}

// Host or creator proposes revised contract terms — appends a version and
// flips the pending side. Resets signatures so both must re-sign the new terms.
export const sendCounter = mutation({
  args: {
    id: v.id("pitches"),
    fromParty: v.string(),         // 'host' | 'creator'
    fields: v.any(),               // contract terms object
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, fromParty, fields, note }) => {
    const pitch = await ctx.db.get(id);
    if (!pitch) return;
    await requireOwnerOrAdmin(ctx, fromParty === "host" ? pitch.host_id : pitch.creator_id);

    // Three-zone floor — a negotiation can never settle below the hard floor
    // for whatever deliverable set it proposes. Server-side is the source of
    // truth; the pitch UI only warns/disables ahead of this.
    const cashAmount = typeof fields?.cash_amount === "number" ? fields.cash_amount : undefined;
    if (cashAmount !== undefined && cashAmount > 0) {
      const points = Array.isArray(fields?.deliverables) ? totalPoints(fields.deliverables) : 0;
      const tierId = normalizeTierId(pitch.creator_tier);
      const midpoint = tierId ? calcMidpoint(points, tierId) : 0;
      const hardFloor = calcHardFloor(midpoint, 0);
      if (evaluateZone(cashAmount, midpoint, 0) === "red") {
        throw new Error(`This offer is below the minimum for the proposed workload. The minimum is $${Math.round(hardFloor)}.`);
      }
    }

    const history = parseJSON<any[]>(pitch.contract_history, []);
    const version = history.length + 1;
    history.push({ version, fields, modifiedBy: fromParty, timestamp: new Date().toISOString(), note: note || "" });

    await ctx.db.patch(id, {
      contract_history: JSON.stringify(history),
      counter_pending: fromParty === "host" ? "creator" : "host",
      signatures: JSON.stringify(emptySignatures()),
      contract_locked: false,
      status: "under_review",
    });

    // Keep any linked contract in a negotiating (unsigned) state.
    if (pitch.contract_id) {
      await ctx.db.patch(pitch.contract_id as any, {
        status: "sent", creator_signed: false, host_signed: false,
      });
    }

    const recipientId = fromParty === "host" ? pitch.creator_id : pitch.host_id;
    if (recipientId) {
      await ctx.runMutation(internal.notifications.create, {
        userId: recipientId,
        type: "contract_reminder",
        title: fromParty === "host"
          ? "The host proposed changes to your contract"
          : "The creator sent a counter-proposal",
        body: note || "Open proposals to review the updated terms and respond.",
        link: fromParty === "host"
          ? `#/collabs?open=${String(pitch.listing_id)}`
          : `#/host/proposals?pitch=${String(id)}`,
      });

      const listingPart = pitch.listing_title ? ` for <strong>${pitch.listing_title}</strong>` : "";
      await scheduleProposalEmail(ctx, recipientId, {
        subject: fromParty === "host" ? "The host proposed contract changes" : "You received a counter-proposal",
        heading: "Hey {name} 👋",
        message:
          (fromParty === "host"
            ? `The host proposed changes to your contract${listingPart}.`
            : `The creator sent a counter-proposal${listingPart}.`) +
          (note ? ` “${note}”` : "") +
          " Review the updated terms and respond.",
        calloutLabel: "Action needed",
        calloutText: "Open Collabnb to review the proposal and respond.",
      });
    }
  },
});

// Host or creator signs the current contract version. When both sign the same
// version the contract locks and the linked contract record is marked signed.
export const signContract = mutation({
  args: {
    id: v.id("pitches"),
    party: v.string(),             // 'host' | 'creator'
    signerName: v.string(),
  },
  handler: async (ctx, { id, party, signerName }) => {
    const pitch = await ctx.db.get(id);
    if (!pitch) return;
    await requireOwnerOrAdmin(ctx, party === "host" ? pitch.host_id : pitch.creator_id);

    const history = parseJSON<any[]>(pitch.contract_history, []);
    const version = history.length;
    const sigs = parseJSON(pitch.signatures, emptySignatures()) as any;
    const now = new Date().toISOString();

    if (party === "host") {
      sigs.hostSignature = signerName; sigs.hostSignedAt = now; sigs.hostSignedVersion = version;
    } else {
      sigs.creatorSignature = signerName; sigs.creatorSignedAt = now; sigs.creatorSignedVersion = version;
    }
    const bothSigned = !!sigs.hostSignature && !!sigs.creatorSignature &&
                       sigs.hostSignedVersion === sigs.creatorSignedVersion;

    await ctx.db.patch(id, {
      signatures: JSON.stringify(sigs),
      contract_locked: bothSigned,
      status: bothSigned ? "approved" : pitch.status,
      counter_pending: bothSigned ? undefined : pitch.counter_pending,
    });

    if (pitch.contract_id) {
      const cu: Record<string, unknown> = {};
      if (party === "host") { cu.host_signed = true; cu.host_signed_at = now; }
      else { cu.creator_signed = true; cu.creator_signed_at = now; }
      if (bothSigned) cu.status = "signed";
      await ctx.db.patch(pitch.contract_id as any, cu);
    }

    const recipientId = party === "host" ? pitch.creator_id : pitch.host_id;
    if (recipientId) {
      await ctx.runMutation(internal.notifications.create, {
        userId: recipientId,
        type: "contract_reminder",
        title: bothSigned
          ? "Contract fully signed 🎉"
          : `${party === "host" ? "Host" : "Creator"} signed the contract`,
        body: bothSigned
          ? "Both parties have signed. Your collab is locked in."
          : "Open to review and add your signature.",
        link: party === "host"
          ? `#/collabs?open=${String(pitch.listing_id)}`
          : `#/host/proposals?pitch=${String(id)}`,
      });

      const listingPart = pitch.listing_title ? ` for <strong>${pitch.listing_title}</strong>` : "";
      const signer = party === "host" ? "The host" : "The creator";
      await scheduleProposalEmail(
        ctx,
        recipientId,
        bothSigned
          ? {
              subject: "Your contract is fully signed 🎉",
              heading: "Nice work, {name} 🎉",
              message: `Both parties have signed the contract${listingPart}. Your collab is locked in.`,
              calloutLabel: "What's next",
              calloutText: "Review the signed agreement in Collabnb.",
            }
          : {
              subject: `${signer} signed your contract`,
              heading: "Hey {name} 👋",
              message: `${signer} signed the contract${listingPart}. Add your signature to finalize it.`,
              calloutLabel: "Action needed",
              calloutText: "Open Collabnb to review and sign.",
            }
      );
    }
  },
});
