import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { Label } from '@/components/ui/text';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  title?: string;
  scrollable?: boolean;
}

export function FilterChips<T extends string>({ options, value, onChange, title, scrollable = true }: FilterChipsProps<T>) {
  const chips = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(option.value)}
        style={[styles.chip, active ? styles.chipActive : null]}
      >
        <Text style={[typography.label, active ? styles.chipTextActive : null]}>
          {option.label}
          {option.count !== undefined ? `  ${option.count}` : ''}
        </Text>
      </Pressable>
    );
  });

  const body = scrollable ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  ) : (
    <View style={[styles.row, styles.wrap]}>{chips}</View>
  );

  if (!title) return body;

  return (
    <View style={styles.group}>
      <Label>{title}</Label>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  wrap: { flexWrap: 'wrap', paddingRight: 0 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTextActive: { color: colors.accentInk, fontWeight: '700' },
});
