import { supabase } from './supabase';
import type { Profile } from '../types/database';

export type FriendState =
  | 'none'
  | 'friends'
  // я пригласил, ждём ответа
  | 'outgoing'
  // меня пригласили, можно принять
  | 'incoming'
  | 'blocked';

export interface FriendsData {
  friends: Profile[];
  incoming: Profile[];
  outgoing: Profile[];
  blocked: Profile[];
}

type FriendshipRow = { requester_id: string; addressee_id: string; status: 'pending' | 'accepted' };

async function fetchProfiles(ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  return new Map(((data as Profile[]) ?? []).map((p) => [p.id, p]));
}

function byName(a: Profile, b: Profile) {
  return a.full_name.localeCompare(b.full_name);
}

export async function fetchFriendsData(userId: string): Promise<FriendsData> {
  const [friendships, blocks] = await Promise.all([
    supabase.from('friendships').select('requester_id, addressee_id, status'),
    supabase.from('user_blocks').select('blocked_id'),
  ]);
  if (friendships.error) throw friendships.error;
  if (blocks.error) throw blocks.error;

  const rows = (friendships.data as FriendshipRow[]) ?? [];
  const blockedIds = (blocks.data ?? []).map((b) => b.blocked_id as string);
  const otherId = (r: FriendshipRow) => (r.requester_id === userId ? r.addressee_id : r.requester_id);
  const profiles = await fetchProfiles([...new Set([...rows.map(otherId), ...blockedIds])]);
  const pick = (ids: string[]) =>
    ids.map((id) => profiles.get(id)).filter((p): p is Profile => !!p).sort(byName);

  return {
    friends: pick(rows.filter((r) => r.status === 'accepted').map(otherId)),
    incoming: pick(rows.filter((r) => r.status === 'pending' && r.addressee_id === userId).map(otherId)),
    outgoing: pick(rows.filter((r) => r.status === 'pending' && r.requester_id === userId).map(otherId)),
    blocked: pick(blockedIds),
  };
}

export function friendStateOf(data: FriendsData, otherId: string): FriendState {
  if (data.blocked.some((p) => p.id === otherId)) return 'blocked';
  if (data.friends.some((p) => p.id === otherId)) return 'friends';
  if (data.incoming.some((p) => p.id === otherId)) return 'incoming';
  if (data.outgoing.some((p) => p.id === otherId)) return 'outgoing';
  return 'none';
}

// Друзей заводят ученики и сотрудники; родителей в поиске нет.
export async function searchPeople(userId: string, query: string): Promise<Profile[]> {
  let request = supabase
    .from('profiles')
    .select('*')
    .in('role', ['student', 'staff'])
    .neq('id', userId)
    .order('full_name')
    .limit(50);
  if (query.trim()) request = request.ilike('full_name', `%${query.trim()}%`);
  const { data, error } = await request;
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function sendFriendRequest(userId: string, otherId: string) {
  const { error } = await supabase.from('friendships').insert({ requester_id: userId, addressee_id: otherId });
  if (error) {
    if (error.message.includes('friend_request_blocked')) {
      throw new Error('Отправить приглашение нельзя: один из вас заблокировал другого.');
    }
    if (error.code === '23505') {
      throw new Error('Приглашение уже есть. Проверьте раздел «Заявки».');
    }
    throw error;
  }
}

export async function acceptFriendRequest(userId: string, otherId: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', otherId)
    .eq('addressee_id', userId);
  if (error) throw error;
}

// Отклонить или отменить приглашение, удалить из друзей.
export async function removeFriendship(userId: string, otherId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
    );
  if (error) throw error;
}

export async function blockUser(userId: string, otherId: string) {
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: userId, blocked_id: otherId });
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(userId: string, otherId: string) {
  const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', userId).eq('blocked_id', otherId);
  if (error) throw error;
}
