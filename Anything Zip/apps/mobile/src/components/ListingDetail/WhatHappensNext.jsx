import { View, Text } from "react-native";

const STEPS = [
  {
    step: "1",
    title: "Apply & Pitch",
    desc: "Submit your application with portfolio samples",
  },
  {
    step: "2",
    title: "Confirm Terms",
    desc: "Host reviews and confirms collaboration details",
  },
  {
    step: "3",
    title: "Deliver & Get Paid",
    desc: "Complete deliverables and receive compensation",
  },
];

export function WhatHappensNext() {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#192524",
          marginBottom: 16,
        }}
      >
        What happens next
      </Text>
      <View style={{ gap: 20 }}>
        {STEPS.map((item) => (
          <View key={item.step} style={{ flexDirection: "row", gap: 16 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#3C5759",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                {item.step}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
