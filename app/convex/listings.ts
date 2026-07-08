import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const dateRangesValidator = v.array(v.object({
  startDate: v.string(),
  endDate: v.string(),
}));

const deliverablePointsValidator = v.array(v.object({
  type: v.union(
    v.literal("photo"),
    v.literal("storyFrame"),
    v.literal("carousel"),
    v.literal("ugcReel"),
    v.literal("influencerReel"),
    v.literal("youtubeVideo")
  ),
  quantity: v.number(),
}));

function validateListingFields(
  fields: { compensation_type?: string; cash_amount?: number; date_ranges?: { startDate: string; endDate: string }[] },
  { requireCompensation = false } = {}
) {
  const { compensation_type, cash_amount, date_ranges } = fields;
  if (requireCompensation || compensation_type !== undefined) {
    if (compensation_type !== "paid" && compensation_type !== "hybrid") {
      throw new Error('Collaboration type must be "paid" or "hybrid" — a stay alone is not valid compensation.');
    }
  }
  if (requireCompensation || cash_amount !== undefined) {
    if (typeof cash_amount !== "number" || !(cash_amount > 0)) {
      throw new Error("Compensation amount is required and must be greater than $0.");
    }
  }
  if (date_ranges !== undefined) {
    if (date_ranges.length < 1 || date_ranges.length > 3) {
      throw new Error("A listing must have between 1 and 3 date ranges.");
    }
    for (const r of date_ranges) {
      if (!r.startDate || !r.endDate) throw new Error("Each date range needs a start and end date.");
      if (r.endDate < r.startDate) throw new Error("A date range cannot end before it starts.");
    }
  }
}

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
    const filtered = listings.filter((l: any) => !l.is_sample && !l.needs_compensation_review);
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
    let listings = (await ctx.db.query("listings").collect())
      .filter((l: any) => !l.is_sample && !l.needs_compensation_review);

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
    date_ranges: v.optional(dateRangesValidator),
    turnaround_days: v.optional(v.number()),
    deliverables: v.optional(deliverablePointsValidator),
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
    validateListingFields(args, { requireCompensation: true });
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
    date_ranges: v.optional(dateRangesValidator),
    turnaround_days: v.optional(v.number()),
    deliverables: v.optional(deliverablePointsValidator),
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
    validateListingFields(fields);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Listing not found.");
    const patch: any = { ...fields };
    const nextType = fields.compensation_type ?? (existing as any).compensation_type;
    const nextCash = fields.cash_amount ?? (existing as any).cash_amount;
    if (
      (existing as any).needs_compensation_review &&
      (nextType === "paid" || nextType === "hybrid") &&
      typeof nextCash === "number" && nextCash > 0
    ) {
      patch.needs_compensation_review = false;
    }
    await ctx.db.patch(id, patch);
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
        compensation: "$250 + 3-night stay",
        compensation_type: "hybrid",
        cash_amount: 250,
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
        compensation: "$200 + 2-night stay",
        compensation_type: "hybrid",
        cash_amount: 200,
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
        compensation_type: "paid",
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
        compensation_type: "paid",
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
        compensation_type: "paid",
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
        compensation_type: "paid",
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
          "https://outgoing-anaconda-357.convex.cloud/api/storage/d6974384-e2cf-43ee-a2aa-3af4a4b30c86",
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

// One-time migration for the paid/hybrid pivot.
// - Legacy free-stay listings ('free' / 'free_stay' / no compensation at all):
//   samples are deleted; real listings become 'hybrid' with no cash amount and
//   needs_compensation_review=true, which hides them from Explore until the
//   host adds compensation.
// - 'cash' is normalized to 'paid'.
// Run with: npx convex run listings:migrateLegacyCompensation
export const migrateLegacyCompensation = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("listings").collect();
    let flaggedForReview = 0;
    let deletedSamples = 0;
    let normalizedToPaid = 0;
    for (const l of all as any[]) {
      const t = (l.compensation_type || "").toLowerCase();
      const hasCash = typeof l.cash_amount === "number" && l.cash_amount > 0;
      const legacyFree = t === "free" || t === "free_stay" || (!t && !hasCash);
      if (legacyFree) {
        if (l.is_sample) {
          await ctx.db.delete(l._id);
          deletedSamples++;
        } else {
          await ctx.db.patch(l._id, {
            compensation_type: "hybrid",
            cash_amount: undefined,
            needs_compensation_review: true,
          });
          flaggedForReview++;
        }
      } else if (t === "cash") {
        await ctx.db.patch(l._id, { compensation_type: "paid" });
        normalizedToPaid++;
      } else if ((t === "paid" || t === "hybrid") && !hasCash) {
        await ctx.db.patch(l._id, { needs_compensation_review: true });
        flaggedForReview++;
      }
    }
    return { flaggedForReview, deletedSamples, normalizedToPaid };
  },
});
