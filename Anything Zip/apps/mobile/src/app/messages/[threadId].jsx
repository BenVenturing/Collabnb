import { useState, useEffect, useRef } from "react";
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
import { Image } from "expo-image";
import { ArrowLeft, Send, MoreVertical } from "lucide-react-native";
import MessagingStore from "@/utils/MessagingStore";
import ConversationDetailsSheet from "@/components/ConversationDetailsSheet";

export default function ThreadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { threadId } = useLocalSearchParams();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadThread();
    MessagingStore.markAsRead(threadId);

    const unsubscribe = MessagingStore.subscribe(() => {
      loadThread();
    });

    return unsubscribe;
  }, [threadId]);

  const loadThread = () => {
    const t = MessagingStore.getThread(threadId);
    const m = MessagingStore.getMessages(threadId);
    setThread(t);
    setMessages(m);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    await MessagingStore.sendMessage(threadId, messageText);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }) => {
    const isCreator = item.senderRole === "creator";
    const isSystem = item.senderRole === "system";

    if (isSystem) {
      return (
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#EFECE9",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#3C5759",
                textAlign: "center",
              }}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 4,
          flexDirection: "row",
          justifyContent: isCreator ? "flex-end" : "flex-start",
        }}
      >
        {!isCreator && (
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
              source={{ uri: thread?.hostAvatarUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        )}

        <View style={{ maxWidth: "75%" }}>
          <View
            style={{
              borderRadius: 20,
              borderBottomLeftRadius: isCreator ? 20 : 4,
              borderBottomRightRadius: isCreator ? 4 : 20,
              padding: 12,
              paddingHorizontal: 16,
              backgroundColor: isCreator ? "#D1EBDB" : "#EFECE9",
            }}
          >
            <Text style={{ fontSize: 15, color: "#192524", lineHeight: 20 }}>
              {item.text}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 11,
              color: "#959D90",
              marginTop: 4,
              marginLeft: isCreator ? 0 : 8,
              marginRight: isCreator ? 8 : 0,
              textAlign: isCreator ? "right" : "left",
            }}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (!thread) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center" }}
      >
        <Text style={{ textAlign: "center", color: "#3C5759" }}>
          Thread not found
        </Text>
      </View>
    );
  }

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
            source={{ uri: thread.hostAvatarUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}
            numberOfLines={1}
          >
            {thread.listingTitle}
          </Text>
          <Text style={{ fontSize: 13, color: "#3C5759" }} numberOfLines={1}>
            {thread.hostName}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowDetails(true)}
          style={{ padding: 4 }}
        >
          <MoreVertical color="#192524" size={24} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
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
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
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

      {/* Details Sheet */}
      {showDetails && (
        <ConversationDetailsSheet
          threadId={threadId}
          thread={thread}
          onClose={() => setShowDetails(false)}
          onMarkUnread={async () => {
            await MessagingStore.markAsUnread(threadId);
            setShowDetails(false);
            router.back();
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}
