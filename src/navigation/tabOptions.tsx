import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, paint, spacing } from '../theme/colors';

export interface TabConfig {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}

// Иконки в правом верхнем углу: разделы, которые открывают не каждый день,
// поэтому они не занимают место в нижней панели.
function HeaderActions({ showMarket }: { showMarket: boolean }) {
  // Экраны Market и Messages есть в стеке каждой роли, у которой показана иконка.
  const navigation = useNavigation<any>();
  return (
    <View style={styles.actions}>
      {showMarket ? (
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Market')}
          accessibilityLabel="Продажа работ"
          style={styles.action}
        >
          <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
        </Pressable>
      ) : null}
      <Pressable
        hitSlop={8}
        onPress={() => navigation.navigate('Messages')}
        accessibilityLabel="Сообщения"
        style={styles.action}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// Лента — главный раздел: стоит по центру, иконка крупнее и на круглой
// полупрозрачной подложке.
function FeedIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.feedCircle, focused && styles.feedCircleFocused]}>
      <Ionicons
        name={focused ? 'color-palette' : 'color-palette-outline'}
        size={30}
        color={focused ? paint.coral : colors.textMuted}
      />
    </View>
  );
}

export function makeTabScreenOptions(
  configs: Record<string, TabConfig>,
  { showMarket }: { showMarket: boolean }
) {
  return ({ route }: { route: { name: string } }): BottomTabNavigationOptions => {
    const config = configs[route.name];
    const isFeed = route.name === 'FeedTab';
    return {
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
      headerRight: () => <HeaderActions showMarket={showMarket} />,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarIcon: ({ focused, size }) =>
        isFeed ? (
          <FeedIcon focused={focused} />
        ) : (
          <Ionicons
            name={focused ? config.icon : config.iconOutline}
            size={size}
            color={focused ? config.color : colors.textMuted}
          />
        ),
      tabBarLabelStyle: { fontSize: 10 },
      tabBarIconStyle: isFeed ? styles.feedIconSlot : { marginTop: 2 },
    };
  };
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, gap: spacing.md },
  action: { padding: 2 },
  feedIconSlot: { width: 56, height: 56, marginTop: -14 },
  feedCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 102, 79, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(228, 102, 79, 0.25)',
  },
  feedCircleFocused: { backgroundColor: 'rgba(228, 102, 79, 0.2)' },
});
