// ИИ-проверка публикации Комьюнити.
//
// Приложение вызывает функцию сразу после публикации (или изменения работы)
// с { postId }. Функция берёт фото и подпись, спрашивает Claude по правилам
// школы и записывает решение:
//   approve → публикация одобрена и сразу видна в Комьюнити;
//   reject  → отклонена, автор видит причину в «Мои публикации»;
//   review  → остаётся на проверке у сотрудника (с пояснением ИИ).
// Проверяется только публикация «на проверке», один раз: повторные вызовы
// ничего не стоят. Если ключа нет или Claude недоступен — публикация просто
// ждёт сотрудника, как раньше.
//
// Секреты (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY.
// Необязательно: MODERATION_MODEL (по умолчанию claude-opus-5-5).

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const MODEL = Deno.env.get('MODERATION_MODEL') ?? 'claude-opus-5-5';
const MAX_IMAGES = 10;

// Правила школы. Меняются здесь.
const RULES = `Ты проверяешь публикации в школьном приложении Школы искусств и дизайна им. А. Кастеева.
Пользователи — ученики (в том числе дети), их родители и преподаватели. Ученики публикуют фотографии
своих рисунков, картин и других работ, а также фото с занятий, выставок и конкурсов, с короткой подписью.

Отклоняй (reject), если в фото или подписи есть:
- нагота или сексуальный контент (в том числе в рисунках, кроме учебных академических штудий без откровенности);
- насилие, жестокость, оружие в угрожающем контексте, самоповреждение;
- оскорбления, травля, унижение, ненависть к людям или группам;
- реклама, спам, ссылки на сторонние сервисы, призывы что-то купить или подписаться;
- личные данные: номера телефонов, адреса, документы, пароли;
- явно чужая работа, выданная за свою (например, известная картина или скриншот из интернета с подписью «моя работа»).

Отправляй на ручную проверку (review), если не уверен: спорное содержание, плохо видно, неясный контекст,
посторонние люди крупным планом без явной связи с занятием.

Одобряй (approve) обычные творческие работы, процесс рисования, фото с занятий, выставок и конкурсов
с нормальной подписью. Не оценивай художественный уровень: слабые или детские работы одобряй.

Причину пиши по-русски, коротко и вежливо, так, чтобы её мог прочитать ребёнок.`;

const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['approve', 'reject', 'review'] },
    reason: { type: 'string', description: 'Короткая причина решения для автора или сотрудника' },
  },
  required: ['decision', 'reason'],
  additionalProperties: false,
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const { postId } = (await req.json()) as { postId?: string };
    if (!postId) return json(400, { error: 'postId required' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'Unauthorized' });
    const { data: auth, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !auth.user) return json(401, { error: 'Unauthorized' });

    const { data: post } = await admin
      .from('posts')
      .select('id, author_id, status, title, technique, caption, ai_checked_at')
      .eq('id', postId)
      .single();
    if (!post) return json(404, { error: 'Not found' });
    // Проверку запускает автор; повторно и для уже решённых — не тратим деньги.
    if (post.author_id !== auth.user.id) return json(403, { error: 'Forbidden' });
    if (post.status !== 'pending' || post.ai_checked_at) return json(200, { skipped: true });

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json(200, { skipped: true, reason: 'no api key' });

    const { data: images } = await admin
      .from('post_images')
      .select('image_url, position')
      .eq('post_id', postId)
      .order('position')
      .limit(MAX_IMAGES);

    const text = [
      post.title ? `Название: ${post.title}` : null,
      post.technique ? `Техника: ${post.technique}` : null,
      `Подпись: ${post.caption?.trim() || '(без подписи)'}`,
      `Фото: ${images?.length ?? 0}`,
    ]
      .filter(Boolean)
      .join('\n');

    const client = new Anthropic({ apiKey });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: RULES,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: DECISION_SCHEMA } },
      // Если модель откажется отвечать, запрос сам повторится на запасной модели.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [
        {
          role: 'user',
          content: [
            ...(images ?? []).map((img) => ({
              type: 'image' as const,
              source: { type: 'url' as const, url: img.image_url },
            })),
            { type: 'text' as const, text },
          ],
        },
      ],
    } as any);

    let decision: 'approve' | 'reject' | 'review' = 'review';
    let reason = 'ИИ не смог проверить публикацию, её посмотрит сотрудник.';
    if (response.stop_reason !== 'refusal') {
      const block = response.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
      try {
        const parsed = JSON.parse(block?.text ?? '{}');
        if (['approve', 'reject', 'review'].includes(parsed.decision)) {
          decision = parsed.decision;
          reason = String(parsed.reason ?? '').slice(0, 500);
        }
      } catch {
        // Неразборчивый ответ — оставляем на ручную проверку.
      }
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { ai_decision: decision, ai_reason: reason, ai_checked_at: now };
    if (decision === 'approve') {
      update.status = 'approved';
      update.moderated_at = now;
    } else if (decision === 'reject') {
      update.status = 'rejected';
      update.moderated_at = now;
    }
    // Только если публикация всё ещё на проверке (сотрудник мог успеть раньше).
    await admin.from('posts').update(update).eq('id', postId).eq('status', 'pending');

    return json(200, { decision });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Internal error' });
  }
});
