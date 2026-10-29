// Collabnb MCP server — lets a user run their own account from an AI agent
// (Claude, Codex, Grok, Hermes, anything that speaks MCP over HTTP). The
// JSON-RPC transport lives in http.ts (POST /mcp); this file owns API keys
// and the tools themselves.
//
// Every tool runs as the key's owner by re-using the app's own query/mutation
// handlers with ctx.auth swapped for that owner's identity (asUser), so all
// existing permission checks, verification gates, sanitizing and rate limits
// apply exactly as they do in the app — nothing here re-implements them.
//
// Deliberately out of scope for agents: payments, contract signing,
// publishing listings, marking collabs complete and account changes. Those
// stay human-only in the app.

import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuthedProfileAction, requireAuthedProfile, getAuthedProfile } from "./lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { withSurfacedErrors } from "./lib/errors";
import * as listings from "./listings";
import * as threads from "./threads";
import * as threadMessages from "./threadMessages";
import * as collections from "./collections";
import * as pitches from "./pitches";
import * as collaborations from "./collaborations";
import * as reviews from "./reviews";
import * as notifications from "./notifications";
import { draftForOwner } from "./aiAssistant";

const MAX_KEYS = 5;
// Private beta: only admin accounts can create or use keys. Flip to false
// (and drop the isAdmin check on the Settings link) to open it to everyone.
export const MCP_ADMIN_ONLY = false;

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Key management (called from Settings → Agent access) ──────────────────

// An action, not a mutation: Convex seeds randomness inside queries and
// mutations, so only an action gets real entropy for a secret.
export const createApiKey = action({
  args: { name: v.string() },
  handler: withSurfacedErrors(async (ctx, { name }) => {
    const caller = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    if (MCP_ADMIN_ONLY && caller.is_admin !== true) throw new ConvexError("Agent access isn't available on your account yet.");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "cnb_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.runMutation(internal.mcp.insertKey, {
      ownerId: String(caller._id),
      name: name.trim().slice(0, 60) || "Agent",
      keyHash: await sha256Hex(key),
      keyPrefix: key.slice(0, 10),
    });
    return key;
  }),
});

export const insertKey = internalMutation({
  args: { ownerId: v.string(), name: v.string(), keyHash: v.string(), keyPrefix: v.string() },
  handler: async (ctx, { ownerId, name, keyHash, keyPrefix }) => {
    const existing = await ctx.db
      .query("mcp_api_keys")
      .withIndex("by_owner", (q) => q.eq("owner_id", ownerId))
      .collect();
    if (existing.length >= MAX_KEYS) {
      throw new ConvexError(`You can have up to ${MAX_KEYS} agent keys — revoke one first.`);
    }
    await ctx.db.insert("mcp_api_keys", {
      owner_id: ownerId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      created_at: Date.now(),
    });
  },
});

export const listMyKeys = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getAuthedProfile(ctx);
    if (!profile) return [];
    const rows = await ctx.db
      .query("mcp_api_keys")
      .withIndex("by_owner", (q) => q.eq("owner_id", String(profile._id)))
      .collect();
    return rows.map((r) => ({
      id: r._id,
      name: r.name,
      prefix: r.key_prefix,
      created_at: r.created_at,
      last_used_at: r.last_used_at ?? null,
    }));
  },
});

export const revokeKey = mutation({
  args: { id: v.id("mcp_api_keys") },
  handler: async (ctx, { id }) => {
    const profile = await requireAuthedProfile(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.owner_id !== String(profile._id)) throw new ConvexError("Key not found.");
    await ctx.db.delete(id);
  },
});

// ─── Used by the /mcp http route ───────────────────────────────────────────

export const resolveKey = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, { keyHash }) => {
    const row = await ctx.db
      .query("mcp_api_keys")
      .withIndex("by_hash", (q) => q.eq("key_hash", keyHash))
      .unique();
    if (!row) return null;
    const profile: any = await ctx.db.get(row.owner_id as any);
    if (!profile || profile.is_deleted === true) return null;
    if (MCP_ADMIN_ONLY && profile.is_admin !== true) return null;
    return { keyId: row._id, profileId: String(profile._id) };
  },
});

// OAuth path: the bearer is a Clerk-issued access token already verified in
// http.ts; `subject` is the Clerk user id.
export const resolveClerkUser = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const profile: any = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerkUserId))
      .first();
    if (!profile || profile.is_deleted === true) return null;
    if (MCP_ADMIN_ONLY && profile.is_admin !== true) return null;
    return { keyId: null, profileId: String(profile._id) };
  },
});

export const checkOAuthVerifyBudget = internalMutation({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    await enforceRateLimit(ctx, `mcp-oauth:${ip}`, RATE_LIMITS.MCP_OAUTH_VERIFY);
  },
});

export const recordCall = internalMutation({
  args: { keyId: v.optional(v.id("mcp_api_keys")), profileId: v.string() },
  handler: async (ctx, { keyId, profileId }) => {
    await enforceRateLimit(ctx, `mcp:${profileId}`, RATE_LIMITS.MCP_CALL);
    if (!keyId) return;
    const row = await ctx.db.get(keyId);
    if (row && (!row.last_used_at || Date.now() - row.last_used_at > 5 * 60 * 1000)) {
      await ctx.db.patch(keyId, { last_used_at: Date.now() });
    }
  },
});

// ─── Tool plumbing ─────────────────────────────────────────────────────────

// Runs an existing registered query/mutation's handler in-process with the
// key owner as the authenticated caller. `_handler` is Convex's own field on
// registered functions (convex/server registration_impl) — if a Convex upgrade
// ever renames it, every MCP tool fails loudly here rather than misbehaving.
function asUser(ctx: any, profile: any) {
  const identity = { subject: profile.clerk_user_id ?? `mcp:${profile._id}`, email: profile.email };
  return { ...ctx, auth: { getUserIdentity: async () => identity } };
}
function run(fn: any, ctx: any, args: Record<string, unknown>) {
  if (typeof fn?._handler !== "function") throw new Error("MCP: Convex handler not reachable — check convex version.");
  return fn._handler(ctx, args);
}

function str(args: any, key: string, { required = false, max = 5000 } = {}): string | undefined {
  const val = args?.[key];
  if (val === undefined || val === null || val === "") {
    if (required) throw new ConvexError(`"${key}" is required.`);
    return undefined;
  }
  if (typeof val !== "string") throw new ConvexError(`"${key}" must be a string.`);
  return val.slice(0, max);
}
function num(args: any, key: string, { required = false } = {}): number | undefined {
  const val = args?.[key];
  if (val === undefined || val === null) {
    if (required) throw new ConvexError(`"${key}" is required.`);
    return undefined;
  }
  const n = typeof val === "string" ? Number(val) : val;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new ConvexError(`"${key}" must be a number.`);
  return n;
}
const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : null);
const clip = (s: unknown, n: number) => (typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s);
const isHost = (p: any) => p.role === "host";

function listingSummary(l: any) {
  return {
    id: String(l._id),
    title: l.title,
    location: l.location_full ?? l.location,
    status: l.status ?? null,
    property_type: l.property_type ?? null,
    compensation_type: l.compensation_type ?? null,
    cash_amount: l.cash_amount ?? null,
    currency: l.currency ?? "USD",
    nights: l.nights ?? null,
    creator_tier: l.creator_tier ?? null,
    creator_track: l.creator_track ?? null,
    date_ranges: l.date_ranges ?? null,
    url: `https://collabnb.com/listing/${String(l._id)}`,
  };
}

async function loadProfile(ctx: any, profileId: string) {
  const profile: any = await ctx.db.get(profileId as any);
  if (!profile) throw new ConvexError("Account not found.");
  return profile;
}

async function inbox(c: any) {
  const [incoming, mine] = await Promise.all([
    run(threads.getIncomingForMe, c, {}),
    run(threads.getMine, c, {}),
  ]);
  const seen = new Set<string>();
  return [...incoming, ...mine].filter((t: any) => {
    if (!t.thread_key || seen.has(t.thread_key)) return false;
    seen.add(t.thread_key);
    return true;
  });
}

// ─── Read tools ────────────────────────────────────────────────────────────

export const runRead = internalQuery({
  args: { profileId: v.string(), tool: v.string(), args: v.any() },
  handler: async (ctx, { profileId, tool, args }) => {
    const me = await loadProfile(ctx, profileId);
    const c = asUser(ctx, me);
    const myId = String(me._id);

    switch (tool) {
      case "whoami":
        return {
          id: myId,
          name: me.full_name,
          username: me.username,
          role: me.role,
          verified: me.is_verified === true,
          tier: me.tier ?? null,
          is_founder: me.is_founder === true,
        };

      case "search_listings": {
        const limit = Math.min(Math.max(num(args, "limit") ?? 20, 1), 50);
        const rows = await run(listings.search, c, {
          location: str(args, "location", { max: 100 }),
          property_type: str(args, "property_type", { max: 50 }),
          collab_type: str(args, "collab_type", { max: 50 }),
          creator_tier: str(args, "creator_tier", { max: 30 }),
        });
        const maxCash = num(args, "max_cash");
        const minCash = num(args, "min_cash");
        return rows
          .filter((l: any) => l.status === "published")
          .filter((l: any) => minCash === undefined || (l.cash_amount ?? 0) >= minCash)
          .filter((l: any) => maxCash === undefined || (l.cash_amount ?? 0) <= maxCash)
          .slice(0, limit)
          .map(listingSummary);
      }

      case "get_listing": {
        const id = str(args, "listing_id", { required: true, max: 64 })!;
        const listing = await run(listings.getById, c, { id, viewerId: myId });
        if (!listing) throw new ConvexError("Listing not found.");
        const { gallery_images, image, ...rest } = listing as any;
        return { ...rest, id: String(listing._id), url: `https://collabnb.com/listing/${String(listing._id)}` };
      }

      case "get_listing_reviews": {
        const id = str(args, "listing_id", { required: true, max: 64 })!;
        const rows = await run(reviews.getForListing, c, { listingId: id });
        return rows.map((r: any) => ({ ...r, created_at: iso(r.created_at) }));
      }

      case "list_my_listings": {
        if (!isHost(me)) throw new ConvexError("Only hosts have listings.");
        const rows = await run(listings.getByHost, c, { host_id: myId });
        return rows.filter((l: any) => !l.is_sample).map(listingSummary);
      }

      case "list_inbox": {
        const rows = await inbox(c);
        const unreadOnly = args?.unread_only === true;
        return rows
          .filter((t: any) => !unreadOnly || t.unread > 0)
          .map((t: any) => ({
            thread_key: t.thread_key,
            with: t.host_name,
            listing: t.listing_title,
            tag: t.tag,
            unread: t.unread > 0,
            last_message: clip(t.last_message, 200),
            last_activity: t.timestamp,
          }));
      }

      case "read_thread": {
        const threadKey = str(args, "thread_key", { required: true, max: 200 })!;
        const limit = Math.min(Math.max(num(args, "limit") ?? 50, 1), 200);
        const msgs = await run(threadMessages.getByThread, c, { threadKey });
        if (msgs.length === 0) return { thread_key: threadKey, messages: [], note: "No messages, or you're not part of this thread." };
        return {
          thread_key: threadKey,
          messages: msgs.slice(-limit).map((m: any) => ({
            from: m.sender_id === myId ? "me" : m.sender_name,
            role: m.sender_role,
            text: m.text,
            sent_at: iso(m.created_at),
          })),
        };
      }

      case "list_saved": {
        const cols = await run(collections.getByUser, c, { creatorId: myId });
        return Promise.all(
          cols.map(async (col: any) => ({
            collection_id: String(col._id),
            name: col.name,
            listings: (
              await Promise.all(
                col.listing_ids.map(async (id: string) => {
                  const nid = ctx.db.normalizeId("listings", id);
                  const l = nid ? await ctx.db.get(nid) : null;
                  return l ? listingSummary(l) : null;
                })
              )
            ).filter(Boolean),
          }))
        );
      }

      case "list_applications": {
        const status = str(args, "status", { max: 30 });
        const rows = isHost(me)
          ? await run(pitches.getByHost, c, { hostId: myId })
          : await run(pitches.getByCreator, c, { creatorId: myId });
        return rows
          .filter((p: any) => !status || p.status === status)
          .map((p: any) => ({
            id: String(p._id),
            listing_id: p.listing_id,
            listing_title: p.listing_title,
            creator_name: p.creator_name,
            creator_username: p.creator_username ?? null,
            creator_tier: p.creator_tier ?? null,
            creator_followers: p.creator_followers ?? null,
            creator_engagement: p.creator_engagement ?? null,
            creator_platforms: p.creator_platforms ?? [],
            status: p.status,
            type: p.type,
            message: clip(p.message, 400),
            thread_key: p.thread_key ?? null,
            created_at: iso(p.created_at),
          }));
      }

      case "list_collaborations": {
        const rows = isHost(me)
          ? await run(collaborations.getByHost, c, { hostId: myId })
          : await run(collaborations.getByCreator, c, { creatorId: myId });
        return rows
          .filter((r: any) => !r.is_sample)
          .map((r: any) => ({
            id: String(r._id),
            property: r.property_name,
            location: r.location,
            status: r.status,
            stage: r.current_stage,
            active: r.is_active,
            dates: r.dates ?? null,
            payment: r.payment ?? null,
            creator_name: r.creator_name ?? null,
            host_name: r.host_name ?? null,
          }));
      }

      case "list_notifications": {
        const rows = await run(notifications.getForUser, c, { userId: myId });
        const unreadOnly = args?.unread_only === true;
        return rows
          .filter((r: any) => !unreadOnly || !r.read)
          .map((r: any) => ({
            id: String(r._id),
            type: r.type,
            title: r.title,
            body: r.body ?? null,
            read: r.read,
            created_at: iso(r.created_at),
          }));
      }

      case "get_my_stats": {
        const host = isHost(me);
        const [apps, collabs, threadRows] = await Promise.all([
          host ? run(pitches.getByHost, c, { hostId: myId }) : run(pitches.getByCreator, c, { creatorId: myId }),
          host ? run(collaborations.getByHost, c, { hostId: myId }) : run(collaborations.getByCreator, c, { creatorId: myId }),
          inbox(c),
        ]);
        const count = (rows: any[], key: string) =>
          rows.reduce((acc: Record<string, number>, r: any) => ((acc[r[key] ?? "unknown"] = (acc[r[key] ?? "unknown"] ?? 0) + 1), acc), {});
        const realCollabs = collabs.filter((r: any) => !r.is_sample);

        // Ratings this user received = reviews on their collabs written by the other side.
        const otherRole = host ? "creator" : "host";
        let ratingSum = 0;
        let ratingCount = 0;
        for (const col of realCollabs) {
          const rs = await ctx.db.query("reviews").withIndex("by_collab", (q: any) => q.eq("collab_id", String(col._id))).collect();
          for (const r of rs) if (r.reviewer_role === otherRole) { ratingSum += r.rating; ratingCount++; }
        }

        const stats: Record<string, unknown> = {
          role: me.role,
          applications_total: apps.length,
          applications_by_status: count(apps, "status"),
          collaborations_total: realCollabs.length,
          collaborations_active: realCollabs.filter((r: any) => r.is_active).length,
          collaborations_by_stage: count(realCollabs, "current_stage"),
          rating_average: ratingCount ? +(ratingSum / ratingCount).toFixed(2) : null,
          rating_count: ratingCount,
          inbox_threads: threadRows.length,
          inbox_unread: threadRows.filter((t: any) => t.unread > 0).length,
        };
        if (host) {
          const mine = (await run(listings.getByHost, c, { host_id: myId })).filter((l: any) => !l.is_sample);
          stats.listings_total = mine.length;
          stats.listings_by_status = count(mine, "status");
          stats.applications_per_listing = mine.map((l: any) => ({
            listing: l.title,
            applications: apps.filter((p: any) => p.listing_id === String(l._id)).length,
          }));
        } else {
          stats.pitches_used_this_month = await run(pitches.getCount, c, { userId: myId });
        }
        return stats;
      }

      default:
        throw new ConvexError(`Unknown tool: ${tool}`);
    }
  },
});

// ─── Write tools ───────────────────────────────────────────────────────────

async function findOrCreateCollection(ctx: any, c: any, myId: string, name?: string) {
  const cols = await run(collections.getByUser, c, { creatorId: myId });
  if (name) {
    const hit = cols.find((col: any) => col.name.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
    const id = await run(collections.create, c, { name, creatorId: myId });
    return await ctx.db.get(id);
  }
  if (cols[0]) return cols[0];
  const id = await run(collections.create, c, { name: "Saved", creatorId: myId });
  return await ctx.db.get(id);
}

export const runWrite = internalMutation({
  args: { profileId: v.string(), tool: v.string(), args: v.any() },
  handler: async (ctx, { profileId, tool, args }) => {
    const me = await loadProfile(ctx, profileId);
    const c = asUser(ctx, me);
    const myId = String(me._id);

    switch (tool) {
      case "send_message": {
        const threadKey = str(args, "thread_key", { required: true, max: 200 })!;
        const text = str(args, "text", { required: true, max: 3000 })!.trim();
        if (!text) throw new ConvexError('"text" can\'t be empty.');
        await run(threadMessages.sendMessage, c, {
          threadKey,
          senderId: myId,
          senderName: me.full_name,
          senderAvatar: me.avatar_url,
          senderRole: isHost(me) ? "host" : "creator",
          text,
        });
        await run(threads.markReadByMe, c, { threadKey });
        return { sent: true, thread_key: threadKey };
      }

      case "mark_thread_read": {
        const threadKey = str(args, "thread_key", { required: true, max: 200 })!;
        return { marked: await run(threads.markReadByMe, c, { threadKey }) };
      }

      case "save_listing": {
        const listingId = str(args, "listing_id", { required: true, max: 64 })!;
        const nid = ctx.db.normalizeId("listings", listingId);
        if (!nid || !(await ctx.db.get(nid))) throw new ConvexError("Listing not found.");
        const col: any = await findOrCreateCollection(ctx, c, myId, str(args, "collection_name", { max: 60 }));
        if (!col.listing_ids.includes(listingId)) {
          await run(collections.toggleSave, c, { collectionId: String(col._id), listingId });
        }
        return { saved: true, collection: col.name };
      }

      case "unsave_listing": {
        const listingId = str(args, "listing_id", { required: true, max: 64 })!;
        const cols = await run(collections.getByUser, c, { creatorId: myId });
        const removedFrom: string[] = [];
        for (const col of cols) {
          if (col.listing_ids.includes(listingId)) {
            await run(collections.toggleSave, c, { collectionId: String(col._id), listingId });
            removedFrom.push(col.name);
          }
        }
        return { removed_from: removedFrom };
      }

      case "mark_notifications_read": {
        const id = str(args, "notification_id", { max: 64 });
        if (id) {
          const nid = ctx.db.normalizeId("notifications", id);
          if (!nid) throw new ConvexError("Notification not found.");
          await run(notifications.markRead, c, { id: nid });
          return { marked: 1 };
        }
        await run(notifications.markAllRead, c, { userId: myId });
        return { marked: "all" };
      }

      // Mirrors CollabContext.applyToListing (collab row → thread → pitch),
      // but inside one mutation, so a rejected pitch (unpublished listing,
      // unverified creator, trial ended) rolls back the quota, collab and
      // thread with it instead of leaving orphans.
      case "apply_to_listing": {
        if (isHost(me)) throw new ConvexError("Only creators can apply to listings.");
        const listingId = str(args, "listing_id", { required: true, max: 64 })!;
        const message = str(args, "message", { required: true, max: 3000 })!.trim();
        if (message.length < 20) throw new ConvexError("Write a real pitch — at least a couple of sentences.");
        const nid = ctx.db.normalizeId("listings", listingId);
        const listing: any = nid ? await ctx.db.get(nid) : null;
        if (!listing) throw new ConvexError("Listing not found.");

        const already = await ctx.db
          .query("pitches")
          .withIndex("by_listing", (q: any) => q.eq("listing_id", listingId))
          .filter((q: any) => q.eq(q.field("creator_id"), myId))
          .first();
        if (already) throw new ConvexError(`You've already applied to this listing (status: ${already.status}).`);

        const quota = await run(pitches.checkAndIncrement, c, { userId: myId });
        if (!quota.allowed) throw new ConvexError(`You've used all ${quota.count} applications for this month.`);

        const hostId = listing.host_id ? String(listing.host_id) : undefined;
        const premsgKey = `premsg_${listingId}_${myId}`;
        const premsg = await ctx.db
          .query("threads")
          .withIndex("by_thread_key", (q: any) => q.eq("thread_key", premsgKey))
          .first();
        const threadKey = premsg ? premsgKey : `thread_${listingId}_${myId}`;

        const collaborationId = await run(collaborations.create, c, {
          listingId,
          propertyName: listing.title,
          location: listing.location,
          hostName: listing.host_name,
          image: listing.image,
          deliverables: typeof listing.deliverables === "string" ? listing.deliverables : undefined,
          listingDescription: listing.about,
          pitchMessage: message,
          hostId,
        });
        if (premsg) {
          await ctx.db.patch(premsg._id, { tag: "Application" });
        } else {
          await run(threads.create, c, {
            listingTitle: listing.title,
            hostName: listing.host_name || "Host",
            tag: "Application",
            lastMessage: message.slice(0, 100),
            participantId: hostId,
            threadKey,
          });
        }
        const pitchId = await run(pitches.create, c, {
          listingId,
          listingTitle: listing.title,
          hostId,
          creatorId: myId,
          creatorName: me.full_name || "Creator",
          creatorUsername: me.username,
          creatorAvatar: me.avatar_url,
          creatorTier: me.tier,
          creatorFollowers: me.follower_count,
          creatorEngagement: me.engagement_rate,
          creatorPlatforms: [
            me.instagram_handle && "Instagram",
            me.tiktok_handle && "TikTok",
            me.youtube_handle && "YouTube",
          ].filter(Boolean),
          message,
          type: "application",
          threadKey,
          collaborationId: collaborationId ? String(collaborationId) : undefined,
        });
        return {
          applied: true,
          application_id: String(pitchId),
          thread_key: threadKey,
          applications_used_this_month: quota.count,
        };
      }

      case "review_application": {
        if (!isHost(me)) throw new ConvexError("Only hosts can review applications.");
        const id = str(args, "application_id", { required: true, max: 64 })!;
        const decision = str(args, "decision", { required: true, max: 20 })!;
        // "completed" also exists on pitches but triggers payout — app only.
        if (!["approved", "declined", "under_review"].includes(decision)) {
          throw new ConvexError('"decision" must be approved, declined or under_review.');
        }
        const nid = ctx.db.normalizeId("pitches", id);
        if (!nid) throw new ConvexError("Application not found.");
        await run(pitches.updateStatus, c, { id: nid, status: decision, hostNote: str(args, "note", { max: 1000 }) });
        return { application_id: id, status: decision };
      }

      case "update_listing": {
        if (!isHost(me)) throw new ConvexError("Only hosts can edit listings.");
        const id = str(args, "listing_id", { required: true, max: 64 })!;
        const nid = ctx.db.normalizeId("listings", id);
        if (!nid) throw new ConvexError("Listing not found.");
        const fields: Record<string, unknown> = {
          title: str(args, "title", { max: 150 }),
          location: str(args, "location", { max: 200 }),
          location_city: str(args, "location_city", { max: 100 }),
          location_country: str(args, "location_country", { max: 100 }),
          property_url: str(args, "property_url", { max: 500 }),
          collaboration_brief: str(args, "collaboration_brief", { max: 2000 }),
          compensation_type: str(args, "compensation_type", { max: 10 }),
          cash_amount: num(args, "cash_amount"),
          currency: str(args, "currency", { max: 3 }),
          nights: num(args, "nights"),
          stay_value: num(args, "stay_value"),
          max_offers: num(args, "max_offers"),
          turnaround_days: num(args, "turnaround_days"),
          creator_tier: str(args, "creator_tier", { max: 30 }),
          date_ranges: Array.isArray(args?.date_ranges)
            ? args.date_ranges.slice(0, 3).map((r: any) => ({ startDate: String(r?.startDate ?? ""), endDate: String(r?.endDate ?? "") }))
            : undefined,
        };
        const changed = Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined));
        if (Object.keys(changed).length === 0) throw new ConvexError("Nothing to update — pass at least one field.");
        // No `status` here on purpose: agents can edit but never publish/unpublish.
        await run(listings.update, c, { id: nid, ...changed });
        return { listing_id: id, updated: Object.keys(changed) };
      }

      case "create_listing_draft": {
        if (!isHost(me)) throw new ConvexError("Only hosts can create listings.");
        const compensationType = str(args, "compensation_type", { required: true, max: 10 });
        const dateRanges = Array.isArray(args?.date_ranges)
          ? args.date_ranges.slice(0, 3).map((r: any) => ({ startDate: String(r?.startDate ?? ""), endDate: String(r?.endDate ?? "") }))
          : undefined;
        const id = await run(listings.create, c, {
          title: str(args, "title", { required: true, max: 150 }),
          location: str(args, "location", { required: true, max: 200 }),
          location_city: str(args, "location_city", { max: 100 }),
          location_country: str(args, "location_country", { max: 100 }),
          property_url: str(args, "property_url", { max: 500 }),
          collaboration_brief: str(args, "collaboration_brief", { max: 2000 }),
          compensation_type: compensationType,
          cash_amount: num(args, "cash_amount", { required: true }),
          currency: str(args, "currency", { max: 3 }),
          nights: num(args, "nights"),
          stay_value: num(args, "stay_value"),
          creator_tier: str(args, "creator_tier", { max: 30 }),
          date_ranges: dateRanges,
          host_id: myId,
          host_name: me.full_name,
          status: "draft",
        });
        return {
          listing_id: String(id),
          status: "draft",
          next_step: "Draft saved. Add photos and publish it from the Host Dashboard — agents can't publish listings.",
          dashboard_url: "https://collabnb.com/host",
        };
      }

      default:
        throw new ConvexError(`Unknown tool: ${tool}`);
    }
  },
});

// ─── Action tools (need fetch / an LLM call) ───────────────────────────────

export const threadForDraft = internalQuery({
  args: { profileId: v.string(), threadKey: v.string() },
  handler: async (ctx, { profileId, threadKey }) => {
    const me = await loadProfile(ctx, profileId);
    if (me.is_verified !== true && me.is_admin !== true) {
      throw new ConvexError("Your account is pending verification. AI drafting unlocks once you're approved.");
    }
    const messages = await run(threadMessages.getByThread, asUser(ctx, me), { threadKey });
    return messages.map((m: any) => ({ sender_role: m.sender_role, text: m.text }));
  },
});

export const runAction = internalAction({
  args: { profileId: v.string(), tool: v.string(), args: v.any() },
  handler: async (ctx, { profileId, tool, args }): Promise<unknown> => {
    switch (tool) {
      case "draft_reply": {
        const threadKey = str(args, "thread_key", { required: true, max: 200 })!;
        const messages = await ctx.runQuery(internal.mcp.threadForDraft, { profileId, threadKey });
        if (messages.length === 0) throw new ConvexError("No messages in that thread, or you're not part of it.");
        const { draft } = await draftForOwner(ctx, profileId, messages, str(args, "instruction", { max: 500 }));
        return { thread_key: threadKey, draft, note: "Not sent. Show it to the user, then call send_message if they approve." };
      }
      default:
        throw new ConvexError(`Unknown tool: ${tool}`);
    }
  },
});
