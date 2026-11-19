// Удаление своего аккаунта (находка M-9 аудита; без этого не пропустят
// App Store и Google Play).
//
// Вызывает только сам пользователь из приложения, со своим токеном. Функция
// удаляет его файлы из хранилища (аватар, работы, фото объявлений) и сам
// аккаунт. Профиль и все связанные записи (публикации, комментарии, друзья,
// привязки родителей, обращения) удаляются каскадом в базе. Запись в
// списке школы (school_roster) остаётся, её код снова можно использовать.
//
// Развёртывание: Supabase → Edge Functions → Deploy a new function →
// имя delete-account → вставить этот файл. Verify JWT оставить включённым.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

// student-photos — фото с занятий, которые сотрудники загрузили в папку ученика.
const USER_BUCKETS = ['avatars', 'portfolio', 'marketplace', 'student-photos'];

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Все файлы в папке пользователя {uid}/ (папки в бакетах — по id владельца).
async function removeUserFiles(admin: SupabaseClient, userId: string) {
  for (const bucket of USER_BUCKETS) {
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 100 });
      if (error || !data || data.length === 0) break;
      const paths = data.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) throw removeError;
      if (data.length < 100) break;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  try {
    const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'Unauthorized' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // anon-ключ — тоже валидный JWT, но пользователя за ним нет.
    const { data: auth, error } = await admin.auth.getUser(jwt);
    if (error || !auth.user) return json(401, { error: 'Unauthorized' });
    const userId = auth.user.id;

    // Нужен недавний вход: приложение перед удалением просит пароль ещё раз,
    // чтобы чужой человек с разблокированным телефоном не удалил аккаунт.
    const lastSignIn = auth.user.last_sign_in_at ? Date.parse(auth.user.last_sign_in_at) : 0;
    if (Date.now() - lastSignIn > 10 * 60 * 1000) {
      return json(403, { error: 'reauthentication_required' });
    }

    await removeUserFiles(admin, userId);
    // Push-токены удалятся каскадом вместе с профилем.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return json(200, { deleted: true });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Internal error' });
  }
});
