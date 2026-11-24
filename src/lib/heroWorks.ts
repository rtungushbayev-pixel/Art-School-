// Знаменитые картины героев (экран героя и страница художника).
// Все картины — общественное достояние, Wikimedia Commons (assets/works
// и assets/art). Работы Кастеева защищены авторским правом до 2043 года,
// поэтому для него картин нет, пока музей не даст разрешение.

import type { HeroId } from './heroes';
import type { Lang } from '../i18n';
import { workTitle, yearText } from './contentI18n';

export interface HeroWork {
  image: number; // require(...)
  title: string;
  year: string;
}

export const HERO_WORKS: Partial<Record<HeroId, HeroWork[]>> = {
  leonardo: [
    { image: require('../../assets/art/mona_lisa.jpg'), title: '«Мона Лиза»', year: '1503–1519' },
    { image: require('../../assets/works/leonardo_supper.jpg'), title: '«Тайная вечеря»', year: '1495–1498' },
    { image: require('../../assets/works/leonardo_ermine.jpg'), title: '«Дама с горностаем»', year: 'около 1490' },
  ],
  michelangelo: [
    { image: require('../../assets/works/michelangelo_adam.jpg'), title: '«Сотворение Адама»', year: 'около 1511' },
    { image: require('../../assets/works/michelangelo_sibyl.jpg'), title: '«Дельфийская сивилла»', year: '1509' },
  ],
  rembrandt: [
    { image: require('../../assets/art/night_watch.jpg'), title: '«Ночной дозор»', year: '1642' },
    { image: require('../../assets/works/rembrandt_prodigal.jpg'), title: '«Возвращение блудного сына»', year: 'около 1668' },
  ],
  aivazovsky: [
    { image: require('../../assets/works/aivazovsky_ninth_wave.jpg'), title: '«Девятый вал»', year: '1850' },
    { image: require('../../assets/works/aivazovsky_black_sea.jpg'), title: '«Чёрное море»', year: '1881' },
  ],
  vangogh: [
    { image: require('../../assets/art/starry_night.jpg'), title: '«Звёздная ночь»', year: '1889' },
    { image: require('../../assets/works/vangogh_sunflowers.jpg'), title: '«Подсолнухи»', year: '1888' },
    { image: require('../../assets/works/vangogh_bedroom.jpg'), title: '«Спальня в Арле»', year: '1888' },
  ],
  monet: [
    { image: require('../../assets/art/impression_sunrise.jpg'), title: '«Впечатление. Восходящее солнце»', year: '1872' },
    { image: require('../../assets/works/monet_water_lilies.jpg'), title: '«Кувшинки»', year: '1906' },
    { image: require('../../assets/works/monet_haystacks.jpg'), title: '«Стога. Конец лета»', year: '1891' },
  ],
  artemisia: [
    { image: require('../../assets/art/artemisia_self.jpg'), title: '«Автопортрет в образе Живописи»', year: '1638–1639' },
    { image: require('../../assets/works/artemisia_lute.jpg'), title: '«Автопортрет с лютней»', year: '1615–1617' },
  ],
  serebryakova: [
    { image: require('../../assets/art/serebryakova_toilet.jpg'), title: '«За туалетом. Автопортрет»', year: '1909' },
  ],
  cassatt: [
    { image: require('../../assets/art/cassatt_bath.jpg'), title: '«Купание»', year: '1893' },
    { image: require('../../assets/works/cassatt_blue_armchair.jpg'), title: '«Девочка в голубом кресле»', year: '1878' },
  ],
  durer: [
    { image: require('../../assets/works/durer_hare.jpg'), title: '«Молодой заяц»', year: '1502' },
    { image: require('../../assets/works/durer_hands.jpg'), title: '«Руки молящегося»', year: '1508' },
  ],
  raphael: [
    { image: require('../../assets/works/raphael_sistine.jpg'), title: '«Сикстинская мадонна»', year: '1512–1513' },
    { image: require('../../assets/art/school_athens.jpg'), title: '«Афинская школа»', year: '1509–1511' },
  ],
  sofonisba: [
    { image: require('../../assets/works/sofonisba_chess.jpg'), title: '«Игра в шахматы»', year: '1555' },
  ],
  repin: [
    { image: require('../../assets/works/repin_barge.jpg'), title: '«Бурлаки на Волге»', year: '1870–1873' },
    { image: require('../../assets/works/repin_cossacks.jpg'), title: '«Запорожцы пишут письмо турецкому султану»', year: '1880–1891' },
  ],
};

export function heroWorks(id: HeroId, lang?: Lang): HeroWork[] {
  const works = HERO_WORKS[id] ?? [];
  if (lang !== 'kk') return works;
  return works.map((w) => ({ ...w, title: workTitle(w.title, lang), year: yearText(w.year, lang) }));
}
