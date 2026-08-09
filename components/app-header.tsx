import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useUnreadCount } from '@/hooks/use-inbox';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Monospace breadcrumb above the title, e.g. "LUMEN SKINCARE / LEADS". */
  breadcrumb?: string;
  showBack?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  showInboxBadge?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  breadcrumb,
  showBack = false,
  actionLabel,
  onAction,
  showInboxBadge = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topRow}>
        <View style={styles.leading}>
          {showBack ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10} style={styles.back}>
              <Text style={typography.labelStrong}>← Back</Text>
            </Pressable>
          ) : null}
          {breadcrumb ? <Label numberOfLines={1}>{breadcrumb}</Label> : null}
        </View>

        <View style={styles.actions}>
          {showInboxBadge ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Inbox, ${unread} unread`}
              onPress={() => router.push('/(tabs)/inbox')}
              style={styles.badgeWrap}
              hitSlop={8}
            >
              <Text style={typography.labelStrong}>INBOX</Text>
              {unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} size="sm" /> : null}
        </View>
      </View>

      <View style={styles.titleBlock}>
        <AppText variant="display" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="bodyMuted">{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34, gap: spacing.md },
  leading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  back: { paddingVertical: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accentInk, fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
  titleBlock: { gap: 2 },
});
