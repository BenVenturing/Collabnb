import { View, Text } from "react-native";
import { BlurView } from "expo-blur";

export default function SpecialtiesSection({ specialties }) {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: "#192524",
          marginBottom: 12,
        }}
      >
        Specialties
      </Text>
      <BlurView
        intensity={22}
        tint="light"
        style={{
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.35)",
          backgroundColor: "rgba(255, 255, 255, 0.28)",
          shadowColor: "#192524",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {specialties.map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: "#D1EBDB",
              }}
            >
              <Text
                style={{ color: "#192524", fontSize: 13, fontWeight: "500" }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </BlurView>
    </View>
  );
}
