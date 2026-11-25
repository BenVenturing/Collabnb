import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// App Store review demo accounts. Run once from the CLI:
//   npx convex run --prod reviewDemo:setup '{"password":"..."}'
// Re-running is safe: existing Clerk users and profiles are reused, and the
// password is reset to the one passed in.
const ACCOUNTS = [
  { email: "appreview-creator@collabnb.com", first: "Avery", last: "Creator", role: "creator" },
  { email: "appreview-host@collabnb.com", first: "Jordan", last: "Host", role: "host" },
] as const;

async function clerk(path: string, init: RequestInit = {}) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set");
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clerk ${path}: ${JSON.stringify(body)}`);
  return body;
}

export const setup = internalAction({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const ids: Record<string, string> = {};
    for (const a of ACCOUNTS) {
      const found = await clerk(`/users?email_address=${encodeURIComponent(a.email)}`);
      let user = found[0];
      if (user) {
        await clerk(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ password, skip_password_checks: true }),
        });
      } else {
        user = await clerk("/users", {
          method: "POST",
          body: JSON.stringify({
            email_address: [a.email],
            username: a.email.split("@")[0].replace(/-/g, "_"),
            password,
            first_name: a.first,
            last_name: a.last,
            skip_password_checks: true,
          }),
        });
      }
      ids[a.role] = user.id;
    }
    return await ctx.runMutation(internal.reviewDemo.upsertProfiles, {
      creatorClerkId: ids.creator,
      hostClerkId: ids.host,
    });
  },
});

export const upsertProfiles = internalMutation({
  args: { creatorClerkId: v.string(), hostClerkId: v.string() },
  handler: async (ctx, { creatorClerkId, hostClerkId }) => {
    const now = Date.now();
    const out: Record<string, string> = {};
    for (const a of ACCOUNTS) {
      const common = {
        full_name: `${a.first} ${a.last}`,
        role: a.role,
        clerk_user_id: a.role === "creator" ? creatorClerkId : hostClerkId,
        clerk_registered: true,
        is_verified: true,
        is_rejected: undefined,
        access_state: "active",
      };
      const extra =
        a.role === "creator"
          ? {
              creator_verified: true,
              creator_track: "ugc",
              tier: "UGC Pro",
              bio: "Travel creator filming boutique stays. (App Review demo account)",
              follower_count: 25000,
              creator_approved_at: now,
            }
          : { host_verified: true, bio: "Boutique stay host. (App Review demo account)" };
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", a.email))
        .first();
      let id;
      if (existing) {
        await ctx.db.patch(existing._id, { ...common, ...extra } as any);
        id = existing._id;
      } else {
        id = await ctx.db.insert("profiles", {
          ...common,
          ...extra,
          email: a.email,
          username: a.email.split("@")[0],
        } as any);
      }
      out[a.role] = String(id);
    }

    // Give the host one listing by copying a sample stay. It stays a sample
    // (is_sample) so it never shows up as a real stay to real creators.
    const hostListings = await ctx.db
      .query("listings")
      .filter((q) => q.eq(q.field("host_id"), out.host))
      .collect();
    if (hostListings.length === 0) {
      const sample = await ctx.db
        .query("listings")
        .filter((q) => q.eq(q.field("is_sample"), true))
        .first();
      if (sample) {
        const { _id, _creationTime, ...fields } = sample as any;
        await ctx.db.insert("listings", {
          ...fields,
          host_id: out.host,
          host_name: "Jordan Host",
          is_sample: true,
        });
      }
    }
    return out;
  },
});
