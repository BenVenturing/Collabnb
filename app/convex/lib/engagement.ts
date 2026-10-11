// Plain-language label for a creator's engagement rate so brands don't have
// to interpret a raw percentage. "views" basis = (likes+comments)/avg views,
// which runs higher than "followers" basis = (likes+comments)/followers.
export function engagementTier(rate: number | undefined, basis: "views" | "followers" = "views"): string | undefined {
  if (rate === undefined || !isFinite(rate) || rate <= 0) return undefined;
  const [strong, average] = basis === "views" ? [6, 3] : [3, 1];
  if (rate >= strong) return "strong";
  if (rate >= average) return "average";
  return "low";
}
