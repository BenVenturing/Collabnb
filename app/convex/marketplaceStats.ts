import { query } from "./_generated/server";

// Founding cohort size per side — mirrors the cap already used on the
// pricing page (CREATOR_CAP / HOST_CAP in PricingPage.jsx).
const FOUNDING_CAP = 100;

// Live counts powering the signup sidebar, marketing counters, and listing
// previews. All counts reflect ONLY verified profiles / published listings —
// never pending, unverified, or draft records.
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, listings] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("listings").collect(),
    ]);

    const verifiedHosts = profiles.filter((p: any) => p.role === "host" && p.is_verified === true);
    const verifiedCreators = profiles.filter((p: any) => p.role === "creator" && p.is_verified === true);
    const foundingHosts = verifiedHosts.filter((p: any) => p.is_founder === true).length;
    const foundingCreators = verifiedCreators.filter((p: any) => p.is_founder === true).length;

    const published = listings.filter(
      (l: any) => l.status === "published" && !l.is_sample && !l.needs_compensation_review
    );
    const countries = new Set(
      published.map((l: any) => l.location_country).filter((c: any) => !!c)
    );

    return {
      totalVerifiedHosts: verifiedHosts.length,
      totalVerifiedCreators: verifiedCreators.length,
      totalPublishedListings: published.length,
      totalCountries: countries.size,
      foundingHostSpotsRemaining: Math.max(0, FOUNDING_CAP - foundingHosts),
      foundingCreatorSpotsRemaining: Math.max(0, FOUNDING_CAP - foundingCreators),
    };
  },
});
