import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft, Archive, Star } from "lucide-react-native";
import MessagingStore from "@/utils/MessagingStore";

export default function ArchivedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    loadThreads();

    const unsubscribe = MessagingStore.subscribe(() => {
      loadThreads();
    });

    return unsubscribe;
  }, []);

  const loadThreads = () => {
    const data = MessagingStore.getArchivedThreads();
    setThreads(data);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const renderThread = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/messages/${item.id}`)}
      style={{
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#D0D5CE",
      }}
    >
      {/* Avatar */}
      <View style={{ position: "relative", marginRight: 12 }}>
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
      </View>

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
                fontWeight: "600",
                color: "#192524",
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {item.listingTitle}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
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
          <Text
            style={{
              fontSize: 12,
              color: "#959D90",
              marginTop: 2,
            }}
          >
            {formatTime(item.lastMessageAt)}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            color: "#3C5759",
            marginTop: 2,
          }}
        >
          {item.lastMessageText}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        paddingTop: insets.top,
      }}
    >
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
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#192524" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#192524" }}>
          Archived
        </Text>
      </View>

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
          <Archive color="#D0D5CE" size={64} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: "#192524",
              marginTop: 20,
            }}
          >
            No archived messages
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Archived conversations will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}
