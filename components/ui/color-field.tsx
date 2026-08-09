import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/ui/form-field';
import { colors, radii, spacing, typography } from '@/constants/theme';

const PRESETS = ['#1F4BC5', '#111827', '#1B5E4B', '#E4756A', '#2CB1A6', '#7C4DFF', '#B4741C'];

export const HEX_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Hex input with a live swatch and brand presets. */
export function ColorField({ label, value, onChange, error }: ColorFieldProps) {
  const valid = HEX_PATTERN.test(value);

  return (
    <FormField label={label} error={error}>
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: valid ? value : colors.surfaceSunken }]} />
        <TextInput
          value={value}
          onChangeText={(next) => onChange(next.startsWith('#') || next.length === 0 ? next.toUpperCase() : `#${next.toUpperCase()}`)}
          placeholder="#1F4BC5"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={[styles.input, !valid && value.length > 0 ? styles.inputError : null]}
        />
      </View>
      <View style={styles.presets}>
        {PRESETS.map((preset) => (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityLabel={`Use ${preset}`}
            onPress={() => onChange(preset)}
            style={[styles.preset, { backgroundColor: preset }, value === preset ? styles.presetActive : null]}
          />
        ))}
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 44, height: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  input: {
    ...typography.mono,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: { width: 26, height: 26, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  presetActive: { borderWidth: 2, borderColor: colors.ink },
});
