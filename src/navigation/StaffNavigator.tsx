import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StaffStackParamList } from './types';
import { StaffTabs } from './StaffTabs';
import { ComposeAnnouncementScreen } from '../screens/staff/ComposeAnnouncementScreen';
import { StaffAnnouncementsScreen } from '../screens/staff/AnnouncementsScreen';
import { MarketplaceScreen } from '../screens/shared/MarketplaceScreen';
import { FriendsScreen } from '../screens/shared/FriendsScreen';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { CreatePostScreen } from '../screens/shared/CreatePostScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { NotificationSettingsScreen } from '../screens/shared/NotificationSettingsScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { PortfolioScreen } from '../screens/shared/PortfolioScreen';
import { EditArtworkScreen } from '../screens/shared/EditArtworkScreen';
import { EditAchievementScreen } from '../screens/shared/EditAchievementScreen';
import { CreateGroupScreen } from '../screens/staff/CreateGroupScreen';
import { GroupDetailScreen } from '../screens/staff/GroupDetailScreen';
import { AddStudentToGroupScreen } from '../screens/staff/AddStudentToGroupScreen';
import { CreateLessonScreen } from '../screens/staff/CreateLessonScreen';
import { ListingDetailScreen } from '../screens/shared/ListingDetailScreen';
import { CreateListingScreen } from '../screens/shared/CreateListingScreen';
import { PaymentsScreen } from '../screens/shared/PaymentsScreen';
import { StudentBalancesScreen } from '../screens/staff/StudentBalancesScreen';
import { BillingEntryFormScreen } from '../screens/staff/BillingEntryFormScreen';
import { LessonChangeScreen } from '../screens/staff/LessonChangeScreen';
import { PeopleScreen } from '../screens/staff/PeopleScreen';
import { LinkChildScreen } from '../screens/staff/LinkChildScreen';
import { AddProgressNoteScreen } from '../screens/staff/AddProgressNoteScreen';
import { AddStudentPhotoScreen } from '../screens/staff/AddStudentPhotoScreen';
import { PhotoViewScreen } from '../screens/shared/PhotoViewScreen';
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
      <Stack.Screen name="Messages" component={StaffAnnouncementsScreen} options={{ title: 'Сообщения' }} />
      <Stack.Screen name="Market" component={MarketplaceScreen} options={{ title: 'Продажа работ' }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Друзья' }} />
      <Stack.Screen
        name="ComposeAnnouncement"
        component={ComposeAnnouncementScreen}
        options={{ title: 'Новое объявление' }}
      />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Публикация' }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'Новая работа' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Редактирование профиля' }} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Уведомления' }}
      />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Профиль' }} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Портфолио' }} />
      <Stack.Screen name="EditArtwork" component={EditArtworkScreen} options={{ title: 'О работе' }} />
      <Stack.Screen name="EditAchievement" component={EditAchievementScreen} options={{ title: 'Достижение' }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Новая группа' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Группа' }} />
      <Stack.Screen
        name="AddStudentToGroup"
        component={AddStudentToGroupScreen}
        options={{ title: 'Добавить ученика' }}
      />
      <Stack.Screen name="CreateLesson" component={CreateLessonScreen} options={{ title: 'Новое занятие' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Объявление' }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'Продажа работы' }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Оплаты ученика' }} />
      <Stack.Screen name="StudentBalances" component={StudentBalancesScreen} options={{ title: 'Оплаты учеников' }} />
      <Stack.Screen name="BillingEntryForm" component={BillingEntryFormScreen} options={{ title: 'Начисление' }} />
      <Stack.Screen name="LessonChange" component={LessonChangeScreen} options={{ title: 'Изменение занятия' }} />
      <Stack.Screen name="People" component={PeopleScreen} options={{ title: 'Ученики и родители' }} />
      <Stack.Screen name="LinkChild" component={LinkChildScreen} options={{ title: 'Привязать ребёнка' }} />
      <Stack.Screen name="AddProgressNote" component={AddProgressNoteScreen} options={{ title: 'Отзыв о прогрессе' }} />
      <Stack.Screen name="AddStudentPhoto" component={AddStudentPhotoScreen} options={{ title: 'Фото в галерею' }} />
      <Stack.Screen name="PhotoView" component={PhotoViewScreen} options={{ title: 'Фото' }} />
    </Stack.Navigator>
  );
}
