// Картинки раздела «История искусств» (assets/art).
// Картины старых мастеров — общественное достояние (Wikimedia Commons).
// Фото предметов сделаны авторами Commons по свободным лицензиям: их автор
// и лицензия показаны в подписи (credit), как этого требует лицензия.
// «Қошқар мүйіз» нарисован в приложении (components/KoshkarMuiz).

export type ArtImageId =
  | 'lascaux'
  | 'tamgaly'
  | 'meidum_geese'
  | 'nefertiti'
  | 'venus_milo'
  | 'pompeii_fresco'
  | 'trinity_rublev'
  | 'chartres_window'
  | 'mona_lisa'
  | 'birth_venus'
  | 'school_athens'
  | 'night_watch'
  | 'pearl_earring'
  | 'artemisia_self'
  | 'impression_sunrise'
  | 'starry_night'
  | 'cassatt_bath'
  | 'kandinsky_comp'
  | 'malevich_square'
  | 'serebryakova_toilet'
  | 'golden_man'
  | 'koshkar_muiz';

export interface ArtImage {
  source: number; // require(...)
  credit: string;
}

// Пустая запись — картинки нет, в карточке будет только подпись.
export const ART_IMAGES: Partial<Record<ArtImageId, ArtImage>> = {
  lascaux: { source: require('../../assets/art/lascaux.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  tamgaly: { source: require('../../assets/art/tamgaly.jpg'), credit: 'Фото: Stomac, CC BY-SA 3.0, Wikimedia Commons' },
  meidum_geese: { source: require('../../assets/art/meidum_geese.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  nefertiti: { source: require('../../assets/art/nefertiti.jpg'), credit: 'Фото: Philip Pikart, CC BY-SA 3.0, Wikimedia Commons' },
  venus_milo: { source: require('../../assets/art/venus_milo.jpg'), credit: 'Фото: Livioandronico2013, CC BY-SA 4.0, Wikimedia Commons' },
  pompeii_fresco: { source: require('../../assets/art/pompeii_fresco.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  trinity_rublev: { source: require('../../assets/art/trinity_rublev.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  chartres_window: { source: require('../../assets/art/chartres_window.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  mona_lisa: { source: require('../../assets/art/mona_lisa.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  birth_venus: { source: require('../../assets/art/birth_venus.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  school_athens: { source: require('../../assets/art/school_athens.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  night_watch: { source: require('../../assets/art/night_watch.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  pearl_earring: { source: require('../../assets/art/pearl_earring.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  artemisia_self: { source: require('../../assets/art/artemisia_self.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  impression_sunrise: { source: require('../../assets/art/impression_sunrise.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  starry_night: { source: require('../../assets/art/starry_night.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  cassatt_bath: { source: require('../../assets/art/cassatt_bath.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  kandinsky_comp: { source: require('../../assets/art/kandinsky_comp.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  malevich_square: { source: require('../../assets/art/malevich_square.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  serebryakova_toilet: { source: require('../../assets/art/serebryakova_toilet.jpg'), credit: 'Общественное достояние, Wikimedia Commons' },
  golden_man: { source: require('../../assets/art/golden_man.jpg'), credit: 'Фото: eggry, CC BY-SA 2.0, Wikimedia Commons' },
};
