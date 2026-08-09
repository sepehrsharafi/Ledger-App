import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE_BY_STATUS: Record<string, Tone> = {
  Active: 'accent',
  Scheduled: 'neutral',
  Ended: 'neutral',
  Paused: 'warning',
  Archived: 'neutral',
  New: 'accent',
  Contacted: 'neutral',
  Qualified: 'accent',
  Won: 'success',
  Lost: 'danger',
  Draft: 'neutral',
  Published: 'success',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  High: 'danger',
  Medium: 'warning',
  Low: 'neutral',
  Admin: 'accent',
  Manager: 'neutral',
  Member: 'neutral',
};

const toneStyles: Record<Tone, { bg: string; border: string; text: string }> = {
  neutral: { bg: colors.surface, border: colors.border, text: colors.inkMuted },
  accent: { bg: colors.surface, border: colors.accent, text: colors.accent },
  success: { bg: colors.surface, border: colors.success, text: colors.success },
  warning: { bg: colors.surface, border: colors.warning, text: colors.warning },
  danger: { bg: colors.surface, border: colors.danger, text: colors.danger },
};

interface StatusPillProps {
  label: string;
  /** Overrides the tone inferred from the label. */
  tone?: Tone;
  filled?: boolean;
  minWidth?: number;
}

export function StatusPill({ label, tone, filled = false, minWidth }: StatusPillProps) {
  const resolved = toneStyles[tone ?? TONE_BY_STATUS[label] ?? 'neutral'];
  return (
    <View
      style={[
        styles.pill,
        minWidth ? { minWidth } : null,
        { borderColor: resolved.border, backgroundColor: filled ? resolved.border : resolved.bg },
      ]}
    >
      <Text style={[typography.label, styles.text, { color: filled ? colors.accentInk : resolved.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { textAlign: 'center' },
});
