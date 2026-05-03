import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

const DELIVERABLES_COUNT_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1-3", label: "1-3 deliverables" },
  { value: "4-6", label: "4-6 deliverables" },
  { value: "7-10", label: "7-10 deliverables" },
  { value: "11", label: "11+ deliverables" },
];

const DELIVERABLE_OPTIONS = [
  "UGC",
  "Reels",
  "TikTok",
  "Blog",
  "Instagram",
  "YouTube",
  "Photography",
];

const TIER_OPTIONS = [
  { value: "ugc", label: "UGC" },
  { value: "ugc+", label: "UGC+" },
  { value: "nano", label: "Nano" },
];

const COMPENSATION_OPTIONS = [
  { value: "free", label: "Free stay" },
  { value: "paid", label: "Paid" },
  { value: "hybrid", label: "Hybrid" },
];

const LOAD_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

const SORT_OPTIONS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "value", label: "Highest value" },
];

export default function FilterModal({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
}) {
  const insets = useSafeAreaInsets();

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#D0D5CE",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#192524",
              }}
            >
              Filters
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#EFECE9",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X color="#192524" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            {/* Deliverables Count */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Number of deliverables
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {DELIVERABLES_COUNT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setDeliverablesCount(option.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        deliverablesCount === option.value
                          ? "#3C5759"
                          : "#EFECE9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color:
                          deliverablesCount === option.value
                            ? "#fff"
                            : "#192524",
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Price range (value score)
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <TextInput
                  value={priceRange.min}
                  onChangeText={(value) =>
                    setPriceRange((prev) => ({ ...prev, min: value }))
                  }
                  placeholder="Min"
                  placeholderTextColor="#959D90"
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    borderRadius: 12,
                    fontSize: 15,
                    color: "#192524",
                  }}
                />
                <Text style={{ color: "#959D90" }}>-</Text>
                <TextInput
                  value={priceRange.max}
                  onChangeText={(value) =>
                    setPriceRange((prev) => ({ ...prev, max: value }))
                  }
                  placeholder="Max"
                  placeholderTextColor="#959D90"
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    borderRadius: 12,
                    fontSize: 15,
                    color: "#192524",
                  }}
                />
              </View>
            </View>

            {/* Complete-by Date */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Complete by date
              </Text>
              <TextInput
                value={completeByDate}
                onChangeText={setCompleteByDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#959D90"
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  fontSize: 15,
                  color: "#192524",
                }}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "#D0D5CE",
                marginBottom: 24,
              }}
            />

            {/* Nearby Toggle */}
            <View style={{ marginBottom: 24 }}>
              <Pressable
                onPress={() => setNearbyEnabled(!nearbyEnabled)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: nearbyEnabled ? "#3C5759" : "#D0D5CE",
                    backgroundColor: nearbyEnabled ? "#3C5759" : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {nearbyEnabled && (
                    <Text style={{ color: "#fff", fontSize: 14 }}>✓</Text>
                  )}
                </View>
                <Text style={{ fontSize: 14, color: "#192524", flex: 1 }}>
                  Nearby only{" "}
                  <Text style={{ fontSize: 12, color: "#959D90" }}>
                    (GPS coming soon)
                  </Text>
                </Text>
              </Pressable>
            </View>

            {/* Deliverable Types */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#192524",
                  }}
                >
                  Deliverable types
                </Text>
                {selectedDeliverables.length > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: "#3C5759",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      {selectedDeliverables.length} selected
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {DELIVERABLE_OPTIONS.map((deliverable) => (
                  <TouchableOpacity
                    key={deliverable}
                    onPress={() => toggleDeliverable(deliverable)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: selectedDeliverables.includes(
                        deliverable,
                      )
                        ? "#3C5759"
                        : "#EFECE9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: selectedDeliverables.includes(deliverable)
                          ? "#fff"
                          : "#192524",
                      }}
                    >
                      {deliverable}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Creator Tier */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Creator tier
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {TIER_OPTIONS.map((tier) => (
                  <TouchableOpacity
                    key={tier.value}
                    onPress={() => setSelectedTier(tier.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor:
                        selectedTier === tier.value ? "#3C5759" : "#EFECE9",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: selectedTier === tier.value ? "#fff" : "#192524",
                      }}
                    >
                      {tier.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: "#959D90", marginTop: 8 }}>
                Listings shown are based on your tier.
              </Text>
            </View>

            {/* Compensation */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#192524",
                  }}
                >
                  Compensation
                </Text>
                {compensationTypes.length > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: "#3C5759",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      {compensationTypes.length} selected
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {COMPENSATION_OPTIONS.map((comp) => (
                  <TouchableOpacity
                    key={comp.value}
                    onPress={() => toggleCompensation(comp.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: compensationTypes.includes(comp.value)
                        ? "#3C5759"
                        : "#EFECE9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: compensationTypes.includes(comp.value)
                          ? "#fff"
                          : "#192524",
                      }}
                    >
                      {comp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Deliverable Load */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Deliverable load
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {LOAD_OPTIONS.map((load) => (
                  <TouchableOpacity
                    key={load.value}
                    onPress={() =>
                      setDeliverableLoad(
                        deliverableLoad === load.value ? "" : load.value,
                      )
                    }
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor:
                        deliverableLoad === load.value ? "#3C5759" : "#EFECE9",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          deliverableLoad === load.value ? "#fff" : "#192524",
                      }}
                    >
                      {load.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Sort by
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSortBy(option.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        sortBy === option.value ? "#3C5759" : "#EFECE9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: sortBy === option.value ? "#fff" : "#192524",
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#D0D5CE",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: "#fff",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={onClearAll}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#3C5759",
                  textDecorationLine: "underline",
                }}
              >
                Clear all {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "#3C5759",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                Apply filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
