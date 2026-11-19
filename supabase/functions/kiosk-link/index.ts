// Ссылка для подключения планшета филиала (см. миграцию 0049).
//
// Почтовые программы не делают кликабельными ссылки вида kasteyevschool://,
// поэтому в письме обычная https-ссылка на эту функцию, а она перенаправляет
// в приложение: kasteyevschool://kiosk?k=КОД. Сама функция ничего не
// проверяет и не хранит — код проверяет pair_kiosk, когда на планшете
// нажмут «Подключить».
//
// Развёртывание: Supabase → Edge Functions → Deploy a new function →
// имя kiosk-link → вставить этот файл. Verify JWT выключить: ссылку
// открывают из письма, без входа в аккаунт.

Deno.serve((req) => {
  const code = (new URL(req.url).searchParams.get('k') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
  if (!code) {
    return new Response('Ссылка неполная. Попросите администратора школы прислать новую.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: `kasteyevschool://kiosk?k=${code}`, 'Cache-Control': 'no-store' },
  });
});
