export type UserRole = 'student' | 'staff' | 'parent' | 'admin';
export type EnrollmentStatus = 'planning' | 'applied' | 'enrolled';
export type PostStatus = 'pending' | 'approved' | 'rejected';
export type AnnouncementAudience = 'all' | 'students' | 'staff' | 'group';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ListingStatus = 'pending' | 'approved' | 'rejected';
export type BillingKind = 'charge' | 'payment';
export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type AchievementKind = 'competition' | 'exhibition' | 'award' | 'other';
export type SupportCategory = 'bug' | 'schedule' | 'operations' | 'question' | 'other';
export type SupportStatus = 'open' | 'answered' | 'closed';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  target_institution: string | null;
  target_institution_status: EnrollmentStatus | null;
  specialization: string | null; // направление: живопись, графика, дизайн…
  study_since: number | null; // год начала обучения в школе
  notify_announcements: boolean;
  notify_comments: boolean;
  notify_moderation: boolean;
  notify_support: boolean;
  created_at: string;
  updated_at: string;
}

// Личные данные профиля: видит только владелец и сотрудники.
export interface ProfilePrivate {
  user_id: string;
  phone: string | null;
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

// Разовое изменение регулярного занятия на конкретную дату.
export interface LessonChange {
  id: string;
  lesson_id: string;
  lesson_date: string; // YYYY-MM-DD
  cancelled: boolean;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

// Запись учёта оплат: начисление (charge) или принятая оплата (payment).
export interface BillingEntry {
  id: string;
  student_id: string;
  kind: BillingKind;
  amount: number;
  currency: string;
  description: string;
  method: PaymentMethod | null;
  entry_date: string; // YYYY-MM-DD
  created_by: string | null;
  created_at: string;
}

// Баланс ученика (view student_balances): оплачено минус начислено.
export interface StudentBalance {
  student_id: string;
  currency: string;
  charged: number;
  paid: number;
  balance: number;
}

export interface Post {
  id: string;
  author_id: string;
  caption: string | null;
  title: string | null;
  technique: string | null; // техника и материалы
  artwork_year: number | null;
  featured: boolean; // закреплена в начале портфолио
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

// Конкурсы, выставки, награды ученика. verified ставит только сотрудник.
export interface StudentAchievement {
  id: string;
  student_id: string;
  kind: AchievementKind;
  title: string;
  result: string | null;
  event_date: string | null;
  verified: boolean;
  verified_by: string | null;
  created_by: string | null;
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

// Привязка родителя к ребёнку. Назначает сотрудник.
export interface ParentChild {
  parent_id: string;
  student_id: string;
  created_at: string;
}

// Запись преподавателя о прогрессе ученика. Видят сотрудники, сам ученик
// и его родители.
export interface ProgressNote {
  id: string;
  student_id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  rating: number | null; // 1–5
  created_at: string;
}

// Фото в галерее ученика, которое загрузил сотрудник. Файл лежит в закрытом
// бакете student-photos, показывается по временной ссылке.
export interface StudentPhoto {
  id: string;
  student_id: string;
  uploaded_by: string | null;
  storage_path: string;
  caption: string | null;
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

// Обращение в «Помощь»: переписка пользователя с сотрудниками школы.
export interface SupportTicket {
  id: string;
  author_id: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  device_info: string | null;
  created_at: string;
  last_message_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      profile_private: {
        Row: ProfilePrivate;
        Insert: Partial<ProfilePrivate> & { user_id: string };
        Update: Partial<ProfilePrivate>;
      };
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> };
      group_members: { Row: GroupMember; Insert: GroupMember; Update: Partial<GroupMember> };
      lessons: { Row: Lesson; Insert: Partial<Lesson>; Update: Partial<Lesson> };
      lesson_changes: { Row: LessonChange; Insert: Partial<LessonChange>; Update: Partial<LessonChange> };
      billing_entries: { Row: BillingEntry; Insert: Partial<BillingEntry>; Update: Partial<BillingEntry> };
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> };
      post_images: { Row: PostImage; Insert: Partial<PostImage>; Update: Partial<PostImage> };
      post_likes: { Row: PostLike; Insert: PostLike; Update: Partial<PostLike> };
      post_comments: { Row: PostComment; Insert: Partial<PostComment>; Update: Partial<PostComment> };
      student_achievements: {
        Row: StudentAchievement;
        Insert: Partial<StudentAchievement> & { student_id: string; title: string };
        Update: Partial<StudentAchievement>;
      };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement> };
      attendance: { Row: Attendance; Insert: Partial<Attendance>; Update: Partial<Attendance> };
      parent_children: { Row: ParentChild; Insert: Omit<ParentChild, 'created_at'>; Update: Partial<ParentChild> };
      progress_notes: { Row: ProgressNote; Insert: Partial<ProgressNote>; Update: Partial<ProgressNote> };
      student_photos: { Row: StudentPhoto; Insert: Partial<StudentPhoto>; Update: Partial<StudentPhoto> };
      marketplace_listings: {
        Row: MarketplaceListing;
        Insert: Partial<MarketplaceListing>;
        Update: Partial<MarketplaceListing>;
      };
      support_tickets: { Row: SupportTicket; Insert: Partial<SupportTicket>; Update: Partial<SupportTicket> };
      support_messages: { Row: SupportMessage; Insert: Partial<SupportMessage>; Update: Partial<SupportMessage> };
      marketplace_listing_images: {
        Row: MarketplaceListingImage;
        Insert: Partial<MarketplaceListingImage>;
        Update: Partial<MarketplaceListingImage>;
      };
    };
  };
}
