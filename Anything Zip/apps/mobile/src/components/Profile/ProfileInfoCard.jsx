import { View, Text, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Shield, MessageCircle, RefreshCw } from "lucide-react-native";
import { formatFollowers } from "@/utils/profileHelpers";

export default function ProfileInfoCard({
  name,
  creatorTier,
  bio,
  stats,
  showVerificationTooltip,
  onVerificationPress,
  isSelfView = false,
}) {
  return (
    <BlurView
      intensity={22}
      tint="light"
      style={{
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.35)",
        backgroundColor: "rgba(255, 255, 255, 0.28)",
        shadowColor: "#192524",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      <View style={{ padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
              position: "relative",
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#192524",
                marginRight: 8,
              }}
            >
              {name}
            </Text>
            <View
              onMouseEnter={() =>
                Platform.OS === "web" && onVerificationPress(true)
              }
              onMouseLeave={() =>
                Platform.OS === "web" && onVerificationPress(false)
              }
            >
              <TouchableOpacity
                onPress={() =>
                  Platform.OS !== "web" &&
                  onVerificationPress(!showVerificationTooltip)
                }
                activeOpacity={0.7}
              >
                <Shield color="#3C5759" size={16} fill="#3C5759" />
              </TouchableOpacity>
            </View>

            {showVerificationTooltip && (
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  left: 110,
                  backgroundColor: "rgba(60, 87, 89, 0.95)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                  zIndex: 1000,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: "500",
                  }}
                >
                  Verified by platform
                </Text>
                <View
                  style={{
                    position: "absolute",
                    left: -6,
                    top: 6,
                    width: 0,
                    height: 0,
                    borderTopWidth: 6,
                    borderBottomWidth: 6,
                    borderRightWidth: 6,
                    borderTopColor: "transparent",
                    borderBottomColor: "transparent",
                    borderRightColor: "rgba(60, 87, 89, 0.95)",
                  }}
                />
              </View>
            )}
          </View>

          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: "#D1EBDB",
            }}
          >
            <Text style={{ color: "#192524", fontSize: 12, fontWeight: "600" }}>
              ⭐ {creatorTier}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 14,
            color: "#3C5759",
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 16,
          }}
        >
          {bio}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            paddingVertical: 16,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.25)",
            marginBottom: 8,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
              {formatFollowers(stats.followers)}
            </Text>
            <Text style={{ fontSize: 12, color: "#959D90", marginTop: 4 }}>
              Followers
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
              {stats.engagement.toFixed(1)}%
            </Text>
            <Text style={{ fontSize: 12, color: "#959D90", marginTop: 4 }}>
              Engagement
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
              {stats.collabs}
            </Text>
            <Text style={{ fontSize: 12, color: "#959D90", marginTop: 4 }}>
              Collabs
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: isSelfView ? 0 : 16,
          }}
        >
          <RefreshCw color="#959D90" size={10} />
          <Text style={{ fontSize: 10, color: "#959D90", marginLeft: 4 }}>
            Updated just now
          </Text>
        </View>

        {!isSelfView && (
          <TouchableOpacity>
            <LinearGradient
              colors={["#3C5759", "#192524"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <MessageCircle
                color="#fff"
                size={18}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                Contact Creator
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  );
}
