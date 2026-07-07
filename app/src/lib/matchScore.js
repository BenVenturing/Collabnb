// Explore ranking engine. Full reference: /explore-algorithm.md (project root).

export const WEIGHTS = { location: 0.4, tags: 0.35, profile: 0.25 };

export const MATCH_BADGE_THRESHOLD = 60; // show "% match" badge at or above this
export const FOR_YOU_MIN_SCORE = 40;     // listing enters "Picked for You" at or above this
export const NEAR_ME_MIN_LOCATION = 0.55; // location part needed to enter "Near You"

// Listing vibe_tags are free-form, profile niches are a fixed list — this table
// bridges the two vocabularies. Tuning matches = editing these keywords.
export const NICHE_KEYWORDS = {
  'travel': ['travel', 'wanderlust', 'getaway', 'explore'],
  'cabins & stays': ['cabin', 'cozy', 'lodge', 'chalet', 'a-frame'],
  'mountain': ['mountain', 'alpine', 'peak', 'hiking', 'ski'],
  'beach': ['beach', 'ocean', 'surf', 'sand', 'island'],
  'coastal': ['coastal', 'ocean', 'sea', 'waterfront', 'lakefront', 'lake'],
  'outdoors': ['outdoor', 'nature', 'hiking', 'forest', 'wilderness', 'firepit'],
  'adventure': ['adventure', 'hiking', 'kayak', 'climb', 'trail', 'explore'],
  'lifestyle': ['lifestyle', 'cozy', 'slow living', 'romantic'],
  'food & dining': ['food', 'dining', 'culinary', 'chef', 'farm', 'vineyard'],
  'fashion': ['fashion', 'style', 'boutique'],
  'fitness': ['fitness', 'gym', 'yoga', 'active'],
  'wellness': ['wellness', 'spa', 'retreat', 'yoga', 'hot tub', 'sauna', 'peaceful'],
  'photography': ['photo', 'scenic', 'view', 'photogenic', 'sunset', 'stargazing'],
  'tech': ['tech', 'smart', 'modern', 'workspace'],
  'city life': ['city', 'urban', 'downtown', 'loft', 'rooftop'],
  'eco & sustainable': ['eco', 'sustainable', 'green', 'off-grid', 'solar', 'tiny'],
  'luxury': ['luxury', 'premium', 'upscale', 'villa', 'estate', 'private'],
  'design': ['design', 'architect', 'interior', 'a-frame', 'modern', 'minimalist'],
};

const US_STATES = {
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
  colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga',
  hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia',
  kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md',
  massachusetts: 'ma', michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo',
  montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
  'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh',
  oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
  'south dakota': 'sd', tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt',
  virginia: 'va', washington: 'wa', 'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy',
};

const norm = (s) => (s || '').toString().trim().toLowerCase();

function regionTerms(region) {
  const r = norm(region);
  if (!r) return [];
  const abbr = US_STATES[r];
  if (abbr) return [r, abbr];
  const byAbbr = Object.entries(US_STATES).find(([, a]) => a === r);
  return byAbbr ? [byAbbr[0], r] : [r];
}

function listingLocationHaystack(listing) {
  return [listing.location, listing.location_full, listing.location_city, listing.location_country]
    .filter(Boolean).join(' ').toLowerCase();
}

function haystackHasTerm(haystack, term) {
  if (!term || term.length < 2) return false;
  if (term.length <= 3) return new RegExp(`\\b${term}\\b`).test(haystack);
  return haystack.includes(term);
}

export function buildCreatorContext({ profile, collaborations = [], savedListings = [], allListings = [] }) {
  const listingsById = new Map(allListings.map((l) => [String(l.id), l]));
  const pastListings = collaborations
    .map((c) => listingsById.get(String(c.listing_id)))
    .filter(Boolean);

  const pastLocations = [
    ...collaborations.map((c) => c.location),
    ...pastListings.map((l) => l.location),
  ].filter(Boolean);

  const inferredTags = new Set();
  [...savedListings, ...pastListings].forEach((l) => {
    (l.vibe_tags || []).forEach((t) => inferredTags.add(norm(t)));
    if (l.collab_type) inferredTags.add(norm(l.collab_type));
  });

  const nicheKeywords = new Set();
  (profile?.niches || []).forEach((n) => {
    nicheKeywords.add(norm(n));
    (NICHE_KEYWORDS[norm(n)] || []).forEach((k) => nicheKeywords.add(k));
  });

  return {
    homeCity: norm(profile?.city),
    homeRegionTerms: regionTerms(profile?.region),
    homeCountry: norm(profile?.country),
    pastLocations,
    creatorKeywords: [...nicheKeywords, ...inferredTags],
    hasExplicitNiches: (profile?.niches || []).length > 0,
    tier: norm(profile?.tier),
    pastCollabTypes: [...new Set(pastListings.map((l) => norm(l.collab_type)).filter(Boolean))],
  };
}

export function locationScore(listing, ctx) {
  const hay = listingLocationHaystack(listing);
  if (!hay) return { score: 0.25, reason: null };

  let best = { score: 0.25, reason: null };
  const consider = (score, reason) => { if (score > best.score) best = { score, reason }; };

  if (ctx.homeCity && ctx.homeCity.length >= 3 && hay.includes(ctx.homeCity)) {
    consider(1.0, `near ${ctx.homeCity}`);
  }
  if (ctx.homeRegionTerms.some((t) => haystackHasTerm(hay, t))) {
    consider(0.85, 'in your home region');
  }
  if (ctx.homeCountry && haystackHasTerm(hay, ctx.homeCountry)) {
    consider(0.55, 'in your country');
  }
  for (const past of ctx.pastLocations) {
    const city = norm(past.split(',')[0]);
    const region = regionTerms(past.split(',')[1]);
    if ((city.length >= 3 && hay.includes(city)) || region.some((t) => haystackHasTerm(hay, t))) {
      consider(0.7, "you've collabed in this area");
      break;
    }
  }
  return best;
}

export function tagScore(listing, ctx) {
  if (!ctx.creatorKeywords.length) return { score: 0.5, matched: [] };

  const listingTags = [
    ...(listing.vibe_tags || []),
    listing.collab_type,
    listing.property_type,
  ].filter(Boolean).map(norm);

  const matched = listingTags.filter((tag) =>
    ctx.creatorKeywords.some((k) => tag.includes(k) || k.includes(tag))
  );
  return { score: Math.min(1, matched.length / 3), matched: [...new Set(matched)] };
}

export function profileFitScore(listing, ctx) {
  const listingTier = norm(listing.creator_tier);
  const tierFit = !listingTier || listingTier === 'any' ? 0.75
    : ctx.tier && listingTier === ctx.tier ? 1
    : 0.4;

  const familiarity = !ctx.pastCollabTypes.length ? 0.5
    : ctx.pastCollabTypes.includes(norm(listing.collab_type)) ? 1
    : 0.25;

  return 0.6 * tierFit + 0.4 * familiarity;
}

export function computeMatch(listing, ctx) {
  const loc = locationScore(listing, ctx);
  const tags = tagScore(listing, ctx);
  const profile = profileFitScore(listing, ctx);

  const score = Math.round(
    (WEIGHTS.location * loc.score + WEIGHTS.tags * tags.score + WEIGHTS.profile * profile) * 100
  );

  return {
    score,
    parts: { location: loc.score, tags: tags.score, profile },
    reasons: [loc.reason, tags.matched.length ? `${tags.matched.length} matching tags` : null].filter(Boolean),
  };
}

export function scoreListings(listings, ctx) {
  return listings.map((l) => {
    const m = computeMatch(l, ctx);
    return { ...l, _match: m.score, _matchParts: m.parts, _matchReasons: m.reasons };
  });
}
