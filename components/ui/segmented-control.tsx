import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Renders a different visible label than the underlying value. */
  labels?: Partial<Record<T, string>>;
  /** Makes every segment share the available width, useful for compact mobile filters. */
  fullWidth?: boolean;
  /** Keeps long controls inside the viewport while preserving single-line labels. */
  scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  fullWidth = false,
  scrollable = false,
}: SegmentedControlProps<T>) {
  const segments = options.map((option) => {
    const active = option === value;
    return (
      <Pressable
        key={option}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(option)}
        style={[styles.segment, fullWidth ? styles.segmentFullWidth : null, active ? styles.segmentActive : null]}
      >
        <View style={styles.segmentContent}>
          <Text style={[typography.label, fullWidth ? styles.textFullWidth : null, active ? styles.textActive : null]} numberOfLines={fullWidth ? 2 : 1}>
            {labels?.[option] ?? option}
          </Text>
        </View>
      </Pressable>
    );
  });

  return (
    <View style={[styles.container, fullWidth ? styles.containerFullWidth : null]}>
      {scrollable ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>{segments}</ScrollView> : segments}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  containerFullWidth: { alignSelf: 'stretch' },
  segment: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  segmentFullWidth: { flex: 1, minHeight: 44, paddingHorizontal: spacing.xs, justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.ink },
  textFullWidth: { textAlign: 'center' },
  segmentContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  scrollContent: { flexDirection: 'row' },
  textActive: { color: colors.accentInk, fontWeight: '700' },
});
