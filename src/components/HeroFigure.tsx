import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { HeroAvatar } from './HeroAvatar';
import { SKIN_POWER, stageForLevel, type Hero, type HeroSkin } from '../lib/heroes';

interface HeroFigureProps {
  hero: Hero;
  level: number;
  skin: HeroSkin;
  // Загруженные картинки героя (из useHero или heroArtFiles).
  art: Map<string, string>;
  // Высота картинки; ширина — 3/4 от неё.
  height: number;
}

// Доля высоты рамки по образу: ребёнок ниже, с 8 образа (взрослый) — во весь рост.
const LEVEL_SCALE: Record<number, number> = { 1: 0.6, 2: 0.66, 3: 0.72, 4: 0.78, 5: 0.84, 6: 0.88, 7: 0.93 };

export function heroScale(level: number): number {
  return LEVEL_SCALE[level] ?? 1;
}

// Герой в полный рост на нужном уровне и в нужном скине. Пока картинку
// не загрузили в хранилище, показываем нарисованный портрет.
export function HeroFigure({ hero, level, skin, art, height }: HeroFigureProps) {
  const url = art.get(`${level}_${skin}`);
  if (url) {
    // Фон у картинок прозрачный, поэтому уменьшенный герой «стоит» внизу рамки
    // и рост от уровня к уровню виден сразу.
    const h = height * heroScale(level);
    return (
      <View style={{ width: height * 0.75, height, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image
          source={{ uri: url }}
          style={{ width: h * 0.75, height: h }}
          contentFit="contain"
          transition={200}
          accessibilityLabel={hero.name.ru}
        />
      </View>
    );
  }
  const size = Math.min(height, height * 0.75 + 40);
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <HeroAvatar hero={hero} stage={stageForLevel(level)} power={SKIN_POWER[skin]} size={size} />
    </View>
  );
}
