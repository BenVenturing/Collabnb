import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { X, Star, Archive, Mail, AlertCircle } from "lucide-react-native";
import { useState } from "react";
import MessagingStore from "@/utils/MessagingStore";

export default function ConversationDetailsSheet({
  threadId,
  thread,
  onClose,
  onMarkUnread,
}) {
  const insets = useSafeAreaInsets();
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");

  const handleToggleStar = async () => {
    await MessagingStore.toggleStar(threadId);
  };

  const handleToggleArchive = async () => {
    await MessagingStore.toggleArchive(threadId);
    onClose();
  };

  const handleSubmitHelp = () => {
    if (!helpSubject.trim() || !helpMessage.trim()) {
      Alert.alert("Error", "Please fill in both subject and message");
      return;
    }

    // TODO: Store locally or send to support system
    Alert.alert(
      "Help Request Submitted",
      "We'll get back to you soon. Check your email for updates.",
      [
        {
          text: "OK",
          onPress: () => {
            setShowHelpForm(false);
            setHelpSubject("");
            setHelpMessage("");
            onClose();
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onClose}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 100,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom,
          maxHeight: "80%",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#D0D5CE",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
            {showHelpForm ? "Help Center Request" : "Details"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#192524" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {showHelpForm ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: "#3C5759",
                  marginBottom: 16,
                }}
              >
                Describe your issue and we'll help resolve it.
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 8,
                }}
              >
                Subject
              </Text>
              <TextInput
                value={helpSubject}
                onChangeText={setHelpSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor="#959D90"
                style={{
                  backgroundColor: "#EFECE9",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#192524",
                  marginBottom: 16,
                }}
              />

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 8,
                }}
              >
                Message
              </Text>
              <TextInput
                value={helpMessage}
                onChangeText={setHelpMessage}
                placeholder="Provide details about your issue..."
                placeholderTextColor="#959D90"
                multiline
                maxLength={500}
                style={{
                  backgroundColor: "#EFECE9",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#192524",
                  height: 120,
                  textAlignVertical: "top",
                  marginBottom: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: "#959D90",
                  textAlign: "right",
                  marginBottom: 20,
                }}
              >
                {helpMessage.length}/500
              </Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowHelpForm(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: "#EFECE9",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#192524",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitHelp}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: "#3C5759",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}
                  >
                    Submit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Participants */}
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#959D90",
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  In this conversation
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={{ uri: thread.hostAvatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#192524",
                      }}
                    >
                      {thread.hostName}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#3C5759" }}>Host</Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "#3C5759",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}
                    >
                      You
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#192524",
                      }}
                    >
                      You
                    </Text>
                    <Text style={{ fontSize: 13, color: "#3C5759" }}>
                      Creator
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 24,
                  gap: 0,
                }}
              >
                <TouchableOpacity
                  onPress={onMarkUnread}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#D0D5CE",
                  }}
                >
                  <Mail color="#192524" size={22} />
                  <Text style={{ fontSize: 15, color: "#192524", flex: 1 }}>
                    Mark as unread
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleStar}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#D0D5CE",
                  }}
                >
                  <Star
                    color={thread.isStarred ? "#F5D547" : "#192524"}
                    fill={thread.isStarred ? "#F5D547" : "transparent"}
                    size={22}
                  />
                  <Text style={{ fontSize: 15, color: "#192524", flex: 1 }}>
                    {thread.isStarred ? "Unstar" : "Star"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleArchive}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#D0D5CE",
                  }}
                >
                  <Archive color="#192524" size={22} />
                  <Text style={{ fontSize: 15, color: "#192524", flex: 1 }}>
                    {thread.isArchived ? "Unarchive" : "Archive"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowHelpForm(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    paddingVertical: 16,
                  }}
                >
                  <AlertCircle color="#192524" size={22} />
                  <Text style={{ fontSize: 15, color: "#192524", flex: 1 }}>
                    Help Center request
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
