// Персонаж ученика — великий художник, который «растёт» вместе с ним.
//
// Стадия (1–5) зависит от группы: Младшая → Средняя → Старшая → 0–6 курс.
// Уровень (1–10) — шаг внутри школы, стадия меняется каждые два уровня.
// Сила (0–4) — за участие в конкурсах и выставках и подтверждённые
// достижения: аура → плащ творца → кристалл → магистр.
//
// Истории — короткие главы из настоящих биографий: каким художник был
// в том же возрасте, что и ученик на этой стадии.

import { pick, type Lang, type Translations } from '../i18n';
import { supabase } from './supabase';
import type { HeroLook, HeroPower, HeroStage } from './heroArt';
import { HERO_STORIES } from './heroStories';
import { HERO_STORIES_KK } from './heroStories.kk';

export type HeroId =
  | 'kasteyev'
  | 'leonardo'
  | 'michelangelo'
  | 'rembrandt'
  | 'aivazovsky'
  | 'vangogh'
  | 'monet'
  | 'artemisia'
  | 'serebryakova'
  | 'cassatt'
  | 'durer'
  | 'raphael'
  | 'sofonisba'
  | 'repin';

// Настоящий автопортрет художника (общественное достояние, Wikimedia Commons).
export interface HeroPortrait {
  image: number; // require(...) картинки из assets/heroes
  caption: string;
}

export interface Hero {
  id: HeroId;
  name: Translations<string>;
  years: string;
  // Одна строка под именем: чем знаменит.
  tagline: Translations<string>;
  look: HeroLook;
  // Настоящие автопортреты разных лет, если они есть в общественном достоянии.
  portraits?: HeroPortrait[];
  // Реалистичный портрет для списка «Великие художники» (если нет автопортретов).
  avatar?: number;
}

export const HEROES: Hero[] = [
  {
    id: 'kasteyev',
    name: { ru: 'Абылхан Кастеев', kk: 'Әбілхан Қастеев', en: 'Abylkhan Kasteyev' },
    years: '1904–1973',
    // Портрет из логотипа школы.
    avatar: require('../../assets/heroes/kasteyev_avatar.jpg'),
    tagline: {
      ru: 'Первый профессиональный художник Казахстана',
      kk: 'Қазақстанның тұңғыш кәсіби суретшісі',
      en: "Kazakhstan's first professional painter",
    },
    look: {
      skin: '#D9A47E',
      hair: '#1E1A18',
      hairMaster: '#9C9A98',
      hairStyle: 'short',
      hat: { from: 1, style: 'tubeteika', color: '#2E6B4F' },
      outfit: '#2F4E7A',
      collar: '#F1E6D0',
      accent: '#3B9C93',
      scene: 'mountains',
    },
  },
  {
    id: 'leonardo',
    name: { ru: 'Леонардо да Винчи', kk: 'Леонардо да Винчи', en: 'Leonardo da Vinci' },
    years: '1452–1519',
    tagline: {
      ru: 'Художник, изобретатель и учёный эпохи Возрождения',
      kk: 'Қайта өрлеу дәуірінің суретшісі, өнертапқышы және ғалымы',
      en: 'Renaissance painter, inventor and scientist',
    },
    look: {
      skin: '#EBC2A0',
      hair: '#8A5A35',
      hairMaster: '#E6E2DA',
      hairStyle: 'long',
      beard: { from: 5, style: 'long' },
      hat: { from: 3, style: 'beret', color: '#8E2B3A' },
      outfit: '#A2433F',
      collar: '#F3E5C8',
      accent: '#B5651D',
      scene: 'parchment',
    },
  },
  {
    id: 'michelangelo',
    name: { ru: 'Микеланджело', kk: 'Микеланджело', en: 'Michelangelo' },
    years: '1475–1564',
    tagline: {
      ru: 'Скульптор «Давида» и автор росписи Сикстинской капеллы',
      kk: '«Давид» мүсінінің және Сикстин капелласы суреттерінің авторы',
      en: 'Sculptor of David, painter of the Sistine Chapel',
    },
    look: {
      skin: '#E2B48E',
      hair: '#2A1E17',
      hairMaster: '#6E6762',
      hairStyle: 'curly',
      beard: { from: 4, style: 'short' },
      outfit: '#6B4B32',
      collar: '#E8DCC6',
      accent: '#C9B79C',
      scene: 'marble',
    },
  },
  {
    id: 'rembrandt',
    name: { ru: 'Рембрандт', kk: 'Рембрандт', en: 'Rembrandt' },
    years: '1606–1669',
    tagline: {
      ru: 'Мастер света и тени, голландский живописец',
      kk: 'Жарық пен көлеңке шебері, голланд суретшісі',
      en: 'Dutch master of light and shadow',
    },
    look: {
      skin: '#E7BE9A',
      hair: '#7A4A2A',
      hairMaster: '#B9B2AA',
      hairStyle: 'wavy',
      beard: { from: 4, style: 'goatee' },
      hat: { from: 4, style: 'beret', color: '#2B2420' },
      outfit: '#4A3324',
      collar: '#EADDBE',
      accent: '#C88A2E',
      scene: 'candle',
    },
    portraits: [
      { image: require('../../assets/heroes/rembrandt_1.jpg'), caption: 'Автопортрет, 1628 · 22 года' },
      { image: require('../../assets/heroes/rembrandt_2.jpg'), caption: 'Автопортрет, 1640 · 34 года' },
      { image: require('../../assets/heroes/rembrandt_3.jpg'), caption: 'Автопортрет, 1659 · 53 года' },
      { image: require('../../assets/heroes/rembrandt_4.jpg'), caption: 'Автопортрет, 1669 · 63 года' },
    ],
  },
  {
    id: 'aivazovsky',
    name: { ru: 'Иван Айвазовский', kk: 'Иван Айвазовский', en: 'Ivan Aivazovsky' },
    years: '1817–1900',
    tagline: {
      ru: 'Великий художник моря, автор «Девятого вала»',
      kk: 'Теңізді бейнелеген ұлы суретші, «Тоғызыншы толқынның» авторы',
      en: 'Great painter of the sea, author of The Ninth Wave',
    },
    look: {
      skin: '#E6B994',
      hair: '#2A211C',
      hairMaster: '#A9A6A2',
      hairStyle: 'curly',
      beard: { from: 4, style: 'sideburns' },
      outfit: '#1F3A5F',
      collar: '#F4F1EA',
      accent: '#2F6F8F',
      scene: 'sea',
    },
  },
  {
    id: 'vangogh',
    name: { ru: 'Винсент ван Гог', kk: 'Винсент ван Гог', en: 'Vincent van Gogh' },
    years: '1853–1890',
    tagline: {
      ru: 'Автор «Звёздной ночи» и «Подсолнухов»',
      kk: '«Жұлдызды түн» мен «Күнбағыстардың» авторы',
      en: 'Painter of The Starry Night and Sunflowers',
    },
    look: {
      skin: '#F0C8A6',
      hair: '#C1532A',
      hairStyle: 'short',
      beard: { from: 4, style: 'short', color: '#B8492A' },
      hat: { from: 3, style: 'straw', color: '#E8C55E' },
      outfit: '#3E6FB5',
      collar: '#E9EEF5',
      accent: '#F2C14E',
      scene: 'stars',
    },
    portraits: [
      { image: require('../../assets/heroes/vangogh_1.jpg'), caption: 'Фотография, 1873 · 19 лет' },
      { image: require('../../assets/heroes/vangogh_2.jpg'), caption: 'Автопортрет, 1887 · 34 года' },
      { image: require('../../assets/heroes/vangogh_3.jpg'), caption: 'Автопортрет в серой фетровой шляпе, 1887' },
      { image: require('../../assets/heroes/vangogh_4.jpg'), caption: 'Автопортрет, 1889 · 36 лет' },
    ],
  },
  {
    id: 'monet',
    name: { ru: 'Клод Моне', kk: 'Клод Моне', en: 'Claude Monet' },
    years: '1840–1926',
    tagline: {
      ru: 'Основатель импрессионизма, автор «Кувшинок»',
      kk: 'Импрессионизмнің негізін салушы, «Су лалаларының» авторы',
      en: 'Founder of Impressionism, painter of the Water Lilies',
    },
    look: {
      skin: '#EFC7A6',
      hair: '#3B2A20',
      hairMaster: '#ECEAE6',
      hairStyle: 'short',
      beard: { from: 4, style: 'full' },
      outfit: '#5F6E73',
      collar: '#F3F0E8',
      accent: '#8266C2',
      scene: 'lilies',
    },
  },
  {
    id: 'artemisia',
    name: { ru: 'Артемизия Джентилески', kk: 'Артемизия Джентилески', en: 'Artemisia Gentileschi' },
    years: '1593 — около 1656',
    tagline: {
      ru: 'Первая женщина в Академии рисунка Флоренции',
      kk: 'Флоренция сурет академиясына қабылданған тұңғыш әйел',
      en: 'First woman admitted to the Florentine Academy of Design',
    },
    look: {
      skin: '#EDC3A1',
      hair: '#5A2E1E',
      hairStyle: 'bun',
      outfit: '#2F6B4F',
      collar: '#F2E3C4',
      accent: '#C0392B',
      scene: 'curtain',
      extra: 'earring',
    },
  },
  {
    id: 'serebryakova',
    name: { ru: 'Зинаида Серебрякова', kk: 'Зинаида Серебрякова', en: 'Zinaida Serebriakova' },
    years: '1884–1967',
    tagline: {
      ru: 'Художница, автор автопортрета «За туалетом»',
      kk: '«Айна алдында» автопортретінің авторы',
      en: 'Painter of the self-portrait At the Dressing Table',
    },
    look: {
      skin: '#F2CDB0',
      hair: '#3A2418',
      hairStyle: 'braid',
      outfit: '#F4F0E8',
      collar: '#E8D6C2',
      accent: '#E4664F',
      scene: 'fields',
      extra: 'comb',
    },
  },
  {
    id: 'cassatt',
    name: { ru: 'Мэри Кассат', kk: 'Мэри Кассат', en: 'Mary Cassatt' },
    years: '1844–1926',
    tagline: {
      ru: 'Американская художница-импрессионистка',
      kk: 'Америкалық импрессионист суретші',
      en: 'American Impressionist painter',
    },
    look: {
      skin: '#F3D1B6',
      hair: '#6B4430',
      hairMaster: '#B8B0AA',
      hairStyle: 'bun',
      outfit: '#8B7BB8',
      collar: '#F6EEF6',
      accent: '#E58FA8',
      scene: 'pastel',
      extra: 'ribbon',
    },
  },
  {
    id: 'durer',
    name: { ru: 'Альбрехт Дюрер', kk: 'Альбрехт Дюрер', en: 'Albrecht Dürer' },
    years: '1471–1528',
    tagline: {
      ru: 'Мальчик, который нарисовал себя в 13 лет',
      kk: '13 жасында өз портретін салған бала',
      en: 'The boy who drew himself at 13',
    },
    look: {
      skin: '#F0CDB0',
      hair: '#A8743E',
      hairStyle: 'long',
      beard: { from: 4, style: 'short', color: '#9A6A38' },
      outfit: '#4B3A2C',
      collar: '#F2EBDD',
      accent: '#8C6A3F',
      scene: 'engraving',
    },
    portraits: [
      { image: require('../../assets/heroes/durer_1.jpg'), caption: 'Автопортрет, 1484 · 13 лет' },
      { image: require('../../assets/heroes/durer_2.jpg'), caption: 'Автопортрет с чертополохом, 1493 · 22 года' },
      { image: require('../../assets/heroes/durer_3.jpg'), caption: 'Автопортрет, 1498 · 26 лет' },
      { image: require('../../assets/heroes/durer_4.jpg'), caption: 'Автопортрет, 1500 · 28 лет' },
    ],
  },
  {
    id: 'raphael',
    name: { ru: 'Рафаэль Санти', kk: 'Рафаэль Санти', en: 'Raphael' },
    years: '1483–1520',
    tagline: {
      ru: 'Автор «Сикстинской мадонны» и «Афинской школы»',
      kk: '«Сикстин мадоннасы» мен «Афины мектебінің» авторы',
      en: 'Painter of the Sistine Madonna and The School of Athens',
    },
    look: {
      skin: '#EEC9A8',
      hair: '#3A2618',
      hairStyle: 'long',
      beard: { from: 5, style: 'short' },
      hat: { from: 3, style: 'beret', color: '#1E1A1A' },
      outfit: '#22201E',
      collar: '#EDE6D8',
      accent: '#3E7CB1',
      scene: 'fresco',
    },
    portraits: [
      { image: require('../../assets/heroes/raphael_1.jpg'), caption: 'Портрет юноши (вероятно, автопортрет), около 1499' },
      { image: require('../../assets/heroes/raphael_2.jpg'), caption: 'Автопортрет, 1504–1506' },
      { image: require('../../assets/heroes/raphael_3.jpg'), caption: '«Афинская школа» (фрагмент), 1509–1511' },
      { image: require('../../assets/heroes/raphael_4.jpg'), caption: 'Автопортрет с другом, 1518–1519' },
    ],
  },
  {
    id: 'sofonisba',
    name: { ru: 'Софонисба Ангиссола', kk: 'Софонисба Ангиссола', en: 'Sofonisba Anguissola' },
    years: 'около 1532–1625',
    tagline: {
      ru: 'Художница, которой давал советы Микеланджело',
      kk: 'Микеланджело кеңес берген суретші',
      en: 'The painter who was advised by Michelangelo',
    },
    look: {
      skin: '#F1CFB3',
      hair: '#4A3022',
      hairMaster: '#C9C4BE',
      hairStyle: 'bun',
      outfit: '#1F1C1C',
      collar: '#F4EFE6',
      accent: '#B5651D',
      scene: 'chess',
      extra: 'earring',
    },
    portraits: [
      { image: require('../../assets/heroes/sofonisba_1.jpg'), caption: 'Автопортрет, около 1552' },
      { image: require('../../assets/heroes/sofonisba_2.jpg'), caption: 'Автопортрет с книгой, 1554' },
      { image: require('../../assets/heroes/sofonisba_3.jpg'), caption: 'Автопортрет за мольбертом, около 1556' },
      { image: require('../../assets/heroes/sofonisba_4.jpg'), caption: 'Автопортрет, 1610' },
    ],
  },
  {
    id: 'repin',
    name: { ru: 'Илья Репин', kk: 'Илья Репин', en: 'Ilya Repin' },
    years: '1844–1930',
    tagline: {
      ru: 'Автор «Бурлаков на Волге» и великий учитель',
      kk: '«Еділдегі бурлактардың» авторы және ұлы ұстаз',
      en: 'Painter of Barge Haulers on the Volga and a great teacher',
    },
    look: {
      skin: '#EDC4A2',
      hair: '#4A3020',
      hairMaster: '#B5ADA4',
      hairStyle: 'wavy',
      beard: { from: 4, style: 'full' },
      outfit: '#3D3A44',
      collar: '#F1EDE4',
      accent: '#C0392B',
      scene: 'birch',
    },
    portraits: [
      { image: require('../../assets/heroes/repin_1.jpg'), caption: 'Автопортрет, 1878 · 34 года' },
      { image: require('../../assets/heroes/repin_2.jpg'), caption: 'Автопортрет, 1887 · 43 года' },
      { image: require('../../assets/heroes/repin_3.jpg'), caption: 'Автопортрет, 1899 · 55 лет' },
      { image: require('../../assets/heroes/repin_4.jpg'), caption: 'Автопортрет, 1920 · 76 лет' },
    ],
  },
];

export function heroStory(id: HeroId, lang?: Lang): readonly string[] {
  return (lang === 'kk' ? HERO_STORIES_KK[id] : undefined) ?? HERO_STORIES[id];
}

// Настоящий портрет художника: отдельный аватар или первый автопортрет.
export function heroPhoto(hero: Hero): number | undefined {
  return hero.avatar ?? hero.portraits?.[0]?.image;
}

export function findHero(id: string | null | undefined): Hero | null {
  return HEROES.find((h) => h.id === id) ?? null;
}

// ---------- Стадии ----------

const STAGE_NAMES: Translations<Record<HeroStage, string>> = {
  ru: { 1: 'Юный художник', 2: 'Ученик мастерской', 3: 'Подмастерье', 4: 'Молодой мастер', 5: 'Мастер' },
  kk: { 1: 'Жас суретші', 2: 'Шеберхана шәкірті', 3: 'Шебердің көмекшісі', 4: 'Жас шебер', 5: 'Шебер' },
  en: { 1: 'Young artist', 2: 'Studio pupil', 3: 'Apprentice', 4: 'Young master', 5: 'Master' },
};

export function stageName(stage: HeroStage, lang?: Lang): string {
  return pick(STAGE_NAMES, lang)[stage];
}

// Где в школе открывается стадия — подпись для закрытых глав.
const STAGE_UNLOCK: Translations<Record<HeroStage, string>> = {
  ru: { 1: 'с первого дня', 2: 'в Старшей группе или на 0 курсе', 3: 'на 1–3 курсе', 4: 'на 4–5 курсе', 5: 'на 6 курсе и в Арт-карьере' },
  kk: { 1: 'алғашқы күннен', 2: 'Ересек топта немесе 0 курста', 3: '1–3 курста', 4: '4–5 курста', 5: '6 курста және Арт-мансапта' },
  en: { 1: 'from day one', 2: 'in the Senior group or course 0', 3: 'in courses 1–3', 4: 'in courses 4–5', 5: 'in course 6 and Art Career' },
};

export function stageUnlockText(stage: HeroStage, lang?: Lang): string {
  return pick(STAGE_UNLOCK, lang)[stage];
}

// Образ героя (1–10) повторяет путь ученика в школе (kasteyev.kz).
// Возраст героя на картинке — см. LEVEL_GROUP ниже. На основном курсе образ меняется почти каждый год.
const YOUNG_GROUP = /младш|junior|радуг|орнек|өрнек/;
const MIDDLE_GROUP = /средн|палитр|семицвет/;
const SENIOR_GROUP = /старш|бояу|middle|гвд/;

function groupLevel(g: { name: string; course?: number | null }): number | null {
  const n = g.name.toLowerCase();
  if (n.includes('арт-карьер')) return 10;
  if (g.course !== null && g.course !== undefined) {
    if (g.course <= 0) return 4;
    if (g.course <= 2) return 5;
    if (g.course === 3) return 6;
    if (g.course === 4) return 7;
    return g.course === 5 ? 8 : 9;
  }
  if (n.includes('мастерск') || n.includes('архитект')) return n.includes('продвин') ? 9 : 8;
  if (YOUNG_GROUP.test(n)) return 1;
  if (MIDDLE_GROUP.test(n)) return 2;
  if (SENIOR_GROUP.test(n)) return 3;
  return null;
}

export const MAX_LEVEL = 10;

// Уровень по группам (берём самую старшую). Если группа не подходит под
// шкалу (например, Digital Art), считаем по годам в школе.
export function heroLevel(
  groups: { name: string; course?: number | null }[],
  studySince: number | null | undefined,
  now: Date = new Date()
): number {
  const levels = groups.map(groupLevel).filter((l): l is number => l !== null);
  if (levels.length > 0) return Math.max(...levels);
  if (studySince) {
    // Учебный год начинается в сентябре.
    const schoolYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return Math.max(1, Math.min(MAX_LEVEL, schoolYear - studySince + 1));
  }
  return 1;
}

export function stageForLevel(level: number): HeroStage {
  return Math.max(1, Math.min(5, Math.ceil(level / 2))) as HeroStage;
}

// Глава биографии для образа: по одному эпизоду на каждый из 10 образов.
export function heroChapter(id: HeroId, level: number, lang?: Lang): string {
  return heroStory(id, lang)[Math.max(1, Math.min(MAX_LEVEL, level)) - 1];
}

// ---------- Уровни ----------

// Где в школе открывается образ — подпись для закрытых образов.
// Возраст героя: 5, 7, 9, 11, 13, 14, 16, 30, 40, 50 лет.
const LEVEL_GROUP: Translations<string[]> = {
  ru: ['Младшая группа', 'Средняя группа', 'Старшая группа', '0 курс', '1–2 курс', '3 курс', '4 курс', '5 курс и мастерские', '6 курс и продвинутые мастерские', 'Арт-карьера'],
  kk: ['Кіші топ', 'Ортаңғы топ', 'Ересек топ', '0 курс', '1–2 курс', '3 курс', '4 курс', '5 курс және шеберханалар', '6 курс және жетілдірілген шеберханалар', 'Арт-мансап'],
  en: ['Junior group', 'Middle group', 'Senior group', 'Course 0', 'Courses 1–2', 'Course 3', 'Course 4', 'Course 5 and workshops', 'Course 6 and advanced workshops', 'Art Career'],
};

// Возраст героя на картинке каждого образа.
export const LEVEL_AGE = [5, 7, 9, 11, 13, 14, 16, 30, 40, 50];

export function levelGroupName(level: number, lang?: Lang): string {
  return pick(LEVEL_GROUP, lang)[Math.max(1, Math.min(MAX_LEVEL, level)) - 1];
}

// ---------- Скины за конкурсы ----------

export type HeroSkin = 'base' | 'rare' | 'epic' | 'legendary';
export const HERO_SKINS: HeroSkin[] = ['base', 'rare', 'epic', 'legendary'];

export interface HeroProgress {
  participations: number; // участия в прошедших конкурсах и выставках
  achievements: number; // достижения, подтверждённые школой
  prizes: number; // из них 1–3 место, Гран-при, лауреат
  top: number; // из них Гран-при или 1 место
  points: number; // очки силы
}

export const EMPTY_PROGRESS: HeroProgress = { participations: 0, achievements: 0, prizes: 0, top: 0, points: 0 };

export function skinUnlocked(skin: HeroSkin, p: HeroProgress): boolean {
  switch (skin) {
    case 'rare':
      return p.participations + p.achievements >= 1;
    case 'epic':
      return p.prizes >= 1;
    case 'legendary':
      return p.top >= 1;
    case 'base':
    default:
      return true;
  }
}

// Пока картинки скина нет, рисуем героя с «силой» нужного уровня.
export const SKIN_POWER: Record<HeroSkin, HeroPower> = { base: 0, rare: 2, epic: 3, legendary: 4 };

// Названия обликов — по пути работы художника: от эскиза к шедевру.
const SKIN_NAMES: Translations<Record<HeroSkin, string>> = {
  ru: { base: 'Эскиз', rare: 'Этюд', epic: 'Полотно', legendary: 'Шедевр' },
  kk: { base: 'Эскиз', rare: 'Этюд', epic: 'Кенеп', legendary: 'Шедевр' },
  en: { base: 'Sketch', rare: 'Study', epic: 'Canvas', legendary: 'Masterpiece' },
};

// Короткая плашка над обликом: за что он даётся.
const SKIN_RARITY: Translations<Record<HeroSkin, string>> = {
  ru: { base: 'Для всех', rare: 'Участие', epic: 'Призёр', legendary: 'Победа' },
  kk: { base: 'Барлығына', rare: 'Қатысу', epic: 'Жүлдегер', legendary: 'Жеңіс' },
  en: { base: 'For all', rare: 'Entry', epic: 'Prize', legendary: 'Victory' },
};

const SKIN_UNLOCK: Translations<Record<HeroSkin, string>> = {
  ru: {
    base: 'Есть у всех',
    rare: 'За участие в конкурсе или выставке',
    epic: 'За призовое место: 1–3 место или лауреат',
    legendary: 'За Гран-при или 1 место',
  },
  kk: {
    base: 'Барлығында бар',
    rare: 'Байқауға не көрмеге қатысқаны үшін',
    epic: 'Жүлделі орын үшін: 1–3 орын немесе лауреат',
    legendary: 'Гран-при немесе 1 орын үшін',
  },
  en: {
    base: 'Everyone has it',
    rare: 'For taking part in a competition or exhibition',
    epic: 'For a prize: 1st–3rd place or laureate',
    legendary: 'For a Grand Prix or 1st place',
  },
};

export function skinName(skin: HeroSkin, lang?: Lang): string {
  return pick(SKIN_NAMES, lang)[skin];
}
export function skinRarity(skin: HeroSkin, lang?: Lang): string {
  return pick(SKIN_RARITY, lang)[skin];
}
export function skinUnlockText(skin: HeroSkin, lang?: Lang): string {
  return pick(SKIN_UNLOCK, lang)[skin];
}

export async function fetchHeroProgress(studentId: string): Promise<HeroProgress> {
  const { data, error } = await supabase.rpc('hero_progress', { p_student_id: studentId });
  if (error) throw error;
  const d = (data ?? {}) as Partial<HeroProgress>;
  return {
    participations: Number(d.participations ?? 0),
    achievements: Number(d.achievements ?? 0),
    prizes: Number(d.prizes ?? 0),
    top: Number(d.top ?? 0),
    points: Number(d.points ?? 0),
  };
}

export async function saveHeroSkin(userId: string, skin: HeroSkin): Promise<void> {
  const { error } = await supabase.from('profiles').update({ hero_skin: skin }).eq('id', userId);
  if (error) throw error;
}

// ---------- Картинки в полный рост ----------

// Картинки лежат в Supabase Storage: heroes/{герой}/{уровень}_{скин}.webp
// (или .png/.jpg). Какие уже загружены — узнаём списком папки героя.
const artCache = new Map<HeroId, Promise<Map<string, string>>>();

export function heroArtFiles(heroId: HeroId): Promise<Map<string, string>> {
  let cached = artCache.get(heroId);
  if (!cached) {
    cached = supabase.storage
      .from('heroes')
      .list(heroId, { limit: 200 })
      .then(({ data, error }) => {
        const files = new Map<string, string>();
        if (error || !data) return files;
        for (const f of data) {
          const m = f.name.match(/^(\d+)_(base|rare|epic|legendary)\.(webp|png|jpe?g)$/i);
          if (m) {
            const url = supabase.storage.from('heroes').getPublicUrl(`${heroId}/${f.name}`).data.publicUrl;
            files.set(`${Number(m[1])}_${m[2].toLowerCase()}`, url);
          }
        }
        return files;
      })
      .catch(() => new Map<string, string>());
    artCache.set(heroId, cached);
  }
  return cached;
}

// Герой в конце пути: 10 уровень, обычный облик «Эскиз». Для экрана выбора героя.
export function heroFinalArtUrl(heroId: HeroId): string {
  return supabase.storage.from('heroes').getPublicUrl(`${heroId}/10_base.webp`).data.publicUrl;
}

// Сменить героя можно не больше 3 раз за календарный год (0061).
// Первый выбор сменой не считается.
export const HERO_CHANGES_PER_YEAR = 3;

export async function fetchHeroChangesLeft(): Promise<number> {
  const { data, error } = await supabase.rpc('hero_changes_left');
  if (error) return HERO_CHANGES_PER_YEAR;
  return Number(data ?? HERO_CHANGES_PER_YEAR);
}

export async function saveHero(userId: string, heroId: HeroId): Promise<void> {
  const { error } = await supabase.from('profiles').update({ hero_id: heroId, hero_skin: 'base' }).eq('id', userId);
  if (error) throw error;
}
