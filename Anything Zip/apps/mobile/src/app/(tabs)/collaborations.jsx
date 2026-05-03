// Creator V1 screen (namespaced to avoid host collisions)

import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Calendar,
  MapPin,
  User,
  Clock,
  ChevronRight,
  Edit2,
  X,
  Trash2,
  Archive,
} from "lucide-react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { getApplications } from "@/utils/ApplicationStore";
import ThemedBackground from "@/components/ThemedBackground";

export default function CreatorCollaborationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("active"); // 'active' or 'archived'
  const [applications, setApplications] = useState([]);
  const [editingCollab, setEditingCollab] = useState(null);

  useEffect(() => {
    const load = async () => {
      const apps = await getApplications();
      setApplications(apps);
    };
    load();
  }, []);

  const [collaborations, setCollaborations] = useState([
    {
      id: 1,
      propertyName: "Glacier Prime Cabin",
      location: "Lake Tahoe, CA",
      hostName: "Sarah Mitchell",
      image:
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400",
      status: "pending",
      statusText: "Pending Upload",
      dates: "Feb 15-18, 2026",
      deliverables: "3 Reels, 5 Photos",
      daysLeft: 12,
      isActive: true,
      listingId: "1",
    },
    {
      id: 2,
      propertyName: "Tranquil Waterfront Retreat",
      location: "Malibu, CA",
      hostName: "David Chen",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      status: "uploaded",
      statusText: "Uploaded & Tagged (AI)",
      dates: "Jan 28-31, 2026",
      deliverables: "2 Reels, 8 Photos",
      daysLeft: null,
      isActive: true,
      listingId: "2",
    },
    {
      id: 3,
      propertyName: "Desert Oasis Villa",
      location: "Joshua Tree, CA",
      hostName: "Emma Rodriguez",
      image:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400",
      status: "approved",
      statusText: "Approved - Payment Released",
      dates: "Jan 10-13, 2026",
      deliverables: "4 Reels, 10 Photos",
      payment: "$850",
      isActive: true,
      listingId: "3",
    },
    {
      id: 4,
      propertyName: "Mountain Lodge Escape",
      location: "Aspen, CO",
      hostName: "Michael Park",
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
      status: "approved",
      statusText: "Completed",
      dates: "Dec 20-24, 2025",
      deliverables: "5 Reels, 12 Photos",
      payment: "$1,200",
      isActive: false,
      listingId: "4",
    },
  ]);

  const filteredCollabs = collaborations.filter((collab) =>
    activeFilter === "active" ? collab.isActive : !collab.isActive,
  );

  const getStatusColor = (status) => {
    return "#D1EBDB";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "🟡";
      case "uploaded":
        return "🔵";
      case "approved":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "pending":
        return {
          backgroundColor: "rgba(212,168,67,0.15)",
          color: "#D4A843",
          text: "Pending",
        };
      case "accepted":
        return {
          backgroundColor: "rgba(74,155,127,0.15)",
          color: "#4A9B7F",
          text: "Accepted",
        };
      case "declined":
        return {
          backgroundColor: "rgba(200,104,104,0.12)",
          color: "#C86868",
          text: "Declined",
        };
      default:
        return {
          backgroundColor: "rgba(212,168,67,0.15)",
          color: "#D4A843",
          text: "Pending",
        };
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleUpdateStatus = (collabId, newStatus) => {
    setCollaborations((prev) =>
      prev.map((c) => {
        if (c.id === collabId) {
          let statusText = "Unknown";
          if (newStatus === "pending") statusText = "Pending Upload";
          if (newStatus === "uploaded") statusText = "Uploaded & Tagged (AI)";
          if (newStatus === "approved")
            statusText = "Approved - Payment Released";
          return { ...c, status: newStatus, statusText };
        }
        return c;
      }),
    );
    setEditingCollab(null);
  };

  const handleArchiveCollab = (collabId) => {
    setCollaborations((prev) =>
      prev.map((c) => (c.id === collabId ? { ...c, isActive: false } : c)),
    );
    setEditingCollab(null);
  };

  const handleDeleteCollab = (collabId) => {
    setCollaborations((prev) => prev.filter((c) => c.id !== collabId));
    setEditingCollab(null);
  };

  return (
    <ThemedBackground>
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: "rgba(255,255,255,0.55)",
            borderBottomWidth: 1,
            borderBottomColor: "#D0D5CE",
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 16,
            }}
          >
            Collaborations
          </Text>

          {/* Filter Toggle */}
          <View
            style={{
              backgroundColor: "#EFECE9",
              borderRadius: 12,
              padding: 4,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveFilter("active")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor:
                  activeFilter === "active" ? "#fff" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: activeFilter === "active" ? "#192524" : "#3C5759",
                }}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveFilter("archived")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor:
                  activeFilter === "archived" ? "#fff" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: activeFilter === "archived" ? "#192524" : "#3C5759",
                }}
              >
                Archived
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Collaborations List */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 80,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Applications from ApplicationStore */}
          {applications.length > 0 &&
            applications.map((app) => {
              const statusStyle = getStatusBadgeStyle(app.status);
              return (
                <TouchableOpacity
                  key={app.id}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.55)",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.75)",
                    padding: 14,
                    marginBottom: 12,
                    shadowColor: "#3C5759",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                    marginHorizontal: 20,
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/listing-detail",
                      params: { id: app.listingId },
                    })
                  }
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 8 }}>🏡</Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: "#192524",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {app.listingTitle}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: statusStyle.backgroundColor,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: statusStyle.color,
                        }}
                      >
                        {statusStyle.text}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14, marginRight: 6 }}>📍</Text>
                    <Text style={{ fontSize: 13, color: "#3C5759" }}>
                      {app.listingLocation}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14, marginRight: 6 }}>💰</Text>
                    <Text style={{ fontSize: 13, color: "#3C5759" }}>
                      {app.compensation}
                    </Text>
                  </View>

                  {app.isCounter && (
                    <View
                      style={{
                        backgroundColor: "rgba(212,168,67,0.15)",
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: "rgba(212,168,67,0.3)",
                        alignSelf: "flex-start",
                        marginTop: 4,
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: "#D4A843",
                        }}
                      >
                        🔄 Counter
                      </Text>
                    </View>
                  )}

                  <Text
                    style={{ fontSize: 12, color: "#959D90", marginTop: 4 }}
                  >
                    Submitted {formatDate(app.submittedAt)}
                  </Text>
                </TouchableOpacity>
              );
            })}

          {/* Empty State for Applications */}
          {applications.length === 0 && (
            <View
              style={{
                alignItems: "center",
                paddingTop: 40,
                paddingHorizontal: 40,
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 12 }}>✦</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 6,
                }}
              >
                No collabs yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#959D90",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Apply to a stay to get started
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#3C5759",
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 20,
                }}
                onPress={() => router.push("/(tabs)")}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}
                >
                  Discover Stays
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Existing Collaborations */}
          {filteredCollabs.length === 0 && applications.length > 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 60,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: "#959D90" }}
              >
                No {activeFilter} collaborations
              </Text>
            </View>
          ) : (
            filteredCollabs.map((collab) => (
              <View
                key={collab.id}
                style={{
                  backgroundColor: "#fff",
                  marginHorizontal: 20,
                  marginBottom: 16,
                  borderRadius: 16,
                  overflow: "hidden",
                  shadowColor: "#192524",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/listing-detail",
                      params: { id: collab.listingId || collab.id },
                    })
                  }
                  activeOpacity={0.7}
                >
                  {/* Property Image */}
                  <View style={{ flexDirection: "row" }}>
                    <Image
                      source={{ uri: collab.image }}
                      style={{ width: 120, height: 120 }}
                      contentFit="cover"
                      transition={200}
                    />

                    {/* Collaboration Details */}
                    <View
                      style={{ flex: 1, padding: 12, position: "relative" }}
                    >
                      {/* Edit Icon */}
                      <TouchableOpacity
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "rgba(255,255,255,0.95)",
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          zIndex: 10,
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          setEditingCollab(collab);
                        }}
                      >
                        <Edit2 color="#3C5759" size={16} />
                      </TouchableOpacity>

                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: "#192524",
                          marginBottom: 4,
                          paddingRight: 32,
                        }}
                      >
                        {collab.propertyName}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <MapPin color="#3C5759" size={12} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#3C5759",
                            marginLeft: 4,
                          }}
                        >
                          {collab.location}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <User color="#3C5759" size={12} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#3C5759",
                            marginLeft: 4,
                          }}
                        >
                          Host: {collab.hostName}
                        </Text>
                      </View>

                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Calendar color="#3C5759" size={12} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#3C5759",
                            marginLeft: 4,
                          }}
                        >
                          {collab.dates}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Status Badge & Details */}
                  <View
                    style={{
                      padding: 12,
                      borderTopWidth: 1,
                      borderTopColor: "#EFECE9",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#D1EBDB",
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>
                          {getStatusIcon(collab.status)}
                        </Text>
                        <Text
                          style={{
                            color: "#192524",
                            fontSize: 12,
                            fontWeight: "600",
                            marginLeft: 6,
                          }}
                        >
                          {collab.statusText}
                        </Text>
                      </View>

                      <ChevronRight color="#959D90" size={20} />
                    </View>

                    <View
                      style={{
                        marginTop: 12,
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#959D90",
                            marginBottom: 2,
                          }}
                        >
                          Deliverables
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#192524",
                          }}
                        >
                          {collab.deliverables}
                        </Text>
                      </View>

                      {collab.daysLeft && (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#959D90",
                              marginBottom: 2,
                            }}
                          >
                            Due in
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: "#3C5759",
                            }}
                          >
                            {collab.daysLeft} days
                          </Text>
                        </View>
                      )}

                      {collab.payment && (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#959D90",
                              marginBottom: 2,
                            }}
                          >
                            Payment
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: "#3C5759",
                            }}
                          >
                            {collab.payment}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Edit Collab Modal */}
        <Modal
          visible={!!editingCollab}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingCollab(null)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
            activeOpacity={1}
            onPress={() => setEditingCollab(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingBottom: insets.bottom + 20,
                  paddingTop: 20,
                  paddingHorizontal: 20,
                }}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: "#192524",
                    }}
                  >
                    Edit Collaboration
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingCollab(null)}
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

                {editingCollab && (
                  <>
                    {/* Property Name */}
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#192524",
                        marginBottom: 16,
                      }}
                    >
                      {editingCollab.propertyName}
                    </Text>

                    {/* Status Options */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#959D90",
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                      }}
                    >
                      Update Status
                    </Text>
                    <View style={{ marginBottom: 20 }}>
                      {[
                        {
                          status: "pending",
                          label: "Pending Upload",
                          icon: "🟡",
                        },
                        {
                          status: "uploaded",
                          label: "Uploaded & Tagged",
                          icon: "🔵",
                        },
                        {
                          status: "approved",
                          label: "Approved - Payment Released",
                          icon: "🟢",
                        },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.status}
                          style={{
                            backgroundColor:
                              editingCollab.status === option.status
                                ? "rgba(209,235,219,0.5)"
                                : "rgba(255,255,255,0.55)",
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor:
                              editingCollab.status === option.status
                                ? "#3C5759"
                                : "#D0D5CE",
                            padding: 14,
                            marginBottom: 8,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                          onPress={() =>
                            handleUpdateStatus(editingCollab.id, option.status)
                          }
                        >
                          <Text style={{ fontSize: 16, marginRight: 10 }}>
                            {option.icon}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#192524",
                              flex: 1,
                            }}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Archive & Delete Actions */}
                    <View style={{ gap: 10 }}>
                      {editingCollab.isActive && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: "rgba(255,255,255,0.55)",
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#D0D5CE",
                            padding: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onPress={() => handleArchiveCollab(editingCollab.id)}
                        >
                          <Archive color="#3C5759" size={18} />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#3C5759",
                              marginLeft: 8,
                            }}
                          >
                            Archive Collaboration
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={{
                          backgroundColor: "rgba(200,104,104,0.12)",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "rgba(200,104,104,0.3)",
                          padding: 14,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => handleDeleteCollab(editingCollab.id)}
                      >
                        <Trash2 color="#C86868" size={18} />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#C86868",
                            marginLeft: 8,
                          }}
                        >
                          Delete Collaboration
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </ThemedBackground>
  );
}
