import { Platform } from 'react-native';

/**
 * Ledger design tokens. The product ships light-only so every surface is predictable
 * on both platforms; colours are referenced through this object, never inlined.
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F6F4',
  surfaceSunken: '#F1EFEC',
  ink: '#111110',
  inkMuted: '#6B6863',
  inkFaint: '#9A968F',
  border: '#E6E3DE',
  borderStrong: '#111110',
  accent: '#1F4BC5',
  accentSoft: '#E8EDFB',
  accentInk: '#FFFFFF',
  success: '#1B7F5C',
  successSoft: '#E4F2EC',
  warning: '#B4741C',
  warningSoft: '#FBF0E0',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  overlay: 'rgba(17, 17, 16, 0.45)',
  chartInk: '#111110',
  chartAccent: '#1F4BC5',
  chartSoft: '#9CB6EA',
} as const;

export const channelColors = {
  Search: '#111110',
  Social: '#1F4BC5',
  Email: '#9CB6EA',
  Paid: '#B4741C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const typography = {
  display: { fontSize: 30, lineHeight: 34, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const, color: colors.ink },
  bodyMuted: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const, color: colors.inkMuted },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, color: colors.inkMuted },
  metric: { fontSize: 26, lineHeight: 30, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.5 },
  /** Uppercase monospace micro-label used for every section and field caption. */
  label: {
    fontFamily: mono,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: colors.inkMuted,
    textTransform: 'uppercase' as const,
  },
  labelStrong: {
    fontFamily: mono,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: colors.ink,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  mono: { fontFamily: mono, fontSize: 12, lineHeight: 16, color: colors.ink },
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#111110',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 2 },
});
