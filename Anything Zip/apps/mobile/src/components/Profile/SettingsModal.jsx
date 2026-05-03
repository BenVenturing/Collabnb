import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ThemedBackground from "../ThemedBackground";
import { useState, useEffect } from "react";

export default function SettingsModal({
  visible,
  onClose,
  insets,
  isSwitching,
  onHostModePress,
}) {
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState("creator");

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem("@collabnb_active_mode_v1").then((m) => {
        if (m) setCurrentMode(m);
      });
    }
  }, [visible]);

  const handleModeSwitch = () => {
    Alert.alert(
      "Switch to Host Mode",
      "You will be taken to the Host dashboard immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            await AsyncStorage.setItem("@collabnb_active_mode_v1", "host");
            router.replace("/host/(tabs)/dashboard");
          },
        },
      ],
    );
  };

  const handleChangePhoto = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to change your profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      try {
        await AsyncStorage.setItem("@profile_photo_uri", uri);
        Alert.alert(
          "Success",
          "Profile photo updated! Close settings to see the change.",
        );
      } catch (error) {
        console.error("Failed to save profile photo:", error);
        Alert.alert("Error", "Failed to update profile photo.");
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <ThemedBackground>
          <View
            style={{
              paddingTop: insets.top + 20,
              paddingBottom: 20,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
              backgroundColor: "transparent",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter-Bold",
                  fontSize: 26,
                  color: "#192524",
                  letterSpacing: -0.5,
                }}
              >
                Settings
              </Text>
              <Text
                style={{
                  fontFamily: "Inter-Regular",
                  fontSize: 13,
                  color: "#959D90",
                  marginTop: 2,
                }}
              >
                Manage your account and preferences
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color="#3C5759" size={28} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={{ padding: 20 }}>
              {/* Current Mode Card */}
              <Text
                style={{
                  fontFamily: "Inter-Bold",
                  fontSize: 18,
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Current Mode
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(60,87,89,0.15)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(60,87,89,0.3)",
                  padding: 18,
                  marginBottom: 24,
                  shadowColor: "#3C5759",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 10,
                    color: "#3C5759",
                    letterSpacing: 1.2,
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  ACTIVE MODE
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter-Bold",
                    fontSize: 22,
                    color: "#192524",
                    letterSpacing: -0.3,
                  }}
                >
                  {currentMode === "creator"
                    ? "🎬 Creator Mode"
                    : "🏡 Host Mode"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 13,
                    color: "#959D90",
                    lineHeight: 19,
                    marginTop: 8,
                  }}
                >
                  {currentMode === "creator"
                    ? "Discover stays, apply for collabs, and grow your content portfolio."
                    : "List your property, discover creators, and manage your collab pipeline."}
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255,255,255,0.3)",
                marginVertical: 4,
              }}
            />

            <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
              <Text
                style={{
                  fontFamily: "Inter-Bold",
                  fontSize: 18,
                  color: "#192524",
                  marginBottom: 16,
                }}
              >
                Account Settings
              </Text>

              {/* Change Profile Photo button */}
              <TouchableOpacity
                onPress={handleChangePhoto}
                style={{
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 16,
                    color: "#192524",
                  }}
                >
                  Change Profile Photo
                </Text>
                <Text style={{ fontSize: 18, color: "#959D90" }}>›</Text>
              </TouchableOpacity>

              {/* Add mode switch button for creator */}
              {currentMode === "creator" && (
                <TouchableOpacity
                  onPress={handleModeSwitch}
                  style={{
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderColor: "rgba(255,255,255,0.3)",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter-Regular",
                      fontSize: 16,
                      color: "#192524",
                    }}
                  >
                    Switch to Host Mode
                  </Text>
                  <Text style={{ fontSize: 18, color: "#959D90" }}>›</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 16,
                    color: "#192524",
                  }}
                >
                  Privacy & Security
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 16,
                    color: "#192524",
                  }}
                >
                  Notifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 16,
                    color: "#192524",
                  }}
                >
                  Verification
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ paddingVertical: 16 }}>
                <Text
                  style={{
                    fontFamily: "Inter-Regular",
                    fontSize: 16,
                    color: "#3C5759",
                  }}
                >
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedBackground>
      </View>
    </Modal>
  );
}
