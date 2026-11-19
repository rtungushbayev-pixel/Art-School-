import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, paint } from '../theme/colors';
import type { ParentTabParamList } from './types';
import { makeTabScreenOptions, type TabConfig } from './tabOptions';
import { ScheduleScreen } from '../screens/shared/ScheduleScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { CheckInScreen } from '../screens/shared/CheckInScreen';
import { useStrings } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useQrCheckInAvailable } from '../hooks/useQrCheckIn';

const STRINGS = {
  ru: {
    scan: 'Сканировать QR',
    schedule: 'Расписание',
    community: 'Комьюнити',
    profile: 'Профиль',
  },
  kk: {
    scan: 'QR сканерлеу',
    schedule: 'Кесте',
    community: 'Қауымдастық',
    profile: 'Профиль',
  },
  en: {
    scan: 'Scan QR',
    schedule: 'Schedule',
    community: 'Community',
    profile: 'Profile',
  },
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

const TAB_CONFIG: Record<keyof ParentTabParamList, TabConfig> = {
  ScheduleTab: { color: paint.sky, icon: 'calendar', iconOutline: 'calendar-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  ScanTab: { color: paint.teal, icon: 'qr-code', iconOutline: 'qr-code-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

// У родителя нет продажи работ и друзей, поэтому вверху только «Сообщения».
export function ParentTabs() {
  const s = useStrings(STRINGS);
  const { profile } = useAuth();
  const showScan = useQrCheckInAvailable(profile);
  return (
    <Tab.Navigator initialRouteName="FeedTab" screenOptions={makeTabScreenOptions(TAB_CONFIG, { showFriends: false, showMarket: false })}>
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: s.schedule }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: s.community }} />
      {showScan ? <Tab.Screen name="ScanTab" component={CheckInScreen} options={{ title: s.scan }} /> : null}
      <Tab.Screen name="ProfileTab" component={ParentProfileScreen} options={{ title: s.profile }} />
    </Tab.Navigator>
  );
}
