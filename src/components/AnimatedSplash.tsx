import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../theme/colors';

// Короткая заставка при запуске: логотип с лицом основателя «пульсирует»
// цветными кругами из его же палитры, затем появляется название школы.
// Показывается поверх приложения, пока оно грузится под ней; по тапу — пропуск.

const LOGO_SIZE = 200;
const SHOW_MS = 2600;
const RING_COLORS = ['#EF457A', '#FBB21E', '#4A2F91', '#34C3F1'];

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleShift = useRef(new Animated.Value(16)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const rings = useRef(RING_COLORS.map(() => new Animated.Value(0))).current;
  const [started, setStarted] = useState(false);
  const finishing = useRef(false);

  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onFinish());
  };

  useEffect(() => {
    if (!started) return;
    // Нативная заставка с тем же фоном и логотипом уходит, а наша продолжает.
    SplashScreen.hide();

    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
      Animated.stagger(
        220,
        rings.map((ring) =>
          Animated.timing(ring, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(titleShift, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    const timer = setTimeout(finish, SHOW_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
      onLayout={() => setStarted(true)}
    >
      <Pressable style={styles.center} onPress={finish}>
        <View style={styles.logoBox}>
          {rings.map((ring, i) => (
            <Animated.View
              key={RING_COLORS[i]}
              style={[
                styles.ring,
                {
                  borderColor: RING_COLORS[i],
                  opacity: ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
                },
              ]}
            />
          ))}
          <Animated.Image
            source={require('../../assets/splash-logo.png')}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>
        <Animated.Text
          style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleShift }] }]}
        >
          KasteyevSchool
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: titleOpacity }]}>
          Школа искусств и дизайна им. А. Кастеева
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.background,
    zIndex: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE * 0.85,
    height: LOGO_SIZE * 0.85,
    borderRadius: LOGO_SIZE,
    borderWidth: 6,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  title: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    paddingHorizontal: 32,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
