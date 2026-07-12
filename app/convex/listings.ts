import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { calcMidpoint, calcStayOffset, calcHardFloor, evaluateZone, normalizeTierId, totalPoints } from "./lib/compensationPoints";

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

// Server-side source of truth for the three-zone compensation floor — the UI
// check can warn/disable, but this is what actually blocks a red-zone listing.
function evaluateCompensationFloor(fields: {
  compensation_type?: string;
  cash_amount?: number;
  creator_tier?: string;
  deliverables?: unknown;
  complexity?: string;
  stay_value?: number;
}) {
  const { compensation_type, cash_amount, creator_tier, deliverables, complexity, stay_value } = fields;
  if (compensation_type !== "paid" && compensation_type !== "hybrid") return null;
  if (typeof cash_amount !== "number" || !(cash_amount > 0)) return null;

  const points = Array.isArray(deliverables) ? totalPoints(deliverables as any) : 0;
  const tierId = normalizeTierId(creator_tier);
  const midpoint = tierId ? calcMidpoint(points, tierId, (complexity as any) || "standard") : 0;
  const stayOffset = compensation_type === "hybrid" && tierId ? calcStayOffset(stay_value || 0, tierId, midpoint) : 0;
  const hardFloor = calcHardFloor(midpoint, stayOffset);
  const zone = evaluateZone(cash_amount, midpoint, stayOffset);
  return { zone, hardFloor };
}

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
  args: { viewerId: v.optional(v.string()) },
  handler: async (ctx, { viewerId }) => {
    const listings = await ctx.db.query("listings").collect();
    const filtered = listings.filter((l: any) => !l.is_sample && !l.needs_compensation_review);

    // Check viewer's access level
    let canViewFull = true;
    if (viewerId) {
      const viewer = await ctx.db.get(viewerId as any);
      if (viewer && viewer.role === "creator" && !viewer.is_admin) {
        const state = viewer.access_state ?? "active";
        const isFounder = viewer.is_founder === true;
        const isVerified = viewer.is_verified === true;
        canViewFull = isFounder || state === "trial" || state === "active" || !isVerified;
        // Unverified creators see blurbs only
        if (!isVerified) canViewFull = false;
      }
    }

    if (canViewFull) {
      return Promise.all(filtered.map((l: any) => withImages(ctx, l)));
    }

    // Redact sensitive fields for unapproved / limited creators
    return filtered.map((l: any) => ({
      ...l,
      title: undefined,
      subtitle: undefined,
      about: undefined,
      collaboration_brief: undefined,
      location_full: undefined,
      host_name: undefined,
      host_id: undefined,
      amenities: undefined,
      what_you_get: undefined,
      what_you_deliver: undefined,
      requirements: undefined,
      property_url: undefined,
      gallery_images: [],
      image: l.image ? l.image : undefined, // blur in UI via CSS
      location: l.location?.split(",")[0] || l.location, // city only
      // Always visible:
      compensation: l.compensation,
      compensation_type: l.compensation_type,
      cash_amount: l.cash_amount,
      collab_type: l.collab_type,
      creator_tier: l.creator_tier,
      creator_track: l.creator_track,
      deliverable_count: l.deliverable_count,
      deliverable_load: l.deliverable_load,
      deliverables: l.deliverables,
      deliverables_list: l.deliverables_list,
      location_city: l.location_city,
      location_country: l.location_country,
      is_featured: l.is_featured ?? false,
      date_ranges: l.date_ranges,
      dates_available: l.dates_available,
      nights: l.nights,
      property_type: l.property_type,
      _redacted: true,
      _id: l._id,
      _creationTime: l._creationTime,
    }));
  },
});

export const getSamples = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    const samples = listings.filter((l: any) => l.is_sample === true);
    // Attach the host's avatar/name from the owner profile so cards show the
    // real host, not the viewer's own avatar.
    const hostIds = [...new Set(samples.map((l: any) => l.host_id).filter(Boolean))];
    const hostProfiles = await Promise.all(
      hostIds.map((id: string) => ctx.db.get(id as any))
    );
    const hostMap = new Map<string, any>();
    hostProfiles.forEach((p) => { if (p) hostMap.set(String(p._id), p); });
    return Promise.all(samples.map(async (l: any) => {
      const withImg = await withImages(ctx, l);
      const host = l.host_id ? hostMap.get(String(l.host_id)) : null;
      return {
        ...withImg,
        host_avatar: host?.avatar_url || null,
        host_name: l.host_name || host?.full_name || null,
      };
    }));
  },
});

export const getById = query({
  args: { id: v.string(), viewerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("listings")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
    if (!listing) return null;

    // Check viewer access
    let canViewFull = true;
    if (args.viewerId) {
      const viewer = await ctx.db.get(args.viewerId as any);
      if (viewer && viewer.role === "creator" && !viewer.is_admin) {
        const isVerified = viewer.is_verified === true;
        const state = viewer.access_state ?? "active";
        const isFounder = viewer.is_founder === true;
        canViewFull = isFounder || state === "trial" || state === "active" || !isVerified;
        if (!isVerified) canViewFull = false;
      }
    }

    const full = await withImages(ctx, listing);
    if (canViewFull) return full;

    return {
      ...full,
      title: undefined,
      subtitle: undefined,
      about: undefined,
      collaboration_brief: undefined,
      location_full: undefined,
      host_name: undefined,
      host_id: undefined,
      amenities: undefined,
      what_you_get: undefined,
      what_you_deliver: undefined,
      requirements: undefined,
      property_url: undefined,
      gallery_images: [],
      location: listing.location?.split(",")[0] || listing.location,
      compensation: listing.compensation,
      compensation_type: listing.compensation_type,
      cash_amount: listing.cash_amount,
      collab_type: listing.collab_type,
      creator_tier: listing.creator_tier,
      creator_track: listing.creator_track,
      deliverable_count: listing.deliverable_count,
      deliverables: listing.deliverables,
      deliverables_list: listing.deliverables_list,
      location_city: listing.location_city,
      location_country: listing.location_country,
      is_featured: listing.is_featured ?? false,
      date_ranges: listing.date_ranges,
      dates_available: listing.dates_available,
      property_type: listing.property_type,
      _redacted: true,
    };
  },
});

// Public, unauthenticated preview of published listings for marketing
// surfaces (signup sidebar carousel, How it works "Browse opportunities").
// Deliberately thin — never includes about/requirements/host contact info,
// since these visitors haven't passed the verification gate.
export const getPublishedPreview = query({
  args: { country: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { country, limit }) => {
    const all = await ctx.db.query("listings").collect();
    let published = all.filter(
      (l: any) => l.status === "published" && !l.is_sample && !l.needs_compensation_review
    );
    if (country) {
      published = published.filter((l: any) => l.location_country === country);
    }
    published.sort((a: any, b: any) => b._creationTime - a._creationTime);
    const capped = published.slice(0, limit ?? 20);

    return Promise.all(
      capped.map(async (l: any) => {
        const withImg = await withImages(ctx, l);
        return {
          _id: l._id,
          title: l.title,
          image: withImg.image,
          property_type: l.property_type,
          location_city: l.location_city,
          location_country: l.location_country,
          compensation: l.compensation,
          compensation_type: l.compensation_type,
          cash_amount: l.cash_amount,
          currency: l.currency,
          creator_tier: l.creator_tier,
          deliverable_load: l.deliverable_load,
        };
      })
    );
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
    complexity: v.optional(v.string()),
    stay_value: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    validateListingFields(args, { requireCompensation: true });
    const floor = evaluateCompensationFloor(args);
    if (floor?.zone === "red") {
      throw new Error(`Compensation is below the minimum for this workload. The minimum for this listing is $${Math.round(floor.hardFloor)}.`);
    }
    return await ctx.db.insert("listings", { ...args, below_recommended_comp: floor?.zone === "amber" });
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
    complexity: v.optional(v.string()),
    stay_value: v.optional(v.number()),
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

    const merged = {
      compensation_type: nextType,
      cash_amount: nextCash,
      creator_tier: fields.creator_tier ?? (existing as any).creator_tier,
      deliverables: fields.deliverables ?? (existing as any).deliverables,
      complexity: fields.complexity ?? (existing as any).complexity,
      stay_value: fields.stay_value ?? (existing as any).stay_value,
    };
    const floor = evaluateCompensationFloor(merged);
    if (floor?.zone === "red") {
      throw new Error(`Compensation is below the minimum for this workload. The minimum for this listing is $${Math.round(floor.hardFloor)}.`);
    }
    if (floor) patch.below_recommended_comp = floor.zone === "amber";

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
        rating: 4.97,
        review_count: 84,
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
          "https://images.unsplash.com/photo-1480497490787-505ec076689f?w=800&q=80",
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        ],
        about: "Glacier Prime is a hand-crafted old-growth forest cabin built into a granite ridge above the western shore of Lake Tahoe. The structure is made almost entirely from reclaimed Douglas fir and stone sourced on-site, with floor-to-ceiling windows that frame unobstructed views of the lake and the Sierra Nevada range beyond.\n\nInside, the cabin blends raw wilderness with considered comfort — a cast-iron wood stove anchors the main living space, while the lofted sleeping area opens to a private deck where you can watch alpenglow turn the mountains pink at dusk. The private hot tub sits cantilevered over the tree line, giving you the sensation of floating above the forest.\n\nThe surrounding 12 acres of old-growth pine and cedar are entirely private. Deer pass through most mornings. The trailhead to Eagle Falls and Desolation Wilderness is a 10-minute drive, and the nearest ski resort is under 20 minutes. This is a property that rewards a slow pace — one that's designed to be felt as much as photographed.",
        amenities: [
          { icon: "♨️", label: "Private hot tub" },
          { icon: "🔥", label: "Stone fireplace" },
          { icon: "⛷️", label: "Ski storage" },
          { icon: "🏔️", label: "Mountain views" },
        ],
        what_you_get: [
          "3 nights hosted stay experience",
          "Private hot tub access",
          "Ski equipment storage",
          "Welcome provisions basket",
        ],
        what_you_deliver: "9 total deliverables across 3 formats (Moderate load)",
        requirements: [
          "Minimum 10,000 followers on primary platform",
          "UGC Pro or higher creator tier",
        ],
        location_full: "Lake Tahoe, El Dorado County, California",
        lat: 38.9399, lng: -119.9772,
        status: "published",
      },
      {
        title: "Tranquil Waterfront Retreat",
        subtitle: "Patagonian lakefront villa with private infinity pool",
        location: "Bariloche, Argentina",
        property_type: "Villa",
        is_featured: true,
        rating: 4.93,
        review_count: 112,
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
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
          "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80",
        ],
        about: "Set directly on the shore of Nahuel Huapi Lake in Argentine Patagonia, this lakefront villa is surrounded by old-growth lenga beech forest on three sides and open water on the fourth. The Andes rise dramatically behind the property — snow-capped peaks reflected in a lake so clear it reads almost teal in afternoon light.\n\nThe villa was designed by a Buenos Aires architect who grew up in Bariloche, and it shows. The interiors lean into the landscape rather than competing with it — raw concrete, local slate floors, and Douglas fir ceilings frame views that shift from alpine blue to deep orange depending on the hour. The infinity pool is positioned to create a seamless visual merge with the lake beyond, a shot that photographs unlike almost anything else in South America.\n\nFrom the private dock you can kayak into sheltered coves, or simply sit on the jetty at golden hour while the lake goes still. Bariloche's chocolate shops, craft beer scene, and hiking trails are 20 minutes away — but this property makes it easy to never leave.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🏔️", label: "Andean lake views" },
          { icon: "👨‍🍳", label: "Chef's kitchen" },
          { icon: "🛶", label: "Private dock & kayaks" },
        ],
        what_you_get: [
          "2 nights hosted stay experience",
          "Infinity pool exclusive access",
          "Private dock & kayak access",
          "Welcome Argentine wine & provisions",
        ],
        what_you_deliver: "10 total deliverables across 2 formats (Moderate load)",
        requirements: [
          "Minimum 5,000 followers on Instagram",
          "Micro Influencer or higher creator tier",
        ],
        location_full: "Bariloche, Río Negro Province, Argentina",
        lat: -41.1335, lng: -71.3103,
        status: "published",
      },
      {
        title: "Mountain Lodge Escape",
        subtitle: "Jungle mountain luxury with panoramic views",
        location: "Chiang Mai, Thailand",
        property_type: "Lodge",
        is_featured: true,
        rating: 4.95,
        review_count: 203,
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
          "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=800&q=80",
          "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
          "https://images.unsplash.com/photo-1506665531195-3366daf6b4dfa?w=800&q=80",
        ],
        about: "Perched 900 meters above Chiang Mai in the Doi Suthep-Pui National Park buffer zone, this jungle mountain lodge is carved into a ridge overlooking layered rice terraces, teak forest, and the valley city below. On clear mornings, you can see all the way to the Burmese border — on misty ones, the property floats above a sea of white cloud.\n\nThe lodge was built using a traditional Northern Thai construction method called 'sala' architecture — open-air pavilions connected by elevated walkways through the canopy. The main living pavilion has no fourth wall, just a view that opens directly onto the jungle and the valley beyond. The infinity pool hangs at the edge of the ridge and at certain angles appears to pour directly into the cityscape below.\n\nThis is a heavy-content stay by design. The property has a dedicated yoga sala that catches the sunrise, an outdoor fire pit that draws in fireflies after dark, and an on-site guide who can arrange a private pre-dawn trek to Doi Suthep temple before the tourists arrive. The host provides daily chef-prepared meals using ingredients from the on-site garden. It's a place built for creators who want depth, not just aesthetics.",
        amenities: [
          { icon: "🏊", label: "Infinity pool" },
          { icon: "🌿", label: "Jungle mountain views" },
          { icon: "🧘", label: "Yoga sala" },
          { icon: "🔥", label: "Outdoor fire pit" },
        ],
        what_you_get: [
          "$500 cash payment upon content approval",
          "Complimentary 3-night stay included",
          "Daily private chef meals",
          "Guided Doi Suthep sunrise trek",
        ],
        what_you_deliver: "18 total deliverables across 3 formats (Heavy load)",
        requirements: [
          "Minimum 25,000 followers across platforms",
          "UGC Pro or higher creator tier",
        ],
        location_full: "Chiang Mai, Thailand",
        lat: 18.7883, lng: 98.9853,
        status: "published",
      },
      {
        title: "Vineyard Wine Estate",
        subtitle: "Private villa on a working South African estate",
        location: "Stellenbosch, South Africa",
        property_type: "Estate",
        is_featured: true,
        rating: 4.96,
        review_count: 129,
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
          "https://images.unsplash.com/photo-1573246123716-6b178079bfb0?w=800&q=80",
          "https://images.unsplash.com/photo-1504376379689-8a543476bc2f?w=800&q=80",
          "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80",
        ],
        about: "This Cape Dutch-style villa sits on a working wine estate in the Jonkershoek Valley, one of the most photographed wine corridors in South Africa. The property dates to 1743 — the thick whitewashed walls, carved gable, and original yellowwood floors have been immaculately preserved — but the interior has been updated with the kind of quiet luxury that makes for effortless content: linen drapes, raw plaster walls, and antique wine presses repurposed as sculpture.\n\nThe estate produces its own Chenin Blanc, Syrah, and red blend from 28 hectares of vines that frame the property on every side. Your stay includes a private tour of the barrel room with the winemaker, and a hosted tasting for up to four guests — not the standard tourist circuit, but a genuine behind-the-scenes access that most visitors never see. The heated estate pool is positioned between the vine rows, looking out to the Stellenbosch Mountain range.\n\nStellenbosch itself is a 10-minute drive — one of South Africa's most walkable university towns, with world-class restaurants, a vibrant street food scene, and the Franschhoek wine corridor within easy reach. For macro creators looking for a property that photographs like editorial and performs like travel content, this is one of the strongest collab opportunities on the platform.",
        amenities: [
          { icon: "🍷", label: "Private wine tasting" },
          { icon: "🌿", label: "Vineyard access" },
          { icon: "🏊", label: "Heated estate pool" },
          { icon: "👨‍🍳", label: "Chef's kitchen" },
        ],
        what_you_get: [
          "$800 cash payment upon content approval",
          "Complimentary 2-night estate stay",
          "Private vineyard & barrel room tour",
          "Hosted wine tasting (up to 4 guests)",
        ],
        what_you_deliver: "12 total deliverables across 3 formats (Moderate load)",
        requirements: [
          "Minimum 100,000 followers on primary platform",
          "Macro creator tier required",
        ],
        location_full: "Stellenbosch, Western Cape, South Africa",
        lat: -33.9364, lng: 18.8605,
        status: "published",
      },
      {
        title: "Lakeside Forest Treehouse",
        subtitle: "Elevated treehouse above a private lake",
        location: "Asheville, NC",
        property_type: "Treehouse",
        is_featured: false,
        rating: 4.99,
        review_count: 41,
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
        about: "The Lakeside Forest Treehouse sits 30 feet up in a cluster of old-growth white oaks at the edge of a private 4-acre lake in the Blue Ridge Mountains outside Asheville. The structure is suspended on living trees — no concrete footings, no earthworks — and the platform sways slightly in the wind the way a boat does at anchor. At night, the lake reflects the stars directly below your feet through the glass floor panels.\n\nThe interior is compact and intentional: a queen sleeping platform, a clawfoot soaking tub positioned at the window, and a reading nook built into the bow of the tree. The wrap-around deck is the real living space — hammock, fire table, and a direct staircase down to the dock where two kayaks are always ready. The lake is entirely private, no other structures visible from the water.\n\nThis is a light-deliverable collab designed for photographers and visual creators who produce exceptional single images rather than high-volume content. The property offers golden-hour lake light in both morning and evening, which is rare. The host is a landscape photographer himself and can share optimal shot locations on the property that aren't visible from the standard guest areas.",
        amenities: [
          { icon: "🛣️", label: "Kayaks included" },
          { icon: "🌲", label: "Private lake access" },
        ],
        what_you_get: [
          "$1,000 cash payment upon content approval",
          "Complimentary 2-night treehouse stay",
        ],
        what_you_deliver: "10 total deliverables across 3 formats (Light load)",
        requirements: [
          "Minimum 10,000 followers on primary platform",
          "Strong photography portfolio required",
        ],
        location_full: "Asheville, Buncombe County, North Carolina",
        lat: 35.5951, lng: -82.5515,
        status: "published",
      },
      {
        title: "Desert Dome Glamping",
        subtitle: "Geodesic dome on the Mediterranean coast",
        location: "Paphos, Cyprus",
        property_type: "Glamping",
        is_featured: false,
        rating: 4.91,
        review_count: 78,
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
          "https://images.unsplash.com/photo-1585970480901-90d6bb2a48b5?w=800&q=80",
          "https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=800&q=80",
        ],
        about: "Perched on a hillside above the Paphos coastline on the southwest tip of Cyprus, this geodesic glass dome is designed to disappear into the landscape during the day and become a lantern at night. The structure is 7 meters in diameter with a 270-degree glass panel roof — at night, you fall asleep looking directly at the Milky Way, with the Mediterranean glittering below the hill line.\n\nThe dome sits on a private terraced plot with a stone meditation terrace facing west, a traditional ceramic fire bowl for evening fires, and an outdoor rain shower fed by a cistern of collected rainwater. The nearest neighboring structure is 400 meters away. The light on this hillside is extraordinary — harsh and sculptural at noon, warm and directional in the final hour before sunset when the limestone cliffs glow amber.\n\nPaphos itself is a UNESCO World Heritage city with 4,000-year-old mosaics, a working harbor, and a craft food scene that has developed significantly over the past decade. The property is 12 minutes from the old harbor and 8 minutes from the Akamas Peninsula National Park. For creators with a more minimal, meditative aesthetic, this is one of the most visually distinctive stays on the platform.",
        amenities: [
          { icon: "🌌", label: "Mediterranean stargazing" },
          { icon: "🔥", label: "Private fire pit" },
          { icon: "🧘", label: "Stone meditation terrace" },
          { icon: "🚿", label: "Outdoor rain shower" },
        ],
        what_you_get: [
          "$500 cash payment upon content approval",
          "Complimentary 1-night dome stay",
          "Guided stargazing session",
          "Mediterranean provisions & fire kit",
        ],
        what_you_deliver: "5 total deliverables across 2 formats (Light load)",
        requirements: [
          "Minimum 5,000 followers on Instagram",
          "Micro Influencer or higher creator tier",
        ],
        location_full: "Paphos, Cyprus",
        lat: 34.7754, lng: 32.4218,
        status: "published",
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
