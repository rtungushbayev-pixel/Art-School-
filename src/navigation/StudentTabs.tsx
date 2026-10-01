import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, paint } from '../theme/colors';
import type { StudentTabParamList } from './types';
import { makeTabScreenOptions, type TabConfig } from './tabOptions';
import { ScheduleScreen } from '../screens/shared/ScheduleScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: {
    schedule: 'Расписание',
    community: 'Комьюнити',
    profile: 'Профиль',
  },
  kk: {
    schedule: 'Кесте',
    community: 'Қауымдастық',
    profile: 'Профиль',
  },
  en: {
    schedule: 'Schedule',
    community: 'Community',
    profile: 'Profile',
  },
};

const Tab = createBottomTabNavigator<StudentTabParamList>();

// У каждой вкладки — свой цвет «краски», который загорается при выборе;
// подпись остаётся единого строгого цвета бренда.
const TAB_CONFIG: Record<keyof StudentTabParamList, TabConfig> = {
  ScheduleTab: { color: paint.sky, icon: 'calendar', iconOutline: 'calendar-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

export function StudentTabs() {
  const s = useStrings(STRINGS);
  return (
    <Tab.Navigator initialRouteName="FeedTab" screenOptions={makeTabScreenOptions(TAB_CONFIG, { showFriends: true, showMarket: true })}>
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: s.schedule }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: s.community }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: s.profile }} />
    </Tab.Navigator>
  );
}
