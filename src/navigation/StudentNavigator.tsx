import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentStackParamList } from './types';
import { StudentTabs } from './StudentTabs';
import { HomeworkDetailScreen } from '../screens/student/HomeworkDetailScreen';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { CreatePostScreen } from '../screens/student/CreatePostScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { ListingDetailScreen } from '../screens/shared/ListingDetailScreen';
import { CreateListingScreen } from '../screens/shared/CreateListingScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<StudentStackParamList>();

export function StudentNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} options={{ title: 'Задание' }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Публикация' }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'Новая работа' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Редактирование профиля' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Профиль' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Объявление' }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'Продажа работы' }} />
    </Stack.Navigator>
  );
}
