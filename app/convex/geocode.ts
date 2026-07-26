import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Server-side geocoding for the Explore map. Host listings only store
// location_city / location_country — this turns that into coordinates via the
// Mapbox Geocoding API (same account/token as the map) and caches the result
// back onto the listing row. True coords are still passed through approxCoords
// (lib/geo.ts) before they ever reach a client.

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

async function mapboxGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!MAPBOX_TOKEN) throw new Error("MAPBOX_TOKEN is not set in the Convex environment (npx convex env set MAPBOX_TOKEN ...)");
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}&limit=1&types=place,region,locality,district`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: any = await res.json();
  const center = data?.features?.[0]?.center;
  if (!Array.isArray(center) || center.length < 2) return null;
  const [lng, lat] = center;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

function queryFor(loc: { location_city?: string; location_country?: string; location?: string }) {
  const parts = [loc.location_city, loc.location_country].filter(Boolean);
  return parts.length ? parts.join(", ") : (loc.location || "").trim();
}

// ── internal helpers (query/patch the DB from within actions) ──────────────────
export const getListingLoc = internalQuery({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const l: any = await ctx.db.get(listingId);
    if (!l) return null;
    return {
      location_city: l.location_city,
      location_country: l.location_country,
      location: l.location,
      hasCoords: typeof l.lat === "number" && typeof l.lng === "number",
    };
  },
});

export const listingsNeedingCoords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("listings").collect();
    return all
      .filter((l: any) => !l.is_sample && (typeof l.lat !== "number" || typeof l.lng !== "number"))
      .map((l: any) => ({
        _id: l._id,
        location_city: l.location_city,
        location_country: l.location_country,
        location: l.location,
      }));
  },
});

export const patchCoords = internalMutation({
  args: { listingId: v.id("listings"), lat: v.number(), lng: v.number() },
  handler: async (ctx, { listingId, lat, lng }) => {
    await ctx.db.patch(listingId, { lat, lng });
  },
});

// ── geocode a single listing (scheduled after create/update) ───────────────────
export const geocodeListing = internalAction({
  args: { listingId: v.id("listings"), force: v.optional(v.boolean()) },
  handler: async (ctx, { listingId, force }) => {
    const loc = await ctx.runQuery(internal.geocode.getListingLoc, { listingId });
    if (!loc) return;
    if (loc.hasCoords && !force) return;
    const q = queryFor(loc);
    if (!q) return;
    const hit = await mapboxGeocode(q);
    if (hit) await ctx.runMutation(internal.geocode.patchCoords, { listingId, lat: hit.lat, lng: hit.lng });
  },
});

// ── one-shot backfill for every real listing missing coordinates ───────────────
// Run once after deploy:  npx convex run geocode:backfillListingCoords
export const backfillListingCoords = action({
  args: {},
  handler: async (ctx) => {
    const rows: any[] = await ctx.runQuery(internal.geocode.listingsNeedingCoords, {});
    let geocoded = 0;
    for (const r of rows) {
      const q = queryFor(r);
      if (!q) continue;
      const hit = await mapboxGeocode(q);
      if (hit) {
        await ctx.runMutation(internal.geocode.patchCoords, { listingId: r._id, lat: hit.lat, lng: hit.lng });
        geocoded++;
      }
      await new Promise((resolve) => setTimeout(resolve, 120)); // gentle on rate limits
    }
    return { attempted: rows.length, geocoded };
  },
});
