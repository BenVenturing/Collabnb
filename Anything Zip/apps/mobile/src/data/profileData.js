import { Instagram, Camera, Youtube, Globe } from "lucide-react-native";

export const portfolioItems = [
  {
    id: 1,
    uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    type: "image",
  },
  {
    id: 2,
    uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400",
    type: "image",
  },
  {
    id: 3,
    uri: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400",
    type: "video",
  },
  {
    id: 4,
    uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
    type: "image",
  },
  {
    id: 5,
    uri: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
    type: "image",
  },
  {
    id: 6,
    uri: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400",
    type: "image",
  },
];

export const socialLinks = [
  {
    platform: "Instagram",
    username: "@ben.venturing",
    url: "https://instagram.com/ben.venturing",
    icon: Instagram,
    color: "#3C5759",
  },
  {
    platform: "TikTok",
    username: "@ben.venturing",
    url: "https://tiktok.com/@ben.venturing",
    icon: Camera,
    color: "#3C5759",
  },
  {
    platform: "YouTube",
    username: "@ben.venturing",
    url: "https://youtube.com/@ben.venturing",
    icon: Youtube,
    color: "#3C5759",
  },
];

export const personalLink = {
  title: "My Link-in-Bio",
  url: "https://beacons.ai/benventuring",
  icon: Globe,
};

export const specialties = [
  "Luxury Travel",
  "Adventure",
  "Food & Dining",
  "Wellness",
  "Photography",
];
