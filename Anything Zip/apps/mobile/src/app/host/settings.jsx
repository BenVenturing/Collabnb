import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { X, ChevronRight } from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";
import {
  setTheme as setStoreTheme,
  getTheme,
  THEMES,
} from "@/utils/ThemeStore";
import useRoleStore from "@/utils/RoleStore";

const SAMPLE_HOST = {
  name: "Ben",
  handle: "@ben.hosting",
  photo: {
    uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
  },
};

export default function HostSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setRole } = useRoleStore();
  const [selectedTheme, setSelectedTheme] = useState("sand");
  const [vibeExpanded, setVibeExpanded] = useState(false);

  useEffect(() => {
    getTheme().then((id) => {
      if (id) setSelectedTheme(id);
    });
  }, []);

  const handleThemeSelect = async (themeId) => {
    setSelectedTheme(themeId);
    await setStoreTheme(themeId);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "You'll be signed out on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              "@role",
              "@host_draft",
              "@creator_draft",
              "@profile_photo_uri",
              "@notifications_settings",
              "@verification_status",
            ]);
            router.replace("/role-select");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleSwitchToCreator = async () => {
    // Admin bypass — same pattern as host profile
    const isAdmin = await AsyncStorage.getItem("@collabnb_is_admin_v1");
    if (isAdmin === "true") {
      await AsyncStorage.setItem("@collabnb_active_mode_v1", "creator");
      router.replace("/(tabs)");
      return;
    }
    // Non-admin: use role store
    try {
      await setRole("creator");
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", "Failed to switch. Please try again.");
    }
  };

  return (
    <ThemedBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(60,87,89,0.08)",
        }}
      >
        <Text
          style={{ fontFamily: "Inter-Bold", fontSize: 20, color: "#192524" }}
        >
          Settings
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(60,87,89,0.08)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X color="#3C5759" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE */}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 11,
            color: "#959D90",
            letterSpacing: 1.2,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Profile
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/host/profile-edit")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.62)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.78)",
            marginHorizontal: 20,
            padding: 14,
            gap: 14,
            shadowColor: "#3C5759",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.8)",
            }}
          >
            <Image
              source={SAMPLE_HOST.photo}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter-Bold",
                fontSize: 16,
                color: "#192524",
              }}
            >
              {SAMPLE_HOST.name}
            </Text>
            <Text
              style={{
                fontFamily: "Inter-Regular",
                fontSize: 13,
                color: "#959D90",
                marginTop: 2,
              }}
            >
              {SAMPLE_HOST.handle}
            </Text>
            <Text
              style={{
                fontFamily: "Inter-Regular",
                fontSize: 11,
                color: "#D0D5CE",
                marginTop: 3,
              }}
            >
              Tap to edit profile
            </Text>
          </View>
          <ChevronRight color="#D0D5CE" size={18} />
        </TouchableOpacity>

        {/* APPEARANCE */}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 11,
            color: "#959D90",
            letterSpacing: 1.2,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Appearance
        </Text>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.62)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.78)",
            marginHorizontal: 20,
            overflow: "hidden",
            shadowColor: "#3C5759",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <TouchableOpacity
            onPress={() => setVibeExpanded(!vibeExpanded)}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 15,
                  color: "#192524",
                }}
              >
                Your Vibe
              </Text>
              <Text
                style={{
                  fontFamily: "Inter-Regular",
                  fontSize: 12,
                  color: "#959D90",
                  marginTop: 2,
                }}
              >
                Changes background theme
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: "#D0D5CE" }}>
              {vibeExpanded ? "∨" : "›"}
            </Text>
          </TouchableOpacity>

          {vibeExpanded && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-evenly",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(60,87,89,0.06)",
              }}
            >
              {THEMES.map((theme) => (
                <View
                  key={theme.id}
                  style={{ alignItems: "center", width: 44 }}
                >
                  <TouchableOpacity
                    onPress={() => handleThemeSelect(theme.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        {
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          overflow: "hidden",
                        },
                        selectedTheme === theme.id && {
                          transform: [{ scale: 1.18 }],
                          shadowColor: "#192524",
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.2,
                          shadowRadius: 10,
                          elevation: 8,
                        },
                      ]}
                    >
                      {theme.id === "white" ? (
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1.5,
                            borderColor: "#E8E8E8",
                          }}
                        />
                      ) : (
                        <LinearGradient
                          colors={theme.colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 8,
                      color: "#959D90",
                      textAlign: "center",
                      marginTop: 4,
                      fontWeight: "500",
                    }}
                  >
                    {theme.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ACCOUNT */}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 11,
            color: "#959D90",
            letterSpacing: 1.2,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Account
        </Text>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.62)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.78)",
            marginHorizontal: 20,
            overflow: "hidden",
            shadowColor: "#3C5759",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          {[
            {
              label: "Privacy & Security",
              onPress: () => router.push("/settings/privacy"),
            },
            {
              label: "Notifications",
              onPress: () => router.push("/settings/notifications"),
            },
            {
              label: "Verification",
              onPress: () => console.log("verification"),
            },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <TouchableOpacity
                onPress={row.onPress}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 15,
                    color: "#192524",
                  }}
                >
                  {row.label}
                </Text>
                <ChevronRight color="#D0D5CE" size={18} />
              </TouchableOpacity>
              {i < arr.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: "rgba(60,87,89,0.06)",
                    marginLeft: 16,
                  }}
                />
              )}
            </View>
          ))}
        </View>

        {/* MODE */}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 11,
            color: "#959D90",
            letterSpacing: 1.2,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Mode
        </Text>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.62)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.78)",
            marginHorizontal: 20,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#3C5759",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter-Bold",
                fontSize: 15,
                color: "#192524",
              }}
            >
              🎨 Creator Mode
            </Text>
            <Text
              style={{
                fontFamily: "Inter-Regular",
                fontSize: 12,
                color: "#959D90",
                marginTop: 2,
              }}
            >
              Switch to your creator profile
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSwitchToCreator}
            style={{
              backgroundColor: "#3C5759",
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 13,
                color: "#EFECE9",
              }}
            >
              Switch ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 40,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: "rgba(200,104,104,0.08)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(200,104,104,0.2)",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter-Medium",
              fontSize: 15,
              color: "#C86868",
            }}
          >
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedBackground>
  );
}
