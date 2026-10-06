import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BillingKind, SupportCategory } from '../types/database';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
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
  Friends: { focusSearch?: boolean; showBlocked?: boolean } | undefined;
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
  Support: undefined;
  NewSupportTicket: { category: SupportCategory };
  SupportTicket: { ticketId: string };
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
  Friends: { focusSearch?: boolean; showBlocked?: boolean } | undefined;
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
  Support: undefined;
  NewSupportTicket: { category: SupportCategory };
  SupportTicket: { ticketId: string };
  MaterialRequests: undefined;
  NewMaterialRequest: undefined;
  MaterialRequest: { requestId: string };
  MaterialSummary: undefined;
};

// Администрация: заявки на материалы и профиль. Стек — часть стека сотрудника.
export type OfficeTabParamList = {
  MaterialsTab: undefined;
  ProfileTab: undefined;
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
  AddChild: undefined;
  ChildDetail: { childId: string };
  PhotoView: { uri: string; caption?: string | null };
  PostDetail: { postId: string };
  EditProfile: undefined;
  NotificationSettings: undefined;
  UserProfile: { userId: string };
  Support: undefined;
  NewSupportTicket: { category: SupportCategory };
  SupportTicket: { ticketId: string };
};
