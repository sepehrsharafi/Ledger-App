import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/text';
import { colors, radii, spacing } from '@/constants/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned action row at the bottom of the sheet. */
  footer?: ReactNode;
}

/**
 * Modal sheet used for every create/edit/detail flow. Built on the native Modal so it
 * stays stable with the keyboard open, which drag-based sheets on Android do not.
 */
export function BottomSheet({ visible, onClose, title, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState({ title, children, footer });
  const mountedRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setSnapshot({ title, children, footer });
  }, [children, footer, title, visible]);

  useEffect(() => {
    if (visible) {
      if (!mountedRef.current) {
        mountedRef.current = true;
        setMounted(true);
        progress.setValue(0);
      }

      progress.stopAnimation();
      Animated.timing(progress, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!mountedRef.current) return;

    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 240,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
    });
  }, [progress, visible]);

  if (!mounted && !visible) return null;

  const displayed = visible ? { title, children, footer } : snapshot;
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const sheetOpacity = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.96, 1, 1] });
  // A full viewport translation keeps the sheet entirely off-screen before it enters.
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [viewportHeight, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.lg), opacity: sheetOpacity, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.header}>
              <Label>{displayed.title}</Label>
              <Button label="Close" onPress={onClose} variant="secondary" size="sm" />
            </View>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {displayed.children}
            </ScrollView>
            {displayed.footer ? <View style={styles.footer}>{displayed.footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheetWrap: { maxHeight: '92%', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: { flexShrink: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
