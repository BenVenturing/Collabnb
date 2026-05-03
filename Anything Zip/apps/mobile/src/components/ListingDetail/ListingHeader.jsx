import { View, TouchableOpacity, Text } from "react-native";
import { ChevronLeft } from "lucide-react-native";

export function ListingHeader({ onBack, topInset, isHost, onEdit }) {
  return (
    <View
      style={{
        position: "absolute",
        top: topInset + 12,
        left: 20,
        right: 20,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.95)",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <ChevronLeft color="#192524" size={24} />
      </TouchableOpacity>

      {isHost && onEdit && (
        <TouchableOpacity
          onPress={onEdit}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: "rgba(60,87,89,0.95)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
            Edit
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
