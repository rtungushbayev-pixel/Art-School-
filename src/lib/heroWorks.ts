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

    { image: require('../../assets/works/leonardo_annunciation.jpg'), title: '«Благовещение»', year: 'около 1472–1476' },
    { image: require('../../assets/works/leonardo_vitruvian.jpg'), title: '«Витрувианский человек»', year: 'около 1490' },
  ],
  michelangelo: [
    { image: require('../../assets/works/michelangelo_adam.jpg'), title: '«Сотворение Адама»', year: 'около 1511' },
    { image: require('../../assets/works/michelangelo_sibyl.jpg'), title: '«Дельфийская сивилла»', year: '1509' },

    { image: require('../../assets/works/michelangelo_doni.jpg'), title: '«Мадонна Дони»', year: 'около 1506' },
  ],
  rembrandt: [
    { image: require('../../assets/art/night_watch.jpg'), title: '«Ночной дозор»', year: '1642' },
    { image: require('../../assets/works/rembrandt_prodigal.jpg'), title: '«Возвращение блудного сына»', year: 'около 1668' },

    { image: require('../../assets/works/rembrandt_jewish_bride.jpg'), title: '«Еврейская невеста»', year: 'около 1665–1669' },
    { image: require('../../assets/works/rembrandt_syndics.jpg'), title: '«Синдики гильдии суконщиков»', year: '1662' },
  ],
  aivazovsky: [
    { image: require('../../assets/works/aivazovsky_ninth_wave.jpg'), title: '«Девятый вал»', year: '1850' },
    { image: require('../../assets/works/aivazovsky_black_sea.jpg'), title: '«Чёрное море»', year: '1881' },

    { image: require('../../assets/works/aivazovsky_rainbow.jpg'), title: '«Радуга»', year: '1873' },
    { image: require('../../assets/works/aivazovsky_among_waves.jpg'), title: '«Среди волн»', year: '1898' },
  ],
  vangogh: [
    { image: require('../../assets/art/starry_night.jpg'), title: '«Звёздная ночь»', year: '1889' },
    { image: require('../../assets/works/vangogh_sunflowers.jpg'), title: '«Подсолнухи»', year: '1888' },
    { image: require('../../assets/works/vangogh_bedroom.jpg'), title: '«Спальня в Арле»', year: '1888' },

    { image: require('../../assets/works/vangogh_cafe.jpg'), title: '«Ночная терраса кафе»', year: '1888' },
    { image: require('../../assets/works/vangogh_irises.jpg'), title: '«Ирисы»', year: '1889' },
    { image: require('../../assets/works/vangogh_almond.jpg'), title: '«Цветущие ветки миндаля»', year: '1890' },
  ],
  monet: [
    { image: require('../../assets/art/impression_sunrise.jpg'), title: '«Впечатление. Восходящее солнце»', year: '1872' },
    { image: require('../../assets/works/monet_water_lilies.jpg'), title: '«Кувшинки»', year: '1906' },
    { image: require('../../assets/works/monet_haystacks.jpg'), title: '«Стога. Конец лета»', year: '1891' },

    { image: require('../../assets/works/monet_parasol.jpg'), title: '«Дама с зонтиком»', year: '1875' },
    { image: require('../../assets/works/monet_bridge.jpg'), title: '«Мостик через пруд с кувшинками»', year: '1899' },
    { image: require('../../assets/works/monet_poppies.jpg'), title: '«Маки»', year: '1873' },
  ],
  artemisia: [
    { image: require('../../assets/art/artemisia_self.jpg'), title: '«Автопортрет в образе Живописи»', year: '1638–1639' },
    { image: require('../../assets/works/artemisia_lute.jpg'), title: '«Автопортрет с лютней»', year: '1615–1617' },

    { image: require('../../assets/works/artemisia_catherine.jpg'), title: '«Автопортрет в образе святой Екатерины»', year: 'около 1615–1617' },
    { image: require('../../assets/works/artemisia_esther.jpg'), title: '«Эсфирь перед Артаксерксом»', year: 'около 1628–1635' },
  ],
  serebryakova: [
    { image: require('../../assets/art/serebryakova_toilet.jpg'), title: '«За туалетом. Автопортрет»', year: '1909' },
  ],
  cassatt: [
    { image: require('../../assets/art/cassatt_bath.jpg'), title: '«Купание»', year: '1893' },
    { image: require('../../assets/works/cassatt_blue_armchair.jpg'), title: '«Девочка в голубом кресле»', year: '1878' },

    { image: require('../../assets/works/cassatt_boating.jpg'), title: '«Катание на лодке»', year: '1893–1894' },
    { image: require('../../assets/works/cassatt_mirror.jpg'), title: '«Мать и дитя (Овальное зеркало)»', year: 'около 1899' },
  ],
  durer: [
    { image: require('../../assets/works/durer_hare.jpg'), title: '«Молодой заяц»', year: '1502' },
    { image: require('../../assets/works/durer_hands.jpg'), title: '«Руки молящегося»', year: '1508' },

    { image: require('../../assets/works/durer_rhino.jpg'), title: '«Носорог»', year: '1515' },
    { image: require('../../assets/works/durer_melencolia.jpg'), title: '«Меланхолия I»', year: '1514' },
    { image: require('../../assets/works/durer_knight.jpg'), title: '«Рыцарь, смерть и дьявол»', year: '1513' },
  ],
  raphael: [
    { image: require('../../assets/works/raphael_sistine.jpg'), title: '«Сикстинская мадонна»', year: '1512–1513' },
    { image: require('../../assets/art/school_athens.jpg'), title: '«Афинская школа»', year: '1509–1511' },

    { image: require('../../assets/works/raphael_meadow.jpg'), title: '«Мадонна на лугу»', year: '1505–1506' },
    { image: require('../../assets/works/raphael_transfiguration.jpg'), title: '«Преображение»', year: '1516–1520' },
  ],
  sofonisba: [
    { image: require('../../assets/works/sofonisba_chess.jpg'), title: '«Игра в шахматы»', year: '1555' },

    { image: require('../../assets/works/sofonisba_family.jpg'), title: '«Портрет отца, сестры и брата»', year: 'около 1559' },
    { image: require('../../assets/works/sofonisba_philip.jpg'), title: '«Портрет короля Филиппа II»', year: '1565' },
  ],
  repin: [
    { image: require('../../assets/works/repin_barge.jpg'), title: '«Бурлаки на Волге»', year: '1870–1873' },
    { image: require('../../assets/works/repin_cossacks.jpg'), title: '«Запорожцы пишут письмо турецкому султану»', year: '1880–1891' },

    { image: require('../../assets/works/repin_dragonfly.jpg'), title: '«Стрекоза»', year: '1884' },
    { image: require('../../assets/works/repin_unexpected.jpg'), title: '«Не ждали»', year: '1884–1888' },
    { image: require('../../assets/works/repin_procession.jpg'), title: '«Крестный ход в Курской губернии»', year: '1880–1883' },
  ],
};

export function heroWorks(id: HeroId, lang?: Lang): HeroWork[] {
  const works = HERO_WORKS[id] ?? [];
  if (lang !== 'kk') return works;
  return works.map((w) => ({ ...w, title: workTitle(w.title, lang), year: yearText(w.year, lang) }));
}
