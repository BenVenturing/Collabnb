"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import SearchOverlay from "@/components/search/SearchOverlay";
import SearchResults from "@/components/search/SearchResults";
import { mockListings, getTierRank } from "@/data/mockListings";

export default function SearchPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [deliverablesCount, setDeliverablesCount] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [completeByDate, setCompleteByDate] = useState("");
  const [selectedDeliverables, setSelectedDeliverables] = useState([]);
  const [selectedTier, setSelectedTier] = useState("ugc");
  const [compensationTypes, setCompensationTypes] = useState([]);
  const [deliverableLoad, setDeliverableLoad] = useState("");
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [sortBy, setSortBy] = useState("best");

  // Filter and sort listings - updates live as user types
  const filteredListings = useMemo(() => {
    let results = [...mockListings];

    // 1. Location/search query filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      results = results.filter(
        (listing) =>
          listing.location_city.toLowerCase().includes(searchLower) ||
          listing.location_country.toLowerCase().includes(searchLower) ||
          listing.title.toLowerCase().includes(searchLower) ||
          (searchLower.includes("nearby") && listing.location_tag === "nearby"),
      );
    }

    // 2. Nearby filter
    if (nearbyEnabled) {
      results = results.filter((listing) => listing.location_tag === "nearby");
    }

    // 3. Deliverables filter (AND logic: listing must support ALL selected)
    if (selectedDeliverables?.length > 0) {
      results = results.filter((listing) =>
        selectedDeliverables.every((d) =>
          listing.deliverables_supported.includes(d),
        ),
      );
    }

    // 4. Creator tier filter (show only if listing.min_creator_tier <= selected tier)
    if (selectedTier) {
      const selectedTierRank = getTierRank(selectedTier);
      results = results.filter(
        (listing) => getTierRank(listing.min_creator_tier) <= selectedTierRank,
      );
    }

    // 5. Compensation filter (OR logic)
    if (compensationTypes?.length > 0) {
      results = results.filter((listing) =>
        compensationTypes.includes(listing.compensation_type),
      );
    }

    // 6. Deliverable load filter
    if (deliverableLoad) {
      results = results.filter(
        (listing) => listing.deliverable_load === deliverableLoad,
      );
    }

    // 7. Deliverables count filter
    if (deliverablesCount) {
      const [min, max] = deliverablesCount.split("-").map(Number);
      results = results.filter((listing) => {
        const count = listing.deliverables_supported.length;
        if (max) return count >= min && count <= max;
        return count >= min;
      });
    }

    // 8. Price range filter (using value_score as proxy for now)
    if (priceRange.min || priceRange.max) {
      results = results.filter((listing) => {
        const min = priceRange.min ? Number(priceRange.min) : 0;
        const max = priceRange.max ? Number(priceRange.max) : Infinity;
        return listing.value_score >= min && listing.value_score <= max;
      });
    }

    // 9. Sorting
    if (sortBy === "newest") {
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "value") {
      results.sort((a, b) => b.value_score - a.value_score);
    } else {
      results.sort((a, b) => {
        const valueDiff = b.value_score - a.value_score;
        if (valueDiff !== 0) return valueDiff;
        const overlapA =
          selectedDeliverables?.filter((d) =>
            a.deliverables_supported.includes(d),
          ).length || 0;
        const overlapB =
          selectedDeliverables?.filter((d) =>
            b.deliverables_supported.includes(d),
          ).length || 0;
        const overlapDiff = overlapB - overlapA;
        if (overlapDiff !== 0) return overlapDiff;
        const tierDiffA = Math.abs(
          getTierRank(a.min_creator_tier) - getTierRank(selectedTier),
        );
        const tierDiffB = Math.abs(
          getTierRank(b.min_creator_tier) - getTierRank(selectedTier),
        );
        return tierDiffA - tierDiffB;
      });
    }

    return results;
  }, [
    searchQuery,
    deliverablesCount,
    priceRange,
    completeByDate,
    selectedDeliverables,
    selectedTier,
    compensationTypes,
    deliverableLoad,
    nearbyEnabled,
    sortBy,
  ]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setDeliverablesCount("");
    setPriceRange({ min: "", max: "" });
    setCompleteByDate("");
    setSelectedDeliverables([]);
    setSelectedTier("ugc");
    setCompensationTypes([]);
    setDeliverableLoad("");
    setNearbyEnabled(false);
    setSortBy("best");
  };

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (deliverablesCount ? 1 : 0) +
    (priceRange.min || priceRange.max ? 1 : 0) +
    (completeByDate ? 1 : 0) +
    selectedDeliverables.length +
    compensationTypes.length +
    (deliverableLoad ? 1 : 0) +
    (nearbyEnabled ? 1 : 0) +
    (selectedTier !== "ugc" ? 1 : 0) +
    (sortBy !== "best" ? 1 : 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Live Search Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#D0D5CE] px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#959D90] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations, properties..."
              className="w-full pl-12 pr-4 py-3 border border-[#D0D5CE] rounded-xl text-base text-[#192524] placeholder-[#959D90] focus:outline-none focus:ring-2 focus:ring-[#3C5759] focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Icon Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="relative bg-white border border-[#D0D5CE] hover:bg-[#EFECE9] p-3 rounded-xl transition-colors flex-shrink-0"
          >
            <SlidersHorizontal className="w-5 h-5 text-[#3C5759]" />
            {activeFilterCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-[#3C5759] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Filter Overlay */}
      <SearchOverlay
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={{
          deliverablesCount,
          priceRange,
          completeByDate,
          selectedDeliverables,
          selectedTier,
          compensationTypes,
          deliverableLoad,
          nearbyEnabled,
          sortBy,
        }}
        onFiltersChange={{
          setDeliverablesCount,
          setPriceRange,
          setCompleteByDate,
          setSelectedDeliverables,
          setSelectedTier,
          setCompensationTypes,
          setDeliverableLoad,
          setNearbyEnabled,
          setSortBy,
        }}
        onClearAll={handleClearFilters}
      />

      {/* Results */}
      <SearchResults
        listings={filteredListings}
        filters={{
          location: searchQuery,
          deliverables: selectedDeliverables,
          compensation: compensationTypes,
          load: deliverableLoad,
        }}
      />

      {/* Empty State / Welcome */}
      {!searchQuery && activeFilterCount === 0 && (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-[#192524] mb-4">
            Find your perfect collaboration
          </h1>
          <p className="text-lg text-[#3C5759] mb-8">
            Search through curated properties looking for creators like you
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-[#192524]">
                {mockListings.length}+
              </div>
              <div className="text-sm text-[#3C5759] mt-1">Listings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#192524]">50+</div>
              <div className="text-sm text-[#3C5759] mt-1">Cities</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#192524]">3</div>
              <div className="text-sm text-[#3C5759] mt-1">Creator Tiers</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
