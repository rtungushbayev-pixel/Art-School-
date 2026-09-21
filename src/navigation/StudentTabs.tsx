import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import type { StudentTabParamList } from './types';
import { ScheduleScreen } from '../screens/student/ScheduleScreen';
import { HomeworkScreen } from '../screens/student/HomeworkScreen';
import { FeedScreen } from '../screens/student/FeedScreen';
import { AnnouncementsScreen } from '../screens/student/AnnouncementsScreen';
import { MarketplaceScreen } from '../screens/shared/MarketplaceScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<StudentTabParamList>();

const ICONS: Record<keyof StudentTabParamList, string> = {
  ScheduleTab: '📅',
  HomeworkTab: '📝',
  FeedTab: '🖼️',
  MarketTab: '🛒',
  AnnouncementsTab: '📣',
  ProfileTab: '👤',
};

export function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{ICONS[route.name as keyof StudentTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: 'Расписание' }} />
      <Tab.Screen name="HomeworkTab" component={HomeworkScreen} options={{ title: 'Задания' }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Лента' }} />
      <Tab.Screen name="MarketTab" component={MarketplaceScreen} options={{ title: 'Продажа' }} />
      <Tab.Screen name="AnnouncementsTab" component={AnnouncementsScreen} options={{ title: 'Объявления' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
