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
  StudentTabs: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditProfile: undefined;
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
  StaffTabs: undefined;
  ComposeAnnouncement: undefined;
  AttendanceGroup: { groupId: string; groupName: string };
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditProfile: undefined;
  UserProfile: { userId: string };
  CreateGroup: undefined;
  GroupDetail: { groupId: string };
  AddStudentToGroup: { groupId: string };
  CreateLesson: { groupId: string; lessonId?: string };
  ListingDetail: { listingId: string };
  CreateListing: undefined;
};
