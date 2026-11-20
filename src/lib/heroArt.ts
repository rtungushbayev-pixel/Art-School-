// Рисунок персонажа-художника: авторские векторные портреты (не копии чужих
// картин и фото). Один и тот же герой выглядит по-разному на каждой стадии:
// ребёнок → подросток → молодой художник → мастер.
//
// Рисунок описан как дерево простых фигур (ArtNode), а не сразу как
// компоненты react-native-svg: так его же можно превратить в SVG-строку
// для превью и проверки без телефона (см. heroArtToSvg).

export type ArtTag =
  | 'g'
  | 'defs'
  | 'clipPath'
  | 'linearGradient'
  | 'radialGradient'
  | 'stop'
  | 'circle'
  | 'ellipse'
  | 'rect'
  | 'path'
  | 'line'
  | 'polygon';

export interface ArtNode {
  t: ArtTag;
  p: Record<string, string | number>;
  c?: ArtNode[];
}

export type HeroStage = 1 | 2 | 3 | 4 | 5;

// Сила за конкурсы и выставки (0–4): аура → плащ творца → кристалл → магистр.
export type HeroPower = 0 | 1 | 2 | 3 | 4;

export type HeroScene =
  | 'mountains'
  | 'parchment'
  | 'marble'
  | 'candle'
  | 'sea'
  | 'stars'
  | 'lilies'
  | 'curtain'
  | 'fields'
  | 'pastel';

export interface HeroLook {
  skin: string;
  hair: string;
  // Цвет волос у мастера (седина); если нет — те же волосы.
  hairMaster?: string;
  hairStyle: 'short' | 'curly' | 'wavy' | 'long' | 'bun' | 'braid';
  beard?: { from: HeroStage; style: 'full' | 'long' | 'short' | 'mustache' | 'goatee' | 'sideburns'; color?: string };
  hat?: { from: HeroStage; style: 'beret' | 'straw' | 'tubeteika'; color: string };
  outfit: string;
  collar: string;
  // Цвет краски на кисти и акценты.
  accent: string;
  scene: HeroScene;
  extra?: 'earring' | 'ribbon' | 'comb';
}

function el(t: ArtTag, p: Record<string, string | number>, c?: ArtNode[]): ArtNode {
  return c ? { t, p, c } : { t, p };
}

// Пропорции лица и плеч по стадиям: у ребёнка круглое лицо, большие глаза
// и узкие плечи, у взрослого — вытянутое лицо и широкие плечи.
const BODY: Record<HeroStage, { cy: number; rx: number; ry: number; eye: number; sh: number; jaw: number }> = {
  1: { cy: 98, rx: 33, ry: 34, eye: 5.4, sh: 42, jaw: 0.8 },
  2: { cy: 96, rx: 32, ry: 36, eye: 4.9, sh: 48, jaw: 0.72 },
  3: { cy: 93, rx: 30, ry: 38, eye: 4.3, sh: 55, jaw: 0.6 },
  4: { cy: 90, rx: 29, ry: 40, eye: 3.9, sh: 62, jaw: 0.52 },
  5: { cy: 90, rx: 29, ry: 40, eye: 3.7, sh: 64, jaw: 0.5 },
};

export const STAGE_RING: Record<HeroStage, string> = {
  1: '#5FA36A',
  2: '#4A90C4',
  3: '#8266C2',
  4: '#B9BEC6',
  5: '#D9A441',
};

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---------- Фон ----------

function scene(kind: HeroScene, id: string): { defs: ArtNode[]; nodes: ArtNode[] } {
  const lin = (gid: string, stops: [number, string][], vertical = true): ArtNode =>
    el(
      'linearGradient',
      { id: gid, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 },
      stops.map(([o, c]) => el('stop', { offset: o, stopColor: c }))
    );
  const full = (fill: string) => el('rect', { x: 0, y: 0, width: 200, height: 200, fill });
  switch (kind) {
    case 'mountains':
      // Заилийский Алатау: небо, снежные вершины, степь.
      return {
        defs: [lin(`${id}sky`, [[0, '#9CC9E8'], [0.7, '#F6D9B3']])],
        nodes: [
          full(`url(#${id}sky)`),
          el('circle', { cx: 150, cy: 52, r: 14, fill: '#FBE7A1' }),
          el('path', { d: 'M0 140 L40 70 L70 110 L105 55 L145 115 L170 85 L200 125 L200 200 L0 200 Z', fill: '#6C7FA3' }),
          el('path', { d: 'M40 70 L52 92 L45 88 L35 95 Z M105 55 L120 80 L110 76 L98 86 L93 74 Z M170 85 L179 99 L168 96 Z', fill: '#FFFFFF' }),
          el('path', { d: 'M0 150 Q60 128 110 146 T200 140 L200 200 L0 200 Z', fill: '#C9A55B' }),
          el('path', { d: 'M0 168 Q70 150 130 166 T200 160 L200 200 L0 200 Z', fill: '#A8873F' }),
        ],
      };
    case 'parchment':
      // Пергамент с набросками: круг и квадрат пропорций, шестерёнка.
      return {
        defs: [lin(`${id}pp`, [[0, '#F4E4C1'], [1, '#E2C48F']])],
        nodes: [
          full(`url(#${id}pp)`),
          el('circle', { cx: 100, cy: 100, r: 78, fill: 'none', stroke: '#A0743F', strokeWidth: 1, opacity: 0.45 }),
          el('rect', { x: 32, y: 32, width: 136, height: 136, fill: 'none', stroke: '#A0743F', strokeWidth: 1, opacity: 0.35 }),
          el('circle', { cx: 36, cy: 60, r: 13, fill: 'none', stroke: '#8E6532', strokeWidth: 1.4, strokeDasharray: '3 3', opacity: 0.55 }),
          el('path', { d: 'M150 40 q12 -10 24 0 M146 50 q18 -14 34 2', stroke: '#8E6532', strokeWidth: 1.2, fill: 'none', opacity: 0.5 }),
        ],
      };
    case 'marble':
      // Мрамор и купол собора.
      return {
        defs: [lin(`${id}mb`, [[0, '#F1EEE9'], [1, '#CFC8BE']])],
        nodes: [
          full(`url(#${id}mb)`),
          el('path', { d: 'M10 30 C50 60 40 90 80 110 M140 20 C130 60 170 80 160 120 M0 120 C30 130 40 160 30 200', stroke: '#B5ADA2', strokeWidth: 1.5, fill: 'none', opacity: 0.7 }),
          el('path', { d: 'M128 120 Q128 70 160 62 Q192 70 192 120 Z', fill: '#B7A98F', opacity: 0.55 }),
          el('rect', { x: 157, y: 50, width: 6, height: 12, fill: '#B7A98F', opacity: 0.55 }),
        ],
      };
    case 'candle':
      // Тёмная мастерская и тёплый свет свечи — «светотень».
      return {
        defs: [
          el('radialGradient', { id: `${id}cd`, cx: 0.35, cy: 0.35, r: 0.8 }, [
            el('stop', { offset: 0, stopColor: '#E9B866' }),
            el('stop', { offset: 0.45, stopColor: '#7A4A1E' }),
            el('stop', { offset: 1, stopColor: '#2A1A0E' }),
          ]),
        ],
        nodes: [full(`url(#${id}cd)`)],
      };
    case 'sea':
      // Морская волна.
      return {
        defs: [lin(`${id}sk`, [[0, '#F7D7A8'], [0.55, '#E9A86B'], [1, '#2F6F8F']])],
        nodes: [
          full(`url(#${id}sk)`),
          el('circle', { cx: 60, cy: 70, r: 16, fill: '#FFF1C9', opacity: 0.9 }),
          el('path', { d: 'M0 120 Q30 100 60 118 T120 112 T200 114 L200 200 L0 200 Z', fill: '#2F6F8F' }),
          el('path', { d: 'M0 140 Q40 112 80 136 Q110 150 140 124 Q170 100 200 130 L200 200 L0 200 Z', fill: '#1E4F6B' }),
          el('path', { d: 'M140 124 Q170 100 200 130 M80 136 Q60 124 40 128', stroke: '#E8F4F7', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
        ],
      };
    case 'stars':
      // Синяя ночь с завитками и жёлтыми звёздами.
      return {
        defs: [lin(`${id}nt`, [[0, '#1F3B7A'], [1, '#2C5AA0']])],
        nodes: [
          full(`url(#${id}nt)`),
          el('path', { d: 'M10 60 C40 30 80 80 110 50 S170 30 190 60', stroke: '#8FB3E8', strokeWidth: 5, fill: 'none', strokeLinecap: 'round', opacity: 0.8 }),
          el('path', { d: 'M0 95 C30 75 60 105 95 85', stroke: '#6E95D6', strokeWidth: 4, fill: 'none', strokeLinecap: 'round', opacity: 0.8 }),
          el('circle', { cx: 160, cy: 38, r: 13, fill: '#F7D046' }),
          el('circle', { cx: 160, cy: 38, r: 19, fill: 'none', stroke: '#F7D046', strokeWidth: 2, opacity: 0.6 }),
          el('circle', { cx: 40, cy: 30, r: 5, fill: '#F7E27A' }),
          el('circle', { cx: 40, cy: 30, r: 9, fill: 'none', stroke: '#F7E27A', strokeWidth: 1.5, opacity: 0.6 }),
          el('circle', { cx: 120, cy: 22, r: 4, fill: '#F7E27A' }),
          el('circle', { cx: 25, cy: 120, r: 4, fill: '#F7E27A' }),
        ],
      };
    case 'lilies':
      // Пруд с кувшинками.
      return {
        defs: [lin(`${id}pd`, [[0, '#BFE0D2'], [1, '#6FA79A']])],
        nodes: [
          full(`url(#${id}pd)`),
          el('path', { d: 'M0 40 Q50 30 100 42 T200 38', stroke: '#E9F4EE', strokeWidth: 3, fill: 'none', opacity: 0.7 }),
          el('ellipse', { cx: 35, cy: 75, rx: 20, ry: 7, fill: '#4F8A5B' }),
          el('ellipse', { cx: 168, cy: 64, rx: 22, ry: 8, fill: '#4F8A5B' }),
          el('ellipse', { cx: 30, cy: 150, rx: 18, ry: 6, fill: '#4F8A5B' }),
          el('circle', { cx: 38, cy: 72, r: 5, fill: '#F2A7C3' }),
          el('circle', { cx: 165, cy: 61, r: 5, fill: '#F7F2F4' }),
          el('circle', { cx: 175, cy: 150, r: 4, fill: '#F2A7C3' }),
        ],
      };
    case 'curtain':
      // Тяжёлый алый занавес мастерской барокко.
      return {
        defs: [lin(`${id}ct`, [[0, '#5E0F1A'], [0.5, '#9E2232'], [1, '#5E0F1A']], false)],
        nodes: [
          full(`url(#${id}ct)`),
          el('path', { d: 'M30 0 Q24 100 34 200 M70 0 Q64 100 74 200 M130 0 Q138 100 128 200 M170 0 Q178 100 168 200', stroke: '#4A0A12', strokeWidth: 4, fill: 'none', opacity: 0.45 }),
          el('path', { d: 'M150 0 Q160 50 200 70 L200 0 Z', fill: '#D9A441', opacity: 0.25 }),
        ],
      };
    case 'fields':
      // Тёплое утро в деревне: небо и золотое поле.
      return {
        defs: [lin(`${id}fl`, [[0, '#F9E3CF'], [0.6, '#F2C9A0']])],
        nodes: [
          full(`url(#${id}fl)`),
          el('path', { d: 'M0 140 Q100 120 200 140 L200 200 L0 200 Z', fill: '#E3B861' }),
          el('path', { d: 'M15 150 l4 -14 M30 152 l3 -16 M170 150 l4 -14 M185 152 l3 -15', stroke: '#B88935', strokeWidth: 2, strokeLinecap: 'round' }),
        ],
      };
    case 'pastel':
    default:
      // Нежная пастель.
      return {
        defs: [lin(`${id}ps`, [[0, '#F8D6E0'], [1, '#CFE0F5']])],
        nodes: [
          full(`url(#${id}ps)`),
          el('circle', { cx: 32, cy: 50, r: 9, fill: '#FFFFFF', opacity: 0.6 }),
          el('circle', { cx: 168, cy: 70, r: 12, fill: '#FFFFFF', opacity: 0.5 }),
          el('circle', { cx: 40, cy: 140, r: 6, fill: '#F7B7C9', opacity: 0.8 }),
          el('circle', { cx: 165, cy: 135, r: 7, fill: '#B7CDEB', opacity: 0.9 }),
        ],
      };
  }
}

// ---------- Фигура ----------

function hairColor(look: HeroLook, stage: HeroStage) {
  return stage === 5 && look.hairMaster ? look.hairMaster : look.hair;
}

function backHair(look: HeroLook, stage: HeroStage): ArtNode[] {
  const { cy, rx, ry } = BODY[stage];
  const cx = 100;
  const hc = hairColor(look, stage);
  switch (look.hairStyle) {
    case 'long':
      // Длинные волосы до плеч и ниже.
      return [
        el('path', {
          d: `M${cx - rx - 6} ${cy - 6} C${cx - rx - 12} ${cy - ry - 20} ${cx + rx + 12} ${cy - ry - 20} ${cx + rx + 6} ${cy - 6} L${cx + rx + 10} ${cy + ry + 26} Q${cx} ${cy + ry + 34} ${cx - rx - 10} ${cy + ry + 26} Z`,
          fill: hc,
        }),
      ];
    case 'wavy':
      // Волосы до плеч, волной.
      return [
        el('path', {
          d: `M${cx - rx - 5} ${cy - 6} C${cx - rx - 10} ${cy - ry - 18} ${cx + rx + 10} ${cy - ry - 18} ${cx + rx + 5} ${cy - 6} Q${cx + rx + 14} ${cy + ry * 0.5} ${cx + rx + 6} ${cy + ry + 8} Q${cx + rx - 4} ${cy + ry + 14} ${cx + rx - 6} ${cy + ry} L${cx - rx + 6} ${cy + ry} Q${cx - rx + 4} ${cy + ry + 14} ${cx - rx - 6} ${cy + ry + 8} Q${cx - rx - 14} ${cy + ry * 0.5} ${cx - rx - 5} ${cy - 6} Z`,
          fill: hc,
        }),
      ];
    case 'braid':
      // Коса на плечо.
      return [0, 1, 2, 3, 4].map((i) =>
        el('ellipse', { cx: cx + rx - 2 + i * 1.5, cy: cy + ry * 0.4 + i * 11, rx: 8 - i * 0.6, ry: 7, fill: hc, stroke: shade(hc, -25), strokeWidth: 1 })
      );
    default:
      return [];
  }
}

function frontHair(look: HeroLook, stage: HeroStage): ArtNode[] {
  const { cy, rx, ry } = BODY[stage];
  const cx = 100;
  const hc = hairColor(look, stage);
  const top = cy - ry;
  const hl = cy - ry * 0.42; // линия роста волос
  // Шапка волос: верх головы и чёлка.
  const cap = (fringe: string) =>
    el('path', {
      d: `M${cx - rx - 2} ${cy + 2} C${cx - rx - 6} ${top - 14} ${cx + rx + 6} ${top - 14} ${cx + rx + 2} ${cy + 2} L${cx + rx - 2} ${cy - 2} ${fringe} L${cx - rx + 2} ${cy - 2} Z`,
      fill: hc,
    });
  const smooth = `Q${cx + rx - 6} ${hl} ${cx} ${hl - 4} Q${cx - rx + 6} ${hl} ${cx - rx + 2} ${cy - 2}`;
  const parted = `Q${cx + rx - 8} ${hl - 2} ${cx + 3} ${hl - 10} L${cx - 3} ${hl - 10} Q${cx - rx + 8} ${hl - 2} ${cx - rx + 2} ${cy - 2}`;
  switch (look.hairStyle) {
    case 'curly': {
      const bumps: ArtNode[] = [];
      for (let i = 0; i <= 8; i += 1) {
        const a = Math.PI + (i / 8) * Math.PI;
        bumps.push(el('circle', { cx: cx + Math.cos(a) * (rx + 2), cy: cy - 8 + Math.sin(a) * (ry + 2), r: 9, fill: hc }));
      }
      return [...bumps, cap(`Q${cx + rx - 8} ${hl + 4} ${cx + 10} ${hl} Q${cx} ${hl + 6} ${cx - 10} ${hl} Q${cx - rx + 8} ${hl + 4} ${cx - rx + 2} ${cy - 2}`)];
    }
    case 'bun':
      return [el('circle', { cx, cy: top - 8, r: stage <= 2 ? 11 : 13, fill: hc }), cap(parted)];
    case 'long':
    case 'wavy':
    case 'braid':
      return [cap(parted)];
    case 'short':
    default:
      return [cap(smooth)];
  }
}

function face(look: HeroLook, stage: HeroStage): ArtNode[] {
  const { cy, rx, ry, eye, jaw } = BODY[stage];
  const cx = 100;
  const skin = look.skin;
  const dark = shade(skin, -45);
  const eyeY = cy + ry * 0.1;
  const dx = rx * 0.4;
  const browY = eyeY - eye * 2 - 3;
  const browColor = shade(hairColor(look, stage), stage === 5 && look.hairMaster ? -40 : 0);
  const nodes: ArtNode[] = [
    // уши
    el('ellipse', { cx: cx - rx, cy: eyeY + 4, rx: 5, ry: 8, fill: shade(skin, -12) }),
    el('ellipse', { cx: cx + rx, cy: eyeY + 4, rx: 5, ry: 8, fill: shade(skin, -12) }),
    // лицо
    el('path', {
      d: `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy} C${cx + rx} ${cy + ry * 0.6} ${cx + rx * jaw} ${cy + ry} ${cx} ${cy + ry} C${cx - rx * jaw} ${cy + ry} ${cx - rx} ${cy + ry * 0.6} ${cx - rx} ${cy} Z`,
      fill: skin,
    }),
  ];
  if (look.extra === 'earring') {
    nodes.push(el('circle', { cx: cx - rx, cy: eyeY + 14, r: 3, fill: '#F4E9D0', stroke: '#C9B98F', strokeWidth: 0.8 }));
    nodes.push(el('circle', { cx: cx + rx, cy: eyeY + 14, r: 3, fill: '#F4E9D0', stroke: '#C9B98F', strokeWidth: 0.8 }));
  }
  // румянец у детей и подростков
  if (stage <= 3) {
    nodes.push(el('circle', { cx: cx - dx - 5, cy: eyeY + 13, r: 6, fill: '#F28B82', opacity: 0.3 }));
    nodes.push(el('circle', { cx: cx + dx + 5, cy: eyeY + 13, r: 6, fill: '#F28B82', opacity: 0.3 }));
  }
  // глаза
  for (const sx of [-1, 1]) {
    nodes.push(el('ellipse', { cx: cx + sx * dx, cy: eyeY, rx: eye * 0.85, ry: eye, fill: '#2B1D16' }));
    nodes.push(el('circle', { cx: cx + sx * dx + eye * 0.3, cy: eyeY - eye * 0.35, r: eye * 0.32, fill: '#FFFFFF' }));
    nodes.push(
      el('path', {
        d: `M${cx + sx * dx - 6} ${browY + (stage >= 4 ? 0 : 1)} Q${cx + sx * dx} ${browY - 3} ${cx + sx * dx + 6} ${browY + (stage >= 4 ? 0 : 1)}`,
        stroke: browColor,
        strokeWidth: stage >= 4 ? 2.6 : 2.2,
        fill: 'none',
        strokeLinecap: 'round',
      })
    );
  }
  // нос
  if (stage <= 2) {
    nodes.push(el('path', { d: `M${cx - 3} ${eyeY + 11} Q${cx} ${eyeY + 14} ${cx + 3} ${eyeY + 11}`, stroke: dark, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }));
  } else {
    nodes.push(
      el('path', {
        d: `M${cx + 1} ${eyeY + 2} L${cx - 3} ${eyeY + 15} Q${cx} ${eyeY + 18} ${cx + 4} ${eyeY + 16}`,
        stroke: dark,
        strokeWidth: 1.6,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })
    );
  }
  // морщинки мастера
  if (stage === 5) {
    nodes.push(el('path', { d: `M${cx - 10} ${browY - 9} Q${cx} ${browY - 12} ${cx + 10} ${browY - 9}`, stroke: dark, strokeWidth: 1, fill: 'none', opacity: 0.45 }));
    nodes.push(el('path', { d: `M${cx - rx + 4} ${eyeY - 1} l-4 -2 M${cx - rx + 4} ${eyeY + 2} l-4 1 M${cx + rx - 4} ${eyeY - 1} l4 -2 M${cx + rx - 4} ${eyeY + 2} l4 1`, stroke: dark, strokeWidth: 0.9, opacity: 0.45 }));
  }
  return nodes;
}

function mouth(look: HeroLook, stage: HeroStage): ArtNode {
  const { cy, ry } = BODY[stage];
  const cx = 100;
  const y = cy + ry * 0.6;
  if (stage <= 2) {
    // открытая детская улыбка
    return el('path', { d: `M${cx - 8} ${y - 1} Q${cx} ${y + 9} ${cx + 8} ${y - 1} Z`, fill: '#9E3B3B' });
  }
  return el('path', { d: `M${cx - 7} ${y} Q${cx} ${y + 5} ${cx + 7} ${y}`, stroke: '#8A3B3B', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' });
}

function beard(look: HeroLook, stage: HeroStage): ArtNode[] {
  if (!look.beard || stage < look.beard.from) return [];
  const { cy, rx, ry } = BODY[stage];
  const cx = 100;
  const color = stage === 5 && look.hairMaster ? look.hairMaster : look.beard.color ?? look.hair;
  const eyeY = cy + ry * 0.1;
  const my = cy + ry * 0.6; // рот
  const mustache = el('path', {
    d: `M${cx} ${my - 6} C${cx - 6} ${my - 9} ${cx - 15} ${my - 6} ${cx - 16} ${my + 1} C${cx - 11} ${my - 2} ${cx - 5} ${my - 2} ${cx} ${my - 3} C${cx + 5} ${my - 2} ${cx + 11} ${my - 2} ${cx + 16} ${my + 1} C${cx + 15} ${my - 6} ${cx + 6} ${my - 9} ${cx} ${my - 6} Z`,
    fill: color,
  });
  const jawBeard = (depth: number) =>
    el('path', {
      d: `M${cx - rx} ${eyeY + 6} C${cx - rx} ${cy + ry + depth * 0.6} ${cx - 12} ${cy + ry + depth} ${cx} ${cy + ry + depth} C${cx + 12} ${cy + ry + depth} ${cx + rx} ${cy + ry + depth * 0.6} ${cx + rx} ${eyeY + 6} L${cx + rx - 5} ${eyeY + 8} C${cx + rx - 6} ${my + 4} ${cx + 10} ${my + 10} ${cx} ${my + 10} C${cx - 10} ${my + 10} ${cx - rx + 6} ${my + 4} ${cx - rx + 5} ${eyeY + 8} Z`,
      fill: color,
    });
  switch (look.beard.style) {
    case 'full':
      return [jawBeard(10), mustache];
    case 'short':
      return [jawBeard(3), mustache];
    case 'long':
      return [
        jawBeard(14),
        el('path', { d: `M${cx - 18} ${cy + ry + 6} Q${cx} ${cy + ry + 52} ${cx + 18} ${cy + ry + 6} Z`, fill: color }),
        el('path', { d: `M${cx - 6} ${cy + ry + 10} q2 14 -1 24 M${cx + 6} ${cy + ry + 10} q-2 14 1 24`, stroke: shade(color, -30), strokeWidth: 1, fill: 'none', opacity: 0.5 }),
        mustache,
      ];
    case 'goatee':
      return [mustache, el('path', { d: `M${cx - 5} ${my + 7} Q${cx} ${cy + ry + 8} ${cx + 5} ${my + 7} Z`, fill: color })];
    case 'sideburns':
      return [
        el('path', { d: `M${cx - rx} ${eyeY - 4} L${cx - rx + 7} ${eyeY - 4} L${cx - rx + 9} ${my + 4} Q${cx - rx + 2} ${my + 6} ${cx - rx} ${my - 4} Z`, fill: color }),
        el('path', { d: `M${cx + rx} ${eyeY - 4} L${cx + rx - 7} ${eyeY - 4} L${cx + rx - 9} ${my + 4} Q${cx + rx - 2} ${my + 6} ${cx + rx} ${my - 4} Z`, fill: color }),
        mustache,
      ];
    case 'mustache':
    default:
      return [mustache];
  }
}

function hat(look: HeroLook, stage: HeroStage): ArtNode[] {
  if (!look.hat || stage < look.hat.from) return [];
  const { cy, rx, ry } = BODY[stage];
  const cx = 100;
  const top = cy - ry;
  const c = look.hat.color;
  switch (look.hat.style) {
    case 'beret':
      return [
        el('ellipse', { cx: cx + 6, cy: top + 2, rx: rx + 12, ry: 12, fill: c, transform: `rotate(-12 ${cx + 6} ${top + 2})` }),
        el('circle', { cx: cx + 4, cy: top - 10, r: 3, fill: shade(c, -30) }),
      ];
    case 'straw':
      return [
        el('path', { d: `M${cx - rx + 2} ${top + 12} L${cx - rx + 6} ${top - 14} Q${cx} ${top - 22} ${cx + rx - 6} ${top - 14} L${cx + rx - 2} ${top + 12} Z`, fill: c }),
        el('rect', { x: cx - rx + 4, y: top + 2, width: rx * 2 - 8, height: 6, fill: '#3E5E8E' }),
        el('ellipse', { cx, cy: top + 12, rx: rx + 26, ry: 8, fill: shade(c, 12), stroke: shade(c, -30), strokeWidth: 1 }),
      ];
    case 'tubeteika':
    default:
      return [
        el('path', { d: `M${cx - rx + 1} ${top + 13} L${cx - rx + 7} ${top - 8} Q${cx} ${top - 16} ${cx + rx - 7} ${top - 8} L${cx + rx - 1} ${top + 13} Q${cx} ${top + 9} ${cx - rx + 1} ${top + 13} Z`, fill: c }),
        el('path', { d: `M${cx - rx + 5} ${top + 6} l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6`, stroke: '#F4E3B5', strokeWidth: 1.6, fill: 'none' }),
        el('circle', { cx, cy: top - 6, r: 3, fill: '#F4E3B5' }),
      ];
  }
}

function body(look: HeroLook, stage: HeroStage, power: HeroPower): ArtNode[] {
  const { cy, ry } = BODY[stage];
  const sh = shoulders(stage, power);
  const cx = 100;
  const shY = cy + ry + (stage <= 2 ? 10 : 14);
  const neckW = stage <= 2 ? 16 : 20;
  const nodes: ArtNode[] = [
    el('rect', { x: cx - neckW / 2, y: cy + ry - 8, width: neckW, height: shY - (cy + ry) + 12, fill: shade(look.skin, -14) }),
    el('path', {
      d: `M${cx - sh} 210 L${cx - sh} ${shY + 20} Q${cx - sh} ${shY} ${cx - sh + 22} ${shY} L${cx + sh - 22} ${shY} Q${cx + sh} ${shY} ${cx + sh} ${shY + 20} L${cx + sh} 210 Z`,
      fill: look.outfit,
    }),
    // ворот
    el('path', { d: `M${cx - neckW / 2 - 6} ${shY} L${cx} ${shY + 18} L${cx + neckW / 2 + 6} ${shY} Z`, fill: look.collar }),
  ];
  if (look.extra === 'ribbon') {
    nodes.push(el('path', { d: `M${cx - 9} ${shY + 6} L${cx} ${shY + 12} L${cx + 9} ${shY + 6} L${cx + 9} ${shY + 18} L${cx} ${shY + 12} L${cx - 9} ${shY + 18} Z`, fill: look.accent }));
  }
  // золотая цепь мастера
  if (stage === 5) {
    nodes.push(el('path', { d: `M${cx - sh + 18} ${shY + 2} Q${cx} ${shY + 40} ${cx + sh - 18} ${shY + 2}`, stroke: '#D9A441', strokeWidth: 3, fill: 'none', strokeDasharray: '4 3' }));
    nodes.push(el('circle', { cx, cy: shY + 23, r: 5, fill: '#D9A441' }));
  }
  return nodes;
}

function hairAccessory(look: HeroLook, stage: HeroStage): ArtNode[] {
  const { cy, rx, ry } = BODY[stage];
  if (look.extra === 'comb') {
    return [el('path', { d: `M${100 + rx - 14} ${cy - ry + 2} l12 -6 l3 6 l-12 6 Z`, fill: '#E9D9A6', stroke: '#B59A55', strokeWidth: 0.8 })];
  }
  if (look.extra === 'ribbon' && look.hairStyle === 'bun') {
    return [el('path', { d: `M86 ${cy - ry - 4} l-10 -6 l0 12 Z M114 ${cy - ry - 4} l10 -6 l0 12 Z`, fill: look.accent })];
  }
  return [];
}

// Предметы в руках: карандаш → кисть → кисть со скетчбуком → палитра → палитра мастера.
function props(look: HeroLook, stage: HeroStage): ArtNode[] {
  const pencil = el('g', { transform: 'rotate(-30 160 168)' }, [
    el('rect', { x: 155, y: 130, width: 10, height: 46, fill: '#F2C14E', stroke: '#B88A1F', strokeWidth: 1 }),
    el('rect', { x: 155, y: 124, width: 10, height: 7, fill: '#F28BA8' }),
    el('polygon', { points: '155,176 165,176 160,190', fill: '#F4DDB5' }),
    el('polygon', { points: '158,184 162,184 160,190', fill: '#333333' }),
  ]);
  const brush = el('g', { transform: 'rotate(-28 160 168)' }, [
    el('rect', { x: 157, y: 120, width: 6, height: 50, rx: 3, fill: '#8B5A2B' }),
    el('rect', { x: 156, y: 168, width: 8, height: 8, fill: '#B9BEC6' }),
    el('path', { d: 'M156 176 Q160 196 164 176 Z', fill: look.accent }),
  ]);
  const sketchbook = el('g', { transform: 'rotate(12 52 172)' }, [
    el('rect', { x: 30, y: 152, width: 44, height: 34, rx: 3, fill: '#FFFFFF', stroke: '#8C7A63', strokeWidth: 1.5 }),
    el('path', { d: 'M36 176 Q46 160 56 172 T70 166', stroke: look.accent, strokeWidth: 2, fill: 'none' }),
  ]);
  const palette = el('g', {}, [
    el('path', { d: 'M22 176 C18 150 56 140 74 156 C84 165 76 172 68 170 C60 168 58 178 66 184 C70 194 34 198 22 176 Z', fill: '#D9B07A', stroke: '#A97E45', strokeWidth: 1.5 }),
    el('circle', { cx: 34, cy: 166, r: 4.5, fill: '#E4664F' }),
    el('circle', { cx: 46, cy: 158, r: 4.5, fill: '#F2C14E' }),
    el('circle', { cx: 59, cy: 158, r: 4.5, fill: '#4A90C4' }),
    el('circle', { cx: 34, cy: 180, r: 4.5, fill: look.accent }),
  ]);
  switch (stage) {
    case 1:
      return [pencil];
    case 2:
      return [brush];
    case 3:
      return [sketchbook, brush];
    case 4:
    case 5:
    default:
      return [palette, brush];
  }
}


// Плечи шире, когда герой набирает силу.
function shoulders(stage: HeroStage, power: HeroPower): number {
  return BODY[stage].sh + (power >= 2 ? 6 : 0);
}

const POWER_GLOW = '#6FE3FF';
const CLOAK = '#2B2D6E';
const CLOAK_LINING = '#B3263A';
const TRIM = '#E8C25A';

// Сияние за спиной героя (сила 1+), магический круг из кистей (3+).
function powerBack(stage: HeroStage, power: HeroPower, id: string): { defs: ArtNode[]; nodes: ArtNode[] } {
  if (power < 1) return { defs: [], nodes: [] };
  const { cy } = BODY[stage];
  const defs = [
    el('radialGradient', { id: `${id}aura`, cx: 0.5, cy: 0.5, r: 0.5 }, [
      el('stop', { offset: 0, stopColor: POWER_GLOW, stopOpacity: power >= 4 ? 0.85 : 0.6 }),
      el('stop', { offset: 0.6, stopColor: POWER_GLOW, stopOpacity: 0.25 }),
      el('stop', { offset: 1, stopColor: POWER_GLOW, stopOpacity: 0 }),
    ]),
  ];
  const nodes: ArtNode[] = [el('ellipse', { cx: 100, cy: cy + 10, rx: 82, ry: 92, fill: `url(#${id}aura)` })];
  if (power >= 3) {
    // Круг из двух колец с «рунами» — мазками и точками.
    const r1 = 64;
    nodes.push(el('circle', { cx: 100, cy: cy - 4, r: r1, fill: 'none', stroke: TRIM, strokeWidth: 1.8, opacity: 0.9 }));
    nodes.push(el('circle', { cx: 100, cy: cy - 4, r: r1 - 8, fill: 'none', stroke: TRIM, strokeWidth: 1, strokeDasharray: '2 5', opacity: 0.9 }));
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const x = 100 + Math.cos(a) * (r1 - 4);
      const y = cy - 4 + Math.sin(a) * (r1 - 4);
      nodes.push(
        i % 2 === 0
          ? el('path', { d: `M${x - 3} ${y} L${x} ${y - 3} L${x + 3} ${y} L${x} ${y + 3} Z`, fill: TRIM })
          : el('circle', { cx: x, cy: y, r: 1.6, fill: POWER_GLOW })
      );
    }
  }
  return { defs, nodes };
}

// Высокий стоячий воротник плаща — за головой (сила 2+).
function cloakCollar(stage: HeroStage, power: HeroPower): ArtNode[] {
  if (power < 2) return [];
  const { cy, rx, ry } = BODY[stage];
  const cx = 100;
  const shY = cy + ry + (stage <= 2 ? 10 : 14);
  const h = power >= 4 ? 30 : 24;
  return [
    el('path', {
      d: `M${cx - rx - 4} ${shY + 4} L${cx - rx - 20} ${cy - h * 0.2} Q${cx - rx - 6} ${cy + 4} ${cx - 18} ${shY - 2} Z`,
      fill: CLOAK_LINING,
      stroke: TRIM,
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
    }),
    el('path', {
      d: `M${cx + rx + 4} ${shY + 4} L${cx + rx + 20} ${cy - h * 0.2} Q${cx + rx + 6} ${cy + 4} ${cx + 18} ${shY - 2} Z`,
      fill: CLOAK_LINING,
      stroke: TRIM,
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
    }),
  ];
}

// Плащ творца поверх одежды (сила 2+), кристалл вдохновения (3+).
function cloakFront(stage: HeroStage, power: HeroPower): ArtNode[] {
  if (power < 2) return [];
  const { cy, ry } = BODY[stage];
  const sh = shoulders(stage, power);
  const cx = 100;
  const shY = cy + ry + (stage <= 2 ? 10 : 14);
  const trim = power >= 4 ? POWER_GLOW : TRIM;
  const nodes: ArtNode[] = [];
  for (const side of [-1, 1]) {
    const outer = cx + side * (sh + 2);
    const inner = cx + side * 16;
    nodes.push(
      el('path', {
        d: `M${inner} ${shY - 2} L${outer - side * 20} ${shY - 2} Q${outer} ${shY - 2} ${outer} ${shY + 20} L${outer} 210 L${inner + side * 6} 210 Z`,
        fill: CLOAK,
      })
    );
    // золотая кайма и геометрический узор
    nodes.push(el('path', { d: `M${inner} ${shY - 2} L${inner + side * 6} 210`, stroke: trim, strokeWidth: 3, fill: 'none' }));
    nodes.push(
      el('path', {
        d: `M${inner + side * 8} ${shY + 24} l${side * 8} 8 l${-side * 8} 8 M${inner + side * 9} ${shY + 44} l${side * 8} 8 l${-side * 8} 8`,
        stroke: trim,
        strokeWidth: 1.6,
        fill: 'none',
        opacity: 0.9,
      })
    );
  }
  // пояс-кушак
  nodes.push(el('rect', { x: cx - 18, y: shY + 52, width: 36, height: 7, fill: CLOAK_LINING }));
  if (power >= 3) {
    // Кристалл вдохновения на застёжке плаща.
    const y = shY + 6;
    nodes.push(el('circle', { cx, cy: y, r: 10, fill: TRIM }));
    nodes.push(el('circle', { cx, cy: y, r: 7, fill: '#1B6F8A' }));
    nodes.push(el('path', { d: `M${cx} ${y - 6} L${cx + 4} ${y} L${cx} ${y + 6} L${cx - 4} ${y} Z`, fill: POWER_GLOW }));
    nodes.push(el('circle', { cx: cx - 2, cy: y - 2, r: 1.4, fill: '#FFFFFF' }));
  }
  return nodes;
}

// Магистр (сила 4): парящие сферы-краски и искры вокруг.
function powerFront(power: HeroPower): ArtNode[] {
  if (power < 1) return [];
  const sparks: ArtNode[] = [];
  const star = (x: number, y: number, r: number, c: string) =>
    el('path', { d: `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`, fill: c });
  sparks.push(star(30, 40, 5, '#FFFFFF'));
  sparks.push(star(172, 110, 4, '#FFFFFF'));
  if (power >= 4) {
    const orbs: [number, number, string][] = [
      [26, 96, '#E4664F'],
      [174, 70, '#F2C14E'],
      [40, 130, '#4A90C4'],
      [166, 138, '#8266C2'],
    ];
    for (const [x, y, c] of orbs) {
      sparks.push(el('circle', { cx: x, cy: y, r: 10, fill: POWER_GLOW, opacity: 0.35 }));
      sparks.push(el('circle', { cx: x, cy: y, r: 6, fill: c, stroke: '#FFFFFF', strokeWidth: 1.2 }));
    }
    sparks.push(star(150, 24, 6, POWER_GLOW));
    sparks.push(star(56, 22, 4, POWER_GLOW));
  }
  return sparks;
}

function laurel(): ArtNode[] {
  const leaves: ArtNode[] = [];
  for (let i = 0; i < 7; i += 1) {
    for (const side of [-1, 1]) {
      const a = (Math.PI / 2) + side * (0.35 + i * 0.17);
      const x = 100 + Math.cos(a) * 92;
      const y = 100 + Math.sin(a) * 92;
      const rot = (a * 180) / Math.PI + (side > 0 ? 60 : 120);
      leaves.push(el('ellipse', { cx: x, cy: y, rx: 7, ry: 3.2, fill: '#D9A441', stroke: '#9C7424', strokeWidth: 0.7, transform: `rotate(${rot} ${x} ${y})` }));
    }
  }
  return leaves;
}

// Полный рисунок: фон, фигура, предметы, рамка по стадии.
export function buildHeroArt(look: HeroLook, stage: HeroStage, id: string, power: HeroPower = 0): ArtNode[] {
  const bg = scene(look.scene, id);
  const aura = powerBack(stage, power, id);
  const clipId = `${id}clip`;
  const ring = STAGE_RING[stage];
  return [
    el('defs', {}, [
      el('clipPath', { id: clipId }, [el('circle', { cx: 100, cy: 100, r: 96 })]),
      ...bg.defs,
      ...aura.defs,
    ]),
    el('g', { clipPath: `url(#${clipId})` }, [
      ...bg.nodes,
      ...aura.nodes,
      ...backHair(look, stage),
      ...cloakCollar(stage, power),
      ...body(look, stage, power),
      ...cloakFront(stage, power),
      ...face(look, stage),
      ...beard(look, stage),
      mouth(look, stage),
      ...frontHair(look, stage),
      ...hairAccessory(look, stage),
      ...hat(look, stage),
      ...props(look, stage),
      ...powerFront(power),
    ]),
    el('circle', { cx: 100, cy: 100, r: 96, fill: 'none', stroke: ring, strokeWidth: stage === 5 ? 7 : 5 }),
    ...(stage === 5 ? laurel() : []),
  ];
}

// SVG-строка для превью (браузер, сайт школы, проверка рисунков).
export function heroArtToSvg(nodes: ArtNode[], size = 200): string {
  const attr = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace('clip-path', 'clip-path');
  const keyName = (t: ArtTag, k: string) => {
    if (k === 'clipPath') return 'clip-path';
    if (t === 'linearGradient' || t === 'radialGradient') return k;
    return attr(k);
  };
  const render = (n: ArtNode): string => {
    const props = Object.entries(n.p)
      .map(([k, v]) => `${keyName(n.t, k)}="${v}"`)
      .join(' ');
    const inner = (n.c ?? []).map(render).join('');
    return `<${n.t} ${props}>${inner}</${n.t}>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">${nodes.map(render).join('')}</svg>`;
}
