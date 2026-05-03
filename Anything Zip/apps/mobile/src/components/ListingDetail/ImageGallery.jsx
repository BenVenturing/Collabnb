import { View, ScrollView, Image } from "react-native";

export function ImageGallery({ images, currentIndex, onIndexChange }) {
  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x /
              e.nativeEvent.layoutMeasurement.width,
          );
          onIndexChange(index);
        }}
        scrollEventThrottle={16}
      >
        {images.map((img, idx) => (
          <Image
            key={idx}
            source={{ uri: img }}
            style={{ width: 400, height: 320 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 12,
            backgroundColor: "#fff",
          }}
        >
          {images.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: currentIndex === idx ? 24 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: currentIndex === idx ? "#3C5759" : "#D0D5CE",
              }}
            />
          ))}
        </View>
      )}
    </>
  );
}
