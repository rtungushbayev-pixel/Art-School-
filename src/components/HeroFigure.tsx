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

// Герой в полный рост на нужном уровне и в нужном скине. Пока картинку
// не загрузили в хранилище, показываем нарисованный портрет.
export function HeroFigure({ hero, level, skin, art, height }: HeroFigureProps) {
  const url = art.get(`${level}_${skin}`);
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: height * 0.75, height }}
        contentFit="contain"
        transition={200}
        accessibilityLabel={hero.name.ru}
      />
    );
  }
  const size = Math.min(height, height * 0.75 + 40);
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <HeroAvatar hero={hero} stage={stageForLevel(level)} power={SKIN_POWER[skin]} size={size} />
    </View>
  );
}
