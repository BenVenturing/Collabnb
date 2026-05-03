import { View, ImageBackground, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

/**
 * HostGlassSheet - Reusable frosted glass container for host screens
 * Matches the Collabnb HAZY aesthetic with liquid glass effect
 */
export default function HostGlassSheet({ children, backgroundImage }) {
  return (
    <View style={styles.container}>
      {/* Background Layer — only render if a custom backgroundImage is passed */}
      {backgroundImage && (
        <ImageBackground
          source={backgroundImage}
          style={StyleSheet.absoluteFill}
          blurRadius={20}
        />
      )}

      {/* Frosted Glass Sheet */}
      <View style={styles.glassContainer}>
        <BlurView intensity={85} tint="light" style={styles.blurView}>
          <View style={styles.contentWrapper}>{children}</View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  glassContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  blurView: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#192524",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  contentWrapper: {
    padding: 28,
    minHeight: 400,
  },
});
