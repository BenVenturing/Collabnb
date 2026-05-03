import { View, Text } from "react-native";
import { MapPin } from "lucide-react-native";

export function ListingTitle({ title, city, country }) {
  return (
    <View style={{ marginTop: 16, marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 26,
          fontWeight: "700",
          color: "#192524",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MapPin color="#3C5759" size={16} />
        <Text style={{ fontSize: 15, color: "#3C5759" }}>
          {city}, {country}
        </Text>
      </View>
    </View>
  );
}
