import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { colors, spacing } from '@/constants/theme';

interface DataRowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned primary value, e.g. an amount. */
  value?: string;
  valueCaption?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  strikethrough?: boolean;
  footer?: ReactNode;
}

/** Mobile stand-in for a table row: leading slot, stacked text, right-aligned value. */
export function DataRow({
  title,
  subtitle,
  value,
  valueCaption,
  leading,
  trailing,
  onPress,
  strikethrough = false,
  footer,
}: DataRowProps) {
  const body = (
    <View style={styles.row}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={1} style={strikethrough ? styles.strike : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
        {footer}
      </View>
      {value || valueCaption ? (
        <View style={styles.value}>
          {value ? <AppText variant="body">{value}</AppText> : null}
          {valueCaption ? <AppText variant="small">{valueCaption}</AppText> : null}
        </View>
      ) : null}
      {trailing}
    </View>
  );

  if (!onPress) return <View style={styles.container}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md },
  pressed: { backgroundColor: colors.surfaceAlt },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  leading: { justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  value: { alignItems: 'flex-end', gap: 2 },
  strike: { textDecorationLine: 'line-through', color: colors.inkMuted },
});
