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
import { SupportScreen } from '../screens/shared/SupportScreen';
import { NewSupportTicketScreen } from '../screens/shared/NewSupportTicketScreen';
import { SupportTicketScreen } from '../screens/shared/SupportTicketScreen';
import { colors } from '../theme/colors';
import { useStrings } from '../i18n';

const STRINGS = {
  ru: {
    messages: 'Сообщения',
    market: 'Продажа работ',
    friends: 'Друзья',
    newAnnouncement: 'Новое объявление',
    post: 'Публикация',
    newWork: 'Новая работа',
    editProfile: 'Редактирование профиля',
    notifications: 'Уведомления',
    profile: 'Профиль',
    portfolio: 'Портфолио',
    aboutWork: 'О работе',
    achievement: 'Достижение',
    newGroup: 'Новая группа',
    group: 'Группа',
    addStudent: 'Добавить ученика',
    newLesson: 'Новое занятие',
    listing: 'Объявление',
    sellWork: 'Продажа работы',
    studentPayments: 'Оплаты ученика',
    studentsPayments: 'Оплаты учеников',
    charge: 'Начисление',
    lessonChange: 'Изменение занятия',
    people: 'Ученики и родители',
    linkChild: 'Привязать ребёнка',
    progressNote: 'Отзыв о прогрессе',
    galleryPhoto: 'Фото в галерею',
    photo: 'Фото',
    tickets: 'Обращения',
    help: 'Помощь',
    ticket: 'Обращение',
  },
  kk: {
    messages: 'Хабарламалар',
    market: 'Жұмыстарды сату',
    friends: 'Достар',
    newAnnouncement: 'Жаңа хабарландыру',
    post: 'Жарияланым',
    newWork: 'Жаңа жұмыс',
    editProfile: 'Профильді өңдеу',
    notifications: 'Хабарландырулар',
    profile: 'Профиль',
    portfolio: 'Портфолио',
    aboutWork: 'Жұмыс туралы',
    achievement: 'Жетістік',
    newGroup: 'Жаңа топ',
    group: 'Топ',
    addStudent: 'Оқушы қосу',
    newLesson: 'Жаңа сабақ',
    listing: 'Хабарландыру',
    sellWork: 'Жұмысты сату',
    studentPayments: 'Оқушы төлемдері',
    studentsPayments: 'Оқушылардың төлемдері',
    charge: 'Есептеу',
    lessonChange: 'Сабақты өзгерту',
    people: 'Оқушылар мен ата-аналар',
    linkChild: 'Баланы байланыстыру',
    progressNote: 'Үлгерім туралы пікір',
    galleryPhoto: 'Галереяға фото',
    photo: 'Фото',
    tickets: 'Өтініштер',
    help: 'Көмек',
    ticket: 'Өтініш',
  },
  en: {
    messages: 'Messages',
    market: 'Artwork sale',
    friends: 'Friends',
    newAnnouncement: 'New announcement',
    post: 'Post',
    newWork: 'New artwork',
    editProfile: 'Edit profile',
    notifications: 'Notifications',
    profile: 'Profile',
    portfolio: 'Portfolio',
    aboutWork: 'About the artwork',
    achievement: 'Achievement',
    newGroup: 'New group',
    group: 'Group',
    addStudent: 'Add student',
    newLesson: 'New lesson',
    listing: 'Listing',
    sellWork: 'Sell artwork',
    studentPayments: 'Student payments',
    studentsPayments: 'Students\' payments',
    charge: 'Charge',
    lessonChange: 'Lesson change',
    people: 'Students and parents',
    linkChild: 'Link a child',
    progressNote: 'Progress note',
    galleryPhoto: 'Photo for gallery',
    photo: 'Photo',
    tickets: 'Requests',
    help: 'Help',
    ticket: 'Request',
  },
};

const Stack = createNativeStackNavigator<StaffStackParamList>();

export function StaffNavigator() {
  const s = useStrings(STRINGS);
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="StaffTabs" component={StaffTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Messages" component={StaffAnnouncementsScreen} options={{ title: s.messages }} />
      <Stack.Screen name="Market" component={MarketplaceScreen} options={{ title: s.market }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: s.friends }} />
      <Stack.Screen
        name="ComposeAnnouncement"
        component={ComposeAnnouncementScreen}
        options={{ title: s.newAnnouncement }}
      />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: s.post }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: s.newWork }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: s.editProfile }} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: s.notifications }}
      />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: s.profile }} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: s.portfolio }} />
      <Stack.Screen name="EditArtwork" component={EditArtworkScreen} options={{ title: s.aboutWork }} />
      <Stack.Screen name="EditAchievement" component={EditAchievementScreen} options={{ title: s.achievement }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: s.newGroup }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: s.group }} />
      <Stack.Screen
        name="AddStudentToGroup"
        component={AddStudentToGroupScreen}
        options={{ title: s.addStudent }}
      />
      <Stack.Screen name="CreateLesson" component={CreateLessonScreen} options={{ title: s.newLesson }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: s.listing }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: s.sellWork }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: s.studentPayments }} />
      <Stack.Screen name="StudentBalances" component={StudentBalancesScreen} options={{ title: s.studentsPayments }} />
      <Stack.Screen name="BillingEntryForm" component={BillingEntryFormScreen} options={{ title: s.charge }} />
      <Stack.Screen name="LessonChange" component={LessonChangeScreen} options={{ title: s.lessonChange }} />
      <Stack.Screen name="People" component={PeopleScreen} options={{ title: s.people }} />
      <Stack.Screen name="LinkChild" component={LinkChildScreen} options={{ title: s.linkChild }} />
      <Stack.Screen name="AddProgressNote" component={AddProgressNoteScreen} options={{ title: s.progressNote }} />
      <Stack.Screen name="AddStudentPhoto" component={AddStudentPhotoScreen} options={{ title: s.galleryPhoto }} />
      <Stack.Screen name="PhotoView" component={PhotoViewScreen} options={{ title: s.photo }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: s.tickets }} />
      <Stack.Screen
        name="NewSupportTicket"
        component={NewSupportTicketScreen}
        options={{ title: s.help }}
      />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} options={{ title: s.ticket }} />
    </Stack.Navigator>
  );
}
