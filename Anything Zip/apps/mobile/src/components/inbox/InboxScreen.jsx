import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Search, Settings, MessageCircle, Star, X } from "lucide-react-native";
import MessagingStore from "@/utils/MessagingStore";

const FILTERS = ["All", "Applications", "Collabs", "Pitches"];

/**
 * SharedInboxScreen - Reusable inbox UI for both Creators and Hosts
 * @param {Object} props
 * @param {"creator" | "host"} props.viewAs - Determines header title and minor UI tweaks
 */
export default function SharedInboxScreen({ viewAs = "creator" }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [draggingThreadId, setDraggingThreadId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await MessagingStore.init();
      loadThreads();
      setIsLoading(false);
    };
    loadData();
    const unsubscribe = MessagingStore.subscribe(() => loadThreads());
    return unsubscribe;
  }, [filter, searchQuery]);

  const loadThreads = () => {
    const data = MessagingStore.searchThreads(searchQuery, filter);
    setThreads(data);
  };

  const handleMoveThread = async (threadId, category) => {
    setDraggingThreadId(null);
    try {
      const key = `@collabnb_thread_category_${threadId}`;
      await AsyncStorage.setItem(key, category);
      Alert.alert("Moved", `Conversation moved to ${category}`);
    } catch (e) {
      console.error("Failed to move thread:", e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusLabel = (status) => {
    if (status === "application") return "Application";
    if (status === "collab") return "Collab";
    if (status === "pitch") return "Pitch";
    return "";
  };

  const getStatusColor = (status) => {
    if (status === "application") return "#3C5759";
    if (status === "collab") return "#6B9080";
    if (status === "pitch") return "#E07A5F";
    return "#959D90";
  };

  const handleAvatarPress = (item) => {
    if (viewAs === "host") {
      router.push({
        pathname: "/(tabs)/profile",
        params: { id: item.participantId || item.id },
      });
    } else {
      router.push({
        pathname: "/listing-detail",
        params: { id: item.listingId || "l1", isHost: "false" },
      });
    }
  };

  const renderThread = ({ item }) => {
    const isDragging = draggingThreadId === item.id;
    return (
      <Animated.View
        style={[
          {
            flexDirection: "row",
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#D0D5CE",
          },
          isDragging && {
            transform: [{ scale: 1.02 }],
            shadowColor: "#3C5759",
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push(`/messages/${item.id}`)}
          onLongPress={() => {
            setDraggingThreadId(item.id);
            Alert.alert(
              "Move Conversation",
              "Where would you like to move this conversation?",
              [
                {
                  text: "Applications",
                  onPress: () => handleMoveThread(item.id, "applications"),
                },
                {
                  text: "Collabs",
                  onPress: () => handleMoveThread(item.id, "collabs"),
                },
                {
                  text: "Pitches",
                  onPress: () => handleMoveThread(item.id, "pitches"),
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => setDraggingThreadId(null),
                },
              ],
            );
          }}
          delayLongPress={400}
          activeOpacity={0.7}
          style={{ flex: 1, flexDirection: "row" }}
        >
          {/* Tappable Avatar */}
          <TouchableOpacity
            onPress={() => handleAvatarPress(item)}
            activeOpacity={0.8}
            style={{ position: "relative", marginRight: 12 }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: item.hostAvatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            </View>
            {item.unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#3C5759",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}
                >
                  {item.unreadCount}
                </Text>
              </View>
            )}
            {item.isStarred && (
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#F5D547",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              >
                <Star color="#192524" fill="#192524" size={10} />
              </View>
            )}
          </TouchableOpacity>

          {/* Content */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: item.unreadCount > 0 ? "700" : "600",
                    color: "#192524",
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  {item.listingTitle}
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                      backgroundColor: getStatusColor(item.status) + "20",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: getStatusColor(item.status),
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: "#959D90" }}>
                {formatTime(item.lastMessageAt)}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                color: item.unreadCount > 0 ? "#192524" : "#3C5759",
                fontWeight: item.unreadCount > 0 ? "500" : "400",
                marginTop: 2,
              }}
            >
              {item.hostName ? `${item.hostName}: ` : ""}
              {item.lastMessageText}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}
      >
        <StatusBar style="dark" />
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 16, color: "#3C5759" }}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Determine title based on viewAs prop
  const headerTitle = viewAs === "host" ? "Inbox" : "Messages";
  const emptyStateText =
    viewAs === "host"
      ? "Start chatting with creators about collaborations"
      : "Start chatting with hosts about collaborations";

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        {showSearch ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#EFECE9",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Search color="#959D90" size={18} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages..."
                placeholderTextColor="#959D90"
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#192524",
                  marginLeft: 8,
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X color="#959D90" size={18} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            >
              <Text style={{ fontSize: 15, color: "#3C5759" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ fontSize: 28, fontWeight: "700", color: "#192524" }}
              >
                {headerTitle}
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity onPress={() => setShowSearch(true)}>
                  <Search color="#192524" size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowSettings(!showSettings)}
                >
                  <Settings color="#192524" size={24} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter chips */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor:
                      activeFilter === f ? "#3C5759" : "rgba(255,255,255,0.5)",
                    borderWidth: 1,
                    borderColor:
                      activeFilter === f ? "#3C5759" : "rgba(60,87,89,0.15)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: activeFilter === f ? "#EFECE9" : "#3C5759",
                    }}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Settings Menu */}
      {showSettings && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 10,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: insets.top + 70,
              right: 20,
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 8,
              minWidth: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                router.push("/messages/archived");
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 15, color: "#192524" }}>Archived</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                alert("Feedback feature coming soon");
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 15, color: "#192524" }}>
                Give feedback
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Thread List */}
      {threads.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <MessageCircle color="#D0D5CE" size={64} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: "#192524",
              marginTop: 20,
            }}
          >
            {searchQuery ? "No matches found" : "No messages yet"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {searchQuery ? "Try a different search term" : emptyStateText}
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}
        />
      )}
    </View>
  );
}
