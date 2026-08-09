import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing } from '@/constants/theme';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
      <Label>{label}</Label>
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.panel}>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="bodyMuted">{message}</AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" /> : null}
    </View>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return (
    <View style={[styles.panel, styles.errorPanel]}>
      <Label color={colors.danger}>Error</Label>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="bodyMuted">{message}</AppText>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.md },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
  },
  errorPanel: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
});
