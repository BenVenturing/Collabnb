// Keep partial dates, zero values and empty collections when saving a draft.
export function listingDraftFields(draft, profile, combinedDeliverablesList, totalDeliverables) {
  const dateRanges = (draft.date_ranges?.length
    ? draft.date_ranges
    : [{ startDate: draft.collab_start || "", endDate: draft.collab_end || "" }]
  ).filter((r) => r.startDate || r.endDate).slice(0, 3);
  return {
    title: draft.title,
    location: [draft.location_city, draft.location_country].filter(Boolean).join(", "),
    location_city: draft.location_city,
    location_country: draft.location_country,
    lat: typeof draft.lat === "number" ? draft.lat : undefined,
    lng: typeof draft.lng === "number" ? draft.lng : undefined,
    host_id: profile?._id || profile?.id,
    host_name: profile?.full_name,
    property_url: draft.property_url,
    contact_phone: draft.contact_phone,
    collaboration_brief: draft.collaboration_brief,
    compensation_type: draft.compensation_type,
    cash_amount: Number(draft.cash_amount) || 0,
    payout_handling: draft.payout_handling || undefined,
    currency: draft.currency || undefined,
    max_offers: draft.maxOffers === "" || draft.maxOffers == null ? undefined : Number(draft.maxOffers),
    nights: draft.nights,
    creator_tier: draft.creator_tier,
    deliverable_load: draft.deliverable_load,
    complexity: draft.complexity,
    stay_value: draft.compensation_type === "hybrid" ? draft.stay_value : undefined,
    deliverables: draft.deliverables || [],
    gallery_images: draft.images,
    amenities: draft.amenities || [],
    perks: draft.perks,
    vibe_tags: draft.vibe_tags,
    affiliate_code: draft.affiliate_code,
    affiliate_percent: draft.affiliate_percent === "" ? undefined : draft.affiliate_percent,
    collab_start: dateRanges[0]?.startDate || "",
    collab_end: dateRanges[0]?.endDate || "",
    date_ranges: dateRanges,
    turnaround_days: draft.turnaround_days === "" ? 0 : draft.turnaround_days,
    deliverables_list: combinedDeliverablesList,
    deliverable_count: totalDeliverables,
    revision_policy: draft.revision_policy,
    usage_rights: draft.usage_rights,
  };
}
