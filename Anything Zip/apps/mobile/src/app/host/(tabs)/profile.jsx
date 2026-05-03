import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import HostGlassSheet from "@/components/HostGlassSheet";
import ThemedBackground from "@/components/ThemedBackground";
import { Settings } from "lucide-react-native";
import useRoleStore from "@/utils/RoleStore";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import ListingDraftStore from "@/utils/ListingDraftStore";
import MessagingStore from "@/utils/MessagingStore";

const SAMPLE_HOST = {
  name: "Ben",
  propertyName: "The Grove",
  location: "Asheville, NC",
  verified: true,
  bio: "Welcome to The Grove — a beachfront glass villa designed for creators who want content that stops the scroll. Surrounded by tropical palms, an infinity pool, and golden hour light every evening. We partner with travel and lifestyle creators who share our love for intentional, beautiful spaces. Every collab is personal to us.",
  totalCollabs: 12,
  creatorsWorkedWith: 8,
  propertyPhoto: {
    uri: "https://ucarecdn.com/38af81bb-8d32-4aa8-9e45-ad795a5c9aa7/-/format/auto/",
  },
  hostPhoto: {
    uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
  },
};

export default function HostProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setRole } = useRoleStore();
  const { hostApprovalStatus, loadDraft: loadHostDraft } =
    useHostOnboardingStore();
  const { creatorApprovalStatus, loadDraft: loadCreatorDraft } =
    useCreatorOnboardingStore();

  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [pendingTargetRole, setPendingTargetRole] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const [stats, setStats] = useState({
    publishedListings: 0,
    unpublishedListings: 0,
    unreadMessages: 0,
    lastUpdated: new Date(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHostDraft();
    loadCreatorDraft();
  }, []);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    try {
      const listings = await ListingDraftStore.getPublishedListings();
      const published = listings.filter((l) => l.status === "published").length;
      const unpublished = listings.filter(
        (l) => l.status === "unpublished",
      ).length;
      await MessagingStore.init();
      const threads = MessagingStore.getThreads();
      const unread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
      setStats({
        publishedListings: published,
        unpublishedListings: unpublished,
        unreadMessages: unread,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Failed to load host stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [refreshStats]),
  );

  const attemptRoleSwitch = async (targetRole) => {
    const isAdmin = await AsyncStorage.getItem("@collabnb_is_admin_v1");
    if (isAdmin === "true") {
      await AsyncStorage.setItem("@collabnb_active_mode_v1", targetRole);
      router.replace(
        targetRole === "host" ? "/host/(tabs)/dashboard" : "/(tabs)",
      );
      return;
    }
    const targetApprovalStatus =
      targetRole === "host" ? hostApprovalStatus : creatorApprovalStatus;
    if (targetApprovalStatus === "approved") {
      setIsSwitching(true);
      try {
        await setRole(targetRole);
        setTimeout(() => {
          setIsSwitching(false);
          router.replace(
            targetRole === "host" ? "/host/(tabs)/collabs" : "/(tabs)",
          );
        }, 400);
      } catch (error) {
        setIsSwitching(false);
        Alert.alert("Error", "Failed to switch roles. Please try again.");
      }
    } else if (targetApprovalStatus === "not_submitted") {
      setPendingTargetRole(targetRole);
      setShowRoleSwitchModal(true);
    } else if (targetApprovalStatus === "pending") {
      Alert.alert(
        `${targetRole === "host" ? "Host" : "Creator"} setup pending`,
        "Your application is under review. We'll notify you when you're approved.",
        [{ text: "OK" }],
      );
    }
  };

  const startOnboarding = () => {
    setShowRoleSwitchModal(false);
    if (pendingTargetRole === "host") {
      router.push("/host-onboarding/property");
    } else {
      router.push("/creator-onboarding/basic-info");
    }
  };

  return (
    <ThemedBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        contentInsetAdjustmentBehavior="never"
      >
        <HostGlassSheet>
          {/* Header */}
          <View
            style={{
              paddingTop: insets.top + 20,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "700", color: "#192524" }}>
              Host Profile
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/host/settings")}
              style={{
                backgroundColor: "rgba(60, 87, 89, 0.15)",
                borderRadius: 20,
                padding: 10,
              }}
            >
              <Settings color="#3C5759" size={24} />
            </TouchableOpacity>
          </View>

          {/* Property Photo + overlapping Host Avatar — plain Views, not tappable */}
          <View
            style={{
              width: "100%",
              height: 220,
              borderRadius: 16,
              overflow: "visible",
              position: "relative",
              marginBottom: 44,
            }}
          >
            <Image
              source={SAMPLE_HOST.propertyPhoto}
              style={{ width: "100%", height: 220, borderRadius: 16 }}
              resizeMode="cover"
            />
            <View
              style={{
                position: "absolute",
                bottom: -32,
                left: 20,
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 3,
                borderColor: "#FFFFFF",
                overflow: "hidden",
              }}
            >
              <Image
                source={SAMPLE_HOST.hostPhoto}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Host Info */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter-Bold",
                  fontSize: 22,
                  color: "#192524",
                  marginRight: 8,
                }}
              >
                {SAMPLE_HOST.name}
              </Text>
              {SAMPLE_HOST.verified && (
                <View
                  style={{
                    backgroundColor: "rgba(74,155,127,0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(74,155,127,0.3)",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter-Medium",
                      fontSize: 11,
                      color: "#4A9B7F",
                    }}
                  >
                    ✓ Verified
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 15,
                color: "#3C5759",
                marginBottom: 6,
              }}
            >
              {SAMPLE_HOST.propertyName}
            </Text>
            <Text
              style={{
                fontFamily: "Inter-Regular",
                fontSize: 13,
                color: "#959D90",
              }}
            >
              📍 {SAMPLE_HOST.location}
            </Text>
          </View>

          {/* Bio */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Inter-Regular",
                fontSize: 14,
                color: "#3C5759",
                lineHeight: 20,
              }}
              numberOfLines={bioExpanded ? undefined : 4}
            >
              {SAMPLE_HOST.bio}
            </Text>
            <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#3C5759",
                  marginTop: 6,
                  textDecorationLine: "underline",
                }}
              >
                {bioExpanded ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 20,
              marginBottom: 24,
            }}
          >
            {[
              {
                emoji: "💬",
                label: "Message",
                onPress: () => router.push("/host/(tabs)/inbox"),
              },
              {
                emoji: "🏡",
                label: "View Property",
                onPress: () =>
                  router.push({
                    pathname: "/listing-detail",
                    params: { id: "l1", isHost: "true" },
                  }),
              },
              {
                emoji: "📍",
                label: "Location",
                onPress: () => console.log("open map"),
              },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={btn.onPress}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.55)",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.75)",
                  paddingVertical: 12,
                  alignItems: "center",
                  shadowColor: "#3C5759",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 16, marginBottom: 4 }}>
                  {btn.emoji}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 12,
                    color: "#192524",
                  }}
                >
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider */}
          <View
            style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 24 }}
          />

          {/* Collab Stats */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              {[
                { value: SAMPLE_HOST.totalCollabs, label: "Total Collabs" },
                {
                  value: SAMPLE_HOST.creatorsWorkedWith,
                  label: "Creators\nWorked With",
                },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.55)",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.75)",
                    padding: 16,
                    alignItems: "center",
                    shadowColor: "#3C5759",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "800",
                      color: "#192524",
                      letterSpacing: -0.5,
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#959D90",
                      marginTop: 4,
                      textAlign: "center",
                    }}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </HostGlassSheet>
      </ScrollView>
    </ThemedBackground>
  );
}
