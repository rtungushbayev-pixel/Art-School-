import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStrings } from '../i18n';
import { colors, spacing } from '../theme/colors';

const STRINGS = {
  ru: { close: 'Закрыть' },
  kk: { close: 'Жабу' },
  en: { close: 'Close' },
};

const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;

function distance(e: GestureResponderEvent): number {
  const [a, b] = e.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

// Одно фото на весь экран: два пальца — увеличить, двойное касание —
// увеличить/вернуть, при увеличении фото двигается пальцем.
function ZoomablePhoto({
  uri,
  width,
  height,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const state = useRef({ scale: 1, x: 0, y: 0, startDistance: 0, startScale: 1, lastTap: 0 });

  const apply = (nextScale: number, x: number, y: number, animated = false) => {
    const s = Math.min(MAX_SCALE, Math.max(1, nextScale));
    // Не даём увести фото за края.
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    const cx = Math.max(-maxX, Math.min(maxX, x));
    const cy = Math.max(-maxY, Math.min(maxY, y));
    state.current.scale = s;
    state.current.x = cx;
    state.current.y = cy;
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: s, useNativeDriver: true }),
        Animated.spring(translate, { toValue: { x: cx, y: cy }, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(s);
      translate.setValue({ x: cx, y: cy });
    }
    onZoomChange(s > 1.01);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Пока фото не увеличено, одним пальцем листаем галерею.
        onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2 || state.current.scale > 1.01,
        onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2 || state.current.scale > 1.01,
        onPanResponderGrant: (e) => {
          const st = state.current;
          if (e.nativeEvent.touches.length === 2) {
            st.startDistance = distance(e);
            st.startScale = st.scale;
          }
        },
        onPanResponderMove: (e, g) => {
          const st = state.current;
          if (e.nativeEvent.touches.length === 2) {
            if (!st.startDistance) {
              st.startDistance = distance(e);
              st.startScale = st.scale;
            }
            apply((st.startScale * distance(e)) / st.startDistance, st.x, st.y);
          } else if (st.scale > 1.01) {
            scale.setValue(st.scale);
            translate.setValue({ x: st.x + g.dx, y: st.y + g.dy });
          }
        },
        onPanResponderRelease: (_e, g) => {
          const st = state.current;
          if (st.startDistance) {
            st.startDistance = 0;
          } else if (st.scale > 1.01) {
            apply(st.scale, st.x + g.dx, st.y + g.dy);
          }
          if (st.scale < 1.05) apply(1, 0, 0, true);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height]
  );

  const onTap = () => {
    const now = Date.now();
    if (now - state.current.lastTap < DOUBLE_TAP_MS) {
      state.current.lastTap = 0;
      if (state.current.scale > 1.01) apply(1, 0, 0, true);
      else apply(2.5, 0, 0, true);
    } else {
      state.current.lastTap = now;
    }
  };

  return (
    <View style={{ width, height }} {...responder.panHandlers}>
      <Pressable onPress={onTap} style={StyleSheet.absoluteFill}>
        <Animated.View
          style={{
            width,
            height,
            transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }],
          }}
        >
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

interface Props {
  images: { id: string; image_url: string }[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}

// Фото публикации на весь экран: листаются пальцем, увеличиваются двумя пальцами.
export function FullscreenPhotos({ images, startIndex, visible, onClose }: Props) {
  const s = useStrings(STRINGS);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      setZoomed(false);
    }
  }, [visible, startIndex]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <FlatList
          data={images}
          keyExtractor={(img) => img.id}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={Math.min(startIndex, Math.max(images.length - 1, 0))}
          getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ZoomablePhoto uri={item.image_url} width={width} height={height} onZoomChange={setZoomed} />
          )}
        />
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel={s.close}
          style={[styles.close, { top: insets.top + spacing.sm }]}
        >
          <Ionicons name="close" size={30} color={colors.white} />
        </Pressable>
        {images.length > 1 ? (
          <Text style={[styles.counter, { bottom: insets.bottom + spacing.md }]}>
            {index + 1} / {images.length}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  counter: { position: 'absolute', alignSelf: 'center', color: colors.white, fontWeight: '600' },
});
