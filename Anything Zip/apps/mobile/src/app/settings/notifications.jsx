import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { ChevronLeft, Bell } from "lucide-react-native";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_SETTINGS = {
  messages: true,
  deliverables: true,
  applicationUpdates: false,
  marketing: false,
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem("@notifications_settings");
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(
        "@notifications_settings",
        JSON.stringify(newSettings),
      );
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  };

  const notificationOptions = [
    {
      key: "messages",
      title: "New Messages",
      description: "Get notified when you receive a new message",
    },
    {
      key: "applicationUpdates",
      title: "Application Updates",
      description: "Coming soon - updates on collaboration applications",
      disabled: true,
    },
    {
      key: "deliverables",
      title: "Deliverables Due Reminders",
      description: "Reminders when collaboration deadlines are approaching",
    },
    {
      key: "marketing",
      title: "Marketing Updates",
      description: "News, tips, and special offers from Collabnb",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ChevronLeft color="#3C5759" size={28} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
            Notifications
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Bell color="#3C5759" size={40} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Stay Updated
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Choose what notifications you'd like to receive
          </Text>
        </View>

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
          {notificationOptions.map((option, index) => (
            <View
              key={option.key}
              style={{
                paddingVertical: 18,
                paddingHorizontal: 20,
                borderBottomWidth:
                  index < notificationOptions.length - 1 ? 1 : 0,
                borderBottomColor: "rgba(149, 157, 144, 0.2)",
                opacity: option.disabled ? 0.5 : 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#192524",
                      marginBottom: 4,
                    }}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#3C5759",
                      lineHeight: 18,
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
                <Switch
                  value={settings[option.key]}
                  onValueChange={(value) => updateSetting(option.key, value)}
                  trackColor={{ false: "#D0D5CE", true: "#D1EBDB" }}
                  thumbColor={settings[option.key] ? "#3C5759" : "#959D90"}
                  disabled={option.disabled}
                />
              </View>
            </View>
          ))}
        </BlurView>

        <BlurView
          intensity={60}
          tint="light"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.5)",
            backgroundColor: "rgba(209, 235, 219, 0.4)",
            marginTop: 16,
          }}
        >
          <View style={{ padding: 16 }}>
            <Text
              style={{
                fontSize: 14,
                color: "#192524",
                lineHeight: 20,
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              💡 Enable push notifications in your device settings for real-time
              alerts
            </Text>
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
}
