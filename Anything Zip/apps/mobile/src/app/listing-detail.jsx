// ============================================================
// COLLABNB — Listing Detail Screen (Collabnb Style)
// File: /apps/mobile/src/app/listing-detail.jsx
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Switch,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ListingDraftStore from "@/utils/ListingDraftStore";
import { submitApplication } from "@/utils/ApplicationStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Set to true when liquid glass theming is ready to apply to this screen
const LIQUID_GLASS_READY = false;
// TODO: flip to true to re-enable gradient background

// Photo data for each listing
const LISTING_PHOTOS = {
  l1: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#C4D4C0", "#B8CCC0"] },
    { type: "gradient", colors: ["#B8CCC0", "#AEC4B8"] },
  ],
  l2: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#BCC8D4", "#A8BCC8"] },
    { type: "gradient", colors: ["#A8BCC8", "#9CB0BC"] },
  ],
  l3: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#CCC0A8", "#BEB09C"] },
    { type: "gradient", colors: ["#BEB09C", "#B0A48C"] },
  ],
  l4: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#BCC8B0", "#B0BCA4"] },
    { type: "gradient", colors: ["#B0BCA4", "#A4B098"] },
  ],
  1: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#C4D4C0", "#B8CCC0"] },
    { type: "gradient", colors: ["#B8CCC0", "#AEC4B8"] },
  ],
  2: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#BCC8D4", "#A8BCC8"] },
    { type: "gradient", colors: ["#A8BCC8", "#9CB0BC"] },
  ],
  3: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#CCC0A8", "#BEB09C"] },
    { type: "gradient", colors: ["#BEB09C", "#B0A48C"] },
  ],
};

const SAMPLE_LISTING_DATA = {
  l1: {
    title: "Treehouse Suite — Summer Escape",
    location: "Asheville, NC",
    type: "Treehouse",
    description:
      "A stunning treehouse retreat nestled in the Blue Ridge Mountains. Floor-to-ceiling windows, a private deck, and total seclusion. Perfect for travel creators looking for a unique, shareable stay that stops the scroll.",
    host: "Blue Ridge Stays",
    tierRequired: "Micro Influencer",
    compensation: "Complimentary Stay",
    deliverablesLoad: "Moderate",
    deliverables: ["2 Instagram Reels", "4 Stories", "1 TikTok video"],
    dates: "June–August 2025",
    status: "active",
  },
  l2: {
    title: "Cliffside Villa — Weekend Collab",
    location: "Big Sur, CA",
    type: "Villa",
    description:
      "Dramatic oceanfront villa with unobstructed Pacific views. A sun-drenched retreat built for creators who want content that speaks for itself. Infinity pool, chef kitchen, and golden hour like nowhere else.",
    host: "Pacific Edge Properties",
    tierRequired: "UGC Pro",
    compensation: "Stay + $200 fee",
    deliverablesLoad: "Light",
    deliverables: ["3 UGC videos", "1 photo set (20+ images)"],
    dates: "July–September 2025",
    status: "active",
  },
  l3: {
    title: "Desert Dome — Content Weekend",
    location: "Sedona, AZ",
    type: "Dome",
    description:
      "A geodesic dome under the stars in red rock country. Fall asleep to the Milky Way and wake up to canyon views. Perfect for creators who want otherworldly content that no hotel can replicate.",
    host: "Sedona Domes",
    tierRequired: "UGC Beginner",
    compensation: "Complimentary Stay",
    deliverablesLoad: "Heavy",
    deliverables: [
      "2 TikTok videos",
      "3 Instagram Reels",
      "5 Stories",
      "1 blog post",
    ],
    dates: "Open dates",
    status: "paused",
  },
  l4: {
    title: "Lakeside Cabin — Fall Series",
    location: "Lake Tahoe, CA",
    type: "Cabin",
    description:
      "A private lakeside cabin surrounded by pine forest and mountain air. Built for creators who want moody autumn content with a luxury feel. Direct lake access, fire pit, and full creative freedom.",
    host: "Tahoe Retreats",
    tierRequired: "Influencer",
    compensation: "Stay + $500 fee",
    deliverablesLoad: "Moderate",
    deliverables: ["1 YouTube vlog", "2 Instagram Reels", "4 Stories"],
    dates: "September–November 2025",
    status: "draft",
  },
  1: {
    title: "Glacier Prime Cabin",
    location: "Lake Tahoe, CA",
    type: "Cabin",
    description:
      "New Hot Tub Installed! A stunning mountain retreat with breathtaking views. Perfect for travel creators looking for authentic nature content that stops the scroll.",
    host: "Lake Tahoe Stays",
    tierRequired: "Micro Influencer",
    compensation: "$450 + Free Stay",
    deliverablesLoad: "Moderate",
    deliverables: ["2 Instagram Reels", "2 TikTok videos", "1 blog post"],
    dates: "Year-round",
    status: "active",
  },
  2: {
    title: "Mountain View Lodge",
    location: "Lake Tahoe, CA",
    type: "Lodge",
    description:
      "Ski-in/Ski-out Access! Dramatic mountain views with premium amenities. A sun-drenched retreat built for creators who want content that speaks for itself.",
    host: "Alpine Retreats",
    tierRequired: "UGC Pro",
    compensation: "3D/4N Free Stay",
    deliverablesLoad: "Heavy",
    deliverables: ["3 Instagram Reels", "3 TikTok videos", "2 YouTube shorts"],
    dates: "Winter Season",
    status: "active",
  },
  3: {
    title: "Lakeside Retreat",
    location: "Lake Tahoe, CA",
    type: "Retreat",
    description:
      "Private Beach Access! Waterfront luxury with direct lake access. Built for creators who want high-end lifestyle content with natural beauty.",
    host: "Waterfront Escapes",
    tierRequired: "Influencer",
    compensation: "$1200 + Stay",
    deliverablesLoad: "Heavy",
    deliverables: [
      "4 Instagram Reels",
      "4 TikTok videos",
      "1 YouTube vlog",
      "10 Stories",
    ],
    dates: "Summer 2025",
    status: "active",
  },
};

// ─── APPLY MODAL ─────────────────────────────────────────────
function ApplyModal({ visible, onClose, listing, listingId }) {
  const insets = useSafeAreaInsets();
  const [counterOn, setCounterOn] = useState(false);
  const [counterNote, setCounterNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await submitApplication({
      listingId: listingId,
      listingTitle: listing.title,
      listingLocation: listing.location,
      compensation: listing.compensation,
      tierRequired: listing.tierRequired,
      isCounter: counterOn,
      counterNote: counterOn ? counterNote : null,
      hostName: listing.host,
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setCounterOn(false);
    setCounterNote("");
    onClose();
  };

  if (!listing) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(60,87,89,0.08)",
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#D0D5CE",
              }}
            />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#192524",
              letterSpacing: -0.3,
            }}
          >
            Apply to {listing.title}
          </Text>
        </View>

        {submitted ? (
          // Success State
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Application Submitted!
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#3C5759",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 8,
              }}
            >
              Your application is now pending review.
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#959D90",
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              The host will respond within 48 hours.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 24,
              }}
              onPress={handleClose}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Listing Info Card */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.55)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.75)",
                padding: 16,
                marginBottom: 24,
                shadowColor: "#3C5759",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>🏡</Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    flex: 1,
                  }}
                >
                  {listing.title}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {listing.location}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>💰</Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {listing.compensation}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>📦</Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {listing.deliverablesLoad} deliverables load
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "#D0D5CE",
                marginBottom: 24,
              }}
            />

            {/* Counter Proposal Toggle */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.55)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.75)",
                padding: 16,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  Make a counter proposal
                </Text>
                <Switch
                  value={counterOn}
                  onValueChange={setCounterOn}
                  trackColor={{ false: "#D0D5CE", true: "#3C5759" }}
                  thumbColor={counterOn ? "#EFECE9" : "#FFFFFF"}
                />
              </View>
              <Text style={{ fontSize: 13, color: "#959D90", lineHeight: 19 }}>
                Adjust deliverables & compensation to your needs
              </Text>

              {counterOn && (
                <TextInput
                  style={{
                    backgroundColor: "rgba(255,255,255,0.55)",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(60,87,89,0.2)",
                    padding: 14,
                    fontSize: 14,
                    color: "#192524",
                    minHeight: 100,
                    lineHeight: 21,
                    marginTop: 12,
                  }}
                  value={counterNote}
                  onChangeText={setCounterNote}
                  multiline
                  placeholder="Describe your counter offer — what would you change?"
                  placeholderTextColor="#959D90"
                  textAlignVertical="top"
                />
              )}
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "#D0D5CE",
                marginBottom: 24,
              }}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 16,
                borderRadius: 24,
                alignItems: "center",
                opacity: submitting ? 0.6 : 1,
              }}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── PHOTO GALLERY ───────────────────────────────────────────
function PhotoGallery({ onBack, onEdit, isHost, listingId }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get photos for this listing, fallback to l1 if not found
  const photos = LISTING_PHOTOS[listingId] || LISTING_PHOTOS.l1;
  const totalImages = photos.length;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  const renderItem = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, height: 320, position: "relative" }}>
      {item.type === "image" && item.uri ? (
        <Image
          source={{ uri: item.uri }}
          style={{ width: SCREEN_WIDTH, height: 320 }}
          resizeMode="cover"
          onError={() => console.log("Image failed to load for listing photo")}
        />
      ) : (
        <LinearGradient
          colors={item.colors || ["#D1EBDB", "#3C5759"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ width: SCREEN_WIDTH, height: 320 }}
        />
      )}
    </View>
  );

  return (
    <View style={{ height: 320, width: "100%", position: "relative" }}>
      {/* Swipeable Photo FlatList */}
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        keyExtractor={(item, index) => `photo-${index}`}
        renderItem={renderItem}
      />

      {/* Back Button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          left: 16,
          top: insets.top + 8,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={onBack}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "300",
            color: "#192524",
            marginTop: -2,
          }}
        >
          ‹
        </Text>
      </TouchableOpacity>

      {/* Edit Button (hosts only) */}
      {isHost && (
        <TouchableOpacity
          style={{
            position: "absolute",
            right: 16,
            top: insets.top + 8,
            paddingHorizontal: 16,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={onEdit}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3C5759" }}>
            Edit
          </Text>
        </TouchableOpacity>
      )}

      {/* Dot indicators */}
      <View
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
        }}
      >
        {photos.map((_, index) => (
          <View
            key={index}
            style={{
              width: currentIndex === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                currentIndex === index ? "#FFFFFF" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </View>

      {/* Photo Counter Badge */}
      <View
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
          {currentIndex + 1} / {totalImages}
        </Text>
      </View>
    </View>
  );
}

// ─── HOST AVATAR ─────────────────────────────────────────────
function HostAvatar({ name }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#D1EBDB",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#3C5759" }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const listingId = params.listingId || params.id || "l1";
  const isHost = params.isHost === "true";

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const rawListingFromStore =
        await ListingDraftStore.getListingById(listingId);
      const isSampleData =
        !rawListingFromStore || Object.keys(rawListingFromStore).length === 0;
      const merged = {
        ...SAMPLE_LISTING_DATA[listingId],
        ...rawListingFromStore,
      };
      setListing(merged);
    } catch (error) {
      console.error("[ListingDetail] Error loading listing:", error);
      const fallback = SAMPLE_LISTING_DATA[listingId] || SAMPLE_LISTING_DATA.l1;
      setListing(fallback);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#3C5759" />
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#192524",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Listing not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#3C5759",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push({
      pathname: "/host/listings/create/basics",
      params: { id: listingId, editMode: "true" },
    });
  };

  const handleApply = () => {
    setApplyVisible(true);
  };

  const descriptionLines = listing.description?.split("\n") || [];
  const shouldTruncate = descriptionLines.length > 3;
  const displayDescription = showFullDescription
    ? listing.description
    : descriptionLines.slice(0, 3).join("\n");

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Photo Gallery */}
      <PhotoGallery
        onBack={handleBack}
        onEdit={handleEdit}
        isHost={isHost}
        listingId={listingId}
      />

      {/* White Content Card */}
      <ScrollView
        style={{
          flex: 1,
          marginTop: -40,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1 — Title Block */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: "#192524",
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            {listing.title}
          </Text>
          <Text style={{ fontSize: 14, color: "#959D90", marginBottom: 12 }}>
            ✦ Boutique Stay · {listing.location}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: "rgba(60,87,89,0.12)",
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#3C5759" }}
              >
                {listing.status === "active"
                  ? "Active"
                  : listing.status === "paused"
                    ? "Paused"
                    : "Draft"}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: "rgba(149,157,144,0.12)",
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#959D90" }}
              >
                {listing.tierRequired}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 2 — Host Info Row */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <HostAvatar name={listing.host || "Host"} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: "#192524" }}
              >
                Listed by {listing.host || "Host"}
              </Text>
              <Text style={{ fontSize: 13, color: "#959D90" }}>
                Collabnb Host
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 3 — Three highlight pills */}
        <View
          style={{
            paddingHorizontal: 20,
            marginBottom: 20,
            flexDirection: "row",
            gap: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🎯</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
              Creator Tier
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              {listing.tierRequired}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>💰</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
              Compensation
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              {listing.compensation}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>📦</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
              Deliverables
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              {listing.deliverablesLoad} load
            </Text>
          </View>
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 4 — About This Stay */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
            }}
          >
            About this stay
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              lineHeight: 24,
              marginBottom: 8,
            }}
          >
            {displayDescription}
          </Text>
          {shouldTruncate && (
            <TouchableOpacity
              onPress={() => setShowFullDescription(!showFullDescription)}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#192524",
                  textDecorationLine: "underline",
                }}
              >
                {showFullDescription ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 5 — What We're Looking For */}
        {listing.deliverables && listing.deliverables.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                What we're looking for
              </Text>
              {listing.deliverables.map((item, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 12, color: "#3C5759", marginTop: 2 }}
                  >
                    ✦
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#192524",
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "#F0F0F0",
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* SECTION 6 — Collab Details */}
        {listing.dates && (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Collab details
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 15, color: "#3C5759" }}>
                  Available dates
                </Text>
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  {listing.dates}
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "#F0F0F0",
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* SECTION 7 — Things to Know */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 16,
            }}
          >
            Things to know
          </Text>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  Content Guidelines
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}
                >
                  Review brand guidelines before applying
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>✉️</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  Application Process
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}
                >
                  Host reviews and responds within 48 hours
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  After Your Stay
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}
                >
                  Share content within agreed posting window
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255,255,255,0.97)",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isHost ? (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#3C5759",
              paddingVertical: 14,
              borderRadius: 24,
              alignItems: "center",
            }}
            onPress={handleEdit}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              Edit Listing
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#192524" }}
              >
                {listing.compensation?.includes("Free") ||
                listing.compensation?.includes("Complimentary")
                  ? "Free stay"
                  : listing.compensation?.split("+")[0]?.trim() || "Free stay"}
              </Text>
              <Text style={{ fontSize: 13, color: "#959D90" }}>
                {listing.compensation}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 24,
                alignItems: "center",
              }}
              onPress={handleApply}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                Apply Now
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Apply Modal */}
      <ApplyModal
        visible={applyVisible}
        onClose={() => setApplyVisible(false)}
        listing={listing}
        listingId={listingId}
      />
    </View>
  );
}
