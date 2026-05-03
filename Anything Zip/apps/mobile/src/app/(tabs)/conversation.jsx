// Creator V1 screen (namespaced to avoid host collisions)

import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Image } from "expo-image";
import { ArrowLeft, Send } from "lucide-react-native";

export default function CreatorConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { conversationId, otherUserId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const currentUserId = 1; // Hardcoded for now

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/messages/list?conversationId=${conversationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages(data.messages);

      // Mark as read
      await fetch("/api/conversations/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: parseInt(conversationId),
          userId: currentUserId,
        }),
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: parseInt(conversationId),
          senderId: currentUserId,
          content: messageContent,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === currentUserId;

    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 4,
          flexDirection: "row",
          justifyContent: isMe ? "flex-end" : "flex-start",
        }}
      >
        {!isMe && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              overflow: "hidden",
              marginRight: 8,
              alignSelf: "flex-end",
            }}
          >
            <Image
              source={{ uri: `https://i.pravatar.cc/150?u=${otherUserId}` }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        )}

        <View
          style={{
            maxWidth: "75%",
            position: "relative",
          }}
        >
          {isMe ? (
            <View
              style={{
                borderRadius: 20,
                borderBottomRightRadius: 4,
                padding: 12,
                paddingHorizontal: 16,
                backgroundColor: "#D1EBDB",
              }}
            >
              <Text style={{ fontSize: 15, color: "#192524", lineHeight: 20 }}>
                {item.content}
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "#EFECE9",
                borderRadius: 20,
                borderBottomLeftRadius: 4,
                padding: 12,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 15, color: "#192524", lineHeight: 20 }}>
                {item.content}
              </Text>
            </View>
          )}

          <Text
            style={{
              fontSize: 11,
              color: "#959D90",
              marginTop: 4,
              marginLeft: isMe ? 0 : 16,
              marginRight: isMe ? 16 : 0,
              textAlign: isMe ? "right" : "left",
            }}
          >
            {new Date(item.sent_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {isMe && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              overflow: "hidden",
              marginLeft: 8,
              alignSelf: "flex-end",
            }}
          >
            <Image
              source={{ uri: `https://i.pravatar.cc/150?u=${currentUserId}` }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft color="#192524" size={24} />
        </TouchableOpacity>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            overflow: "hidden",
            marginLeft: 12,
            marginRight: 12,
          }}
        >
          <Image
            source={{ uri: `https://i.pravatar.cc/150?u=${otherUserId}` }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>

        <Text style={{ fontSize: 18, fontWeight: "600", color: "#192524" }}>
          User {otherUserId}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingVertical: 16,
          paddingBottom: 20,
        }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Input */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#D0D5CE",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#EFECE9",
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginRight: 8,
          }}
        >
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#959D90"
            style={{
              fontSize: 15,
              color: "#192524",
              maxHeight: 100,
            }}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
        </View>

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: newMessage.trim() ? "#3C5759" : "#D0D5CE",
          }}
        >
          <Send
            color={newMessage.trim() ? "#fff" : "#959D90"}
            size={20}
            fill={newMessage.trim() ? "#fff" : "transparent"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
