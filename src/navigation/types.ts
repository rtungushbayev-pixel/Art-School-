import type { NavigatorScreenParams } from '@react-navigation/native';

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
  ListingDetail: { listingId: string };
  CreateListing: undefined;
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
  CreateGroup: undefined;
  GroupDetail: { groupId: string };
  AddStudentToGroup: { groupId: string };
  CreateLesson: { groupId: string; lessonId?: string };
  ListingDetail: { listingId: string };
  CreateListing: undefined;
  People: undefined;
  LinkChild: { parentId: string };
  AddProgressNote: { studentId: string; studentName: string };
};

export type ParentTabParamList = {
  ChildrenTab: undefined;
  FeedTab: undefined;
  AnnouncementsTab: undefined;
  ProfileTab: undefined;
};

export type ParentStackParamList = {
  ParentTabs: NavigatorScreenParams<ParentTabParamList> | undefined;
  ChildDetail: { childId: string };
  PostDetail: { postId: string };
  EditProfile: undefined;
  NotificationSettings: undefined;
  UserProfile: { userId: string };
};
