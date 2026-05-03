import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  Search,
  Briefcase,
  MessageCircle,
  User,
  Heart,
} from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";

export default function TabLayout() {
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
          name="index"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => <Search color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="collaborations"
          options={{
            title: "Collabs",
            tabBarIcon: ({ color, size }) => (
              <Briefcase color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: "Saved",
            tabBarIcon: ({ color, size }) => <Heart color={color} size={22} />,
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
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="conversation"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile-edit"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ThemedBackground>
  );
}
