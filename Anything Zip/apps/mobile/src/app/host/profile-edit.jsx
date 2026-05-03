import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "@collabnb_host_profile_v1";

const DEFAULT_PROFILE = {
  name: "Ben",
  propertyName: "The Grove",
  email: "b***9@gmail.com",
  phone: "",
  location: "Asheville, NC",
  bio: "Welcome to The Grove — a beachfront glass villa designed for creators who want content that stops the scroll. Surrounded by tropical palms, an infinity pool, and golden hour light every evening.",
  website: "",
  instagram: "@thegrove",
  tiktok: "@thegrove",
  youtube: "@thegrove",
};

const PHOTO_URI =
  "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/";

const PROPERTY_FIELDS = [
  { key: "name", label: "Host name", multiline: false },
  { key: "propertyName", label: "Property name", multiline: false },
  { key: "email", label: "Email", multiline: false },
  {
    key: "phone",
    label: "Phone number",
    multiline: false,
    emptyLabel: "Not provided",
    emptyAction: "Add",
  },
  { key: "location", label: "Location", multiline: false },
  { key: "bio", label: "Property description", multiline: true },
  {
    key: "website",
    label: "Website",
    multiline: false,
    emptyLabel: "Not provided",
    emptyAction: "Add",
  },
];

const ACCOUNT_FIELDS = [
  { key: "instagram", label: "Instagram", multiline: false },
  { key: "tiktok", label: "TikTok", multiline: false },
  { key: "youtube", label: "YouTube", multiline: false },
];

export default function HostProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((s) => {
      if (s) setProfile((prev) => ({ ...prev, ...JSON.parse(s) }));
    });
  }, []);

  const openEdit = (field) => {
    setEditingField(field);
    setEditValue(profile[field] || "");
  };

  const saveEdit = async () => {
    const updated = { ...profile, [editingField]: editValue };
    setProfile(updated);
    setEditingField(null);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    triggerConfetti();
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1500);
  };

  const activeField =
    [...PROPERTY_FIELDS, ...ACCOUNT_FIELDS].find(
      (f) => f.key === editingField,
    ) || null;

  const renderFieldRow = (field) => {
    const value = profile[field.key];
    const isEmpty = !value;
    const displayValue = isEmpty ? field.emptyLabel || "Not provided" : value;
    const action = isEmpty ? field.emptyAction || "Add" : "Edit";

    return (
      <TouchableOpacity
        key={field.key}
        onPress={() => openEdit(field.key)}
        activeOpacity={0.7}
        style={{
          backgroundColor: "rgba(255,255,255,0.62)",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(60,87,89,0.08)",
          marginHorizontal: 20,
          marginBottom: 8,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          shadowColor: "#3C5759",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter-Medium",
              fontSize: 13,
              color: "#959D90",
              marginBottom: 3,
            }}
          >
            {field.label}
          </Text>
          <Text
            numberOfLines={field.multiline ? 2 : 1}
            style={{
              fontFamily: "Inter-Regular",
              fontSize: 15,
              color: isEmpty ? "#D0D5CE" : "#192524",
            }}
          >
            {displayValue}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 14,
            color: "#3C5759",
            textDecorationLine: "underline",
            marginLeft: 12,
          }}
        >
          {action} ›
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#F0F0F0",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <Text style={{ fontSize: 22, color: "#192524" }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "Inter-Bold",
            fontSize: 22,
            color: "#192524",
            letterSpacing: -0.3,
          }}
        >
          Host Info
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo section */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#F0F0F0",
            gap: 16,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "#F0F0F0",
            }}
          >
            <Image
              source={{ uri: PHOTO_URI }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Update Photo", "Photo picker coming soon.")
            }
          >
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 15,
                color: "#3C5759",
                textDecorationLine: "underline",
              }}
            >
              Change photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Property Info section */}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 11,
            color: "#959D90",
            letterSpacing: 1.4,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Property Info
        </Text>
        {PROPERTY_FIELDS.map(renderFieldRow)}

        {/* Account section */}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: 11,
            color: "#959D90",
            letterSpacing: 1.4,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Account
        </Text>
        {ACCOUNT_FIELDS.map(renderFieldRow)}
      </ScrollView>

      {/* Inline edit modal */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingField(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setEditingField(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Handle bar */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#E0E0E0",
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />
              <Text
                style={{
                  fontFamily: "Inter-Bold",
                  fontSize: 18,
                  color: "#192524",
                  marginBottom: 16,
                }}
              >
                {activeField?.label}
              </Text>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                multiline={activeField?.multiline}
                numberOfLines={activeField?.multiline ? 4 : 1}
                style={{
                  backgroundColor: "rgba(60,87,89,0.05)",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(60,87,89,0.15)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#192524",
                  fontFamily: "Inter-Regular",
                  marginBottom: 16,
                  minHeight: activeField?.multiline ? 100 : undefined,
                  textAlignVertical: activeField?.multiline ? "top" : "center",
                }}
                placeholderTextColor="#D0D5CE"
                placeholder={`Enter ${activeField?.label?.toLowerCase()}...`}
              />
              <TouchableOpacity
                onPress={saveEdit}
                style={{
                  backgroundColor: "#3C5759",
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 15,
                    color: "#EFECE9",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingField(null)}
                style={{ paddingVertical: 12, alignItems: "center" }}
              >
                <Text
                  style={{
                    fontFamily: "Inter-Medium",
                    fontSize: 14,
                    color: "#959D90",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confetti overlay */}
      {showConfetti && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.92)",
          }}
        >
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
          <Text
            style={{
              fontFamily: "Inter-Bold",
              fontSize: 22,
              color: "#192524",
              letterSpacing: -0.3,
            }}
          >
            Profile updated!
          </Text>
        </View>
      )}
    </View>
  );
}
