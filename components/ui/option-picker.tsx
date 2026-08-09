import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { FormField } from '@/components/ui/form-field';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { TeamMember } from '@/types/models';

interface OptionPickerProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

/** Horizontal option row used for every enum-shaped field (status, channel, priority). */
export function OptionPicker<T extends string>({ label, options, value, onChange, error }: OptionPickerProps<T>) {
  return (
    <FormField label={label} error={error}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option)}
              style={[styles.option, active ? styles.optionActive : null]}
            >
              <Text style={[typography.label, active ? styles.optionTextActive : null]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </FormField>
  );
}

interface AssigneePickerProps {
  label: string;
  members: TeamMember[];
  value: string;
  onChange: (name: string) => void;
  error?: string;
}

/** Picks an owner by name from the members assigned to the current project. */
export function AssigneePicker({ label, members, value, onChange, error }: AssigneePickerProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={members.length === 0 ? 'Assign team members to this project first.' : undefined}
    >
      <View style={styles.assigneeList}>
        {members.map((member) => {
          const active = member.name === value;
          return (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(member.name)}
              style={[styles.assignee, active ? styles.assigneeActive : null]}
            >
              <Avatar name={member.name} color={member.avatarColor} size="sm" />
              <Text style={[typography.small, active ? styles.assigneeTextActive : null]}>{member.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionTextActive: { color: colors.accentInk, fontWeight: '700' },
  assigneeList: { gap: spacing.sm },
  assignee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  assigneeActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  assigneeTextActive: { color: colors.ink, fontWeight: '700' },
});
