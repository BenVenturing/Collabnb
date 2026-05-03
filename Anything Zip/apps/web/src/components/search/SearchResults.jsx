"use client";

import { MapPin, Sparkles } from "lucide-react";

export default function SearchResults({ listings, filters }) {
  if (!listings || listings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-[#959D90] mb-4">
          <MapPin className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-[#192524] mb-2">
          No listings found
        </h3>
        <p className="text-[#3C5759]">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Results Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#192524] mb-2">
          {listings.length} {listings.length === 1 ? "listing" : "listings"}{" "}
          found
        </h2>
        {filters?.location && (
          <p className="text-[#3C5759]">
            Showing results for{" "}
            <span className="font-medium">{filters.location}</span>
          </p>
        )}
      </div>

      {/* Active Filters */}
      {(filters?.deliverables?.length > 0 ||
        filters?.compensation?.length > 0 ||
        filters?.load) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.deliverables?.map((d) => (
            <span
              key={d}
              className="px-3 py-1 bg-[#EFECE9] text-[#192524] text-sm rounded-full"
            >
              {d}
            </span>
          ))}
          {filters.compensation?.map((c) => (
            <span
              key={c}
              className="px-3 py-1 bg-[#EFECE9] text-[#192524] text-sm rounded-full capitalize"
            >
              {c}
            </span>
          ))}
          {filters.load && (
            <span className="px-3 py-1 bg-[#EFECE9] text-[#192524] text-sm rounded-full capitalize">
              {filters.load} load
            </span>
          )}
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="group cursor-pointer"
            onClick={() => {
              console.log("Navigate to listing:", listing.id);
            }}
          >
            {/* Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-[#D0D5CE]">
              <div className="absolute inset-0 flex items-center justify-center text-[#959D90] text-sm">
                Property Image
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#D0D5CE] to-[#959D90] opacity-30"></div>
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              {/* Location */}
              <div className="flex items-center gap-1 text-xs text-[#3C5759]">
                <MapPin className="w-3 h-3" />
                <span>
                  {listing.location_city}, {listing.location_country}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-[#192524] line-clamp-2 group-hover:underline">
                {listing.title}
              </h3>

              {/* Badges Row 1: Tier + Compensation */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 bg-[#D0D5CE] text-[#192524] text-xs font-medium rounded">
                  {listing.min_creator_tier.toUpperCase()}+
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                    listing.compensation_type === "paid"
                      ? "bg-[#3C5759] text-white"
                      : listing.compensation_type === "hybrid"
                        ? "bg-[#959D90] text-white"
                        : "bg-[#EFECE9] text-[#192524]"
                  }`}
                >
                  {listing.compensation_type === "free"
                    ? "Free stay"
                    : listing.compensation_type === "paid"
                      ? "Paid"
                      : "Hybrid"}
                </span>
              </div>

              {/* Badges Row 2: Deliverables (max 3) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {listing.deliverables_supported.slice(0, 3).map((d) => (
                  <span
                    key={d}
                    className="text-xs bg-[#3C5759] text-white px-2 py-0.5 rounded"
                  >
                    {d}
                  </span>
                ))}
                {listing.deliverables_supported.length > 3 && (
                  <span className="text-xs text-[#959D90]">
                    +{listing.deliverables_supported.length - 3}
                  </span>
                )}
              </div>

              {/* Value Score */}
              <div className="flex items-center gap-1 text-xs text-[#3C5759]">
                <Sparkles className="w-3 h-3 text-[#3C5759]" />
                <span className="font-medium">
                  Value: {listing.value_score}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
