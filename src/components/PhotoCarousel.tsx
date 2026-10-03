import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing } from '../theme/colors';

interface Props {
  images: { id: string; image_url: string }[];
  // Ширина карусели; по умолчанию — вся ширина экрана.
  width?: number;
  onPress?: () => void;
}

// Несколько фото публикации: листаются пальцем, под ними точки-индикаторы.
export function PhotoCarousel({ images, width, onPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const size = width ?? screenWidth;
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <Pressable onPress={onPress}>
        <Image source={{ uri: images[0].image_url }} style={[styles.image, { width: size, height: size }]} contentFit="cover" />
      </Pressable>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / size))}
      >
        {images.map((img) => (
          <Pressable key={img.id} onPress={onPress}>
            <Image source={{ uri: img.image_url }} style={[styles.image, { width: size, height: size }]} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {images.map((img, i) => (
          <View key={img.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.text },
});
