import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, paint } from '../theme/colors';
import type { StudentTabParamList } from './types';
import { makeTabScreenOptions, type TabConfig } from './tabOptions';
import { ScheduleScreen } from '../screens/shared/ScheduleScreen';
import { FeedScreen } from '../screens/shared/FeedScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { CheckInScreen } from '../screens/shared/CheckInScreen';
import { EventsScreen } from '../screens/shared/EventsScreen';
import { useStrings } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useQrCheckInAvailable } from '../hooks/useQrCheckIn';
import { useHeroOnboarding } from '../lib/heroOnboarding';

const STRINGS = {
  ru: {
    scan: 'Scan-QR',
    schedule: 'Расписание',
    community: 'Арт-двор',
    events: 'Конкурсы',
    eventsTitle: 'Выставки и конкурсы',
    profile: 'Профиль',
  },
  kk: {
    scan: 'Scan-QR',
    schedule: 'Кесте',
    community: 'Арт-аула',
    events: 'Байқаулар',
    eventsTitle: 'Көрмелер мен байқаулар',
    profile: 'Профиль',
  },
  en: {
    scan: 'Scan-QR',
    schedule: 'Schedule',
    community: 'Art Yard',
    events: 'Contests',
    eventsTitle: 'Exhibitions and competitions',
    profile: 'Profile',
  },
};

const Tab = createBottomTabNavigator<StudentTabParamList>();

// У каждой вкладки — свой цвет «краски», который загорается при выборе;
// подпись остаётся единого строгого цвета бренда.
const TAB_CONFIG: Record<keyof StudentTabParamList, TabConfig> = {
  ScheduleTab: { color: paint.sky, icon: 'calendar', iconOutline: 'calendar-outline' },
  FeedTab: { color: paint.coral, icon: 'color-palette', iconOutline: 'color-palette-outline' },
  ScanTab: { color: paint.teal, icon: 'qr-code', iconOutline: 'qr-code-outline' },
  EventsTab: { color: paint.ochre, icon: 'trophy', iconOutline: 'trophy-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

export function StudentTabs() {
  const insets = useSafeAreaInsets();
  const s = useStrings(STRINGS);
  const { profile } = useAuth();
  const showScan = useQrCheckInAvailable(profile);
  // Первый вход ученика: предлагаем выбрать героя.
  useHeroOnboarding(profile);
  return (
    <Tab.Navigator initialRouteName="FeedTab" screenOptions={makeTabScreenOptions(TAB_CONFIG, { showFriends: true, showMarket: true }, insets.bottom)}>
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} options={{ title: s.schedule }} />
      <Tab.Screen name="FeedTab" component={FeedScreen} options={{ title: s.community }} />
      {showScan ? <Tab.Screen name="ScanTab" component={CheckInScreen} options={{ title: s.scan }} /> : null}
      <Tab.Screen name="EventsTab" component={EventsScreen} options={{ title: s.eventsTitle, tabBarLabel: s.events }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: s.profile }} />
    </Tab.Navigator>
  );
}
