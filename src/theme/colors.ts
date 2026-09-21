// Палитра школы искусств: строгая академическая основа (глубокий бордо,
// тёплый графит) + весёлые акценты «красок» для аватаров, тегов и вкладок.

export const colors = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE5', // подложка для тегов/пилюль

  primary: '#7C2A3B', // глубокий бордо — строгий, академический
  primaryDark: '#571E2A',
  primaryLight: '#A8465A',

  accent: '#D9A441', // тёплое золото — акцент «под сусальное золото» рамы

  text: '#221C1A',
  textMuted: '#6E675F',
  border: '#E8E0D3',

  success: '#3E8F5E',
  warning: '#C97B2E',
  danger: '#C23B33',
  white: '#FFFFFF',
};

// «Палитра красок» — весёлые, но не кричащие акценты одной насыщенности.
// Используются точечно: аватары без фото, теги аудитории, иконки вкладок.
export const paint = {
  coral: '#E4664F',
  ochre: '#D9A441',
  teal: '#3B9C93',
  violet: '#8266C2',
  leaf: '#5FA36A',
  sky: '#4A90C4',
};

export const paintPalette = [paint.coral, paint.ochre, paint.teal, paint.violet, paint.leaf, paint.sky];

export function colorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return paintPalette[hash % paintPalette.length];
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
};

// Мягкая «приподнятая» тень вместо плоской обводки — читается современнее.
export const shadow = {
  card: {
    shadowColor: '#3A2A1F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  soft: {
    shadowColor: '#3A2A1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;
