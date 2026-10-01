import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, paint } from '../theme/colors';
import type { ParentTabParamList } from './types';
import { makeTabScreenOptions, type TabConfig } from './tabOptions';
import { ScheduleScreen } from '../screens/shared/ScheduleScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';

const Tab = createBottomTabNavigator<ParentTabParamList>();

const TAB_CONFIG: Record<keyof ParentTabParamList, TabConfig> = {
  ScheduleTab: { color: paint.sky, icon: 'calendar', iconOutline: 'calendar-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

// У родителя нет продажи работ и друзей, поэтому вверху только «Сообщения».
export function ParentTabs() {
  return (
    <Tab.Navigator initialRouteName="FeedTab" screenOptions={makeTabScreenOptions(TAB_CONFIG, { showFriends: false, showMarket: false })}>
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: 'Расписание' }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: 'Лента' }} />
      <Tab.Screen name="ProfileTab" component={ParentProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}
