import { View, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Settings, Camera } from "lucide-react-native";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileHeader({ insets, onSettingsPress }) {
  const [profilePhotoUri, setProfilePhotoUri] = useState(
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  );

  useEffect(() => {
    loadProfilePhoto();
  }, []);

  const loadProfilePhoto = async () => {
    try {
      const savedUri = await AsyncStorage.getItem("@profile_photo_uri");
      if (savedUri) {
        setProfilePhotoUri(savedUri);
      }
    } catch (error) {
      console.error("Failed to load profile photo:", error);
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to change your profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfilePhotoUri(uri);
      try {
        await AsyncStorage.setItem("@profile_photo_uri", uri);
      } catch (error) {
        console.error("Failed to save profile photo:", error);
      }
    }
  };

  return (
    <LinearGradient
      colors={["#192524", "#3C5759"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height: 340 }}
    >
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={onSettingsPress}
            style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              borderRadius: 20,
              padding: 10,
            }}
          >
            <Settings color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              borderWidth: 5,
              borderColor: "#fff",
              overflow: "hidden",
              backgroundColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Image
              source={{ uri: profilePhotoUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
            <TouchableOpacity
              onPress={pickImage}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: "#3C5759",
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#fff",
              }}
              activeOpacity={0.8}
            >
              <Camera color="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
