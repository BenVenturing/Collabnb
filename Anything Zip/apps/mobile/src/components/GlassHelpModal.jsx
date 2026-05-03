import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";

export default function GlassHelpModal({ visible, onClose, title, data }) {
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
          backgroundColor: "rgba(25, 37, 36, 0.6)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "70%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(208, 213, 206, 0.5)",
              borderBottomWidth: 0,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#EFECE9",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#192524",
                }}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EFECE9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color="#3C5759" size={18} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {data.map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    marginBottom: idx === data.length - 1 ? 0 : 16,
                    padding: 16,
                    backgroundColor: "rgba(239, 236, 233, 0.5)",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(208, 213, 206, 0.5)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#192524",
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#3C5759",
                      lineHeight: 20,
                    }}
                  >
                    {item.description}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}
