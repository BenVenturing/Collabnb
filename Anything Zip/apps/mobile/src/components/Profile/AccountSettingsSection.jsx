import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
} from "react-native";
import { BlurView } from "expo-blur";
import { ChevronRight, Shield, CheckCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AccountSettingsSection() {
  const router = useRouter();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");

  const handleLogout = () => {
    Alert.alert("Log Out", "You'll be signed out on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            // Clear local storage only - no auth touch
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

  const handleVerificationSubmit = async () => {
    await AsyncStorage.setItem("@verification_status", "pending");
    setVerificationStatus("pending");
    setShowVerificationModal(false);
    Alert.alert(
      "Request Submitted",
      "Your verification request is under review. We'll notify you when approved.",
    );
  };

  const settingsRows = [
    {
      title: "Privacy & Security",
      route: "/settings/privacy",
      icon: Shield,
    },
    {
      title: "Notifications",
      route: "/settings/notifications",
      icon: null,
    },
    {
      title: "Verification",
      route: null,
      onPress: () => setShowVerificationModal(true),
      icon: null,
    },
  ];

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 32, marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#192524",
          marginBottom: 16,
        }}
      >
        Account Settings
      </Text>

      <BlurView
        intensity={60}
        tint="light"
        style={{
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.5)",
          backgroundColor: "rgba(255, 255, 255, 0.3)",
        }}
      >
        {settingsRows.map((row, index) => (
          <TouchableOpacity
            key={row.title}
            onPress={row.onPress || (() => router.push(row.route))}
            activeOpacity={0.7}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: index < settingsRows.length - 1 ? 1 : 0,
              borderBottomColor: "rgba(149, 157, 144, 0.2)",
            }}
          >
            <Text style={{ fontSize: 16, color: "#192524", fontWeight: "500" }}>
              {row.title}
            </Text>
            <ChevronRight color="#959D90" size={20} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 16, color: "#3C5759", fontWeight: "500" }}>
            Log Out
          </Text>
        </TouchableOpacity>
      </BlurView>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(25, 37, 36, 0.85)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <BlurView
            intensity={80}
            tint="light"
            style={{
              borderRadius: 20,
              overflow: "hidden",
              width: "100%",
              maxWidth: 400,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <View style={{ padding: 24 }}>
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                {verificationStatus === "verified" ? (
                  <CheckCircle color="#3C5759" size={48} fill="#D1EBDB" />
                ) : (
                  <Shield color="#3C5759" size={48} />
                )}
              </View>

              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Account Verification
              </Text>

              <View
                style={{
                  backgroundColor:
                    verificationStatus === "pending"
                      ? "#FFF3CD"
                      : verificationStatus === "verified"
                        ? "#D1EBDB"
                        : "#EFECE9",
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#3C5759",
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  STATUS
                </Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#192524" }}
                >
                  {verificationStatus === "not_submitted"
                    ? "Not Submitted"
                    : verificationStatus === "pending"
                      ? "Pending Review"
                      : "Verified"}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 15,
                  color: "#3C5759",
                  lineHeight: 22,
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                Verification helps build trust with hosts and creators.
                Uploading documents is coming soon. For now, submit your request
                and we'll review manually.
              </Text>

              {verificationStatus === "not_submitted" && (
                <TouchableOpacity
                  onPress={handleVerificationSubmit}
                  style={{
                    backgroundColor: "#3C5759",
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    Submit for Verification
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowVerificationModal(false)}
                style={{
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#3C5759", fontSize: 15 }}>
                  {verificationStatus === "not_submitted" ? "Not now" : "Close"}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}
