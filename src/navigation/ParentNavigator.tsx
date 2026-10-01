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
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<ParentStackParamList>();

export function ParentNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ParentTabs" component={ParentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Messages" component={AnnouncementsScreen} options={{ title: 'Сообщения' }} />
      <Stack.Screen name="Children" component={ChildrenScreen} options={{ title: 'Мои дети' }} />
      <Stack.Screen name="ChildDetail" component={ChildDetailScreen} options={{ title: 'Успехи ребёнка' }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Публикация' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Редактирование профиля' }} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Уведомления' }}
      />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Профиль' }} />
      <Stack.Screen name="PhotoView" component={PhotoViewScreen} options={{ title: 'Фото' }} />
    </Stack.Navigator>
  );
}
