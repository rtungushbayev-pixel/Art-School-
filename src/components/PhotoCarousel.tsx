import React, { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, spacing } from '../theme/colors';
import { FullscreenPhotos } from './FullscreenPhotos';

interface Props {
  images: { id: string; image_url: string }[];
  // Ширина карусели; по умолчанию — вся ширина экрана.
  width?: number;
  // Двойное нажатие на фото (лайк). Одиночное по-прежнему открывает фото на весь экран.
  onDoubleTap?: () => void;
}

// Несколько фото публикации: листаются пальцем, под ними точки-индикаторы.
// Нажатие на фото открывает его на весь экран.
export function PhotoCarousel({ images, width, onDoubleTap }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const size = width ?? screenWidth;
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const lastTap = useRef(0);
  const singleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heart = useRef(new Animated.Value(0)).current;

  // Без двойного нажатия — фото открывается сразу; с ним — ждём второе нажатие.
  const onTap = (i: number) => {
    if (!onDoubleTap) {
      setFullscreen(i);
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (singleTimer.current) clearTimeout(singleTimer.current);
      onDoubleTap();
      heart.setValue(0);
      Animated.sequence([
        Animated.spring(heart, { toValue: 1, useNativeDriver: true, friction: 4 }),
        Animated.timing(heart, { toValue: 0, duration: 250, delay: 350, useNativeDriver: true }),
      ]).start();
      return;
    }
    lastTap.current = now;
    singleTimer.current = setTimeout(() => setFullscreen(i), 280);
  };

  const heartOverlay = onDoubleTap ? (
    <Animated.View
      pointerEvents="none"
      style={[styles.heart, { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}
    >
      <Ionicons name="heart" size={96} color={colors.white} />
    </Animated.View>
  ) : null;

  if (images.length === 0) return null;

  const viewer = (
    <FullscreenPhotos
      images={images}
      startIndex={fullscreen ?? 0}
      visible={fullscreen !== null}
      onClose={() => setFullscreen(null)}
    />
  );

  if (images.length === 1) {
    return (
      <>
        <Pressable onPress={() => onTap(0)}>
          <Image source={{ uri: images[0].image_url }} style={[styles.image, { width: size, height: size }]} contentFit="cover" />
          {heartOverlay}
        </Pressable>
        {viewer}
      </>
    );
  }

  return (
    <View>
      {viewer}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / size))}
      >
        {images.map((img, i) => (
          <Pressable key={img.id} onPress={() => onTap(i)}>
            <Image source={{ uri: img.image_url }} style={[styles.image, { width: size, height: size }]} contentFit="cover" />
            {heartOverlay}
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
  heart: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.text },
});
