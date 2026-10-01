import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, paint } from '../theme/colors';
import type { ParentTabParamList } from './types';
import { ChildrenScreen } from '../screens/parent/ChildrenScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { AnnouncementsScreen } from '../screens/student/AnnouncementsScreen';

const Tab = createBottomTabNavigator<ParentTabParamList>();

const TAB_CONFIG: Record<
  keyof ParentTabParamList,
  { color: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }
> = {
  ChildrenTab: { color: paint.leaf, icon: 'happy', iconOutline: 'happy-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  AnnouncementsTab: { color: paint.violet, icon: 'megaphone', iconOutline: 'megaphone-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

export function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof ParentTabParamList];
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
          tabBarLabelStyle: { fontSize: 10 },
          tabBarIconStyle: { marginTop: 2 },
        };
      }}
    >
      <Tab.Screen name="ChildrenTab" component={ChildrenScreen} options={{ title: 'Дети' }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Лента' }} />
      <Tab.Screen name="AnnouncementsTab" component={AnnouncementsScreen} options={{ title: 'Новости' }} />
      <Tab.Screen name="ProfileTab" component={ParentProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
