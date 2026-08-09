import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing } from '@/constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra context, e.g. the sample task list shown before a forced unassign. */
  children?: ReactNode;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />
        <View style={styles.dialog}>
          <Label color={destructive ? colors.danger : colors.inkMuted}>{destructive ? 'Confirm removal' : 'Confirm'}</Label>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="bodyMuted">{message}</AppText>
          {children}
          <View style={styles.actions}>
            <Button label={cancelLabel} onPress={onCancel} variant="secondary" size="sm" />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              size="sm"
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
