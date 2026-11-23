import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

// Казахский орнамент «Қошқар мүйіз» (бараньи рога), нарисован в приложении:
// четыре завитка вокруг центра, как на тускиизах и сырмаках.

const RED = '#B8322A';
const GOLD = '#E0B44C';

// Один рог: стебель от центра и спираль-завиток наружу.
const HORN = 'M100 100 C100 78 96 62 84 52 C70 40 50 44 46 60 C42 74 56 84 66 76 C74 70 70 58 62 60';

export function KoshkarMuiz({ size = 240 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Rect x="0" y="0" width="200" height="200" rx="18" fill={RED} />
      <Rect x="8" y="8" width="184" height="184" rx="12" fill="none" stroke={GOLD} strokeWidth="3" />
      {[0, 90, 180, 270].map((angle) => (
        <G key={angle} rotation={angle} origin="100, 100">
          <Path d={HORN} stroke={GOLD} strokeWidth="9" fill="none" strokeLinecap="round" />
          <G scale={[-1, 1]} origin="100, 100">
            <Path d={HORN} stroke={GOLD} strokeWidth="9" fill="none" strokeLinecap="round" />
          </G>
        </G>
      ))}
      <Rect x="88" y="88" width="24" height="24" rx="3" fill={GOLD} rotation={45} origin="100, 100" />
    </Svg>
  );
}
