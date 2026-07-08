// ─── Compensation intelligence — single source of truth ──────────────────────
// Every part of the app that reasons about deliverables, tiers, or pricing
// must import from this module. Change a value here and it updates listing
// forms, the pricing tool (both mounts), presets, and pitch negotiation.

// ─── Deliverable points ────────────────────────────────────────────────────
export const DELIVERABLE_POINTS = {
  photo: 1,
  storyFrame: 2,
  carousel: 5,
  ugcReel: 10,
  influencerReel: 15,
  youtubeVideo: 50,
};

export const DELIVERABLE_TYPES = Object.keys(DELIVERABLE_POINTS);

export const DELIVERABLE_LABELS = {
  photo: "Photo",
  storyFrame: "Story frame",
  carousel: "Carousel post",
  ugcReel: "UGC Reel",
  influencerReel: "Influencer Reel",
  youtubeVideo: "YouTube video",
};

export function pointsForDeliverable(type, quantity) {
  return (DELIVERABLE_POINTS[type] || 0) * (quantity || 0);
}

export function totalPoints(deliverables) {
  return (deliverables || []).reduce((sum, d) => sum + pointsForDeliverable(d.type, d.quantity), 0);
}

// ─── Creator tiers ──────────────────────────────────────────────────────────
// Ids match the existing host-wizard convention (Step1Basics TIERS).
export const TIERS = {
  ugc_beginner: {
    id: "ugc_beginner",
    label: "UGC Beginner",
    requirement: "2,000+ followers, portfolio-admitted",
    track: "ugc",
    // Placeholder $/point rate — pending real marketplace data.
    ratePerPoint: 8,
  },
  ugc_pro: {
    id: "ugc_pro",
    label: "UGC Pro",
    requirement: "Portfolio-admitted, professional track record",
    track: "ugc",
    ratePerPoint: 15,
  },
  micro: {
    id: "micro",
    label: "Micro Influencer",
    requirement: "5,000–25,000 followers",
    track: "influencer",
    ratePerPoint: 12,
  },
  mid: {
    id: "mid",
    label: "Influencer",
    requirement: "25,000+ followers",
    track: "influencer",
    ratePerPoint: 25,
  },
};

export const TIER_IDS = Object.keys(TIERS);

// Best-effort resolution of a tier id from either an id ("ugc_pro") or a
// display label ("UGC Pro") — the app has historically stored both.
export function normalizeTierId(idOrLabel) {
  if (!idOrLabel) return undefined;
  if (TIERS[idOrLabel]) return idOrLabel;
  const lower = String(idOrLabel).trim().toLowerCase();
  const found = Object.values(TIERS).find((t) => t.label.toLowerCase() === lower);
  if (found) return found.id;
  if (lower.includes("beginner")) return "ugc_beginner";
  if (lower.includes("pro")) return "ugc_pro";
  if (lower.includes("micro")) return "micro";
  if (lower.includes("influencer") || lower.includes("macro")) return "mid";
  return undefined;
}

// ─── Complexity multipliers ─────────────────────────────────────────────────
// "complex" = shot lists, drone, multi-location, exclusivity/usage rights.
export const COMPLEXITY_MULTIPLIERS = {
  standard: 1.0,
  complex: 1.25,
};

// ─── Stay offset caps (Hybrid only) ─────────────────────────────────────────
export const STAY_OFFSET_CAP = {
  ugc_beginner: 0.5,
  ugc_pro: 0.5,
  micro: 0.5,
  mid: 0.3,
};

// ─── Track rules — which deliverables can target which tiers ───────────────
// "any" means the deliverable is track-agnostic (e.g. a photo).
export const DELIVERABLE_TRACK_TIERS = {
  photo: "any",
  storyFrame: "any",
  carousel: ["micro", "mid"],
  ugcReel: ["ugc_beginner", "ugc_pro"],
  influencerReel: ["micro", "mid"],
  youtubeVideo: "any",
};

export function isDeliverableAllowedForTier(type, tierId) {
  const allowed = DELIVERABLE_TRACK_TIERS[type];
  if (!allowed || allowed === "any") return true;
  return allowed.includes(tierId);
}

// ─── Floor constants ─────────────────────────────────────────────────────────
export const HARD_FLOOR_MIN = 50; // absolute $ minimum, regardless of workload
export const HARD_FLOOR_COEFFICIENT = 0.6; // hardFloor = max($50, 0.6 * midpoint - stayOffset)
export const RECOMMENDED_RANGE = { low: 0.8, high: 1.2 }; // × midpoint
export const BUDGET_STRETCH_CEILING = 1.2; // × budget, for the "stretch" package

// ─── Core pricing math ──────────────────────────────────────────────────────
export function calcMidpoint(points, tierId, complexity = "standard") {
  const tier = TIERS[tierId];
  if (!tier) return 0;
  const mult = COMPLEXITY_MULTIPLIERS[complexity] || 1;
  return points * tier.ratePerPoint * mult;
}

export function calcStayOffsetCap(tierId, midpoint) {
  const cap = STAY_OFFSET_CAP[tierId] ?? 0;
  return cap * midpoint;
}

export function calcStayOffset(declaredStayValue, tierId, midpoint) {
  return Math.min(declaredStayValue || 0, calcStayOffsetCap(tierId, midpoint));
}

export function calcRange(midpoint) {
  return { low: midpoint * RECOMMENDED_RANGE.low, high: midpoint * RECOMMENDED_RANGE.high };
}

export function calcHardFloor(midpoint, stayOffset = 0) {
  return Math.max(HARD_FLOOR_MIN, HARD_FLOOR_COEFFICIENT * midpoint - stayOffset);
}

export function calcWarnThreshold(midpoint, stayOffset = 0) {
  return RECOMMENDED_RANGE.low * midpoint - stayOffset;
}

// zone: 'red' (rejected) | 'amber' (published with warning) | 'green' (publishes freely)
export function evaluateZone(cashAmount, midpoint, stayOffset = 0) {
  const hardFloor = calcHardFloor(midpoint, stayOffset);
  const warnThreshold = calcWarnThreshold(midpoint, stayOffset);
  const cash = cashAmount || 0;
  if (cash < hardFloor) return "red";
  if (cash < warnThreshold) return "amber";
  return "green";
}

// One-shot pricing summary for a given tier/points/complexity/hybrid state.
export function priceCollab({ points, tierId, complexity = "standard", compensationType = "paid", declaredStayValue = 0, cashAmount = 0 }) {
  const midpoint = calcMidpoint(points, tierId, complexity);
  const stayOffset = compensationType === "hybrid" ? calcStayOffset(declaredStayValue, tierId, midpoint) : 0;
  const range = calcRange(midpoint);
  const hardFloor = calcHardFloor(midpoint, stayOffset);
  const warnThreshold = calcWarnThreshold(midpoint, stayOffset);
  const zone = evaluateZone(cashAmount, midpoint, stayOffset);
  return { points, midpoint, stayOffset, range, hardFloor, warnThreshold, zone };
}

// ─── Deliverable load tiers (derived, never manually selected) ─────────────
// Light: ~1 major piece (~10 pts). Moderate: 2-3 Reels equivalent (20-35 pts).
// Heavy: 3-5 Reels equivalent MAX (35-60 pts). Beyond that (or any YouTube
// deliverable) requires a "Custom campaign" — YouTube is always standalone.
export const LOAD_TIER_LABELS = { light: "Light", moderate: "Moderate", heavy: "Heavy", custom: "Custom campaign" };

export function computeLoadTier(deliverables) {
  const hasYoutube = (deliverables || []).some((d) => d.type === "youtubeVideo" && d.quantity > 0);
  if (hasYoutube) return "custom";
  const points = totalPoints(deliverables);
  if (points <= 0) return null;
  if (points > 60) return "custom";
  if (points >= 35) return "heavy";
  if (points >= 20) return "moderate";
  return "light";
}

// ─── Preset deliverable packages ────────────────────────────────────────────
// Points and prices are always computed from this module — never stored on
// the preset itself.
export const PRESET_PACKAGES = [
  // ── UGC track ──
  { name: "Single UGC Reel", track: "ugc", deliverables: [{ type: "ugcReel", quantity: 1 }] },
  { name: "Reel + Photo Set", track: "ugc", deliverables: [{ type: "ugcReel", quantity: 1 }, { type: "photo", quantity: 5 }] },
  { name: "Photo Pack", track: "ugc", deliverables: [{ type: "photo", quantity: 10 }] },
  { name: "Socials Refresh", track: "ugc", deliverables: [{ type: "photo", quantity: 8 }, { type: "storyFrame", quantity: 4 }] },
  { name: "UGC Trio", track: "ugc", deliverables: [{ type: "ugcReel", quantity: 3 }] },
  { name: "Content Day", track: "ugc", deliverables: [{ type: "ugcReel", quantity: 2 }, { type: "photo", quantity: 10 }, { type: "storyFrame", quantity: 3 }] },
  { name: "Full Property Shoot", track: "ugc", deliverables: [{ type: "ugcReel", quantity: 3 }, { type: "photo", quantity: 15 }, { type: "storyFrame", quantity: 5 }] },

  // ── Influencer track ──
  { name: "Carousel Feature", track: "influencer", deliverables: [{ type: "carousel", quantity: 1 }, { type: "storyFrame", quantity: 2 }] },
  { name: "Single Feature Reel", track: "influencer", deliverables: [{ type: "influencerReel", quantity: 1 }] },
  { name: "Reel + Story Set", track: "influencer", deliverables: [{ type: "influencerReel", quantity: 1 }, { type: "storyFrame", quantity: 3 }] },
  { name: "Stay Coverage", track: "influencer", deliverables: [{ type: "influencerReel", quantity: 2 }, { type: "storyFrame", quantity: 5 }] },
  { name: "Weekend Takeover", track: "influencer", deliverables: [{ type: "influencerReel", quantity: 2 }, { type: "storyFrame", quantity: 8 }, { type: "carousel", quantity: 1 }] },
  { name: "Launch Campaign", track: "influencer", deliverables: [{ type: "influencerReel", quantity: 3 }, { type: "storyFrame", quantity: 5 }, { type: "carousel", quantity: 1 }] },

  // ── Custom (standalone / long-form) ──
  { name: "YouTube Feature", track: "custom", deliverables: [{ type: "youtubeVideo", quantity: 1 }] },
  { name: "Vlog Bundle", track: "custom", deliverables: [{ type: "youtubeVideo", quantity: 1 }, { type: "ugcReel", quantity: 1 }, { type: "photo", quantity: 5 }] },
  {
    name: "Ambassador Quarter",
    track: "custom",
    cadence: "1 reel + 4 stories monthly × 3 months",
    deliverables: [{ type: "influencerReel", quantity: 3 }, { type: "storyFrame", quantity: 12 }],
  },
];

// ─── Budget mode ─────────────────────────────────────────────────────────────
// Returns every preset (for the given track) whose midpoint fits the
// effective budget, plus one "stretch" option — the cheapest preset that
// exceeds budget but stays within 120% of it.
export function findPackagesForBudget({ budget, tierId, complexity = "standard", track }) {
  const tier = TIERS[tierId];
  if (!tier || !(budget > 0)) return { fitting: [], stretch: null };

  const candidates = PRESET_PACKAGES
    .filter((p) => !track || p.track === track)
    .map((p) => {
      const points = totalPoints(p.deliverables);
      const midpoint = calcMidpoint(points, tierId, complexity);
      return { ...p, points, midpoint };
    })
    .sort((a, b) => a.points - b.points);

  const fitting = candidates.filter((p) => p.midpoint <= budget);
  const over = candidates
    .filter((p) => p.midpoint > budget && p.midpoint <= budget * BUDGET_STRETCH_CEILING)
    .sort((a, b) => a.midpoint - b.midpoint);
  const stretch = over[0] || null;

  return { fitting, stretch };
}
