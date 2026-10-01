import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BillingKind } from '../types/database';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type StudentTabParamList = {
  ScheduleTab: undefined;
  FeedTab: undefined;
  ProfileTab: undefined;
};

export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;
  Messages: undefined;
  Market: undefined;
  Friends: undefined;
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
  ScheduleTab: undefined;
  GroupsTab: undefined;
  FeedTab: undefined;
  ModerationTab: undefined;
  ProfileTab: undefined;
};

export type StaffStackParamList = {
  StaffTabs: NavigatorScreenParams<StaffTabParamList> | undefined;
  Messages: undefined;
  Market: undefined;
  Friends: undefined;
  ComposeAnnouncement: { announcementId?: string } | undefined;
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
  LessonChange: { lessonId: string; date: string };
  People: undefined;
  LinkChild: { parentId: string };
  AddProgressNote: { studentId: string; studentName: string };
  AddStudentPhoto: { studentId: string; studentName: string };
  PhotoView: { uri: string; caption?: string | null };
};

export type ParentTabParamList = {
  ScheduleTab: undefined;
  FeedTab: undefined;
  ProfileTab: undefined;
};

export type ParentStackParamList = {
  ParentTabs: NavigatorScreenParams<ParentTabParamList> | undefined;
  Portfolio: { userId: string };
  Messages: undefined;
  Children: undefined;
  ChildDetail: { childId: string };
  PhotoView: { uri: string; caption?: string | null };
  PostDetail: { postId: string };
  EditProfile: undefined;
  NotificationSettings: undefined;
  UserProfile: { userId: string };
};
