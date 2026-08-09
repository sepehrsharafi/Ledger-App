import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { AppText, Label } from '@/components/ui/text';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Demo sign-in. Any well-formed email with a password opens the seeded workspace. */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, submitting, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('alex.morgan@ledgerstudio.co');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = touched && !EMAIL_PATTERN.test(email) ? 'Enter a valid email address' : undefined;
  const passwordError = touched && password.trim().length === 0 ? 'Password is required' : undefined;
  const canSubmit = EMAIL_PATTERN.test(email) && password.trim().length > 0;

  const onSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    const success = await signIn(email.trim(), password);
    if (success) router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <Label>Ledger</Label>
          <AppText variant="display">Every client,{'\n'}on the record.</AppText>
          <AppText variant="bodyMuted">
            Every conversation, campaign and milestone in one place — so nothing about your clients ever slips through
            the cracks.
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText variant="title">Sign in</AppText>
          <AppText variant="small">Any email and password opens the demo workspace.</AppText>

          <TextField
            label="Email"
            value={email}
            onChangeText={(value) => {
              clearError();
              setEmail(value);
            }}
            placeholder="alex@ledger.demo"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={(value) => {
              clearError();
              setPassword(value);
            }}
            placeholder="Any password"
            secureTextEntry
            autoCapitalize="none"
            error={passwordError}
          />

          {error ? (
            <View style={styles.errorBox}>
              <AppText variant="small" color={colors.danger}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button label="Sign in" onPress={onSubmit} loading={submitting} disabled={touched && !canSubmit} fullWidth />

          <Label>Demo access — credentials are not verified in this build.</Label>
        </View>

        <Label>Agency operating system</Label>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
  brandBlock: { gap: spacing.md },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
});
