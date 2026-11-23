import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Stop } from 'react-native-svg';

// Гид раздела «История искусств» в виде «голограммы»: светящийся
// полупрозрачный художник в берете парит над тёмной подставкой.
// Пока гид говорит, у него двигается рот.

const HOLO = '#5FF2E6';

interface Props {
  size?: number;
  speaking?: boolean;
}

export function GuideAvatar({ size = 180, speaking = false }: Props) {
  const glowId = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const float = useRef(new Animated.Value(0)).current;
  const mouth = useRef(new Animated.Value(0.25)).current;
  const flicker = useRef(new Animated.Value(1)).current;

  // Плавное покачивание и лёгкое мерцание, как у голограммы.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(flicker, { toValue: 0.55, duration: 60, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 90, useNativeDriver: true }),
      ])
    );
    loop.start();
    blink.start();
    return () => {
      loop.stop();
      blink.stop();
    };
  }, [float, flicker]);

  useEffect(() => {
    if (!speaking) {
      mouth.stopAnimation();
      Animated.timing(mouth, { toValue: 0.25, duration: 120, useNativeDriver: true }).start();
      return;
    }
    const talk = Animated.loop(
      Animated.sequence([
        Animated.timing(mouth, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0.35, duration: 110, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0.8, duration: 120, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0.2, duration: 140, useNativeDriver: true }),
      ])
    );
    talk.start();
    return () => talk.stop();
  }, [speaking, mouth]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] });
  const s = size / 200;

  return (
    <View style={[styles.wrap, { width: size, height: size * 1.1 }]}>
      <Animated.View style={{ opacity: flicker, transform: [{ translateY }] }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id={glowId} cx="50%" cy="45%" r="55%">
              <Stop offset="0" stopColor={HOLO} stopOpacity="0.35" />
              <Stop offset="1" stopColor={HOLO} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="100" cy="95" r="95" fill={`url(#${glowId})`} />
          {/* Плечи */}
          <Path d="M38 196 C44 150 70 138 100 138 C130 138 156 150 162 196" stroke={HOLO} strokeWidth="3" fill={HOLO} fillOpacity="0.12" />
          {/* Шарф художника */}
          <Path d="M78 140 L100 162 L122 140" stroke={HOLO} strokeWidth="3" fill="none" />
          {/* Голова */}
          <Ellipse cx="100" cy="92" rx="40" ry="46" stroke={HOLO} strokeWidth="3" fill={HOLO} fillOpacity="0.1" />
          {/* Берет */}
          <Path d="M56 66 C58 34 140 30 146 58 C130 52 80 54 56 66 Z" stroke={HOLO} strokeWidth="3" fill={HOLO} fillOpacity="0.3" />
          <Circle cx="104" cy="36" r="4" fill={HOLO} />
          {/* Глаза и брови */}
          <Circle cx="84" cy="88" r="5" fill={HOLO} />
          <Circle cx="116" cy="88" r="5" fill={HOLO} />
          <Path d="M74 76 Q84 70 94 76" stroke={HOLO} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M106 76 Q116 70 126 76" stroke={HOLO} strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Усы */}
          <Path d="M84 112 Q92 106 100 111 Q108 106 116 112" stroke={HOLO} strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Полосы развёртки */}
          {Array.from({ length: 14 }, (_, i) => (
            <Line key={i} x1="20" x2="180" y1={30 + i * 12} y2={30 + i * 12} stroke={HOLO} strokeOpacity="0.08" strokeWidth="2" />
          ))}
        </Svg>
        {/* Рот поверх рисунка: открывается, пока гид говорит */}
        <Animated.View
          style={[
            styles.mouth,
            {
              left: 88 * s,
              top: 116 * s,
              width: 24 * s,
              height: 14 * s,
              borderRadius: 7 * s,
              transform: [{ scaleY: mouth }],
            },
          ]}
        />
      </Animated.View>
      {/* Подставка-проектор */}
      <View style={[styles.base, { width: size * 0.6, height: size * 0.08, borderRadius: size * 0.04 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  mouth: { position: 'absolute', backgroundColor: HOLO, opacity: 0.9 },
  base: {
    marginTop: -6,
    backgroundColor: '#1B2E33',
    borderWidth: 2,
    borderColor: HOLO,
    shadowColor: HOLO,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
