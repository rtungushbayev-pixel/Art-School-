import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, paint } from '../theme/colors';
import type { StaffTabParamList } from './types';
import { StaffAnnouncementsScreen } from '../screens/staff/AnnouncementsScreen';
import { GroupsScreen } from '../screens/staff/GroupsScreen';
import { AttendanceScreen } from '../screens/staff/AttendanceScreen';
import { ModerationScreen } from '../screens/staff/ModerationScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { MarketplaceScreen } from '../screens/shared/MarketplaceScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<StaffTabParamList>();

// У каждой вкладки — свой цвет «краски», который загорается при выборе;
// подпись остаётся единого строгого цвета бренда.
const TAB_CONFIG: Record<
  keyof StaffTabParamList,
  { color: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }
> = {
  AnnouncementsTab: { color: paint.violet, icon: 'megaphone', iconOutline: 'megaphone-outline' },
  GroupsTab: { color: paint.teal, icon: 'people', iconOutline: 'people-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  MarketTab: { color: paint.ochre, icon: 'pricetag', iconOutline: 'pricetag-outline' },
  AttendanceTab: { color: paint.leaf, icon: 'checkmark-circle', iconOutline: 'checkmark-circle-outline' },
  ModerationTab: { color: colors.primary, icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

export function StaffTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof StaffTabParamList];
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? config.icon : config.iconOutline}
              size={size}
              color={focused ? config.color : colors.textMuted}
            />
          ),
          tabBarLabelStyle: { fontSize: 9 },
          tabBarItemStyle: { paddingHorizontal: 0 },
          tabBarIconStyle: { marginTop: 2 },
        };
      }}
    >
      <Tab.Screen name="AnnouncementsTab" component={StaffAnnouncementsScreen} options={{ title: 'Объявления' }} />
      <Tab.Screen name="GroupsTab" component={GroupsScreen} options={{ title: 'Группы' }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Лента' }} />
      <Tab.Screen name="MarketTab" component={MarketplaceScreen} options={{ title: 'Продажа' }} />
      <Tab.Screen name="AttendanceTab" component={AttendanceScreen} options={{ title: 'Явка' }} />
      <Tab.Screen name="ModerationTab" component={ModerationScreen} options={{ title: 'Модерация' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
