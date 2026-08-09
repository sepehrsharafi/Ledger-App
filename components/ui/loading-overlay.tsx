import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { colors, radii, shadow, spacing } from '@/constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
}

export function LoadingOverlay({ visible, label = 'Updating view' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.panel}>
        <ActivityIndicator size="small" color={colors.accent} />
        <AppText variant="small" color={colors.ink}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: radii.md,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...shadow,
  },
});
