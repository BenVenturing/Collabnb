import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { useAuth } from "@/utils/auth/useAuth";
import useRoleStore from "@/utils/RoleStore";

const LISTING_TEASERS = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400",
    label: "Free stay",
    isPaid: false,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
    label: "$450",
    isPaid: true,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    label: "Free stay",
    isPaid: false,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400",
    label: "$650",
    isPaid: true,
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
    label: "Free stay",
    isPaid: false,
  },
  {
    id: "6",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400",
    label: "$320",
    isPaid: true,
  },
  {
    id: "7",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
    label: "Free stay",
    isPaid: false,
  },
  {
    id: "8",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    label: "$550",
    isPaid: true,
  },
];

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuth();
  const { setRole } = useRoleStore();

  const [selectedRole, setSelectedRole] = useState("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedRole === "creator" ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [selectedRole]);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      // Store role temporarily
      await AsyncStorage.setItem("pending_role", selectedRole);

      // Call signup endpoint
      console.log("🔵 Attempting signup for:", email);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("🔵 Signup response status:", response.status);
      console.log("🔵 Signup response data:", data);

      if (!response.ok) {
        // Show the actual error message from the API
        const errorMessage =
          data.error || `Signup failed with status ${response.status}`;
        console.error("🔴 Signup failed:", errorMessage);
        throw new Error(errorMessage);
      }

      console.log("🟢 Signup successful, setting auth...");
      // Set auth and WAIT for it to complete
      await setAuth({ jwt: data.jwt, user: data.user });
      console.log("🟢 Auth saved, now saving role...");

      // Persist role to RoleStore
      await setRole(selectedRole);
      console.log("🟢 Role saved, now navigating...");

      // Route based on role
      if (selectedRole === "creator") {
        router.replace("/creator-onboarding/basic-info");
      } else {
        router.replace("/host-onboarding/property");
      }
    } catch (error) {
      console.error("🔴 Signup error:", error);
      // Show the actual error message instead of generic message
      Alert.alert(
        "Signup Error",
        error.message || "Signup failed. Please try again.",
      );
      setLoading(false);
    }
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="light" />

      {/* Background Image with Overlay */}
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200",
        }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0.6,
        }}
        contentFit="cover"
      />
      <View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(239,236,233,0.35)",
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Listing Teaser Strip */}
        <View style={{ marginBottom: 24 }}>
          <FlatList
            horizontal
            data={LISTING_TEASERS}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            renderItem={({ item }) => (
              <View
                style={{
                  marginHorizontal: 6,
                  width: 140,
                  height: 180,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: "#fff",
                  shadowColor: "#192524",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Image
                  source={{ uri: item.image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
                <View
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: "rgba(239,236,233,0.92)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#192524",
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>

        {/* Glass Card */}
        <View style={{ marginHorizontal: 20 }}>
          <View
            style={{
              backgroundColor: "rgba(239,236,233,0.24)",
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(208,213,206,0.45)",
              padding: 28,
              shadowColor: "#192524",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            {/* Title */}
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: "#192524",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Create Account
            </Text>

            {/* Role Selector */}
            <View style={{ marginBottom: 28, marginTop: 20 }}>
              <View
                style={{
                  backgroundColor: "rgba(208,213,206,0.55)",
                  borderRadius: 20,
                  padding: 4,
                  position: "relative",
                }}
              >
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    width: 140,
                    height: 44,
                    backgroundColor: "rgba(209,235,219,0.85)",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    transform: [{ translateX }],
                  }}
                />

                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    onPress={() => setSelectedRole("creator")}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color:
                          selectedRole === "creator" ? "#192524" : "#3C5759",
                      }}
                    >
                      Creator
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedRole("host")}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: selectedRole === "host" ? "#192524" : "#3C5759",
                      }}
                    >
                      Host
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Role Description */}
              <Text
                style={{
                  fontSize: 13,
                  color: "#959D90",
                  textAlign: "center",
                  marginTop: 12,
                  lineHeight: 18,
                }}
              >
                {selectedRole === "creator"
                  ? "Build your portfolio and collaborate on stays."
                  : "Post opportunities and work with creators."}
              </Text>
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="your@email.com"
                placeholderTextColor="#959D90"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={{
                  backgroundColor: "rgba(239,236,233,0.55)",
                  borderWidth: 1,
                  borderColor: emailFocused
                    ? "#3C5759"
                    : "rgba(149,157,144,0.5)",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: "#192524",
                }}
              />
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="••••••••"
                placeholderTextColor="#959D90"
                secureTextEntry
                style={{
                  backgroundColor: "rgba(239,236,233,0.55)",
                  borderWidth: 1,
                  borderColor: passwordFocused
                    ? "#3C5759"
                    : "rgba(149,157,144,0.5)",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: "#192524",
                }}
              />
            </View>

            {/* Privacy Policy Checkbox */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => setPrivacyConsent(!privacyConsent)}
                style={{
                  backgroundColor: privacyConsent
                    ? "#3C5759"
                    : "rgba(239,236,233,0.55)",
                  borderRadius: 12,
                  padding: 6,
                  marginRight: 12,
                }}
              >
                <Animated.View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: privacyConsent ? "#fff" : "transparent",
                    marginRight: 6,
                  }}
                />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 13,
                  color: "#192524",
                  fontWeight: "600",
                }}
              >
                I agree to the{" "}
                <Text
                  style={{ color: "#3C5759", fontWeight: "600" }}
                  onPress={() => router.push("/privacy-policy")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading || !privacyConsent}
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 20,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text
                style={{ color: "#EFECE9", fontSize: 16, fontWeight: "700" }}
              >
                {loading ? "Creating account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            {/* Logo */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Image
                source={{
                  uri: "https://ucarecdn.com/9deddd9f-ada6-48b1-9614-1a97c13cfe69/",
                }}
                style={{ width: 64, height: 64, opacity: 0.9 }}
                contentFit="contain"
                transition={200}
              />
            </View>

            {/* Sign In Link */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: "#959D90" }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/signin")}>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", fontWeight: "600" }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>

            {/* Microcopy */}
            <Text
              style={{
                fontSize: 11,
                color: "#959D90",
                textAlign: "center",
                marginTop: 20,
                lineHeight: 16,
              }}
            >
              You can add the other role later, but you'll be asked to verify.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
