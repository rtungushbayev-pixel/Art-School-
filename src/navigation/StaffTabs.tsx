import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import type { StaffTabParamList } from './types';
import { StaffAnnouncementsScreen } from '../screens/staff/AnnouncementsScreen';
import { AttendanceScreen } from '../screens/staff/AttendanceScreen';
import { ModerationScreen } from '../screens/staff/ModerationScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<StaffTabParamList>();

const ICONS: Record<keyof StaffTabParamList, string> = {
  AnnouncementsTab: '📣',
  AttendanceTab: '✅',
  ModerationTab: '🛡️',
  ProfileTab: '👤',
};

export function StaffTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{ICONS[route.name as keyof StaffTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="AnnouncementsTab" component={StaffAnnouncementsScreen} options={{ title: 'Объявления' }} />
      <Tab.Screen name="AttendanceTab" component={AttendanceScreen} options={{ title: 'Посещаемость' }} />
      <Tab.Screen name="ModerationTab" component={ModerationScreen} options={{ title: 'Модерация' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
