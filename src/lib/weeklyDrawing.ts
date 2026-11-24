// «Рисунок недели», огонёк серии недель и опыт героя.
// Ученики параллельно учатся в обычной школе, поэтому тема — на неделю
// (понедельник – воскресенье по Алматы). Опыт считает сервер (hero_xp в 0060),
// здесь — темы и подписи.
import { supabase } from './supabase';
import { pick, type Lang, type Translations } from '../i18n';

// Сколько опыта за что (те же числа, что в 0060_weekly_drawing_xp.sql).
export const XP_WEEKLY = 50;
export const XP_LESSON = 10;
export const XP_STREAK_4 = 100;
export const XP_STREAK_12 = 300;
// Каждые 100 опыта — новая звезда у героя.
export const XP_PER_STAR = 100;
// Награды за серию недель подряд (каждая — один раз).
export const STREAK_GOALS = [4, 12] as const;

type Theme = { ru: string; kk: string; en: string; hint: { ru: string; kk: string; en: string } };

const THEMES: Theme[] = [
  { ru: 'Моя чашка', kk: 'Менің кесем', en: 'My cup', hint: { ru: 'Нарисуй чашку, из которой пьёшь чай', kk: 'Шай ішетін кесеңді сал', en: 'Draw the cup you drink tea from' } },
  { ru: 'Вид из окна', kk: 'Терезеден көрініс', en: 'View from the window', hint: { ru: 'Что ты видишь из окна прямо сейчас?', kk: 'Дәл қазір терезеден не көріп тұрсың?', en: 'What do you see from your window right now?' } },
  { ru: 'Любимая еда', kk: 'Сүйікті тағам', en: 'Favourite food', hint: { ru: 'Баурсаки, яблоко или пицца — выбирай', kk: 'Бауырсақ, алма не пицца — таңда', en: 'Baursaks, an apple or pizza: you choose' } },
  { ru: 'Горы Алатау', kk: 'Алатау таулары', en: 'The Alatau mountains', hint: { ru: 'Снежные вершины над городом', kk: 'Қала үстіндегі қарлы шыңдар', en: 'Snowy peaks above the city' } },
  { ru: 'Мой питомец', kk: 'Менің үй жануарым', en: 'My pet', hint: { ru: 'Или животное, которое хотел бы завести', kk: 'Немесе асырағың келетін жануар', en: 'Or an animal you would like to have' } },
  { ru: 'Обувь', kk: 'Аяқ киім', en: 'Shoes', hint: { ru: 'Нарисуй свои кроссовки или ботинки с натуры', kk: 'Кроссовкаңды не етігіңді нобайдан сал', en: 'Draw your sneakers or boots from life' } },
  { ru: 'Дерево', kk: 'Ағаш', en: 'A tree', hint: { ru: 'Ствол, ветки и листья — смотри на тени', kk: 'Діңі, бұтағы, жапырағы — көлеңкеге қара', en: 'Trunk, branches and leaves: watch the shadows' } },
  { ru: 'Портрет друга', kk: 'Досыңның портреті', en: 'A friend’s portrait', hint: { ru: 'Попроси кого-нибудь посидеть 10 минут', kk: 'Біреуден 10 минут отыруды сұра', en: 'Ask someone to sit still for 10 minutes' } },
  { ru: 'Космос', kk: 'Ғарыш', en: 'Space', hint: { ru: 'Планеты, ракеты или Байконур', kk: 'Планеталар, зымырандар не Байқоңыр', en: 'Planets, rockets or Baikonur' } },
  { ru: 'Три яблока', kk: 'Үш алма', en: 'Three apples', hint: { ru: 'Маленький натюрморт: свет, тень, блик', kk: 'Шағын натюрморт: жарық, көлеңке, жарқыл', en: 'A small still life: light, shadow, highlight' } },
  { ru: 'Моя рука', kk: 'Менің қолым', en: 'My hand', hint: { ru: 'Нарисуй свою руку в необычной позе', kk: 'Қолыңды ерекше қалыпта сал', en: 'Draw your hand in an unusual pose' } },
  { ru: 'Юрта', kk: 'Киіз үй', en: 'A yurt', hint: { ru: 'Снаружи или внутри, с узорами', kk: 'Сырты не іші, оюларымен', en: 'Outside or inside, with patterns' } },
  { ru: 'Дождь', kk: 'Жаңбыр', en: 'Rain', hint: { ru: 'Лужи, зонты, отражения', kk: 'Шалшықтар, қолшатырлар, шағылыс', en: 'Puddles, umbrellas, reflections' } },
  { ru: 'Сказочный зверь', kk: 'Ертегі аң', en: 'A fairy-tale creature', hint: { ru: 'Придумай животное, которого нет', kk: 'Жоқ жануарды ойлап тап', en: 'Invent an animal that does not exist' } },
  { ru: 'Мой рюкзак', kk: 'Менің рюкзагым', en: 'My backpack', hint: { ru: 'Рисуй с натуры, со всеми молниями', kk: 'Барлық сыдырмасымен нобайдан сал', en: 'Draw it from life, zips and all' } },
  { ru: 'Город ночью', kk: 'Түнгі қала', en: 'The city at night', hint: { ru: 'Окна, фонари, огни машин', kk: 'Терезелер, шамдар, көлік жарығы', en: 'Windows, street lamps, car lights' } },
  { ru: 'Цветок', kk: 'Гүл', en: 'A flower', hint: { ru: 'Найди настоящий цветок и рассмотри лепестки', kk: 'Нағыз гүл тауып, күлтелерін қара', en: 'Find a real flower and study the petals' } },
  { ru: 'Автопортрет', kk: 'Автопортрет', en: 'Self-portrait', hint: { ru: 'Посмотри в зеркало, как Рембрандт', kk: 'Рембрандт сияқты айнаға қара', en: 'Look in the mirror, like Rembrandt' } },
  { ru: 'Транспорт', kk: 'Көлік', en: 'Transport', hint: { ru: 'Автобус, метро, велосипед или самолёт', kk: 'Автобус, метро, велосипед не ұшақ', en: 'Bus, metro, bike or plane' } },
  { ru: 'Птица', kk: 'Құс', en: 'A bird', hint: { ru: 'Воробей за окном или беркут в горах', kk: 'Терезедегі торғай не таудағы бүркіт', en: 'A sparrow outside or an eagle in the mountains' } },
  { ru: 'Музыка', kk: 'Музыка', en: 'Music', hint: { ru: 'Домбра, пианино или просто настроение песни', kk: 'Домбыра, пианино не әннің көңіл күйі', en: 'A dombra, a piano or just the mood of a song' } },
  { ru: 'Мой герой', kk: 'Менің кейіпкерім', en: 'My hero', hint: { ru: 'Нарисуй своего героя из приложения по-своему', kk: 'Қосымшадағы кейіпкеріңді өзіңше сал', en: 'Draw your app hero in your own way' } },
  { ru: 'Утро', kk: 'Таң', en: 'Morning', hint: { ru: 'Как начинается твой день?', kk: 'Күнің қалай басталады?', en: 'How does your day begin?' } },
  { ru: 'Узор', kk: 'Ою-өрнек', en: 'An ornament', hint: { ru: 'Казахский орнамент: қошқар мүйіз, волна, звезда', kk: 'Қазақ оюы: қошқар мүйіз, толқын, жұлдыз', en: 'A Kazakh ornament: ram’s horn, wave, star' } },
  { ru: 'Под водой', kk: 'Су астында', en: 'Underwater', hint: { ru: 'Рыбы, кораллы, затонувший корабль', kk: 'Балықтар, маржандар, батқан кеме', en: 'Fish, corals, a sunken ship' } },
  { ru: 'Кот', kk: 'Мысық', en: 'A cat', hint: { ru: 'Спит, играет или охотится', kk: 'Ұйықтап, ойнап не аңдып жатыр', en: 'Sleeping, playing or hunting' } },
  { ru: 'Моя комната', kk: 'Менің бөлмем', en: 'My room', hint: { ru: 'Попробуй нарисовать уголок в перспективе', kk: 'Бір бұрышын перспективада салып көр', en: 'Try drawing one corner in perspective' } },
  { ru: 'Облака', kk: 'Бұлттар', en: 'Clouds', hint: { ru: 'На что похоже сегодняшнее небо?', kk: 'Бүгінгі аспан неге ұқсайды?', en: 'What does today’s sky look like?' } },
  { ru: 'Скорость', kk: 'Жылдамдық', en: 'Speed', hint: { ru: 'Покажи движение: бег, скачки, гонку', kk: 'Қозғалысты көрсет: жүгіру, бәйге, жарыс', en: 'Show motion: running, a horse race, a car race' } },
  { ru: 'Конь', kk: 'Ат', en: 'A horse', hint: { ru: 'Степной скакун в движении', kk: 'Қозғалыстағы дала жүйрігі', en: 'A steppe horse in motion' } },
  { ru: 'Робот', kk: 'Робот', en: 'A robot', hint: { ru: 'Придумай робота-помощника', kk: 'Көмекші робот ойлап тап', en: 'Invent a helper robot' } },
  { ru: 'Овощи', kk: 'Көкөністер', en: 'Vegetables', hint: { ru: 'Натюрморт с кухни: лук, морковь, перец', kk: 'Ас үй натюрморты: пияз, сәбіз, бұрыш', en: 'A kitchen still life: onion, carrot, pepper' } },
  { ru: 'Мечта', kk: 'Арман', en: 'A dream', hint: { ru: 'Кем ты хочешь стать или куда поехать?', kk: 'Кім болғың не қайда барғың келеді?', en: 'Who do you want to be, or where do you want to go?' } },
  { ru: 'Только три цвета', kk: 'Тек үш түс', en: 'Only three colours', hint: { ru: 'Любой сюжет, но всего три краски', kk: 'Кез келген тақырып, бірақ тек үш бояу', en: 'Any subject, but only three paints' } },
  { ru: 'Зима', kk: 'Қыс', en: 'Winter', hint: { ru: 'Снег, каток, Медеу', kk: 'Қар, сырғанақ, Медеу', en: 'Snow, ice skating, Medeu' } },
  { ru: 'Мама или папа', kk: 'Анам не әкем', en: 'Mum or dad', hint: { ru: 'Нарисуй, чем они сейчас заняты', kk: 'Олар қазір немен айналысып жатқанын сал', en: 'Draw what they are doing right now' } },
  { ru: 'Ключи', kk: 'Кілттер', en: 'Keys', hint: { ru: 'Маленький предмет — большие детали', kk: 'Кішкентай зат — үлкен бөлшектер', en: 'A small object, big details' } },
  { ru: 'Улица у дома', kk: 'Үй жанындағы көше', en: 'The street by my home', hint: { ru: 'Дома, деревья, люди', kk: 'Үйлер, ағаштар, адамдар', en: 'Houses, trees, people' } },
  { ru: 'Насекомое', kk: 'Жәндік', en: 'An insect', hint: { ru: 'Бабочка, жук или божья коровка крупным планом', kk: 'Көбелек, қоңыз не қызыл қоңыз ірі планда', en: 'A butterfly, beetle or ladybird close up' } },
  { ru: 'Как у великого художника', kk: 'Ұлы суретші сияқты', en: 'Like a great artist', hint: { ru: 'Повтори стиль своего героя: мазки, цвет, свет', kk: 'Кейіпкеріңнің стилін қайтала: жағыс, түс, жарық', en: 'Copy your hero’s style: strokes, colour, light' } },
];

// Сегодняшняя дата по Алматы (UTC+5), как на сервере (school_today в 0060).
export function schoolToday(now = new Date()): string {
  const d = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

const DAY = 86_400_000;

// Понедельник недели (как school_week в 0060) и сколько дней до конца недели.
export function schoolWeek(now = new Date()): { monday: string; daysLeft: number } {
  const today = Date.parse(`${schoolToday(now)}T00:00:00Z`);
  const dow = (new Date(today).getUTCDay() + 6) % 7; // 0 — понедельник
  const monday = new Date(today - dow * DAY).toISOString().slice(0, 10);
  return { monday, daysLeft: 7 - dow };
}

export function weeklyTheme(monday: string = schoolWeek().monday, lang?: Lang): { title: string; hint: string } {
  const n = Math.floor(Date.parse(`${monday}T00:00:00Z`) / (7 * DAY));
  const t = THEMES[((n % THEMES.length) + THEMES.length) % THEMES.length];
  const title = pick({ ru: t.ru, kk: t.kk, en: t.en } as Translations<string>, lang);
  const hint = pick(t.hint as Translations<string>, lang);
  return { title, hint };
}

export interface HeroXp {
  xp: number;
  weeks: number; // недель с рисунком недели
  attended: number; // занятий, где ученик был
  streak: number; // огонёк: недель подряд сейчас
  bestStreak: number;
  drewThisWeek: boolean;
}

export const EMPTY_XP: HeroXp = { xp: 0, weeks: 0, attended: 0, streak: 0, bestStreak: 0, drewThisWeek: false };

export async function fetchHeroXp(studentId: string): Promise<HeroXp> {
  const { data, error } = await supabase.rpc('hero_xp', { p_student_id: studentId });
  if (error) throw error;
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    xp: Number(d.xp ?? 0),
    weeks: Number(d.weeks ?? 0),
    attended: Number(d.attended ?? 0),
    streak: Number(d.streak ?? 0),
    bestStreak: Number(d.best_streak ?? 0),
    drewThisWeek: Boolean(d.drew_this_week),
  };
}

// Звёзды героя: целые сотни опыта и путь к следующей.
export function xpStars(xp: number): { stars: number; into: number } {
  return { stars: Math.floor(xp / XP_PER_STAR), into: xp % XP_PER_STAR };
}

// Следующая награда за серию, которую ещё не получал.
export function nextStreakGoal(best: number): number | null {
  return STREAK_GOALS.find((g) => best < g) ?? null;
}
