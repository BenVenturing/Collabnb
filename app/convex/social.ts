import { v } from "convex/values";
import { query, action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireAdmin, requireAdminAction, canAccessAdmin } from "./lib/auth";

// ─── Social connectors ────────────────────────────────────────────────────────
// Instagram requires a Business/Creator account linked to a Facebook Page and a
// Meta developer app. TikTok requires a TikTok for Developers app (Display API).
//
// Required Convex environment variables (set when ready):
//   npx convex env set META_ACCESS_TOKEN EAAG...          (long-lived IG Graph token)
//   npx convex env set IG_BUSINESS_ACCOUNT_ID 1784...     (IG business account id)
//   npx convex env set TIKTOK_ACCESS_TOKEN act....        (TikTok Display API token)

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    return await ctx.db.query("social_accounts").collect();
  },
});

export const getPosts = query({
  args: { platform: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { platform, limit = 30 }) => {
    if (!(await canAccessAdmin(ctx))) return [];
    let rows = platform
      ? await ctx.db
          .query("social_posts")
          .withIndex("by_platform", (q) => q.eq("platform", platform))
          .collect()
      : await ctx.db.query("social_posts").collect();
    rows.sort((a, b) => (b.posted_at ?? 0) - (a.posted_at ?? 0));
    return rows.slice(0, limit);
  },
});

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return {};
    const posts = await ctx.db.query("social_posts").collect();
    const summarize = (platform: string) => {
      const list = posts.filter((p) => p.platform === platform);
      const total = (key: "likes" | "comments" | "views" | "reach") =>
        list.reduce((sum, p) => sum + (p[key] ?? 0), 0);
      return {
        posts: list.length,
        likes: total("likes"),
        comments: total("comments"),
        views: total("views"),
        reach: total("reach"),
      };
    };
    return { instagram: summarize("instagram"), tiktok: summarize("tiktok") };
  },
});

// ─── Internal persistence ─────────────────────────────────────────────────────

export const upsertAccount = internalMutation({
  args: {
    platform: v.string(),
    handle: v.string(),
    accountId: v.optional(v.string()),
    connected: v.boolean(),
    followerCount: v.optional(v.number()),
    followingCount: v.optional(v.number()),
    mediaCount: v.optional(v.number()),
    profilePicUrl: v.optional(v.string()),
    syncError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("social_accounts")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .first();
    const doc = {
      platform: args.platform,
      handle: args.handle,
      account_id: args.accountId,
      connected: args.connected,
      follower_count: args.followerCount,
      following_count: args.followingCount,
      media_count: args.mediaCount,
      profile_pic_url: args.profilePicUrl,
      last_synced_at: Date.now(),
      sync_error: args.syncError,
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("social_accounts", doc);
  },
});

export const upsertPosts = internalMutation({
  args: {
    posts: v.array(
      v.object({
        platform: v.string(),
        external_id: v.string(),
        caption: v.optional(v.string()),
        media_type: v.optional(v.string()),
        media_url: v.optional(v.string()),
        thumbnail_url: v.optional(v.string()),
        permalink: v.optional(v.string()),
        posted_at: v.optional(v.number()),
        likes: v.optional(v.number()),
        comments: v.optional(v.number()),
        shares: v.optional(v.number()),
        saves: v.optional(v.number()),
        views: v.optional(v.number()),
        reach: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { posts }) => {
    for (const post of posts) {
      const existing = await ctx.db
        .query("social_posts")
        .withIndex("by_external", (q) => q.eq("external_id", post.external_id))
        .first();
      const doc = { ...post, synced_at: Date.now() };
      if (existing) await ctx.db.patch(existing._id, doc);
      else await ctx.db.insert("social_posts", doc);
    }
    return { synced: posts.length };
  },
});

// ─── Sync actions (activate once API keys are set) ────────────────────────────

export const syncInstagram = action({
  args: {},
  handler: async (ctx): Promise<{ synced: number; followers?: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const token = process.env.META_ACCESS_TOKEN;
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!token || !igId) {
      throw new Error(
        "Instagram is not connected. Set META_ACCESS_TOKEN and IG_BUSINESS_ACCOUNT_ID in the Convex environment (see the Social tab setup guide)."
      );
    }

    const base = "https://graph.facebook.com/v21.0";

    const profileRes = await fetch(
      `${base}/${igId}?fields=username,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`
    );
    if (!profileRes.ok) {
      const detail = await profileRes.text().catch(() => "");
      await ctx.runMutation(internal.social.upsertAccount, {
        platform: "instagram",
        handle: "instagram",
        connected: false,
        syncError: `Profile fetch failed (${profileRes.status})`,
      });
      throw new Error(`Instagram profile fetch failed (${profileRes.status}): ${detail.slice(0, 200)}`);
    }
    const profile = await profileRes.json();

    const mediaRes = await fetch(
      `${base}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${token}`
    );
    const media = mediaRes.ok ? await mediaRes.json() : { data: [] };

    const posts = (media.data || []).map((m: any) => ({
      platform: "instagram",
      external_id: String(m.id),
      caption: m.caption ? String(m.caption).slice(0, 500) : undefined,
      media_type: m.media_type,
      media_url: m.media_url,
      thumbnail_url: m.thumbnail_url,
      permalink: m.permalink,
      posted_at: m.timestamp ? new Date(m.timestamp).getTime() : undefined,
      likes: m.like_count,
      comments: m.comments_count,
    }));

    await ctx.runMutation(internal.social.upsertAccount, {
      platform: "instagram",
      handle: profile.username || "instagram",
      accountId: String(igId),
      connected: true,
      followerCount: profile.followers_count,
      followingCount: profile.follows_count,
      mediaCount: profile.media_count,
      profilePicUrl: profile.profile_picture_url,
    });
    await ctx.runMutation(internal.social.upsertPosts, { posts });

    return { synced: posts.length, followers: profile.followers_count };
  },
});

export const syncTikTok = action({
  args: {},
  handler: async (ctx): Promise<{ synced: number; followers?: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        "TikTok is not connected. Set TIKTOK_ACCESS_TOKEN in the Convex environment (see the Social tab setup guide)."
      );
    }

    const profileRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,video_count",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!profileRes.ok) {
      const detail = await profileRes.text().catch(() => "");
      await ctx.runMutation(internal.social.upsertAccount, {
        platform: "tiktok",
        handle: "tiktok",
        connected: false,
        syncError: `Profile fetch failed (${profileRes.status})`,
      });
      throw new Error(`TikTok profile fetch failed (${profileRes.status}): ${detail.slice(0, 200)}`);
    }
    const profileData = await profileRes.json();
    const user = profileData?.data?.user || {};

    const videosRes = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ max_count: 20 }),
      }
    );
    const videosData = videosRes.ok ? await videosRes.json() : { data: { videos: [] } };
    const videos = videosData?.data?.videos || [];

    const posts = videos.map((vd: any) => ({
      platform: "tiktok",
      external_id: String(vd.id),
      caption: vd.title ? String(vd.title).slice(0, 500) : undefined,
      media_type: "VIDEO",
      thumbnail_url: vd.cover_image_url,
      permalink: vd.share_url,
      posted_at: vd.create_time ? vd.create_time * 1000 : undefined,
      likes: vd.like_count,
      comments: vd.comment_count,
      shares: vd.share_count,
      views: vd.view_count,
    }));

    await ctx.runMutation(internal.social.upsertAccount, {
      platform: "tiktok",
      handle: user.display_name || "tiktok",
      accountId: user.open_id ? String(user.open_id) : undefined,
      connected: true,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      mediaCount: user.video_count,
      profilePicUrl: user.avatar_url,
    });
    await ctx.runMutation(internal.social.upsertPosts, { posts });

    return { synced: posts.length, followers: user.follower_count };
  },
});

// ─── Inbox: Instagram DMs + post comments, unified for in-app reply ───────────
// Requires instagram_manage_messages + instagram_manage_comments on the same
// META_ACCESS_TOKEN already used for analytics — no separate env var.

export const getInboxItems = query({
  args: { onlyUnreplied: v.optional(v.boolean()) },
  handler: async (ctx, { onlyUnreplied }) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const rows = onlyUnreplied
      ? await ctx.db.query("social_inbox").withIndex("by_replied", (q) => q.eq("replied", false)).collect()
      : await ctx.db.query("social_inbox").collect();
    rows.sort((a, b) => b.created_at - a.created_at);
    return rows;
  },
});

export const getRecentInstagramPostIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("social_posts")
      .withIndex("by_platform", (q) => q.eq("platform", "instagram"))
      .collect();
    rows.sort((a, b) => (b.posted_at ?? 0) - (a.posted_at ?? 0));
    return rows.slice(0, 15).map((r) => ({ external_id: r.external_id, permalink: r.permalink }));
  },
});

export const getInboxItemInternal = internalQuery({
  args: { id: v.id("social_inbox") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const upsertInboxItems = internalMutation({
  args: {
    items: v.array(
      v.object({
        platform: v.string(),
        kind: v.union(v.literal("dm"), v.literal("comment")),
        thread_id: v.string(),
        external_id: v.string(),
        from_username: v.optional(v.string()),
        text: v.optional(v.string()),
        post_permalink: v.optional(v.string()),
        created_at: v.number(),
      })
    ),
  },
  handler: async (ctx, { items }) => {
    let inserted = 0;
    for (const item of items) {
      const existing = await ctx.db
        .query("social_inbox")
        .withIndex("by_external", (q) => q.eq("external_id", item.external_id))
        .first();
      if (existing) continue; // don't clobber reply state on re-sync
      await ctx.db.insert("social_inbox", { ...item, replied: false });
      inserted++;
    }
    return { inserted };
  },
});

export const markReplied = internalMutation({
  args: { id: v.id("social_inbox"), replyText: v.string() },
  handler: async (ctx, { id, replyText }) => {
    await ctx.db.patch(id, { replied: true, reply_text: replyText, replied_at: Date.now() });
  },
});

export const syncInbox = action({
  args: {},
  handler: async (ctx): Promise<{ synced: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const token = process.env.META_ACCESS_TOKEN;
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!token || !igId) {
      throw new Error("Instagram is not connected. Set META_ACCESS_TOKEN and IG_BUSINESS_ACCOUNT_ID first.");
    }
    const base = "https://graph.facebook.com/v21.0";
    const items: Array<{
      platform: string;
      kind: "dm" | "comment";
      thread_id: string;
      external_id: string;
      from_username?: string;
      text?: string;
      post_permalink?: string;
      created_at: number;
    }> = [];

    // DMs — list conversations, then pull recent messages in each.
    const convRes = await fetch(
      `${base}/${igId}/conversations?platform=instagram&fields=participants&limit=25&access_token=${token}`
    );
    if (convRes.ok) {
      const convData = await convRes.json();
      for (const conv of convData.data || []) {
        const other = (conv.participants?.data || []).find((p: any) => String(p.id) !== String(igId));
        const msgRes = await fetch(
          `${base}/${conv.id}?fields=messages.limit(10){id,from,message,created_time}&access_token=${token}`
        );
        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();
        for (const m of msgData.messages?.data || []) {
          if (String(m.from?.id) === String(igId)) continue; // skip our own outgoing messages
          items.push({
            platform: "instagram",
            kind: "dm",
            thread_id: String(conv.id),
            external_id: String(m.id),
            from_username: other?.username || m.from?.username,
            text: m.message,
            created_at: m.created_time ? new Date(m.created_time).getTime() : Date.now(),
          });
        }
      }
    }

    // Comments — only on posts already synced via "Sync now" above.
    const recentPosts = await ctx.runQuery(internal.social.getRecentInstagramPostIds, {});
    for (const post of recentPosts) {
      const cRes = await fetch(
        `${base}/${post.external_id}/comments?fields=id,text,username,timestamp&limit=25&access_token=${token}`
      );
      if (!cRes.ok) continue;
      const cData = await cRes.json();
      for (const c of cData.data || []) {
        items.push({
          platform: "instagram",
          kind: "comment",
          thread_id: String(post.external_id),
          external_id: String(c.id),
          from_username: c.username,
          text: c.text,
          post_permalink: post.permalink,
          created_at: c.timestamp ? new Date(c.timestamp).getTime() : Date.now(),
        });
      }
    }

    const { inserted } = await ctx.runMutation(internal.social.upsertInboxItems, { items });
    return { synced: inserted };
  },
});

export const sendReply = action({
  args: { id: v.id("social_inbox"), replyText: v.string() },
  handler: async (ctx, { id, replyText }): Promise<{ success: boolean }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const token = process.env.META_ACCESS_TOKEN;
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!token || !igId) throw new Error("Instagram is not connected.");
    const item: any = await ctx.runQuery(internal.social.getInboxItemInternal, { id });
    if (!item) throw new Error("Message not found.");

    const base = "https://graph.facebook.com/v21.0";
    if (item.kind === "comment") {
      const res = await fetch(`${base}/${item.external_id}/replies?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Reply failed (${res.status}): ${detail.slice(0, 300)}`);
      }
    } else {
      const convRes = await fetch(`${base}/${item.thread_id}?fields=participants&access_token=${token}`);
      if (!convRes.ok) throw new Error("Could not resolve this conversation's participant.");
      const convData = await convRes.json();
      const other = (convData.participants?.data || []).find((p: any) => String(p.id) !== String(igId));
      if (!other) throw new Error("Could not find the other participant in this conversation.");
      const res = await fetch(`${base}/${igId}/messages?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: other.id }, message: { text: replyText } }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Reply failed (${res.status}): ${detail.slice(0, 300)}`);
      }
    }

    await ctx.runMutation(internal.social.markReplied, { id, replyText });
    return { success: true };
  },
});

// ─── Publish: post a new photo or Reel to Instagram from Collabnb ─────────────
// Requires instagram_content_publish on the same META_ACCESS_TOKEN.

async function finishInstagramPublish(base: string, igId: string, token: string, creationId: string) {
  const pubRes = await fetch(`${base}/${igId}/media_publish?creation_id=${creationId}&access_token=${token}`, {
    method: "POST",
  });
  if (!pubRes.ok) {
    const detail = await pubRes.text().catch(() => "");
    throw new Error(`Publish failed (${pubRes.status}): ${detail.slice(0, 300)}`);
  }
  const { id: mediaId } = await pubRes.json();
  const permRes = await fetch(`${base}/${mediaId}?fields=permalink&access_token=${token}`);
  const permalink = permRes.ok ? (await permRes.json()).permalink : undefined;
  return { published: true, permalink };
}

export const publishPost = action({
  args: {
    caption: v.string(),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("IMAGE"), v.literal("REEL")),
  },
  handler: async (
    ctx,
    { caption, mediaUrl, mediaType }
  ): Promise<{ published: boolean; permalink?: string; creationId?: string; message?: string }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const token = process.env.META_ACCESS_TOKEN;
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!token || !igId) throw new Error("Instagram is not connected.");
    const base = "https://graph.facebook.com/v21.0";

    const createParams = new URLSearchParams({ caption, access_token: token });
    if (mediaType === "REEL") {
      createParams.set("media_type", "REELS");
      createParams.set("video_url", mediaUrl);
    } else {
      createParams.set("image_url", mediaUrl);
    }
    const createRes = await fetch(`${base}/${igId}/media`, { method: "POST", body: createParams });
    if (!createRes.ok) {
      const detail = await createRes.text().catch(() => "");
      throw new Error(`Could not create post (${createRes.status}): ${detail.slice(0, 300)}`);
    }
    const { id: creationId } = await createRes.json();

    if (mediaType === "IMAGE") {
      return await finishInstagramPublish(base, igId, token, creationId);
    }

    // Reels process asynchronously on Instagram's side — poll briefly, else
    // hand the creationId back so the admin can finish publishing shortly after.
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(`${base}/${creationId}?fields=status_code&access_token=${token}`);
      const status = statusRes.ok ? (await statusRes.json()).status_code : null;
      if (status === "FINISHED") return await finishInstagramPublish(base, igId, token, creationId);
      if (status === "ERROR") throw new Error("Instagram failed to process the video.");
    }
    return {
      published: false,
      creationId,
      message: "Still processing on Instagram's side — click Publish again in a minute.",
    };
  },
});

export const finishPublish = action({
  args: { creationId: v.string() },
  handler: async (ctx, { creationId }): Promise<{ published: boolean; permalink?: string; message?: string }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const token = process.env.META_ACCESS_TOKEN;
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!token || !igId) throw new Error("Instagram is not connected.");
    const base = "https://graph.facebook.com/v21.0";
    const statusRes = await fetch(`${base}/${creationId}?fields=status_code&access_token=${token}`);
    const status = statusRes.ok ? (await statusRes.json()).status_code : null;
    if (status !== "FINISHED") return { published: false, message: "Still processing — try again shortly." };
    return await finishInstagramPublish(base, igId, token, creationId);
  },
});

// ─── Integration status (which API keys are configured) ──────────────────────
// Lets the admin UI show configured/missing state without exposing key values.

export const getIntegrationStatus = action({
  args: {},
  handler: async (ctx): Promise<Record<string, boolean>> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    return {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      clerkWebhook: !!process.env.CLERK_WEBHOOK_SECRET,
      nvidia: !!process.env.NVIDIA_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      scrapegraph: !!process.env.SGAI_API_KEY,
      firecrawl: !!process.env.FIRECRAWL_API_KEY,
      unsplash: !!process.env.UNSPLASH_ACCESS_KEY,
      apify: !!process.env.APIFY_API_TOKEN,
      instagram: !!process.env.META_ACCESS_TOKEN && !!process.env.IG_BUSINESS_ACCOUNT_ID,
      tiktok: !!process.env.TIKTOK_ACCESS_TOKEN,
      resend: !!process.env.RESEND_API_KEY,
    };
  },
});
