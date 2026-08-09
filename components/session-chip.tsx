import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { OptionPicker } from '@/components/ui/option-picker';
import { AppText, Label } from '@/components/ui/text';
import { ROLES } from '@/constants/enums';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';
import type { Role } from '@/types/models';

/**
 * Signed-in user chip and session sheet. Role switching lives here rather than in workspace
 * Settings so a Member — who cannot open Settings — can still change back.
 */
export function SessionChip() {
  const user = useAuthStore((state) => state.user);
  const setRole = useAuthStore((state) => state.setRole);
  const signOut = useAuthStore((state) => state.signOut);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const onSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Signed in as ${user.name}. Open session options`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
      >
        <Avatar name={user.name} color={user.avatarColor} />
        <View style={styles.chipText}>
          <AppText variant="body" numberOfLines={1}>
            {user.name}
          </AppText>
          <Label>{user.role}</Label>
        </View>
        <Label color={colors.accent}>Session</Label>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Session"
        footer={<Button label="Sign out" onPress={onSignOut} variant="secondary" size="sm" />}
      >
        <View style={styles.sheetHeader}>
          <Avatar name={user.name} color={user.avatarColor} size="lg" />
          <View style={styles.chipText}>
            <AppText variant="title">{user.name}</AppText>
            <AppText variant="small">{user.email}</AppText>
          </View>
        </View>

        <OptionPicker label="Active role" options={ROLES} value={user.role as Role} onChange={setRole} />
        <AppText variant="small">
          Roles are switchable in this demo build. Members lose access to workspace settings.
        </AppText>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  chipText: { flex: 1, gap: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
