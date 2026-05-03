import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuth } from "@/utils/auth/useAuth";

export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Sign in failed");
      }

      const data = await response.json();

      await setAuth({ jwt: data.jwt, user: data.user });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Sign in error:", error);
      Alert.alert("Error", "Invalid email or password");
      setLoading(false);
    }
  };

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
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Glass Card */}
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
              marginBottom: 32,
            }}
          >
            Welcome Back
          </Text>

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
                borderColor: emailFocused ? "#3C5759" : "rgba(149,157,144,0.5)",
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

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            style={{
              backgroundColor: "#3C5759",
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              marginBottom: 20,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#EFECE9", fontSize: 16, fontWeight: "700" }}>
              {loading ? "Signing in..." : "Sign In"}
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

          {/* Sign Up Link */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: "#959D90" }}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text
                style={{ fontSize: 14, color: "#3C5759", fontWeight: "600" }}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
