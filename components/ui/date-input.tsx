import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/ui/form-field';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { dateKey, formatFullDate, todayKey } from '@/lib/format';

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
}

function shift(value: string, days: number): string {
  const base = isValidDate(value) ? new Date(`${value}T00:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  return dateKey(base);
}

/**
 * Typed ISO date field with nudge controls and a native date picker while still
 * guaranteeing a valid YYYY-MM-DD value reaches the API.
 */
export function DateInput({ label, value, onChange, error }: DateInputProps) {
  const valid = isValidDate(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerValue = valid ? new Date(`${value}T00:00:00`) : new Date();

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setPickerOpen(false);
    if (date && event.type !== 'dismissed') onChange(dateKey(date));
  };

  return (
    <FormField label={label} error={error} hint={valid ? formatFullDate(value) : 'Use the format YYYY-MM-DD'}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.inkFaint}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          maxLength={10}
          style={[styles.input, error || (value.length > 0 && !valid) ? styles.inputError : null]}
        />
        <Stepper label="−1d" onPress={() => onChange(shift(value, -1))} />
        <Stepper label="+1d" onPress={() => onChange(shift(value, 1))} />
      </View>
      {pickerOpen ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      ) : null}
      <View style={styles.quickRow}>
        <Quick label="Pick date" onPress={() => setPickerOpen(true)} />
        <Quick label="Today" onPress={() => onChange(todayKey())} />
        <Quick label="In a week" onPress={() => onChange(shift(todayKey(), 7))} />
        <Quick label="In a month" onPress={() => onChange(shift(todayKey(), 30))} />
      </View>
    </FormField>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.stepper}>
      <AppText variant="small" color={colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Quick({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quick}>
      <Label color={colors.accent}>{label}</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  input: {
    ...typography.body,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  stepper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  quickRow: { flexDirection: 'row', gap: spacing.lg },
  quick: { paddingVertical: 2 },
});
