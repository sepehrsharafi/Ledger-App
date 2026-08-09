import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  contentStyle?: ViewStyle;
}

/**
 * Standard screen body: safe-area aware bottom padding plus optional pull-to-refresh.
 * Screens that own their own list (FlatList) pass `scroll={false}`.
 */
export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom + spacing.xxl;

  if (!scroll) {
    return <View style={[styles.container, padded ? styles.padded : null, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[padded ? styles.padded : null, { paddingBottom }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.lg, gap: spacing.xl },
});
