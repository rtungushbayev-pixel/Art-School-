import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, paint } from '../theme/colors';
import type { StaffTabParamList } from './types';
import { makeTabScreenOptions, type TabConfig } from './tabOptions';
import { ScheduleScreen } from '../screens/shared/ScheduleScreen';
import { GroupsScreen } from '../screens/staff/GroupsScreen';
import { ModerationScreen } from '../screens/staff/ModerationScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<StaffTabParamList>();

// У каждой вкладки — свой цвет «краски», который загорается при выборе;
// подпись остаётся единого строгого цвета бренда.
// Посещаемость временно убрана из приложения (экраны остались в коде).
const TAB_CONFIG: Record<keyof StaffTabParamList, TabConfig> = {
  ScheduleTab: { color: paint.sky, icon: 'calendar', iconOutline: 'calendar-outline' },
  GroupsTab: { color: paint.teal, icon: 'people', iconOutline: 'people-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  ModerationTab: { color: colors.primary, icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

export function StaffTabs() {
  return (
    <Tab.Navigator initialRouteName="FeedTab" screenOptions={makeTabScreenOptions(TAB_CONFIG, { showFriends: true, showMarket: true })}>
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: 'Расписание' }} />
      <Tab.Screen name="GroupsTab" component={GroupsScreen} options={{ title: 'Группы' }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Лента' }} />
      <Tab.Screen name="ModerationTab" component={ModerationScreen} options={{ title: 'Проверка' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
