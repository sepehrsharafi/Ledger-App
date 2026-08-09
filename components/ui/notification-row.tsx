import { Pressable, StyleSheet, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing } from '@/constants/theme';
import { formatRelative } from '@/lib/format';
import type { InboxItem } from '@/types/models';

interface NotificationRowProps {
  item: InboxItem;
  onPress: () => void;
}

export function NotificationRow({ item, onPress }: NotificationRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed ? styles.pressed : null]}
    >
      <View style={styles.header}>
        <StatusPill label={item.kind === 'approval' ? 'Approval' : 'Task review'} tone={item.kind === 'approval' ? 'warning' : 'accent'} />
        <Label>{formatRelative(item.timestamp)}</Label>
      </View>
      <AppText variant="heading" numberOfLines={2}>
        {item.title}
      </AppText>
      <AppText variant="small" numberOfLines={2}>
        {item.subtitle}
      </AppText>
      <Label color={colors.accent}>{item.projectName}</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
