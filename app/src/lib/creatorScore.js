// Creators-tab ranking engine. Mirrors matchScore.js's approach (weighted
// 0–1 parts combined into a 0–100 score) so the two systems stay legible
// side by side. Full reference: /creator-algorithm.md (project root).
import { norm, regionTerms } from './matchScore';

export const WEIGHTS = { proximity: 0.45, success: 0.35, recency: 0.20 };

// A creator gets the full recency boost for this many days after joining,
// then it cliffs straight to 0 — no gradual taper.
export const NEW_CREATOR_WINDOW_DAYS = 7;

// Structured city/region/country when the backend provides them (real
// creators); otherwise fall back to parsing the display "City, ST" string
// samples and legacy records use.
function creatorLocationParts(creator) {
  if (creator.city || creator.region || creator.country) {
    return { city: norm(creator.city), region: norm(creator.region), country: norm(creator.country) };
  }
  const [cityPart, regionPart] = (creator.location || '').split(',').map((s) => s?.trim());
  return { city: norm(cityPart), region: norm(regionPart), country: '' };
}

export function buildHostContext(host) {
  return {
    homeCity: norm(host?.city),
    homeRegionTerms: regionTerms(host?.region),
    homeCountry: norm(host?.country),
  };
}

export function proximityScore(creator, hostCtx) {
  const { city, region, country } = creatorLocationParts(creator);

  if (hostCtx.homeCity && hostCtx.homeCity.length >= 3 && city === hostCtx.homeCity) {
    return { score: 1, reason: `in ${creator.city || city}` };
  }
  const creatorRegionTerms = regionTerms(region);
  if (hostCtx.homeRegionTerms.length && creatorRegionTerms.some((t) => hostCtx.homeRegionTerms.includes(t))) {
    return { score: 0.85, reason: 'in your state' };
  }
  if (hostCtx.homeCountry && country && country === hostCtx.homeCountry) {
    return { score: 0.55, reason: 'in your country' };
  }
  return { score: 0.25, reason: null };
}

// Completed ÷ total collaborations. Real creators carry live counts from
// listPublicCreators; sample/mock creators have no tracked collab records,
// so we approximate from their existing collab_count + past_collab fields.
export function successScore(creator) {
  if (typeof creator.completed_collab_count === 'number' && typeof creator.total_collab_count === 'number') {
    const { completed_collab_count: completed, total_collab_count: total } = creator;
    if (total === 0) return { score: 0.5, completed: 0, total: 0 };
    return { score: completed / total, completed, total };
  }
  if (creator.collab_count > 0) {
    return { score: creator.past_collab ? 0.9 : 0.7, completed: null, total: creator.collab_count };
  }
  return { score: 0.5, completed: null, total: 0 };
}

export function recencyScore(creator, now = Date.now()) {
  const created = creator.created_at ?? creator._creationTime;
  if (!created) return { score: 0, daysSinceJoin: null };
  const days = (now - created) / 86400000;
  return { score: days <= NEW_CREATOR_WINDOW_DAYS ? 1 : 0, daysSinceJoin: Math.max(0, Math.floor(days)) };
}

export function computeCreatorScore(creator, hostCtx) {
  const prox = proximityScore(creator, hostCtx);
  const succ = successScore(creator);
  const rec = recencyScore(creator);

  const score = Math.round(
    (WEIGHTS.proximity * prox.score + WEIGHTS.success * succ.score + WEIGHTS.recency * rec.score) * 100
  );

  const reasons = [
    prox.reason,
    succ.total > 0 ? `${succ.completed ?? '~'}/${succ.total} collabs` : null,
    rec.score === 1 ? `new — joined ${rec.daysSinceJoin}d ago` : null,
  ].filter(Boolean);

  return {
    score,
    parts: { proximity: prox.score, success: succ.score, recency: rec.score },
    reasons,
    meta: { daysSinceJoin: rec.daysSinceJoin, completed: succ.completed, total: succ.total },
  };
}

export function scoreCreators(creators, hostCtx) {
  return creators.map((c) => {
    const m = computeCreatorScore(c, hostCtx);
    return { ...c, _score: m.score, _scoreParts: m.parts, _scoreReasons: m.reasons, _scoreMeta: m.meta };
  });
}
