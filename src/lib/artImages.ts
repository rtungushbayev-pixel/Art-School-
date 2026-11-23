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
export const ART_IMAGES: Partial<Record<ArtImageId, ArtImage>> = {};
