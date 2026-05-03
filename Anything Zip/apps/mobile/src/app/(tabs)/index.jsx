// Creator Explore Screen — Collabnb
// 20x infinite scroll rows, pull-to-refresh shuffle, one-time location prompt

import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Search, Heart, Send, Star, MapPin } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SavedStore from "@/utils/SavedStore";
import MessagingStore from "@/utils/MessagingStore";

// ─── CONSTANTS ───────────────────────────────────────────────
const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const LOCATION_PREF_KEY = "@collabnb_creator_location_prefs_v1";

// Demo host profile
const DEMO_HOST = {
  id: "demo_host_1",
  name: "Benjamin Thompson",
  avatarUrl:
    "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
};

// ─── STATIC SOURCE ARRAYS ────────────────────────────────────

const NEAR_LISTINGS = [
  {
    id: 1,
    name: "Glacier Prime Cabin",
    subtitle: "New Hot Tub Installed!",
    location: "Lake Tahoe, CA",
    image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
    rating: 4.66,
    reviews: 110,
    superhost: true,
    isAffiliate: true,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "cash", amount: 450, deliverables: 5 },
  },
  {
    id: 2,
    name: "Mountain View Lodge",
    subtitle: "Ski-in/Ski-out Access",
    location: "Lake Tahoe, CA",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    rating: 4.89,
    reviews: 203,
    superhost: true,
    isAffiliate: false,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "free", stay: "3D/4N", deliverables: 8 },
  },
  {
    id: 3,
    name: "Lakeside Retreat",
    subtitle: "Private Beach Access",
    location: "Lake Tahoe, CA",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    rating: 4.92,
    reviews: 156,
    superhost: false,
    isAffiliate: true,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "cash", amount: 1200, deliverables: 10 },
  },
];

const PICKED_LISTINGS = [
  {
    id: 4,
    name: "Tranquil Waterfront Retreat",
    subtitle: "Private Room & Balcony",
    location: "Malibu, CA",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    rating: 4.91,
    reviews: 484,
    superhost: true,
    isAffiliate: false,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "free", stay: "2D/3N", deliverables: 6 },
  },
  {
    id: 5,
    name: "Desert Oasis Villa",
    subtitle: "Infinity Pool & Spa",
    location: "Palm Springs, CA",
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
    rating: 4.87,
    reviews: 291,
    superhost: true,
    isAffiliate: true,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "cash", amount: 850, deliverables: 7 },
  },
  {
    id: 6,
    name: "Coastal Modern Escape",
    subtitle: "Ocean Views & Fire Pit",
    location: "Big Sur, CA",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    rating: 4.95,
    reviews: 367,
    superhost: true,
    isAffiliate: false,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "cash", amount: 2500, deliverables: 12 },
  },
];

const TRENDING_LISTINGS = [
  {
    id: 7,
    name: "Downtown Loft",
    subtitle: "Rooftop Access & City Views",
    location: "San Francisco, CA",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    rating: 4.78,
    reviews: 189,
    superhost: false,
    isAffiliate: true,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "cash", amount: 350, deliverables: 4 },
  },
  {
    id: 8,
    name: "Wine Country Estate",
    subtitle: "Vineyard Tours Included",
    location: "Napa Valley, CA",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    rating: 4.93,
    reviews: 421,
    superhost: true,
    isAffiliate: true,
    hostName: DEMO_HOST.name,
    hostId: DEMO_HOST.id,
    hostAvatarUrl: DEMO_HOST.avatarUrl,
    collaborationOffer: { type: "free", stay: "3D/4N", deliverables: 10 },
  },
];

// ─── HELPERS ─────────────────────────────────────────────────

// 20x duplication — gives long enough runway that users never hit the end
const makeInfiniteData = (arr) => {
  const result = [];
  for (let i = 0; i < 20; i++) {
    arr.forEach((item, idx) => {
      result.push({ ...item, _key: `${i}_${idx}_${item.id}` });
    });
  }
  return result;
};

const shuffleArray = (arr) => {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
};

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function CreatorExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [savedListings, setSavedListings] = useState(new Set());

  // Row data — 20x duplicated for effective infinite scroll
  const [nearListings, setNearListings] = useState(() =>
    makeInfiniteData(NEAR_LISTINGS),
  );
  const [pickedListings, setPickedListings] = useState(() =>
    makeInfiniteData(PICKED_LISTINGS),
  );
  const [trendingListings, setTrendingListings] = useState(() =>
    makeInfiniteData(TRENDING_LISTINGS),
  );

  // Pull-to-refresh
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);

  // Location prompt
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("");
  const [collabPrefs, setCollabPrefs] = useState([]);

  useEffect(() => {
    const updateSavedState = () => {
      const state = SavedStore.getState();
      const savedIds = new Set();
      state.lists.forEach((list) => {
        list.items.forEach((item) => {
          savedIds.add(item.listingId);
        });
      });
      setSavedListings(savedIds);
    };
    updateSavedState();
    const unsubscribe = SavedStore.subscribe(updateSavedState);
    checkLocationPrompt();
    return unsubscribe;
  }, []);

  const checkLocationPrompt = async () => {
    try {
      const existing = await AsyncStorage.getItem(LOCATION_PREF_KEY);
      if (!existing) {
        setTimeout(() => setShowLocationPrompt(true), 800);
      }
    } catch (e) {}
  };

  // ─── PULL-TO-REFRESH ───────────────────────────────────────

  const handleRefresh = () => {
    setRefreshing(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Shuffle source arrays then re-apply 20x duplication
      setNearListings(makeInfiniteData(shuffleArray(NEAR_LISTINGS)));
      setPickedListings(makeInfiniteData(shuffleArray(PICKED_LISTINGS)));
      setTrendingListings(makeInfiniteData(shuffleArray(TRENDING_LISTINGS)));
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setRefreshing(false);
      }, 400);
    });
  };

  // ─── LOCATION PROMPT HANDLERS ──────────────────────────────

  const togglePref = (pref) => {
    setCollabPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const saveLocationPrefs = async () => {
    const prefs = {
      currentLocation,
      collabPrefs,
      savedAt: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem(LOCATION_PREF_KEY, JSON.stringify(prefs));
      const profileKey = "@collabnb_creator_profile_v1";
      const existing = await AsyncStorage.getItem(profileKey);
      const profile = existing ? JSON.parse(existing) : {};
      const updated = {
        ...profile,
        location: currentLocation || profile.location,
        collabPrefs,
      };
      await AsyncStorage.setItem(profileKey, JSON.stringify(updated));
    } catch (e) {}
    setShowLocationPrompt(false);
  };

  const dismissPrompt = async (reason) => {
    try {
      await AsyncStorage.setItem(
        LOCATION_PREF_KEY,
        JSON.stringify({
          skipped: true,
          reason,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch (e) {}
    setShowLocationPrompt(false);
  };

  // ─── PROPERTY CARD ─────────────────────────────────────────

  const PropertyCard = ({ property }) => {
    const isSaved = savedListings.has(property.id.toString());

    const handleSaveToggle = async (e) => {
      e.stopPropagation();
      const snapshot = {
        id: property.id.toString(),
        title: property.name,
        location_city: property.location.split(",")[0].trim(),
        location_country: property.location.split(",")[1]?.trim() || "CA",
        image: property.image,
        deliverablesSummary: `${property.collaborationOffer.deliverables} deliverables`,
        offerSummary:
          property.collaborationOffer.type === "cash"
            ? `$${property.collaborationOffer.amount} cash`
            : `${property.collaborationOffer.stay} free stay`,
      };
      await SavedStore.toggleSaved(snapshot);
    };

    const handleMessageHost = async (e) => {
      e.stopPropagation();
      const thread = await MessagingStore.createOrGetCreatorThread({
        creatorId: property.hostId || property.id.toString(),
        creatorName: property.hostName || "Host",
        creatorAvatarUrl: property.hostAvatarUrl,
      });
      router.push(`/messages/${thread.id}`);
    };

    return (
      // outer TouchableOpacity must be overflow:visible so shadows aren't clipped
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/listing-detail",
            params: {
              id: property.id.toString(),
              title: property.name,
              location: property.location,
              photoUri: property.image,
            },
          })
        }
        activeOpacity={0.8}
        style={{
          width: CARD_WIDTH,
          // overflow visible — critical to avoid shadow clipping
          overflow: "visible",
        }}
      >
        {/* Card shell — overflow visible for shadows, image clipping handled inside */}
        <View
          style={{
            borderRadius: 20,
            overflow: "visible",
            backgroundColor: "#fff",
            shadowColor: "#192524",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          {/* Image container clips to border radius */}
          <View
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Image
              source={{ uri: property.image }}
              style={{ width: "100%", height: 240 }}
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

            {/* Save Heart */}
            <TouchableOpacity
              style={{ position: "absolute", top: 12, right: 12 }}
              onPress={handleSaveToggle}
            >
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Heart
                  color={isSaved ? "#E63946" : "#192524"}
                  fill={isSaved ? "#E63946" : "none"}
                  size={20}
                />
              </View>
            </TouchableOpacity>

            {/* Message Button */}
            <TouchableOpacity
              style={{ position: "absolute", bottom: 12, right: 12 }}
              onPress={handleMessageHost}
            >
              <View
                style={{
                  backgroundColor: "#3C5759",
                  borderRadius: 20,
                  padding: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Send color="#fff" size={18} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Info — bottom section, also clips to bottom radius */}
          <View
            style={{
              padding: 14,
              backgroundColor: "#fff",
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <MapPin color="#3C5759" size={13} />
              <Text style={{ fontSize: 12, color: "#3C5759", marginLeft: 4 }}>
                {property.location}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 4,
              }}
            >
              {property.name}
            </Text>
            <Text style={{ fontSize: 13, color: "#3C5759", marginBottom: 8 }}>
              {property.subtitle}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Star color="#3C5759" size={14} fill="#3C5759" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#192524",
                  marginLeft: 4,
                }}
              >
                {property.rating}
              </Text>
              <Text style={{ fontSize: 13, color: "#3C5759", marginLeft: 4 }}>
                ({property.reviews})
              </Text>
              {property.superhost && (
                <>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#3C5759",
                      marginHorizontal: 6,
                    }}
                  >
                    •
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#192524",
                    }}
                  >
                    ⭐ Superhost
                  </Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              {property.collaborationOffer.type === "cash" ? (
                <>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: "#192524",
                    }}
                  >
                    ${property.collaborationOffer.amount}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#3C5759", marginLeft: 6 }}
                  >
                    + {property.collaborationOffer.deliverables} deliverables
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: "#3C5759",
                    }}
                  >
                    FREE {property.collaborationOffer.stay}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#3C5759", marginLeft: 6 }}
                  >
                    • {property.collaborationOffer.deliverables} deliverables
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      {/* Header */}
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
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={{
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
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: "#959D90" }}
          >
            Search destinations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Outer vertical ScrollView — handles pull-to-refresh and vertical scroll */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3C5759"
            colors={["#3C5759"]}
            progressBackgroundColor="#EFECE9"
          />
        }
      >
        {/* Single Animated.View wraps all 3 rows for the fade effect */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ── Near Lake Tahoe, CA ─────────────────────────── */}
          <View style={{ marginTop: 24 }}>
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                Near Lake Tahoe, CA
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                Based on your recent search
              </Text>
            </View>
            <FlatList
              data={nearListings}
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._key}
              snapToInterval={CARD_WIDTH + 12}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: 20,
                gap: 12,
                paddingBottom: 16,
              }}
              renderItem={({ item }) => <PropertyCard property={item} />}
            />
          </View>

          {/* ── Picked for You ──────────────────────────────── */}
          <View style={{ marginTop: 32 }}>
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                Picked for You
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                Matches your style and budget
              </Text>
            </View>
            <FlatList
              data={pickedListings}
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._key}
              snapToInterval={CARD_WIDTH + 12}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: 20,
                gap: 12,
                paddingBottom: 16,
              }}
              renderItem={({ item }) => <PropertyCard property={item} />}
            />
          </View>

          {/* ── Trending Now ────────────────────────────────── */}
          <View style={{ marginTop: 32 }}>
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                Trending Now
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                Popular among creators
              </Text>
            </View>
            <FlatList
              data={trendingListings}
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._key}
              snapToInterval={CARD_WIDTH + 12}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: 20,
                gap: 12,
                paddingBottom: 16,
              }}
              renderItem={({ item }) => <PropertyCard property={item} />}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Location Preference Prompt ───────────────────────── */}
      {showLocationPrompt && (
        <Modal
          visible={showLocationPrompt}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => dismissPrompt("dismissed")}
        >
          <SafeAreaView style={styles.promptSafe}>
            <View style={styles.promptHandle} />

            <View style={styles.promptHeader}>
              <Text style={styles.promptTitle}>Where are you based?</Text>
              <Text style={styles.promptSub}>
                We'll show you collab opportunities near you and destinations
                you want to explore.
              </Text>
            </View>

            {/* Current location */}
            <View style={styles.promptSection}>
              <Text style={styles.promptLabel}>YOUR LOCATION</Text>
              <View style={styles.promptInputCard}>
                <Text style={styles.promptInputIcon}>📍</Text>
                <TextInput
                  style={styles.promptInput}
                  placeholder="City, State or Country"
                  placeholderTextColor="#959D90"
                  value={currentLocation}
                  onChangeText={setCurrentLocation}
                />
              </View>
            </View>

            {/* Collab destinations */}
            <View style={styles.promptSection}>
              <Text style={styles.promptLabel}>
                WHERE DO YOU WANT TO COLLAB?
              </Text>
              <View style={styles.promptChips}>
                {[
                  "Anywhere",
                  "Near me",
                  "Beach destinations",
                  "Mountain retreats",
                  "City escapes",
                  "International",
                  "Tropical stays",
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.promptChip,
                      collabPrefs.includes(opt) && styles.promptChipActive,
                    ]}
                    onPress={() => togglePref(opt)}
                  >
                    <Text
                      style={[
                        styles.promptChipText,
                        collabPrefs.includes(opt) &&
                          styles.promptChipTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={styles.promptSaveBtn}
              onPress={saveLocationPrefs}
            >
              <Text style={styles.promptSaveBtnText}>Save Preferences</Text>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              style={styles.promptSkipBtn}
              onPress={() => dismissPrompt("skipped")}
            >
              <Text style={styles.promptSkipText}>Skip for now</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

// ─── PROMPT STYLES ───────────────────────────────────────────
const styles = StyleSheet.create({
  promptSafe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  promptHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  promptHeader: { marginBottom: 28 },
  promptTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 24,
    color: "#192524",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  promptSub: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    color: "#959D90",
    lineHeight: 21,
  },
  promptSection: { marginBottom: 24 },
  promptLabel: {
    fontFamily: "Inter-Medium",
    fontSize: 10,
    color: "#959D90",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  promptInputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(60,87,89,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  promptInputIcon: { fontSize: 16 },
  promptInput: {
    flex: 1,
    fontFamily: "Inter-Regular",
    fontSize: 15,
    color: "#192524",
  },
  promptChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.15)",
  },
  promptChipActive: {
    backgroundColor: "#3C5759",
    borderColor: "#3C5759",
  },
  promptChipText: {
    fontFamily: "Inter-Medium",
    fontSize: 13,
    color: "#3C5759",
  },
  promptChipTextActive: { color: "#EFECE9" },
  promptSaveBtn: {
    backgroundColor: "#3C5759",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  promptSaveBtnText: {
    fontFamily: "Inter-Medium",
    fontSize: 15,
    color: "#EFECE9",
  },
  promptSkipBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  promptSkipText: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    color: "#959D90",
  },
});
