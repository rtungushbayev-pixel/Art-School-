import { supabase } from './supabase';
import type { PostCardData } from '../components/PostCard';
import type { AchievementKind, Group, StudentAchievement } from '../types/database';
import { pick, type Lang } from '../i18n';

export const ACHIEVEMENT_KIND_LABELS: Record<AchievementKind, string> = {
  competition: 'Конкурс',
  exhibition: 'Выставка',
  award: 'Награда',
  other: 'Другое',
};

const ACHIEVEMENT_KIND_LABELS_I18N = {
  ru: ACHIEVEMENT_KIND_LABELS,
  kk: {
    competition: 'Байқау',
    exhibition: 'Көрме',
    award: 'Марапат',
    other: 'Басқа',
  } as Record<AchievementKind, string>,
  en: {
    competition: 'Competition',
    exhibition: 'Exhibition',
    award: 'Award',
    other: 'Other',
  } as Record<AchievementKind, string>,
};

// Подписи видов достижений на текущем (или переданном) языке.
export function achievementKindLabels(lang?: Lang): Record<AchievementKind, string> {
  return pick(ACHIEVEMENT_KIND_LABELS_I18N, lang);
}

// Сколько работ можно закрепить в начале портфолио
export const MAX_FEATURED_WORKS = 6;

// Избранные работы — первыми, дальше по дате публикации (свежие сверху).
export function sortPortfolio(posts: PostCardData[]): PostCardData[] {
  return [...posts].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

// Подпись под работой: «акварель, бумага · 2026»
export function artworkMeta(post: { technique: string | null; artwork_year: number | null }): string {
  return [post.technique, post.artwork_year].filter(Boolean).join(' · ');
}

export interface PortfolioStats {
  works: number;
  likes: number;
  achievements: number;
}

export function portfolioStats(posts: PostCardData[], achievements: StudentAchievement[]): PortfolioStats {
  const approved = posts.filter((p) => p.status === 'approved');
  return {
    works: approved.length,
    likes: approved.reduce((sum, p) => sum + p.likeCount, 0),
    achievements: achievements.length,
  };
}

export async function fetchAchievements(studentId: string): Promise<StudentAchievement[]> {
  const { data, error } = await supabase
    .from('student_achievements')
    .select('*')
    .eq('student_id', studentId)
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as StudentAchievement[]) ?? [];
}

export async function fetchAchievement(id: string): Promise<StudentAchievement | null> {
  const { data, error } = await supabase.from('student_achievements').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as StudentAchievement | null;
}

export interface AchievementInput {
  kind: AchievementKind;
  title: string;
  result: string | null;
  event_date: string | null;
  verified?: boolean;
}

export async function saveAchievement(studentId: string, input: AchievementInput, id?: string) {
  const { error } = id
    ? await supabase.from('student_achievements').update(input).eq('id', id)
    : await supabase.from('student_achievements').insert({ ...input, student_id: studentId });
  if (error) throw error;
}

export async function deleteAchievement(id: string) {
  const { error } = await supabase.from('student_achievements').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchStudentGroups(studentId: string): Promise<Pick<Group, 'id' | 'name'>[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups:group_id ( id, name )')
    .eq('student_id', studentId);
  if (error) throw error;
  return ((data as any[]) ?? [])
    .map((row) => row.groups as Pick<Group, 'id' | 'name'> | null)
    .filter((g): g is Pick<Group, 'id' | 'name'> => !!g)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function setPostFeatured(postId: string, featured: boolean) {
  const { error } = await supabase.from('posts').update({ featured }).eq('id', postId);
  if (error) throw error;
}

export interface ArtworkDetails {
  title: string | null;
  caption: string | null;
  technique: string | null;
  artwork_year: number | null;
}

// Изменение текста проверенной работы отправляет её на повторную модерацию
// (триггер в 0010_student_portfolio.sql).
export async function updateArtworkDetails(postId: string, details: ArtworkDetails) {
  const { error } = await supabase.from('posts').update(details).eq('id', postId);
  if (error) throw error;
}

// Год из поля ввода: пусто → null, иначе 4 цифры в разумных пределах.
export function parseYear(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}$/.test(trimmed)) return 'invalid';
  const year = Number(trimmed);
  if (year < 1950 || year > new Date().getFullYear() + 1) return 'invalid';
  return year;
}
