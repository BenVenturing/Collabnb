import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

async function resolveImages(ctx: any, ids: string[] | undefined): Promise<string[]> {
  if (!ids?.length) return [];
  const urls = await Promise.all(
    ids.map(async (id) => {
      if (id.startsWith("http")) return id;
      try { return await ctx.storage.getUrl(id); } catch { return null; }
    })
  );
  return urls.filter(Boolean) as string[];
}

async function withImages(ctx: any, listing: any) {
  const resolved = await resolveImages(ctx, listing.gallery_images);
  return {
    ...listing,
    gallery_images: resolved.length ? resolved : listing.gallery_images,
    image: resolved[0] ?? listing.image ?? undefined,
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    const filtered = listings.filter((l: any) => !l.is_sample);
    return Promise.all(filtered.map((l: any) => withImages(ctx, l)));
  },
});

export const getSamples = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    const samples = listings.filter((l: any) => l.is_sample === true);
    return Promise.all(samples.map((l: any) => withImages(ctx, l)));
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("listings")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
    if (!listing) return null;
    return withImages(ctx, listing);
  },
});

export const getByLocation = query({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("listings")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .collect();
  },
});

export const getByHost = query({
  args: { host_id: v.string() },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_host", (q) => q.eq("host_id", args.host_id))
      .collect();
    return Promise.all(listings.map((l: any) => withImages(ctx, l)));
  },
});

export const search = query({
  args: {
    location: v.optional(v.string()),
    collab_type: v.optional(v.string()),
    property_type: v.optional(v.string()),
    creator_tier: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let listings = (await ctx.db.query("listings").collect()).filter((l: any) => !l.is_sample);

    if (args.location) {
      const q = args.location.toLowerCase();
      listings = listings.filter(
        (l) =>
          l.location.toLowerCase().includes(q) ||
          l.location_full?.toLowerCase().includes(q)
      );
    }
    if (args.collab_type) {
      const q = args.collab_type.toLowerCase();
      listings = listings.filter(
        (l) => l.collab_type?.toLowerCase().includes(q)
      );
    }
    if (args.property_type) {
      const q = args.property_type.toLowerCase();
      listings = listings.filter(
        (l) => l.property_type?.toLowerCase().includes(q)
      );
    }
    if (args.creator_tier) {
      listings = listings.filter(
        (l) => l.creator_tier === args.creator_tier
      );
    }
    if (args.is_featured !== undefined) {
      listings = listings.filter((l) => l.is_featured === args.is_featured);
    }

    return Promise.all(listings.map((l: any) => withImages(ctx, l)));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    location: v.string(),
    host_id: v.optional(v.string()),
    host_name: v.optional(v.string()),
    status: v.optional(v.string()),
    location_city: v.optional(v.string()),
    location_country: v.optional(v.string()),
    property_url: v.optional(v.string()),
    collaboration_brief: v.optional(v.string()),
    compensation_type: v.optional(v.string()),
    cash_amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    max_offers: v.optional(v.number()),
    nights: v.optional(v.number()),
    creator_tier: v.optional(v.string()),
    deliverable_load: v.optional(v.string()),
    image: v.optional(v.string()),
    gallery_images: v.optional(v.array(v.string())),
    amenities: v.optional(v.array(v.object({ icon: v.string(), label: v.string() }))),
    perks: v.optional(v.array(v.string())),
    vibe_tags: v.optional(v.array(v.string())),
    affiliate_code: v.optional(v.string()),
    collab_start: v.optional(v.string()),
    collab_end: v.optional(v.string()),
    turnaround_days: v.optional(v.number()),
    deliverables_list: v.optional(v.array(v.object({
      type: v.string(),
      quantity: v.number(),
      description: v.string(),
      usage_rights: v.optional(v.string()),
    }))),
    deliverable_count: v.optional(v.number()),
    revision_policy: v.optional(v.string()),
    usage_rights: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("listings", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("listings"),
    title: v.optional(v.string()),
    location: v.optional(v.string()),
    host_id: v.optional(v.string()),
    host_name: v.optional(v.string()),
    status: v.optional(v.string()),
    location_city: v.optional(v.string()),
    location_country: v.optional(v.string()),
    property_url: v.optional(v.string()),
    collaboration_brief: v.optional(v.string()),
    compensation_type: v.optional(v.string()),
    cash_amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    max_offers: v.optional(v.number()),
    nights: v.optional(v.number()),
    creator_tier: v.optional(v.string()),
    deliverable_load: v.optional(v.string()),
    image: v.optional(v.string()),
    gallery_images: v.optional(v.array(v.string())),
    amenities: v.optional(v.array(v.object({ icon: v.string(), label: v.string() }))),
    perks: v.optional(v.array(v.string())),
    vibe_tags: v.optional(v.array(v.string())),
    affiliate_code: v.optional(v.string()),
    collab_start: v.optional(v.string()),
    collab_end: v.optional(v.string()),
    turnaround_days: v.optional(v.number()),
    deliverables_list: v.optional(v.array(v.object({
      type: v.string(),
      quantity: v.number(),
      description: v.string(),
      usage_rights: v.optional(v.string()),
    }))),
    deliverable_count: v.optional(v.number()),
    revision_policy: v.optional(v.string()),
    usage_rights: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteListing = mutation({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seedSampleListings = mutation({
  args: {
    host_id: v.string(),
    host_name: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotency guard — skip if samples already exist for this host
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_host", (q) => q.eq("host_id", args.host_id))
      .collect();
    if (existing.some((l: any) => l.is_sample)) return { alreadySeeded: true };

    const samples = [
      {
        title: "Glacier Prime Cabin",
        subtitle: "Rustic cabin in old-growth forest",
        location: "Lake Tahoe, CA",
        property_type: "Cabin",
        is_featured: true,
        compensation: "Free Stay · 3 nights",
        compensation_type: "free",
        collab_type: "UGC Video",
        creator_tier: "UGC Pro",
        deliverables: "3 Reels, 5 Photos, 1 Blog Post",
        deliverable_count: 9,
        deliverable_load: "Moderate",
        dates_available: "Feb–Apr 2026",
        due_days: 14,
        image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=85",
          "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80",
          "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
        ],
        about: "A stunning old-growth forest cabin perched above Lake Tahoe with sweeping mountain and lake views.",
        amenities: [
          { icon: "♨️", label: "Private hot tub" },
          { icon: "🔥", label: "Stone fireplace" },
          { icon: "🏔️", label: "Mountain views" },
        ],
        what_you_get: ["3 nights complimentary stay", "Private hot tub access", "Welcome provisions basket"],
        requirements: ["Minimum 10,000 followers on primary platform", "UGC Pro or higher creator tier"],
        location_full: "Lake Tahoe, El Dorado County, California",
        lat: 38.9399, lng: -119.9772,
        status: "draft",
      },
      {
        title: "Tranquil Waterfront Retreat",
        subtitle: "Patagonian lakefront villa with private infinity pool",
        location: "Bariloche, Argentina",
        property_type: "Villa",
        is_featured: true,
        compensation: "Free Stay · 2 nights",
        compensation_type: "free",
        collab_type: "Instagram Reels",
        creator_tier: "Micro Influencer",
        deliverables: "2 Reels, 8 Photos",
        deliverable_count: 10,
        deliverable_load: "Moderate",
        dates_available: "Jan–Mar 2026",
        due_days: 10,
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85",
          "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
          "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80",
        ],
        about: "A stunning Patagonian lakefront villa perched on the shores of Nahuel Huapi Lake.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🏔️", label: "Andean lake views" },
          { icon: "🛶", label: "Private dock & kayaks" },
        ],
        what_you_get: ["2 nights complimentary stay", "Infinity pool exclusive access", "Private dock & kayak access"],
        requirements: ["Minimum 5,000 followers on Instagram"],
        location_full: "Bariloche, Río Negro Province, Argentina",
        lat: -41.1335, lng: -71.3103,
        status: "draft",
      },
      {
        title: "Mountain Lodge Escape",
        subtitle: "Jungle mountain luxury with panoramic views",
        location: "Chiang Mai, Thailand",
        property_type: "Lodge",
        is_featured: true,
        compensation: "$500 Cash",
        compensation_type: "cash",
        cash_amount: 500,
        collab_type: "YouTube Vlog",
        creator_tier: "UGC Pro",
        deliverables: "5 Reels, 12 Photos, 1 YouTube Vlog",
        deliverable_count: 18,
        deliverable_load: "Heavy",
        dates_available: "Nov–Feb 2026",
        due_days: 21,
        image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85",
          "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
          "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
        ],
        about: "A breathtaking jungle mountain lodge in the hills above Chiang Mai with panoramic views.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🌿", label: "Jungle mountain views" },
          { icon: "🔥", label: "Outdoor fire pit" },
        ],
        what_you_get: ["$500 cash payment upon content approval", "Complimentary 3-night stay", "Daily private chef meals"],
        requirements: ["Minimum 25,000 followers across platforms", "UGC Pro or higher creator tier"],
        location_full: "Chiang Mai, Thailand",
        lat: 18.7883, lng: 98.9853,
        status: "draft",
      },
      {
        title: "Vineyard Wine Estate",
        subtitle: "Private villa on a working South African estate",
        location: "Stellenbosch, South Africa",
        property_type: "Estate",
        is_featured: true,
        compensation: "$800 Cash",
        compensation_type: "cash",
        cash_amount: 800,
        collab_type: "Full Package",
        creator_tier: "Macro",
        deliverables: "3 Reels, 8 Photos, 1 YouTube Video",
        deliverable_count: 12,
        deliverable_load: "Moderate",
        dates_available: "Mar–Nov 2026",
        due_days: 14,
        image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=85",
          "https://images.unsplash.com/photo-1566042351553-52fb6fc0a880?w=800&q=80",
        ],
        about: "An opulent Cape Dutch-style private villa set within a working Stellenbosch wine estate.",
        amenities: [
          { icon: "🍷", label: "Private wine tasting" },
          { icon: "🌿", label: "Vineyard access" },
          { icon: "🏊", label: "Heated estate pool" },
        ],
        what_you_get: ["$800 cash payment upon content approval", "Complimentary 2-night estate stay", "Private vineyard tour"],
        requirements: ["Minimum 100,000 followers on primary platform", "Macro creator tier required"],
        location_full: "Stellenbosch, Western Cape, South Africa",
        lat: -33.9364, lng: 18.8605,
        status: "draft",
      },
      {
        title: "Lakeside Forest Treehouse",
        subtitle: "Elevated treehouse above a private lake",
        location: "Asheville, NC",
        property_type: "Treehouse",
        compensation: "$1,000 Cash",
        compensation_type: "cash",
        cash_amount: 1000,
        collab_type: "Photography",
        creator_tier: "UGC Pro",
        deliverables: "2 Reels, 6 Photos, 2 Stories",
        deliverable_count: 10,
        deliverable_load: "Light",
        dates_available: "Apr–Jun 2026",
        due_days: 7,
        image: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=85",
          "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
        ],
        about: "A one-of-a-kind treehouse elevated 30 feet above a glassy private lake in the Blue Ridge Mountains.",
        amenities: [
          { icon: "🛣️", label: "Kayaks included" },
          { icon: "🌲", label: "Private lake access" },
        ],
        what_you_get: ["$1,000 cash payment upon content approval", "Complimentary 2-night treehouse stay"],
        requirements: ["Minimum 10,000 followers on primary platform"],
        location_full: "Asheville, Buncombe County, North Carolina",
        lat: 35.5951, lng: -82.5515,
        status: "draft",
      },
      {
        title: "Desert Dome Glamping",
        subtitle: "Geodesic dome on the Mediterranean coast",
        location: "Paphos, Cyprus",
        property_type: "Glamping",
        compensation: "$500 Cash",
        compensation_type: "cash",
        cash_amount: 500,
        collab_type: "Instagram Reels",
        creator_tier: "Micro Influencer",
        deliverables: "1 Reel, 4 Photos",
        deliverable_count: 5,
        deliverable_load: "Light",
        dates_available: "Year-round",
        due_days: 7,
        image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
        gallery_images: [
          "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=85",
          "https://images.unsplash.com/photo-1572510097885-0c1d5d6b39ee?w=800&q=80",
          "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80",
        ],
        about: "A stunning geodesic glass dome perched on a hillside above the Paphos coastline.",
        amenities: [
          { icon: "🌌", label: "Mediterranean stargazing" },
          { icon: "🔥", label: "Private fire pit" },
          { icon: "🚿", label: "Outdoor rain shower" },
        ],
        what_you_get: ["$500 cash payment upon content approval", "Complimentary 1-night dome stay", "Guided stargazing session"],
        requirements: ["Minimum 5,000 followers on Instagram"],
        location_full: "Paphos, Cyprus",
        lat: 34.7754, lng: 32.4218,
        status: "draft",
      },
    ];

    for (const listing of samples) {
      await ctx.db.insert("listings", {
        ...listing,
        host_id: args.host_id,
        host_name: args.host_name,
        is_sample: true,
      });
    }

    return { seeded: true };
  },
});

// One-time cleanup: collapse all duplicate sample-titled listings down to a single
// canonical international row per title, owned by Ben, marked is_sample + published.
// Only the 6 sample titles are touched — real user listings are left alone.
const SAMPLE_CANONICAL: Record<string, string> = {
  "Glacier Prime Cabin": "Lake Tahoe",
  "Tranquil Waterfront Retreat": "Bariloche",
  "Mountain Lodge Escape": "Chiang Mai",
  "Vineyard Wine Estate": "Stellenbosch",
  "Lakeside Forest Treehouse": "Asheville",
  "Desert Dome Glamping": "Paphos",
};

export const cleanupSampleListings = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const ben = profiles.find(
      (p: any) => (p.email || "").toLowerCase() === "benventuring@gmail.com"
    );
    const benId = ben?._id ? String(ben._id) : undefined;
    const benName = ben?.full_name || "Ben Venturing";

    const all = await ctx.db.query("listings").collect();
    const summary: Record<string, { kept: string; deleted: number }> = {};

    for (const [title, loc] of Object.entries(SAMPLE_CANONICAL)) {
      const rows = all.filter((l: any) => l.title === title);
      if (rows.length === 0) continue;

      const keeper =
        rows.find((l: any) => (l.location || "").includes(loc)) ||
        rows.find((l: any) => l.is_sample) ||
        rows[0];

      await ctx.db.patch(keeper._id, {
        is_sample: true,
        status: "published",
        host_id: benId ?? keeper.host_id,
        host_name: benName,
      });

      let deleted = 0;
      for (const l of rows) {
        if (l._id !== keeper._id) {
          await ctx.db.delete(l._id);
          deleted++;
        }
      }
      summary[title] = { kept: keeper.location, deleted };
    }

    return summary;
  },
});
