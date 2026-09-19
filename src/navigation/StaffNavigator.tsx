import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StaffStackParamList } from './types';
import { StaffTabs } from './StaffTabs';
import { ComposeAnnouncementScreen } from '../screens/staff/ComposeAnnouncementScreen';
import { AttendanceGroupScreen } from '../screens/staff/AttendanceGroupScreen';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<StaffStackParamList>();

export function StaffNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="StaffTabs" component={StaffTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ComposeAnnouncement"
        component={ComposeAnnouncementScreen}
        options={{ title: 'Новое объявление' }}
      />
      <Stack.Screen name="AttendanceGroup" component={AttendanceGroupScreen} options={{ title: 'Посещаемость' }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Публикация' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Редактирование профиля' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Профиль' }} />
    </Stack.Navigator>
  );
}
