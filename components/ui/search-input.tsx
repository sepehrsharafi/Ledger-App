import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Label } from '@/components/ui/text';
import { colors, radii, spacing, typography } from '@/constants/theme';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChangeText, placeholder = 'Search' }: SearchInputProps) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
          <Label>Clear</Label>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  input: { ...typography.body, flex: 1, paddingVertical: spacing.md, minHeight: 42 },
});
