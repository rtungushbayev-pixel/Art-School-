import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, paint } from '../theme/colors';
import type { StudentTabParamList } from './types';
import { ScheduleScreen } from '../screens/student/ScheduleScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { AnnouncementsScreen } from '../screens/student/AnnouncementsScreen';
import { MarketplaceScreen } from '../screens/shared/MarketplaceScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<StudentTabParamList>();

// У каждой вкладки — свой цвет «краски», который загорается при выборе;
// подпись остаётся единого строгого цвета бренда.
const TAB_CONFIG: Record<
  keyof StudentTabParamList,
  { color: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }
> = {
  ScheduleTab: { color: paint.sky, icon: 'calendar', iconOutline: 'calendar-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  MarketTab: { color: paint.ochre, icon: 'pricetag', iconOutline: 'pricetag-outline' },
  AnnouncementsTab: { color: paint.violet, icon: 'megaphone', iconOutline: 'megaphone-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

export function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof StudentTabParamList];
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
        };
      }}
    >
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: 'Расписание' }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Лента' }} />
      <Tab.Screen name="MarketTab" component={MarketplaceScreen} options={{ title: 'Продажа' }} />
      <Tab.Screen name="AnnouncementsTab" component={AnnouncementsScreen} options={{ title: 'Объявления' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
