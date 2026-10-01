import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentStackParamList } from './types';
import { StudentTabs } from './StudentTabs';
import { PostDetailScreen } from '../screens/shared/PostDetailScreen';
import { CreatePostScreen } from '../screens/shared/CreatePostScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { NotificationSettingsScreen } from '../screens/shared/NotificationSettingsScreen';
import { UserProfileScreen } from '../screens/shared/UserProfileScreen';
import { PortfolioScreen } from '../screens/shared/PortfolioScreen';
import { EditArtworkScreen } from '../screens/shared/EditArtworkScreen';
import { EditAchievementScreen } from '../screens/shared/EditAchievementScreen';
import { ListingDetailScreen } from '../screens/shared/ListingDetailScreen';
import { CreateListingScreen } from '../screens/shared/CreateListingScreen';
import { PaymentsScreen } from '../screens/shared/PaymentsScreen';
import { AnnouncementsScreen } from '../screens/student/AnnouncementsScreen';
import { MarketplaceScreen } from '../screens/shared/MarketplaceScreen';
import { FriendsScreen } from '../screens/shared/FriendsScreen';
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
    post: 'Публикация',
    newWork: 'Новая работа',
    editProfile: 'Редактирование профиля',
    notifications: 'Уведомления',
    profile: 'Профиль',
    portfolio: 'Портфолио',
    aboutWork: 'О работе',
    achievement: 'Достижение',
    listing: 'Объявление',
    sellWork: 'Продажа работы',
    payments: 'Оплаты',
    help: 'Помощь',
    ticket: 'Обращение',
  },
  kk: {
    messages: 'Хабарламалар',
    market: 'Жұмыстарды сату',
    friends: 'Достар',
    post: 'Жарияланым',
    newWork: 'Жаңа жұмыс',
    editProfile: 'Профильді өңдеу',
    notifications: 'Хабарландырулар',
    profile: 'Профиль',
    portfolio: 'Портфолио',
    aboutWork: 'Жұмыс туралы',
    achievement: 'Жетістік',
    listing: 'Хабарландыру',
    sellWork: 'Жұмысты сату',
    payments: 'Төлемдер',
    help: 'Көмек',
    ticket: 'Өтініш',
  },
  en: {
    messages: 'Messages',
    market: 'Artwork sale',
    friends: 'Friends',
    post: 'Post',
    newWork: 'New artwork',
    editProfile: 'Edit profile',
    notifications: 'Notifications',
    profile: 'Profile',
    portfolio: 'Portfolio',
    aboutWork: 'About the artwork',
    achievement: 'Achievement',
    listing: 'Listing',
    sellWork: 'Sell artwork',
    payments: 'Payments',
    help: 'Help',
    ticket: 'Request',
  },
};

const Stack = createNativeStackNavigator<StudentStackParamList>();

export function StudentNavigator() {
  const s = useStrings(STRINGS);
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Messages" component={AnnouncementsScreen} options={{ title: s.messages }} />
      <Stack.Screen name="Market" component={MarketplaceScreen} options={{ title: s.market }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: s.friends }} />
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
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: s.listing }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: s.sellWork }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: s.payments }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: s.help }} />
      <Stack.Screen
        name="NewSupportTicket"
        component={NewSupportTicketScreen}
        options={{ title: s.help }}
      />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} options={{ title: s.ticket }} />
    </Stack.Navigator>
  );
}
