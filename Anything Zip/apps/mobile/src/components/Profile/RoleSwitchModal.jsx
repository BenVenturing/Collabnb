import { View, Text, TouchableOpacity, Modal } from "react-native";

export default function RoleSwitchModal({
  visible,
  onClose,
  pendingTargetRole,
  onStartOnboarding,
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.8)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 400,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            You're not set up as a{" "}
            {pendingTargetRole === "host" ? "Host" : "Creator"} yet
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              lineHeight: 22,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            To switch, you'll need to complete a quick onboarding.
          </Text>

          <TouchableOpacity
            onPress={onStartOnboarding}
            style={{
              backgroundColor: "#3C5759",
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Start {pendingTargetRole === "host" ? "Host" : "Creator"} setup
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#3C5759", fontSize: 15 }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
