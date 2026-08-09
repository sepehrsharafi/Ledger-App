import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/constants/theme';
import { initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 22, md: 30, lg: 42 } as const;

export function Avatar({ name, color = colors.accent, size = 'md' }: AvatarProps) {
  const dimension = SIZES[size];
  return (
    <View
      style={[styles.avatar, { width: dimension, height: dimension, backgroundColor: color }]}
      accessibilityLabel={name}
    >
      <Text style={[typography.label, styles.text, size === 'lg' ? styles.textLg : null]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.accentInk, fontWeight: '700' },
  textLg: { fontSize: 13 },
});
