"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const DELIVERABLE_OPTIONS = [
  "UGC",
  "Reels",
  "TikTok",
  "YouTube",
  "Photos",
  "Blog",
  "Story Set",
];

const TIER_OPTIONS = [
  { value: "ugc", label: "UGC" },
  { value: "micro", label: "Micro" },
  { value: "mid", label: "Mid" },
];

const COMPENSATION_OPTIONS = [
  { value: "free", label: "Free stay" },
  { value: "paid", label: "Paid" },
  { value: "hybrid", label: "Hybrid" },
];

const LOAD_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

const SORT_OPTIONS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "value", label: "Highest value" },
];

const DELIVERABLES_COUNT_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1-3", label: "1-3 deliverables" },
  { value: "4-6", label: "4-6 deliverables" },
  { value: "7-10", label: "7-10 deliverables" },
  { value: "10-999", label: "10+ deliverables" },
];

export default function SearchOverlay({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
}) {
  const {
    deliverablesCount = "",
    priceRange = { min: "", max: "" },
    completeByDate = "",
    selectedDeliverables = [],
    selectedTier = "ugc",
    compensationTypes = [],
    deliverableLoad = "",
    nearbyEnabled = false,
    sortBy = "best",
  } = filters;

  const {
    setDeliverablesCount,
    setPriceRange,
    setCompleteByDate,
    setSelectedDeliverables,
    setSelectedTier,
    setCompensationTypes,
    setDeliverableLoad,
    setNearbyEnabled,
    setSortBy,
  } = onFiltersChange;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const activeFilterCount =
    (deliverablesCount ? 1 : 0) +
    (priceRange.min || priceRange.max ? 1 : 0) +
    (completeByDate ? 1 : 0) +
    selectedDeliverables.length +
    compensationTypes.length +
    (deliverableLoad ? 1 : 0) +
    (nearbyEnabled ? 1 : 0) +
    (selectedTier !== "ugc" ? 1 : 0) +
    (sortBy !== "best" ? 1 : 0);

  const toggleDeliverable = (deliverable) => {
    setSelectedDeliverables((prev) =>
      prev.includes(deliverable)
        ? prev.filter((d) => d !== deliverable)
        : [...prev, deliverable],
    );
  };

  const toggleCompensation = (comp) => {
    setCompensationTypes((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp],
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Filter Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-96 z-50 flex"
          >
            <div className="w-full bg-white shadow-2xl flex flex-col max-h-full">
              {/* Header */}
              <div className="border-b border-[#D0D5CE] px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#192524]">
                    Filters
                  </h2>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-[#EFECE9] flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-[#3C5759]" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Deliverables Count Filter */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#192524] mb-3">
                    Number of deliverables
                  </h3>
                  <select
                    value={deliverablesCount}
                    onChange={(e) => setDeliverablesCount(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D0D5CE] rounded-xl text-sm text-[#192524] focus:outline-none focus:ring-2 focus:ring-[#3C5759] focus:border-transparent"
                  >
                    {DELIVERABLES_COUNT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range Filter */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#192524] mb-3">
                    Price range (value score)
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) =>
                        setPriceRange((prev) => ({
                          ...prev,
                          min: e.target.value,
                        }))
                      }
                      placeholder="Min"
                      className="flex-1 px-4 py-3 border border-[#D0D5CE] rounded-xl text-sm text-[#192524] placeholder-[#959D90] focus:outline-none focus:ring-2 focus:ring-[#3C5759] focus:border-transparent"
                    />
                    <span className="text-[#959D90]">-</span>
                    <input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) =>
                        setPriceRange((prev) => ({
                          ...prev,
                          max: e.target.value,
                        }))
                      }
                      placeholder="Max"
                      className="flex-1 px-4 py-3 border border-[#D0D5CE] rounded-xl text-sm text-[#192524] placeholder-[#959D90] focus:outline-none focus:ring-2 focus:ring-[#3C5759] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Complete-by Date Filter */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#192524] mb-3">
                    Complete by date
                  </h3>
                  <input
                    type="date"
                    value={completeByDate}
                    onChange={(e) => setCompleteByDate(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D0D5CE] rounded-xl text-sm text-[#192524] focus:outline-none focus:ring-2 focus:ring-[#3C5759] focus:border-transparent"
                  />
                </div>

                <div className="border-t border-[#D0D5CE] my-6"></div>

                {/* Nearby Toggle */}
                <div className="mb-6">
                  <motion.div
                    className="flex items-center gap-2"
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      type="checkbox"
                      id="nearby-filter"
                      checked={nearbyEnabled}
                      onChange={(e) => setNearbyEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-[#D0D5CE] accent-[#3C5759] cursor-pointer"
                    />
                    <label
                      htmlFor="nearby-filter"
                      className="text-sm text-[#192524] cursor-pointer select-none"
                    >
                      Nearby only{" "}
                      <span className="text-xs text-[#959D90]">
                        (GPS coming soon)
                      </span>
                    </label>
                  </motion.div>
                </div>

                {/* Deliverables Filter */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#192524]">
                      Deliverable types
                    </h3>
                    {selectedDeliverables.length > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs font-medium text-[#3C5759] bg-[#3C5759]/10 px-2 py-1 rounded-full"
                      >
                        {selectedDeliverables.length} selected
                      </motion.span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERABLE_OPTIONS.map((deliverable) => (
                      <motion.button
                        key={deliverable}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleDeliverable(deliverable)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedDeliverables.includes(deliverable)
                            ? "bg-[#3C5759] text-white shadow-md"
                            : "bg-[#EFECE9] text-[#192524] hover:bg-[#D0D5CE]"
                        }`}
                      >
                        {deliverable}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Creator Tier Filter */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#192524] mb-3">
                    Creator tier
                  </h3>
                  <div className="flex gap-2 mb-2">
                    {TIER_OPTIONS.map((tier) => (
                      <motion.button
                        key={tier.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTier(tier.value)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          selectedTier === tier.value
                            ? "bg-[#3C5759] text-white shadow-md"
                            : "bg-[#EFECE9] text-[#192524] hover:bg-[#D0D5CE]"
                        }`}
                      >
                        {tier.label}
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-xs text-[#959D90]">
                    Listings shown are based on your tier.
                  </p>
                </div>

                {/* Compensation Filter */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#192524]">
                      Compensation
                    </h3>
                    {compensationTypes.length > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs font-medium text-[#3C5759] bg-[#3C5759]/10 px-2 py-1 rounded-full"
                      >
                        {compensationTypes.length} selected
                      </motion.span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COMPENSATION_OPTIONS.map((comp) => (
                      <motion.button
                        key={comp.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleCompensation(comp.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          compensationTypes.includes(comp.value)
                            ? "bg-[#3C5759] text-white shadow-md"
                            : "bg-[#EFECE9] text-[#192524] hover:bg-[#D0D5CE]"
                        }`}
                      >
                        {comp.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Deliverable Load Filter */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#192524] mb-3">
                    Deliverable load
                  </h3>
                  <div className="flex gap-2">
                    {LOAD_OPTIONS.map((load) => (
                      <motion.button
                        key={load.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          setDeliverableLoad(
                            deliverableLoad === load.value ? "" : load.value,
                          )
                        }
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          deliverableLoad === load.value
                            ? "bg-[#3C5759] text-white shadow-md"
                            : "bg-[#EFECE9] text-[#192524] hover:bg-[#D0D5CE]"
                        }`}
                      >
                        {load.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sort Filter */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#192524] mb-3">
                    Sort by
                  </h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D0D5CE] rounded-xl text-sm text-[#192524] focus:outline-none focus:ring-2 focus:ring-[#3C5759] focus:border-transparent"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="border-t border-[#D0D5CE] px-6 py-4 bg-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button
                    onClick={onClearAll}
                    className="text-sm font-medium underline text-[#3C5759] hover:text-[#192524] transition-colors"
                  >
                    Clear all{" "}
                    {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="bg-[#3C5759] hover:bg-[#192524] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md"
                  >
                    Apply filters
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
