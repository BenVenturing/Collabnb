// ============================================================
// COLLABNB — Dashboard (Rebuilt)
// Architecture: Listings-first + Activity Feed + Lifetime Stats
// File: /host/(tabs)/dashboard.jsx
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ThemedBackground from "@/components/ThemedBackground";

const LISTINGS_KEY = "@collabnb_host_listings_local_v1";

// ─── SAMPLE DATA ─────────────────────────────────────────────
const SAMPLE_LISTINGS = [
  {
    id: "l1",
    title: "Treehouse Suite — Summer Escape",
    location: "Asheville, NC",
    tierRequired: "Micro Influencer",
    compType: "Complimentary Stay",
    status: "active",
    applicants: 4,
    confirmed: 1,
    completed: 0,
    deliverablesLoad: "Moderate",
    photo: {
      uri: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
    },
  },
  {
    id: "l2",
    title: "Cliffside Villa — Weekend Collab",
    location: "Big Sur, CA",
    tierRequired: "UGC Pro",
    compType: "Stay + Content Fee",
    status: "active",
    applicants: 2,
    confirmed: 1,
    completed: 0,
    deliverablesLoad: "Light",
    photo: {
      uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    },
  },
  {
    id: "l3",
    title: "Desert Dome — Content Weekend",
    location: "Joshua Tree, CA",
    tierRequired: "UGC Beginner",
    compType: "Complimentary Stay",
    status: "paused",
    applicants: 6,
    confirmed: 2,
    completed: 2,
    deliverablesLoad: "Heavy",
    photo: {
      uri: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
    },
  },
  {
    id: "l4",
    title: "Lake House — Fall Series",
    location: "Lake Tahoe, CA",
    tierRequired: "Influencer",
    compType: "Complimentary Stay",
    status: "draft",
    applicants: 0,
    confirmed: 0,
    completed: 0,
    deliverablesLoad: "Moderate",
    photo: {
      uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
    },
  },
];

const SAMPLE_ACTIVITY = [
  {
    id: "a1",
    icon: "✦",
    iconBg: "rgba(60,87,89,0.10)",
    text: "Priya Nair applied to Treehouse Suite",
    sub: "2h ago",
    cta: "Review",
  },
  {
    id: "a2",
    icon: "💬",
    iconBg: "rgba(123,104,200,0.10)",
    text: "Jordan Ellis sent you a message",
    sub: "5h ago",
    cta: "Reply",
  },
  {
    id: "a3",
    icon: "🏡",
    iconBg: "rgba(74,155,127,0.10)",
    text: "Maya Chen's stay starts in 3 days",
    sub: "June 14 · Treehouse Suite",
    cta: "Details",
  },
  {
    id: "a4",
    icon: "✦",
    iconBg: "rgba(60,87,89,0.10)",
    text: "Lena Park applied to Desert Dome",
    sub: "1d ago",
    cta: "Review",
  },
  {
    id: "a5",
    icon: "✓",
    iconBg: "rgba(212,168,67,0.10)",
    text: "Sam Kowalski completed their collab",
    sub: "Desert Dome · 2d ago",
    cta: "Rate",
  },
];

const LIFETIME_STATS = [
  { num: "14", label: "Total Collabs", dot: "#4A9B7F" },
  { num: "31", label: "Creators Worked With", dot: "#3C5759" },
  { num: "148", label: "Content Pieces", dot: "#7B68C8" },
  { num: "2.4M", label: "Est. Reach", dot: "#D4A843" },
];

const STATUS_CONFIG = {
  active: { label: "Active", color: "#4A9B7F", bg: "rgba(74,155,127,0.12)" },
  paused: { label: "Paused", color: "#D4A843", bg: "rgba(212,168,67,0.12)" },
  draft: { label: "Draft", color: "#959D90", bg: "rgba(149,157,144,0.12)" },
};

const TIER_CONFIG = {
  "UGC Beginner": { color: "#959D90", bg: "rgba(149,157,144,0.12)" },
  "UGC Pro": { color: "#3C5759", bg: "rgba(60,87,89,0.12)" },
  "Micro Influencer": { color: "#7B68C8", bg: "rgba(123,104,200,0.12)" },
  Influencer: { color: "#C86868", bg: "rgba(200,104,104,0.12)" },
};

// ─── LISTING CARD ────────────────────────────────────────────
function ListingCard({ listing }) {
  const router = useRouter();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const status = STATUS_CONFIG[listing.status] || STATUS_CONFIG.active;
  const tier = TIER_CONFIG[listing.tierRequired] || TIER_CONFIG["UGC Beginner"];

  // Photo array: use real photo as first slot if available, then gradient fallbacks
  const photos = listing.photo
    ? [
        { type: "image", source: listing.photo },
        { type: "gradient", colors: ["#D1EBDB", "#3C5759"] },
        { type: "gradient", colors: ["#D1EBDB", "#3C5759"] },
      ]
    : [
        { type: "gradient", colors: ["#D1EBDB", "#3C5759"] },
        { type: "gradient", colors: ["#D1EBDB", "#3C5759"] },
        { type: "gradient", colors: ["#D1EBDB", "#3C5759"] },
      ];

  return (
    <TouchableOpacity
      style={styles.listingCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: "/listing-detail",
          params: { id: listing.id, isHost: "true" },
        })
      }
    >
      {/* Photo Swiper */}
      <View style={styles.photoContainer}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          keyExtractor={(item, index) => `photo-${index}`}
          renderItem={({ item }) => (
            <View style={styles.photoSlot}>
              {item.type === "image" ? (
                <Image
                  source={item.source}
                  style={{ width: "100%", height: 160, borderRadius: 0 }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={item.colors}
                  style={styles.photoGradient}
                />
              )}
            </View>
          )}
        />
        {/* Dot indicators */}
        <View style={styles.dotIndicators}>
          {photos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentPhotoIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.listingCardTop}>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <View style={[styles.dot6, { backgroundColor: status.color }]} />
          <Text style={[styles.statusLabel, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <Text style={styles.listingLocation}>📍 {listing.location}</Text>
      </View>

      <Text style={styles.listingTitle} numberOfLines={2}>
        {listing.title}
      </Text>

      <View style={styles.listingMeta}>
        <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
          <Text style={[styles.tierText, { color: tier.color }]}>
            {listing.tierRequired}
          </Text>
        </View>
        <Text style={styles.compType}>{listing.compType}</Text>
      </View>

      <View style={styles.listingStats}>
        {[
          { num: listing.applicants, label: "Applied" },
          { num: listing.confirmed, label: "Confirmed" },
          { num: listing.completed, label: "Completed" },
          { num: listing.deliverablesLoad, label: "Load" },
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            <View style={styles.listingStat}>
              <Text style={styles.listingStatNum}>{s.num}</Text>
              <Text style={styles.listingStatLabel}>{s.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.statDividerV} />}
          </React.Fragment>
        ))}
      </View>
    </TouchableOpacity>
  );
}

// ─── ACTIVITY ITEM ───────────────────────────────────────────
function ActivityItem({ item, isLast, router }) {
  const handleCtaPress = () => {
    if (item.cta === "Review") {
      router.push("/host/(tabs)/proposals");
    } else if (item.cta === "Reply") {
      router.push("/host/(tabs)/inbox");
    } else if (item.cta === "Details") {
      router.push("/host/(tabs)/proposals");
    }
  };

  return (
    <>
      <View style={styles.activityItem}>
        <View style={[styles.activityIcon, { backgroundColor: item.iconBg }]}>
          <Text style={{ fontSize: 14 }}>{item.icon}</Text>
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityText} numberOfLines={2}>
            {item.text}
          </Text>
          <Text style={styles.activitySub}>{item.sub}</Text>
        </View>
        <TouchableOpacity style={styles.activityCta} onPress={handleCtaPress}>
          <Text style={styles.activityCtaText}>{item.cta}</Text>
        </TouchableOpacity>
      </View>
      {!isLast && <View style={styles.activityDivider} />}
    </>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const [listings, setListings] = useState(SAMPLE_LISTINGS);
  const [listingFilter, setListingFilter] = useState("all");

  useEffect(() => {
    const loadListings = async () => {
      try {
        const stored = await AsyncStorage.getItem(LISTINGS_KEY);
        if (stored) {
          setListings(JSON.parse(stored));
        } else {
          // First time: save sample listings to AsyncStorage
          await AsyncStorage.setItem(
            LISTINGS_KEY,
            JSON.stringify(SAMPLE_LISTINGS),
          );
          setListings(SAMPLE_LISTINGS);
        }
      } catch (error) {
        console.error("Failed to load listings:", error);
        setListings(SAMPLE_LISTINGS);
      }
    };
    loadListings();
  }, []);

  const filtered =
    listingFilter === "all"
      ? listings
      : listings.filter((l) => l.status === listingFilter);

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.headerTitle}>Your Stays</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => router.push("/host/(tabs)/profile")}
                style={styles.hostAvatarWrap}
              >
                <Image
                  source={{
                    uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
                  }}
                  style={styles.hostAvatarImg}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Quick Stats Strip ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsStrip}
            style={styles.statsStripWrap}
          >
            {[
              {
                num: listings.filter((l) => l.status === "active").length,
                label: "Active Listings",
              },
              {
                num: listings.reduce((a, l) => a + l.applicants, 0),
                label: "New Applicants",
              },
              { num: 3, label: "Upcoming Stays" },
              { num: 5, label: "Unread Messages" },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatNum}>{s.num}</Text>
                  <Text style={styles.quickStatLabel}>{s.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.statDividerV} />}
              </React.Fragment>
            ))}
          </ScrollView>

          {/* ── My Listings ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>My Listings</Text>
                <Text style={styles.sectionSub}>{listings.length} total</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/host/listings/create/index")}
              >
                <Text style={styles.primaryBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              {["all", "active", "paused", "draft"].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    listingFilter === f && styles.filterChipActive,
                  ]}
                  onPress={() => setListingFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      listingFilter === f && styles.filterChipTextActive,
                    ]}
                  >
                    {f === "all"
                      ? "All"
                      : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏡</Text>
                <Text style={styles.emptyText}>No listings here yet</Text>
                <TouchableOpacity style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>
                    Create your first listing
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              filtered.map((l) => <ListingCard key={l.id} listing={l} />)
            )}
          </View>

          {/* ── Activity Feed ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Activity</Text>
                <Text style={styles.sectionSub}>What needs your attention</Text>
              </View>
            </View>
            <View style={styles.feedCard}>
              {SAMPLE_ACTIVITY.map((item, i) => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  isLast={i === SAMPLE_ACTIVITY.length - 1}
                  router={router}
                />
              ))}
            </View>
          </View>

          {/* ── Lifetime Stats ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Impact</Text>
                <Text style={styles.sectionSub}>All time</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              {LIFETIME_STATS.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.dot8, { backgroundColor: s.dot }]} />
                  <Text style={styles.statNum}>{s.num}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const GLASS = {
  backgroundColor: "rgba(255, 255, 255, 0.55)",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.75)",
  shadowColor: "#3C5759",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 3,
  overflow: "hidden",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingBottom: 32 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: "#959D90" },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#192524",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  notifBadge: {
    backgroundColor: "#C86868",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  notifNum: { fontSize: 11, fontWeight: "700", color: "#fff" },
  hostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#D1EBDB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  hostAvatarText: { fontSize: 14, fontWeight: "700", color: "#3C5759" },
  hostAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  hostAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  statsStripWrap: { marginHorizontal: 20, marginBottom: 4 },
  statsStrip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 4,
  },
  quickStat: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  quickStatNum: { fontSize: 20, fontWeight: "800", color: "#192524" },
  quickStatLabel: { fontSize: 10, color: "#959D90", marginTop: 1 },
  statDividerV: { width: 1, height: 28, backgroundColor: "rgba(60,87,89,0.1)" },

  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#192524",
    letterSpacing: -0.3,
  },
  sectionSub: { fontSize: 12, color: "#959D90", marginTop: 2 },

  primaryBtn: {
    backgroundColor: "#3C5759",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  primaryBtnText: { fontSize: 13, fontWeight: "600", color: "#EFECE9" },

  filterRow: { maxHeight: 40, marginBottom: 14 },
  filterContent: { gap: 8, alignItems: "center" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.15)",
  },
  filterChipActive: { backgroundColor: "#3C5759", borderColor: "#3C5759" },
  filterChipText: { fontSize: 12, fontWeight: "500", color: "#3C5759" },
  filterChipTextActive: { color: "#EFECE9" },

  listingCard: { ...GLASS, padding: 16, marginBottom: 12 },
  photoContainer: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  photoSlot: {
    width: 320, // approximate card width
    height: 160,
  },
  photoGradient: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  dotIndicators: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 16,
  },
  listingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusLabel: { fontSize: 11, fontWeight: "500" },
  listingLocation: { fontSize: 11, color: "#959D90" },
  listingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#192524",
    marginBottom: 10,
    lineHeight: 21,
  },
  listingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tierText: { fontSize: 11, fontWeight: "500" },
  compType: { fontSize: 11, color: "#959D90" },
  listingStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(25,37,36,0.04)",
    borderRadius: 12,
    padding: 10,
  },
  listingStat: { flex: 1, alignItems: "center" },
  listingStatNum: { fontSize: 16, fontWeight: "700", color: "#192524" },
  listingStatLabel: { fontSize: 10, color: "#959D90", marginTop: 1 },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: "#959D90", marginBottom: 16 },

  feedCard: { ...GLASS, overflow: "hidden" },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityContent: { flex: 1 },
  activityText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#192524",
    lineHeight: 18,
  },
  activitySub: { fontSize: 11, color: "#959D90", marginTop: 2 },
  activityCta: {
    backgroundColor: "rgba(60,87,89,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  activityCtaText: { fontSize: 12, fontWeight: "500", color: "#3C5759" },
  activityDivider: {
    height: 1,
    backgroundColor: "rgba(60,87,89,0.06)",
    marginHorizontal: 14,
  },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { ...GLASS, width: "47.5%", padding: 16 },
  dot8: { width: 8, height: 8, borderRadius: 4, marginBottom: 10 },
  dot6: { width: 6, height: 6, borderRadius: 3 },
  statNum: {
    fontSize: 26,
    fontWeight: "800",
    color: "#192524",
    letterSpacing: -0.5,
  },
  statLabel: { fontSize: 12, color: "#959D90", marginTop: 3 },
});
