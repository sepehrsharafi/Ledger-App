import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing, typography } from '@/constants/theme';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}

export function FormField({ label, children, error, hint }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      {children}
      {error ? (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small">{hint}</AppText>
      ) : null}
    </View>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
  editable?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  multiline = false,
  keyboardType,
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  editable = true,
}: TextFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={!secureTextEntry}
        secureTextEntry={secureTextEntry}
        editable={editable}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          error ? styles.inputError : null,
          editable ? null : styles.inputDisabled,
        ]}
      />
    </FormField>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: colors.surfaceAlt, color: colors.inkMuted },
});
