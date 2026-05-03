import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Heart,
  ChevronLeft,
  X,
} from "lucide-react-native";
import FilterModal from "@/components/FilterModal";

const { width } = Dimensions.get("window");

const MOCK_LISTINGS = {
  "Tokyo, Japan": [
    {
      id: 1,
      name: "Modern Tokyo Apartment",
      location: "Shibuya, Tokyo",
      image:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
      isAffiliate: true,
      collaborationType: "UGC+",
      stayType: "Free stay",
      deliverables: ["UGC", "Reels", "TikTok", "+2"],
      value: 1200,
    },
    {
      id: 2,
      name: "Traditional Ryokan Experience",
      location: "Asakusa, Tokyo",
      image:
        "https://images.unsplash.com/photo-1580559196271-8f8e8f57c7f3?w=800",
      isAffiliate: false,
      collaborationType: "UGC",
      stayType: "Paid collab",
      deliverables: ["UGC", "Reels"],
      value: 850,
    },
    {
      id: 3,
      name: "Luxury Penthouse Views",
      location: "Roppongi, Tokyo",
      image:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
      isAffiliate: true,
      collaborationType: "UGC+",
      stayType: "Free stay",
      deliverables: ["UGC", "Reels", "TikTok", "Blog", "+1"],
      value: 2500,
    },
  ],
  "Bali, Indonesia": [
    {
      id: 4,
      name: "Jungle Villa with Pool",
      location: "Ubud, Bali",
      image:
        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
      isAffiliate: true,
      collaborationType: "UGC+",
      stayType: "Free stay",
      deliverables: ["UGC", "Reels", "TikTok", "+1"],
      value: 950,
    },
    {
      id: 5,
      name: "Beachfront Paradise",
      location: "Seminyak, Bali",
      image:
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
      isAffiliate: false,
      collaborationType: "UGC",
      stayType: "Paid collab",
      deliverables: ["UGC", "Reels", "TikTok"],
      value: 1400,
    },
  ],
  "Malibu, California": [
    {
      id: 6,
      name: "Modern Beach House in Malibu",
      location: "Malibu, USA",
      image:
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      isAffiliate: true,
      collaborationType: "UGC+",
      stayType: "Free stay",
      deliverables: ["UGC", "Reels", "TikTok", "+1"],
      value: 850,
    },
    {
      id: 7,
      name: "Oceanfront Luxury Villa",
      location: "Malibu, USA",
      image:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
      isAffiliate: true,
      collaborationType: "UGC+",
      stayType: "Free stay",
      deliverables: ["UGC", "Reels", "Instagram", "+2"],
      value: 1800,
    },
  ],
  nearby: [
    {
      id: 8,
      name: "Cozy Mountain Cabin",
      location: "Lake Tahoe, CA",
      image:
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
      isAffiliate: false,
      collaborationType: "UGC",
      stayType: "Paid collab",
      deliverables: ["UGC", "Reels"],
      value: 450,
    },
  ],
};

const SUGGESTED_DESTINATIONS = [
  {
    id: "nearby",
    icon: "🧭",
    title: "Nearby",
    subtitle: "Find what's around you",
    location: "nearby",
  },
  {
    id: "tokyo",
    icon: "⛩️",
    title: "Tokyo, Japan",
    subtitle: "Based on your wishlist",
    location: "Tokyo, Japan",
  },
  {
    id: "kyoto",
    icon: "🏯",
    title: "Kyoto, Japan",
    subtitle: "Historic temples & culture",
    location: "Kyoto, Japan",
  },
  {
    id: "bali",
    icon: "🏝️",
    title: "Bali, Indonesia",
    subtitle: "Tropical paradise retreats",
    location: "Bali, Indonesia",
  },
  {
    id: "malibu",
    icon: "🌊",
    title: "Malibu, California",
    subtitle: "Beachfront properties",
    location: "Malibu, California",
  },
  {
    id: "paris",
    icon: "🗼",
    title: "Paris, France",
    subtitle: "Romantic city escapes",
    location: "Paris, France",
  },
];

export default function SearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { location = "Tokyo, Japan" } = params;

  const [selectedLocation, setSelectedLocation] = useState(location);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state
  const [deliverablesCount, setDeliverablesCount] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [completeByDate, setCompleteByDate] = useState("");
  const [selectedDeliverables, setSelectedDeliverables] = useState([]);
  const [selectedTier, setSelectedTier] = useState("ugc");
  const [compensationTypes, setCompensationTypes] = useState([]);
  const [deliverableLoad, setDeliverableLoad] = useState("");
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [sortBy, setSortBy] = useState("best");

  const listings = MOCK_LISTINGS[selectedLocation] || [];

  const filteredDestinations = SUGGESTED_DESTINATIONS.filter(
    (dest) =>
      searchQuery === "" ||
      dest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDestinationSelect = (newLocation) => {
    setSelectedLocation(newLocation);
    setSearchQuery("");
    setIsSearchModalOpen(false);
  };

  const handleClearFilters = () => {
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

  const PropertyCard = ({ property }) => (
    <TouchableOpacity
      style={{
        marginBottom: 20,
        borderRadius: 20,
        backgroundColor: "#fff",
        overflow: "hidden",
        shadowColor: "#192524",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Property Image */}
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: property.image }}
          style={{ width: "100%", height: 280 }}
          contentFit="cover"
          transition={200}
        />

        {/* Affiliate Badge */}
        {property.isAffiliate && (
          <View style={{ position: "absolute", top: 12, left: 12 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: "#D1EBDB",
              }}
            >
              <Text
                style={{
                  color: "#192524",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                🔗 Affiliate
              </Text>
            </View>
          </View>
        )}

        {/* Heart Icon */}
        <TouchableOpacity style={{ position: "absolute", top: 12, right: 12 }}>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              borderRadius: 20,
              padding: 8,
            }}
          >
            <Heart color="#192524" size={20} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Property Details */}
      <View style={{ padding: 16 }}>
        {/* Location */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <MapPin color="#3C5759" size={14} />
          <Text style={{ fontSize: 13, color: "#3C5759", marginLeft: 4 }}>
            {property.location}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          {property.name}
        </Text>

        {/* Collaboration Tags */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: "#EFECE9",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#192524",
              }}
            >
              {property.collaborationType}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: "#EFECE9",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#192524",
              }}
            >
              {property.stayType}
            </Text>
          </View>
        </View>

        {/* Deliverables */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {property.deliverables.map((deliverable, index) => (
            <View
              key={index}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: "#3C5759",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                {deliverable}
              </Text>
            </View>
          ))}
        </View>

        {/* Value */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              marginRight: 4,
            }}
          >
            💰 Value:
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#192524",
            }}
          >
            {property.value}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      {/* Header with Back Arrow and Search */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Back Arrow */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#EFECE9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft color="#192524" size={24} />
          </TouchableOpacity>

          {/* Search Bar - Opens Destination Modal */}
          <TouchableOpacity
            onPress={() => setIsSearchModalOpen(true)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#EFECE9",
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Search color="#959D90" size={20} />
            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 15,
                color: "#192524",
              }}
            >
              {selectedLocation}
            </Text>
          </TouchableOpacity>

          {/* Filter Button */}
          <TouchableOpacity
            onPress={() => setIsFilterModalOpen(true)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#EFECE9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SlidersHorizontal color="#192524" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Count */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#192524",
          }}
        >
          {listings.length} listing{listings.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      {/* Listings */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {listings.length > 0 ? (
          listings.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))
        ) : (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: "#959D90",
                textAlign: "center",
              }}
            >
              No listings found for "{selectedLocation}"
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Destination Search Modal */}
      <Modal
        visible={isSearchModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSearchModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <StatusBar style="dark" />

          {/* Modal Header */}
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
                gap: 12,
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsSearchModalOpen(false)}
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
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#192524",
                  flex: 1,
                }}
              >
                Search destinations
              </Text>
            </View>

            {/* Search Input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#EFECE9",
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Search color="#959D90" size={20} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search destinations"
                placeholderTextColor="#959D90"
                autoFocus
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 15,
                  color: "#192524",
                }}
              />
              {searchQuery && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#D0D5CE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X color="#192524" size={14} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Modal Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Suggested destinations
              </Text>
              <View style={{ gap: 2 }}>
                {filteredDestinations.map((dest) => (
                  <TouchableOpacity
                    key={dest.id}
                    onPress={() => handleDestinationSelect(dest.location)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#EFECE9",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{dest.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: "#192524",
                          marginBottom: 2,
                        }}
                      >
                        {dest.title}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#959D90" }}>
                        {dest.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
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
    </View>
  );
}
