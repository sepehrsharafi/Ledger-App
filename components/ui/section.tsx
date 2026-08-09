import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { AppText, Label } from '@/components/ui/text';

interface SectionProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/** Titled block with a hairline rule — the app's primary content divider. */
export function Section({ title, subtitle, children, actionLabel, onAction, style }: SectionProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Label>{title}</Label>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
            <Label color={colors.accent}>{actionLabel}</Label>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rule} />
      {subtitle ? (
        <AppText variant="small" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { height: 1, backgroundColor: colors.ink, marginTop: -spacing.sm },
  subtitle: { marginTop: -spacing.xs },
});
