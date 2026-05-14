// ============================================================
// Jetdale — Design Tokens
// Exact values from spec Section 4. No deviations.
// ============================================================

export const colors = {
  ink: '#0E0F0C',
  paper: '#F4F1EA',
  paper2: '#EAE5D9',
  paper3: '#DDD6C5',
  rule: '#2A2B26',
  accent: '#FF5B1F',
  accent2: '#E84A0F',
  moss: '#2E4A2C',
  gold: '#C9A227',
  muted: '#6B6B62',
  error: '#C7321A',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const typography = {
  families: {
    display: 'BricolageGrotesque',
    body: 'Manrope',
    mono: 'SpaceMono',
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  sizes: {
    displayXl: 56,
    displayLg: 40,
    displayMd: 28,
    displaySm: 20,
    bodyLg: 17,
    bodyMd: 15,
    bodySm: 13,
    monoXs: 10,
  },
  lineHeights: {
    displayXl: 56,
    displayLg: 44,
    displayMd: 32,
    displaySm: 24,
    bodyLg: 24,
    bodyMd: 22,
    bodySm: 18,
    monoXs: 14,
  },
  letterSpacing: {
    display: -0.035 * 16, // -0.035em converted to pts
    body: 0,
    mono: 0,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
  '7xl': 120,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const motion = {
  defaultDuration: 150,
  defaultEasing: 'ease-out',
  pageDuration: 200,
  pageEasing: 'ease-in-out',
  hoverLift: -2,
  pressScale: 0.98,
  micPulseDuration: 1500,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  elevated: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
} as const;
