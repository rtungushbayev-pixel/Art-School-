import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StaffStackParamList } from './types';
import { StaffTabs } from './StaffTabs';
import { ComposeAnnouncementScreen } from '../screens/staff/ComposeAnnouncementScreen';
import { AttendanceGroupScreen } from '../screens/staff/AttendanceGroupScreen';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { CreateGroupScreen } from '../screens/staff/CreateGroupScreen';
import { GroupDetailScreen } from '../screens/staff/GroupDetailScreen';
import { AddStudentToGroupScreen } from '../screens/staff/AddStudentToGroupScreen';
import { CreateLessonScreen } from '../screens/staff/CreateLessonScreen';
import { CreateHomeworkScreen } from '../screens/staff/CreateHomeworkScreen';
import { HomeworkSubmissionsScreen } from '../screens/staff/HomeworkSubmissionsScreen';
import { GradeSubmissionScreen } from '../screens/staff/GradeSubmissionScreen';
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
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Новая группа' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Группа' }} />
      <Stack.Screen
        name="AddStudentToGroup"
        component={AddStudentToGroupScreen}
        options={{ title: 'Добавить ученика' }}
      />
      <Stack.Screen name="CreateLesson" component={CreateLessonScreen} options={{ title: 'Новое занятие' }} />
      <Stack.Screen name="CreateHomework" component={CreateHomeworkScreen} options={{ title: 'Новое задание' }} />
      <Stack.Screen
        name="HomeworkSubmissions"
        component={HomeworkSubmissionsScreen}
        options={{ title: 'Сдачи задания' }}
      />
      <Stack.Screen name="GradeSubmission" component={GradeSubmissionScreen} options={{ title: 'Оценка работы' }} />
    </Stack.Navigator>
  );
}
