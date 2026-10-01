import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, paint, spacing } from '../theme/colors';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: {
    friends: 'Друзья',
    market: 'Продажа работ',
    messages: 'Сообщения',
    help: 'Помощь',
  },
  kk: {
    friends: 'Достар',
    market: 'Жұмыстарды сату',
    messages: 'Хабарламалар',
    help: 'Көмек',
  },
  en: {
    friends: 'Friends',
    market: 'Artwork sale',
    messages: 'Messages',
    help: 'Help',
  },
};

export interface TabConfig {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}

// Иконки в правом верхнем углу: разделы, которые открывают не каждый день,
// поэтому они не занимают место в нижней панели.
interface HeaderActionsProps {
  showFriends: boolean;
  showMarket: boolean;
}

function HeaderActions({ showFriends, showMarket }: HeaderActionsProps) {
  // Экраны Friends, Market, Messages и Support есть в стеке каждой роли, у которой показана иконка.
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  return (
    <View style={styles.actions}>
      {showFriends ? (
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Friends')}
          accessibilityLabel={s.friends}
          style={styles.action}
        >
          <Ionicons name="people-outline" size={22} color={colors.primary} />
        </Pressable>
      ) : null}
      {showMarket ? (
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Market')}
          accessibilityLabel={s.market}
          style={styles.action}
        >
          <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
        </Pressable>
      ) : null}
      <Pressable
        hitSlop={8}
        onPress={() => navigation.navigate('Messages')}
        accessibilityLabel={s.messages}
        style={styles.action}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => navigation.navigate('Support')}
        accessibilityLabel={s.help}
        style={styles.action}
      >
        <Ionicons name="help-buoy-outline" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// Комьюнити — главный раздел: стоит по центру, иконка крупнее и на круглой
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
  actions: HeaderActionsProps
) {
  return ({ route }: { route: { name: string } }): BottomTabNavigationOptions => {
    const config = configs[route.name];
    const isFeed = route.name === 'FeedTab';
    return {
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
      headerRight: () => <HeaderActions {...actions} />,
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
