export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type StudentTabParamList = {
  ScheduleTab: undefined;
  HomeworkTab: undefined;
  FeedTab: undefined;
  AnnouncementsTab: undefined;
  ProfileTab: undefined;
};

export type StudentStackParamList = {
  StudentTabs: undefined;
  HomeworkDetail: { homeworkId: string };
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditProfile: undefined;
  UserProfile: { userId: string };
};

export type StaffTabParamList = {
  AnnouncementsTab: undefined;
  AttendanceTab: undefined;
  ModerationTab: undefined;
  ProfileTab: undefined;
};

export type StaffStackParamList = {
  StaffTabs: undefined;
  ComposeAnnouncement: undefined;
  AttendanceGroup: { groupId: string; groupName: string };
  PostDetail: { postId: string };
  EditProfile: undefined;
  UserProfile: { userId: string };
};
