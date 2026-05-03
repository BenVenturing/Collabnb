import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  Users,
  User,
} from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";

export default function HostTabLayout() {
  return (
    <ThemedBackground style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderColor: "#D0D5CE",
            paddingTop: 4,
          },
          tabBarActiveTintColor: "#192524",
          tabBarInactiveTintColor: "#959D90",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="proposals"
          options={{
            title: "Proposals",
            tabBarIcon: ({ color, size }) => (
              <FileText color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="creators"
          options={{
            title: "Creators",
            tabBarIcon: ({ color, size }) => <Users color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
          }}
        />
      </Tabs>
    </ThemedBackground>
  );
}
