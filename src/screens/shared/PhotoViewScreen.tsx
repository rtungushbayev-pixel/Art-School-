import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../../theme/colors';
import type { ParentStackParamList } from '../../navigation/types';

export function PhotoViewScreen() {
  const route = useRoute<RouteProp<ParentStackParamList, 'PhotoView'>>();
  const { uri, caption } = route.params;
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} contentFit="contain" />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  image: { flex: 1 },
  caption: { color: colors.white, padding: spacing.md, textAlign: 'center' },
});
