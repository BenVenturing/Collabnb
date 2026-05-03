import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  X,
  ChevronLeft,
  MapPin,
  SlidersHorizontal,
} from "lucide-react-native";

const RECENT_SEARCHES = [
  {
    id: 1,
    location: "Tokyo, Japan",
    icon: "⛩️",
  },
  {
    id: 2,
    location: "Bali, Indonesia",
    icon: "🏝️",
  },
];

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

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDestinations = SUGGESTED_DESTINATIONS.filter(
    (dest) =>
      searchQuery === "" ||
      dest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDestinationSelect = (location) => {
    router.push({
      pathname: "/search-results",
      params: { location },
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Mode: "overview" when no search, "typing" when searching
  const mode = searchQuery.length > 0 ? "typing" : "overview";

  return (
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
            gap: 12,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              mode === "typing" ? handleClearSearch() : router.back()
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#EFECE9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "typing" ? (
              <ChevronLeft color="#192524" size={24} />
            ) : (
              <X color="#192524" size={20} />
            )}
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#192524",
              flex: 1,
            }}
          >
            {mode === "typing" ? "Search destinations" : "Search"}
          </Text>
        </View>

        {/* Search Input - always visible, always active */}
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
            autoFocus={mode === "typing"}
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 15,
              color: "#192524",
            }}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={handleClearSearch}
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Recent Searches - only in overview mode */}
        {mode === "overview" && RECENT_SEARCHES.length > 0 && (
          <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 12,
              }}
            >
              Recent searches
            </Text>
            <View style={{ gap: 2 }}>
              {RECENT_SEARCHES.map((search) => (
                <TouchableOpacity
                  key={search.id}
                  onPress={() => handleDestinationSelect(search.location)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: "#EFECE9",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{search.icon}</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      color: "#192524",
                    }}
                  >
                    {search.location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Suggested Destinations */}
        <View
          style={{
            marginTop: mode === "typing" ? 24 : 32,
            paddingHorizontal: 20,
          }}
        >
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
  );
}
