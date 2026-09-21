import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colorFromSeed, colors } from '../theme/colors';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const initials = (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimensionStyle]} />;
  }

  const backgroundColor = colorFromSeed(name?.trim() || '?');

  return (
    <View style={[styles.fallback, dimensionStyle, { backgroundColor }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.white, fontWeight: '700' },
});
