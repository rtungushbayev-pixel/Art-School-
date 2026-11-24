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
    art: 'История искусств',
  },
  kk: {
    friends: 'Достар',
    market: 'Жұмыстарды сату',
    messages: 'Хабарламалар',
    help: 'Көмек',
    art: 'Өнер тарихы',
  },
  en: {
    friends: 'Friends',
    market: 'Artwork sale',
    messages: 'Messages',
    help: 'Help',
    art: 'Art history',
  },
};

export interface TabConfig {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}

// Размер иконок вверху: крупные, чтобы легко попадать пальцем.
const ACTION_ICON = 26;

// Иконки в правом верхнем углу: разделы, которые открывают не каждый день,
// поэтому они не занимают место в нижней панели.
interface HeaderActionsProps {
  showFriends: boolean;
  showMarket: boolean;
  // «История искусств» — у всех, кроме администрации школы (office).
  showArt?: boolean;
}

function HeaderActions({ showFriends, showMarket, showArt = true }: HeaderActionsProps) {
  // Экраны ArtHistory, Friends, Market, Messages и Support есть в стеке каждой роли, у которой показана иконка.
  const navigation = useNavigation<any>();
  const s = useStrings(STRINGS);
  return (
    <View style={styles.actions}>
      {showArt ? (
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('ArtHistory')}
          accessibilityLabel={s.art}
          style={styles.action}
        >
          <Ionicons name="book-outline" size={ACTION_ICON} color={colors.primary} />
        </Pressable>
      ) : null}
      {showFriends ? (
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Friends')}
          accessibilityLabel={s.friends}
          style={styles.action}
        >
          <Ionicons name="people-outline" size={ACTION_ICON} color={colors.primary} />
        </Pressable>
      ) : null}
      {showMarket ? (
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Market')}
          accessibilityLabel={s.market}
          style={styles.action}
        >
          <Ionicons name="storefront-outline" size={ACTION_ICON} color={colors.primary} />
        </Pressable>
      ) : null}
      <Pressable
        hitSlop={8}
        onPress={() => navigation.navigate('Messages')}
        accessibilityLabel={s.messages}
        style={styles.action}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={ACTION_ICON} color={colors.primary} />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => navigation.navigate('Support')}
        accessibilityLabel={s.help}
        style={styles.action}
      >
        <Ionicons name="help-buoy-outline" size={ACTION_ICON} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// Арт-двор — главный раздел: стоит по центру, иконка чуть крупнее остальных.
// Без подложки: круг выходил за панель и выбивался из общего стиля.
function FeedIcon({ focused }: { focused: boolean }) {
  return (
    <Ionicons
      name={focused ? 'color-palette' : 'color-palette-outline'}
      size={28}
      color={focused ? paint.coral : colors.textMuted}
    />
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
      // Название нижней вкладки уже видно в нижней панели, поэтому вверху его не повторяем.
      // Экраны, открытые иконками справа (Друзья, Продажа работ, Помощь), свой заголовок сохраняют.
      headerTitle: '',
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
      tabBarIconStyle: { marginTop: 2 },
    };
  };
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.sm, gap: 6 },
  // Круглая подложка делает кнопку заметной и увеличивает зону нажатия.
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 42, 59, 0.08)',
  },
});
