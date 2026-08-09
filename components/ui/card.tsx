import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { colors, radii, spacing } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Coloured hairline across the top — used to carry project brand accents. */
  accentColor?: string;
  padded?: boolean;
  style?: ViewStyle;
}

export function Card({ children, onPress, accentColor, padded = true, style }: CardProps) {
  const content = (
    <>
      {accentColor ? <View style={[styles.accent, { backgroundColor: accentColor }]} /> : null}
      <View style={padded ? styles.padding : undefined}>{children}</View>
    </>
  );

  if (!onPress) return <View style={[styles.card, style]}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  accent: { height: 3, width: '100%' },
  padding: { padding: spacing.lg },
});
