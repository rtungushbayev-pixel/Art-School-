import React from 'react';
import { StyleSheet, View } from 'react-native';
import { paintPalette } from '../theme/colors';

// Декоративный ряд «капель краски» — фирменный, но ненавязчивый акцент
// для экранов входа/регистрации и заголовков.
export function PaintDots() {
  return (
    <View style={styles.row}>
      {paintPalette.map((color) => (
        <View key={color} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
