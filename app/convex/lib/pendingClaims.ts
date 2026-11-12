// Profiles pre-created for a hotel's claim link stay "pending" (not counted,
// not shown publicly) until the hotel first opens that link.
export async function pendingClaimProfileIds(ctx: { db: any }): Promise<Set<string>> {
  const claims = await ctx.db.query("listing_claims").collect();
  return new Set(
    claims.filter((c: any) => c.profile_id && !c.first_viewed_at && c.status !== "claimed").map((c: any) => String(c.profile_id)),
  );
}
