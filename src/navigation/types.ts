import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BillingKind } from '../types/database';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type StudentTabParamList = {
  ScheduleTab: undefined;
  FeedTab: undefined;
  MarketTab: undefined;
  AnnouncementsTab: undefined;
  ProfileTab: undefined;
};

export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  UserProfile: { userId: string };
  Portfolio: { userId: string };
  EditArtwork: { postId: string };
  EditAchievement: { studentId: string; achievementId?: string };
  ListingDetail: { listingId: string };
  CreateListing: undefined;
  Payments: { studentId?: string } | undefined;
};

export type StaffTabParamList = {
  AnnouncementsTab: undefined;
  GroupsTab: undefined;
  FeedTab: undefined;
  MarketTab: undefined;
  AttendanceTab: undefined;
  ModerationTab: undefined;
  ProfileTab: undefined;
};

export type StaffStackParamList = {
  StaffTabs: NavigatorScreenParams<StaffTabParamList> | undefined;
  ComposeAnnouncement: { announcementId?: string } | undefined;
  AttendanceGroup: { groupId: string; groupName: string };
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  UserProfile: { userId: string };
  Portfolio: { userId: string };
  EditArtwork: { postId: string };
  EditAchievement: { studentId: string; achievementId?: string };
  CreateGroup: undefined;
  GroupDetail: { groupId: string };
  AddStudentToGroup: { groupId: string };
  CreateLesson: { groupId: string; lessonId?: string };
  ListingDetail: { listingId: string };
  CreateListing: undefined;
  Payments: { studentId?: string } | undefined;
  StudentBalances: undefined;
  BillingEntryForm:
    | { studentId: string; kind: BillingKind }
    | { groupId: string; kind: 'charge' };
  Schedule: undefined;
  LessonChange: { lessonId: string; date: string };
};
