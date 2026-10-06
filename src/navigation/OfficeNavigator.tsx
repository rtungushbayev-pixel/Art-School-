import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OfficeTabParamList, StaffStackParamList } from './types';
import { makeTabScreenOptions, type TabConfig } from './tabOptions';
import { MaterialRequestsScreen } from '../screens/materials/MaterialRequestsScreen';
import { MaterialRequestScreen } from '../screens/materials/MaterialRequestScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { NotificationSettingsScreen } from '../screens/shared/NotificationSettingsScreen';
import { AnnouncementsScreen } from '../screens/student/AnnouncementsScreen';
import { SupportScreen } from '../screens/shared/SupportScreen';
import { NewSupportTicketScreen } from '../screens/shared/NewSupportTicketScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { colors, paint } from '../theme/colors';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: {
    materials: 'Заявки',
    profile: 'Профиль',
    request: 'Заявка',
    editProfile: 'Редактирование профиля',
    notifications: 'Уведомления',
    messages: 'Сообщения',
    tickets: 'Обращения',
    help: 'Помощь',
    ticket: 'Обращение',
  },
  kk: {
    materials: 'Өтінімдер',
    profile: 'Профиль',
    request: 'Өтінім',
    editProfile: 'Профильді өңдеу',
    notifications: 'Хабарландырулар',
    messages: 'Хабарламалар',
    tickets: 'Өтініштер',
    help: 'Көмек',
    ticket: 'Өтініш',
  },
  en: {
    materials: 'Requests',
    profile: 'Profile',
    request: 'Request',
    editProfile: 'Edit profile',
    notifications: 'Notifications',
    messages: 'Messages',
    tickets: 'Requests',
    help: 'Help',
    ticket: 'Request',
  },
};

const Tab = createBottomTabNavigator<OfficeTabParamList>();

const TAB_CONFIG: Record<keyof OfficeTabParamList, TabConfig> = {
  MaterialsTab: { color: paint.ochre, icon: 'cube', iconOutline: 'cube-outline' },
  ProfileTab: { color: colors.primary, icon: 'person-circle', iconOutline: 'person-circle-outline' },
};

function OfficeTabs() {
  const s = useStrings(STRINGS);
  return (
    <Tab.Navigator
      initialRouteName="MaterialsTab"
      screenOptions={makeTabScreenOptions(TAB_CONFIG, { showFriends: false, showMarket: false })}
    >
      <Tab.Screen name="MaterialsTab" component={MaterialRequestsScreen} options={{ title: s.materials }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: s.profile }} />
    </Tab.Navigator>
  );
}

// Администрация школы (роль office): только заявки на материалы, сообщения
// школы, «Помощь» и свой профиль. Названия экранов — как в стеке сотрудника.
const Stack = createNativeStackNavigator<StaffStackParamList & { OfficeTabs: undefined }>();

export function OfficeNavigator() {
  const s = useStrings(STRINGS);
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="OfficeTabs" component={OfficeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="MaterialRequest" component={MaterialRequestScreen} options={{ title: s.request }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: s.editProfile }} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: s.notifications }}
      />
      <Stack.Screen name="Messages" component={AnnouncementsScreen} options={{ title: s.messages }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: s.tickets }} />
      <Stack.Screen name="NewSupportTicket" component={NewSupportTicketScreen} options={{ title: s.help }} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} options={{ title: s.ticket }} />
    </Stack.Navigator>
  );
}
