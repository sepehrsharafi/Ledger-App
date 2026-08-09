import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
};

const labelColor: Record<Variant, string> = {
  primary: colors.accentInk,
  secondary: colors.ink,
  ghost: colors.ink,
  danger: colors.accentInk,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        variantStyles[variant],
        fullWidth ? styles.fullWidth : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor[variant]} />
      ) : (
        <Text numberOfLines={1} style={[typography.labelStrong, { color: labelColor[variant] }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  sizeMd: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 44 },
  sizeSm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 34 },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.4 },
});
