import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParentStackParamList } from './types';
import { ParentTabs } from './ParentTabs';
import { ChildDetailScreen } from '../screens/parent/ChildDetailScreen';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { NotificationSettingsScreen } from '../screens/shared/NotificationSettingsScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { PhotoViewScreen } from '../screens/shared/PhotoViewScreen';
import { AnnouncementsScreen } from '../screens/student/AnnouncementsScreen';
import { ChildrenScreen } from '../screens/parent/ChildrenScreen';
import { AddChildScreen } from '../screens/parent/AddChildScreen';
import { SupportScreen } from '../screens/shared/SupportScreen';
import { NewSupportTicketScreen } from '../screens/shared/NewSupportTicketScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { PortfolioScreen } from '../screens/shared/PortfolioScreen';
import { colors } from '../theme/colors';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: {
    messages: 'Сообщения',
    children: 'Мои дети',
    addChild: 'Добавить ребёнка',
    help: 'Помощь',
    ticket: 'Обращение',
    posts: 'Публикации',
    childProgress: 'Успехи ребёнка',
    post: 'Публикация',
    editProfile: 'Редактирование профиля',
    notifications: 'Уведомления',
    profile: 'Профиль',
    photo: 'Фото',
  },
  kk: {
    messages: 'Хабарламалар',
    children: 'Менің балаларым',
    addChild: 'Бала қосу',
    help: 'Көмек',
    ticket: 'Өтініш',
    posts: 'Жарияланымдар',
    childProgress: 'Баланың жетістіктері',
    post: 'Жарияланым',
    editProfile: 'Профильді өңдеу',
    notifications: 'Хабарландырулар',
    profile: 'Профиль',
    photo: 'Фото',
  },
  en: {
    messages: 'Messages',
    children: 'My children',
    addChild: 'Add a child',
    help: 'Help',
    ticket: 'Request',
    posts: 'Posts',
    childProgress: 'Child\'s progress',
    post: 'Post',
    editProfile: 'Edit profile',
    notifications: 'Notifications',
    profile: 'Profile',
    photo: 'Photo',
  },
};

const Stack = createNativeStackNavigator<ParentStackParamList>();

export function ParentNavigator() {
  const s = useStrings(STRINGS);
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ParentTabs" component={ParentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Messages" component={AnnouncementsScreen} options={{ title: s.messages }} />
      <Stack.Screen name="Children" component={ChildrenScreen} options={{ title: s.children }} />
      <Stack.Screen name="AddChild" component={AddChildScreen} options={{ title: s.addChild }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: s.help }} />
      <Stack.Screen name="NewSupportTicket" component={NewSupportTicketScreen} options={{ title: s.help }} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} options={{ title: s.ticket }} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: s.posts }} />
      <Stack.Screen name="ChildDetail" component={ChildDetailScreen} options={{ title: s.childProgress }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: s.post }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: s.editProfile }} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: s.notifications }}
      />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: s.profile }} />
      <Stack.Screen name="PhotoView" component={PhotoViewScreen} options={{ title: s.photo }} />
    </Stack.Navigator>
  );
}
