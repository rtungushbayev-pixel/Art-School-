export type UserRole = 'student' | 'staff';
export type EnrollmentStatus = 'planning' | 'applied' | 'enrolled';
export type SubmissionStatus = 'submitted' | 'reviewed';
export type PostStatus = 'pending' | 'approved' | 'rejected';
export type AnnouncementAudience = 'all' | 'students' | 'staff' | 'group';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ListingStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  target_institution: string | null;
  target_institution_status: EnrollmentStatus | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  student_id: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  group_id: string;
  title: string;
  room: string | null;
  day_of_week: number; // 1 = понедельник ... 7 = воскресенье
  start_time: string;
  end_time: string;
  created_by: string | null;
  created_at: string;
}

export interface Homework {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  attachment_url: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  content: string | null;
  attachment_url: string | null;
  status: SubmissionStatus;
  feedback: string | null;
  grade: number | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  caption: string | null;
  status: PostStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
}

export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  position: number;
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author_id: string | null;
  audience: AnnouncementAudience;
  group_id: string | null;
  pinned: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  group_id: string;
  lesson_id: string | null;
  student_id: string;
  lesson_date: string;
  status: AttendanceStatus;
  marked_by: string | null;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  contact_info: string | null;
  status: ListingStatus;
  sold: boolean;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
}

export interface MarketplaceListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  position: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> };
      group_members: { Row: GroupMember; Insert: GroupMember; Update: Partial<GroupMember> };
      lessons: { Row: Lesson; Insert: Partial<Lesson>; Update: Partial<Lesson> };
      homework: { Row: Homework; Insert: Partial<Homework>; Update: Partial<Homework> };
      homework_submissions: {
        Row: HomeworkSubmission;
        Insert: Partial<HomeworkSubmission>;
        Update: Partial<HomeworkSubmission>;
      };
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> };
      post_images: { Row: PostImage; Insert: Partial<PostImage>; Update: Partial<PostImage> };
      post_likes: { Row: PostLike; Insert: PostLike; Update: Partial<PostLike> };
      post_comments: { Row: PostComment; Insert: Partial<PostComment>; Update: Partial<PostComment> };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement> };
      attendance: { Row: Attendance; Insert: Partial<Attendance>; Update: Partial<Attendance> };
      marketplace_listings: {
        Row: MarketplaceListing;
        Insert: Partial<MarketplaceListing>;
        Update: Partial<MarketplaceListing>;
      };
      marketplace_listing_images: {
        Row: MarketplaceListingImage;
        Insert: Partial<MarketplaceListingImage>;
        Update: Partial<MarketplaceListingImage>;
      };
    };
  };
}
