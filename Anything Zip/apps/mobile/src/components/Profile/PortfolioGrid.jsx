import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

export default function PortfolioGrid({ portfolioItems }) {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: "#192524",
          marginBottom: 12,
        }}
      >
        Portfolio
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {portfolioItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={{
              width: (width - 56) / 3,
              height: (width - 56) / 3,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
            }}
          >
            <Image
              source={{ uri: item.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
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
  );
}
