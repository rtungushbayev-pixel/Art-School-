import React, { useId, useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { buildHeroArt, type ArtNode, type ArtTag, type HeroPower, type HeroStage } from '../lib/heroArt';
import type { Hero } from '../lib/heroes';

const COMPONENTS: Record<ArtTag, React.ComponentType<any>> = {
  g: G,
  defs: Defs,
  clipPath: ClipPath,
  linearGradient: LinearGradient,
  radialGradient: RadialGradient,
  stop: Stop,
  circle: Circle,
  ellipse: Ellipse,
  rect: Rect,
  path: Path,
  line: Line,
  polygon: Polygon,
};

function renderNode(node: ArtNode, key: number): React.ReactNode {
  const Component = COMPONENTS[node.t];
  return (
    <Component key={key} {...node.p}>
      {node.c?.map(renderNode)}
    </Component>
  );
}

interface HeroAvatarProps {
  hero: Hero;
  stage: HeroStage;
  power?: HeroPower;
  size?: number;
}

// Портрет героя на нужной стадии роста и с нужной силой.
export function HeroAvatar({ hero, stage, power = 0, size = 96 }: HeroAvatarProps) {
  // id градиентов должны быть уникальны, если на экране несколько портретов.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const nodes = useMemo(
    () => buildHeroArt(hero.look, stage, `h${uid}${hero.id}`, power),
    [hero, stage, power, uid]
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {nodes.map(renderNode)}
    </Svg>
  );
}
