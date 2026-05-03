import { View, Text } from "react-native";
import { Calendar, Clock } from "lucide-react-native";
import { formatDate, getLoadLabel } from "@/utils/listingHelpers";

export function DatesDeadlines({ listing }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#D0D5CE",
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#192524",
          marginBottom: 16,
        }}
      >
        Dates & Deadlines
      </Text>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Calendar color="#3C5759" size={20} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
              }}
            >
              Collaboration Window
            </Text>
            <Text style={{ fontSize: 14, color: "#3C5759" }}>
              {formatDate(listing.collaboration_window.startDate)} -{" "}
              {formatDate(listing.collaboration_window.endDate)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Clock color="#3C5759" size={20} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
              }}
            >
              Deliverables Due
            </Text>
            <Text style={{ fontSize: 14, color: "#3C5759" }}>
              {formatDate(listing.deliverables_due_date)} (
              {listing.turnaround_time_days} days after stay)
            </Text>
          </View>
        </View>
        <View
          style={{
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#EFECE9",
          }}
        >
          <Text style={{ fontSize: 13, color: "#3C5759" }}>
            This is a{" "}
            <Text style={{ fontWeight: "600" }}>
              {listing.deliverable_load} load
            </Text>{" "}
            collaboration. {getLoadLabel(listing.deliverable_load)}
          </Text>
        </View>
      </View>
    </View>
  );
}
