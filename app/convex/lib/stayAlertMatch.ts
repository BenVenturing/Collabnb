// ─── Stay alert matching — single source of truth ─────────────────────────────
// Used by stayAlerts.previewMatches (the "N live stays match this" counter the
// creator sees while building an alert) and stayAlerts.notifyForListing (the
// fan-out when a listing goes live). Both must agree, or creators get a count
// that doesn't predict what they'll actually be notified about.
//
// Guiding rule: a stated mismatch fails, missing listing data passes. A host
// who left `nights` blank shouldn't be filtered out of every alert that has a
// minimum-nights preference — being slightly over-inclusive costs a creator one
// glance at a listing, while being under-inclusive silently hides work from
// them and they never learn it happened.

export type StayAlertFilters = {
  countries?: string[];
  deliverable_types?: string[];
  min_cash?: number;
  compensation_types?: string[];
  min_nights?: number;
  travel_start?: string;
  travel_end?: string;
};

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

// A listing has to be live, real, and past compensation review before it can
// match anything — the same gate Explore's published feed uses.
export function isAlertableListing(l: any): boolean {
  return l?.status === "published" && l?.is_sample !== true && l?.needs_compensation_review !== true;
}

function matchesCountry(l: any, countries?: string[]): boolean {
  if (!countries || countries.length === 0) return true;
  // location_country is the canonical field; older rows only have the freeform
  // `location` ("Tulum, Mexico"), so fall back to substring-matching that.
  const country = norm(l.location_country);
  const haystack = `${norm(l.location)} ${norm(l.location_city)}`;
  return countries.some((c) => {
    const want = norm(c);
    if (!want) return false;
    if (country) return country === want || country.includes(want) || want.includes(country);
    return haystack.includes(want);
  });
}

function matchesDeliverables(l: any, allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  const d = l.deliverables;
  // Legacy listings store deliverables as a display string ("3 reels + photos")
  // that can't be parsed into types — let those through rather than hiding them.
  if (!Array.isArray(d) || d.length === 0) return true;
  // Every deliverable the host wants must be a type this creator accepts: the
  // creator is on the hook for the whole package, not just the parts they like.
  return d.every((item: any) => allowed.includes(item?.type));
}

function matchesCash(l: any, minCash?: number): boolean {
  if (!minCash || minCash <= 0) return true;
  // Cash only — never cash + stay_value. See the schema comment on min_cash.
  return typeof l.cash_amount === "number" && l.cash_amount >= minCash;
}

function matchesCompType(l: any, types?: string[]): boolean {
  if (!types || types.length === 0) return true;
  const ct = norm(l.compensation_type);
  if (!ct) return true;
  return types.map(norm).includes(ct);
}

function matchesNights(l: any, minNights?: number): boolean {
  if (!minNights || minNights <= 0) return true;
  if (typeof l.nights !== "number" || l.nights <= 0) return true;
  return l.nights >= minNights;
}

// Inclusive overlap between the creator's travel window and any availability
// window on the listing. Both sides are ISO yyyy-mm-dd, which compares
// correctly as plain strings.
function matchesDates(l: any, start?: string, end?: string): boolean {
  if (!start && !end) return true;
  const from = start || "0000-01-01";
  const to = end || "9999-12-31";
  const windows: { startDate: string; endDate: string }[] = [];
  if (Array.isArray(l.date_ranges)) {
    for (const r of l.date_ranges) {
      if (r?.startDate && r?.endDate) windows.push({ startDate: r.startDate, endDate: r.endDate });
    }
  }
  if (windows.length === 0 && l.collab_start && l.collab_end) {
    windows.push({ startDate: l.collab_start, endDate: l.collab_end });
  }
  // No dates published yet — the host may add them later, so don't hide it.
  if (windows.length === 0) return true;
  return windows.some((w) => w.startDate <= to && w.endDate >= from);
}

export function listingMatchesAlert(l: any, alert: StayAlertFilters): boolean {
  return (
    matchesCountry(l, alert.countries) &&
    matchesDeliverables(l, alert.deliverable_types) &&
    matchesCash(l, alert.min_cash) &&
    matchesCompType(l, alert.compensation_types) &&
    matchesNights(l, alert.min_nights) &&
    matchesDates(l, alert.travel_start, alert.travel_end)
  );
}

// Human-readable one-liner used in the alert list, the notification body and
// the email footer ("Paid · Reels · $300+ · Mexico"), so a creator always knows
// which alert fired and why.
export function describeAlert(
  alert: StayAlertFilters,
  labels: Record<string, string> = {}
): string {
  const parts: string[] = [];
  if (alert.compensation_types?.length === 1) {
    parts.push(alert.compensation_types[0] === "hybrid" ? "Hybrid" : "Paid");
  }
  if (alert.deliverable_types?.length) {
    parts.push(alert.deliverable_types.map((d) => labels[d] || d).join(" / "));
  }
  if (alert.min_cash) parts.push(`$${alert.min_cash}+`);
  if (alert.min_nights) parts.push(`${alert.min_nights}+ nights`);
  if (alert.countries?.length) parts.push(alert.countries.join(", "));
  else parts.push("Anywhere");
  if (alert.travel_start || alert.travel_end) {
    parts.push(`${alert.travel_start || "any"} → ${alert.travel_end || "any"}`);
  }
  return parts.join(" · ");
}
