import { View, ScrollView, Text, TouchableOpacity, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useRoleSwitch } from "@/hooks/useRoleSwitch";
import { getCreatorTier } from "@/utils/profileHelpers";
import {
  portfolioItems,
  socialLinks,
  personalLink,
  specialties,
} from "@/data/profileData";
import ThemedBackground from "@/components/ThemedBackground";
import ProfileInfoCard from "@/components/Profile/ProfileInfoCard";
import LinksSection from "@/components/Profile/LinksSection";
import SpecialtiesSection from "@/components/Profile/SpecialtiesSection";
import SettingsModal from "@/components/Profile/SettingsModal";
import RoleSwitchModal from "@/components/Profile/RoleSwitchModal";
import { Settings } from "lucide-react-native";

const LOCATION_PREF_KEY = "@collabnb_creator_location_prefs_v1";

const SAMPLE_CREATOR = {
  name: "Benjamin",
  handle: "@ben.venturing",
  bio: "Travel & lifestyle creator documenting unique stays and hidden gems around the world. Passionate about authentic content that inspires people to explore.",
  bioLink: "beacons.ai/benventuring",
  photo: {
    uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
  },
  tier: "Micro Influencer",
  followers: "28.4k",
  engagement: "6.2%",
  collabs: 12,
  platforms: ["Instagram", "TikTok", "YouTube"],
  location: "Asheville, NC",
  verified: true,
};

export default function CreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadDraft: loadHostDraft } = useHostOnboardingStore();
  const { loadDraft: loadCreatorDraft } = useCreatorOnboardingStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showVerificationTooltip, setShowVerificationTooltip] = useState(false);
  const [collabPrefs, setCollabPrefs] = useState(null);

  const { stats } = useProfileStats();
  const {
    showRoleSwitchModal,
    setShowRoleSwitchModal,
    pendingTargetRole,
    isSwitching,
    attemptRoleSwitch,
    startOnboarding,
  } = useRoleSwitch();

  useEffect(() => {
    loadHostDraft();
    loadCreatorDraft();
    loadCollabPrefs();
  }, []);

  const loadCollabPrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCATION_PREF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          !parsed.skipped &&
          (parsed.currentLocation ||
            (parsed.collabPrefs && parsed.collabPrefs.length > 0))
        ) {
          setCollabPrefs(parsed);
        }
      }
    } catch (e) {}
  };

  const handleHostModePress = () => {
    setShowSettings(false);
    attemptRoleSwitch("host");
  };
  const handleVerificationPress = (show) => setShowVerificationTooltip(show);

  return (
    <ThemedBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Top bar — gear icon only */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          alignItems: "flex-end",
          backgroundColor: "transparent",
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/settings")}
          style={{
            backgroundColor: "rgba(255,255,255,0.4)",
            borderRadius: 20,
            padding: 10,
          }}
        >
          <Settings color="#3C5759" size={24} />
        </TouchableOpacity>
      </View>

      {/* Profile photo — clean vertical stack, no overlap */}
      <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 0 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 3,
            borderColor: "#FFFFFF",
            overflow: "hidden",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Image
            source={SAMPLE_CREATOR.photo}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <ProfileInfoCard
          name={SAMPLE_CREATOR.name}
          creatorTier={SAMPLE_CREATOR.tier}
          bio={SAMPLE_CREATOR.bio}
          stats={stats}
          showVerificationTooltip={showVerificationTooltip}
          onVerificationPress={handleVerificationPress}
          isSelfView={true}
        />

        <LinksSection personalLink={personalLink} socialLinks={socialLinks} />
        <SpecialtiesSection specialties={specialties} />

        {/* Collab Preferences — only shown when prefs are saved */}
        {collabPrefs && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.55)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.75)",
                padding: 16,
                shadowColor: "#3C5759",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 10,
                  color: "#959D90",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Collab Preferences
              </Text>
              {!!collabPrefs.currentLocation && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, marginRight: 8 }}>📍</Text>
                  <Text
                    style={{
                      fontFamily: "Inter-Regular",
                      fontSize: 13,
                      color: "#3C5759",
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: "#192524" }}>
                      Based in:{" "}
                    </Text>
                    {collabPrefs.currentLocation}
                  </Text>
                </View>
              )}
              {collabPrefs.collabPrefs &&
                collabPrefs.collabPrefs.length > 0 && (
                  <View
                    style={{ flexDirection: "row", alignItems: "flex-start" }}
                  >
                    <Text
                      style={{ fontSize: 14, marginRight: 8, marginTop: 1 }}
                    >
                      ✈️
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter-Regular",
                        fontSize: 13,
                        color: "#3C5759",
                        flex: 1,
                        lineHeight: 20,
                      }}
                    >
                      <Text style={{ fontWeight: "600", color: "#192524" }}>
                        Open to:{" "}
                      </Text>
                      {collabPrefs.collabPrefs.join(", ")}
                    </Text>
                  </View>
                )}
            </View>
          </View>
        )}

        {/* Past Collabs */}
        <View
          style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 32 }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#192524",
              marginBottom: 12,
            }}
          >
            Past Collabs
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {portfolioItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  width: (400 - 56) / 3,
                  height: (400 - 56) / 3,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#E5E7EB",
                }}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    backgroundColor: "rgba(25,37,36,0.55)",
                    borderRadius: 6,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: "#EFECE9",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    SAMPLE
                  </Text>
                </View>
                {item.type === "video" && (
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      borderRadius: 12,
                      padding: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10 }}>▶️</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        insets={insets}
        isSwitching={isSwitching}
        onHostModePress={handleHostModePress}
      />
      <RoleSwitchModal
        visible={showRoleSwitchModal}
        onClose={() => setShowRoleSwitchModal(false)}
        pendingTargetRole={pendingTargetRole}
        onStartOnboarding={startOnboarding}
      />
    </ThemedBackground>
  );
}
