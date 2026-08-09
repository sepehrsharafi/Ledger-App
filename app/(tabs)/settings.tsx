import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataRow } from '@/components/ui/data-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { colors, spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useAgencySettings, useSettingsMutations } from '@/hooks/use-settings';
import { dataSource } from '@/lib/api';
import { resetDatabase } from '@/lib/db';
import { formatFullDate } from '@/lib/format';
import { useAuthStore } from '@/state/auth-store';
import { useCan } from '@/state/permissions';
import type { AgencySettings } from '@/types/models';

const NOTIFICATION_COPY: { key: keyof AgencySettings['notifications']; label: string; description: string }[] = [
  { key: 'approvals', label: 'Approvals', description: 'Alert me when a request needs a decision.' },
  { key: 'reports', label: 'Reports', description: 'Notify me when a client report is sent or opened.' },
  { key: 'tasks', label: 'Tasks', description: 'Tell me when a task lands in review.' },
];

export default function SettingsScreen() {
  const { data, isPending, isError, error, refetch } = useAgencySettings();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const { toggleNotification, toggleIntegration } = useSettingsMutations();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const canViewSettings = useCan('viewWorkspaceSettings');
  const queryClient = useQueryClient();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const onResetData = async () => {
    setResetting(true);
    try {
      resetDatabase();
      await queryClient.invalidateQueries();
    } finally {
      setResetting(false);
      setConfirmingReset(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  // Dropping to Member while sitting on this screen must also close it, not just hide the tab.
  if (!canViewSettings) return <Redirect href="/(tabs)" />;

  return (
    <View style={styles.root}>
      <AppHeader title="Settings" subtitle="Agency profile, notifications and integrations." />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading settings" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load settings" /> : null}

        {data ? (
          <>
            <Card>
              <View style={styles.identity}>
                <View style={[styles.logo, { backgroundColor: colors.ink }]}>
                  <AppText variant="heading" color={colors.accentInk}>
                    {data.logoPlaceholder}
                  </AppText>
                </View>
                <View style={styles.identityText}>
                  <AppText variant="title">{data.agencyName}</AppText>
                  <Label>Updated {formatFullDate(data.updatedAt)}</Label>
                </View>
              </View>
            </Card>

            <Section title="Signed in as">
              {user ? (
                <DataRow
                  title={user.name}
                  subtitle={user.email}
                  leading={<Avatar name={user.name} color={user.avatarColor} size="lg" />}
                  trailing={<StatusPill label={user.role} />}
                />
              ) : null}
              <AppText variant="small">
                Switch role or sign out from the session card at the bottom of the Projects tab.
              </AppText>
            </Section>

            <Section title="Notifications">
              {NOTIFICATION_COPY.map((item) => (
                <DataRow
                  key={item.key}
                  title={item.label}
                  subtitle={item.description}
                  trailing={
                    <Switch
                      value={data.notifications[item.key]}
                      onValueChange={(enabled) => toggleNotification.mutate({ key: item.key, enabled })}
                      trackColor={{ true: colors.accent, false: colors.surfaceSunken }}
                      thumbColor={colors.surface}
                    />
                  }
                />
              ))}
            </Section>

            <Section title="Integrations">
              {data.integrations.map((integration) => (
                <DataRow
                  key={integration.id}
                  title={integration.name}
                  subtitle={integration.connected ? 'Connected' : 'Not connected'}
                  trailing={
                    <Switch
                      value={integration.connected}
                      onValueChange={(connected) => toggleIntegration.mutate({ integrationId: integration.id, connected })}
                      trackColor={{ true: colors.accent, false: colors.surfaceSunken }}
                      thumbColor={colors.surface}
                    />
                  }
                />
              ))}
            </Section>

            <Section title="Data">
              <DataRow
                title={dataSource === 'embedded' ? 'Embedded database' : 'Remote API'}
                subtitle={
                  dataSource === 'embedded'
                    ? 'Everything is stored in SQLite on this device. No server required.'
                    : 'This build reads and writes through the Ledger HTTP API.'
                }
              />
              {dataSource === 'embedded' && Platform.OS !== 'web' ? (
                <Button
                  label="Reset demo data"
                  onPress={() => setConfirmingReset(true)}
                  variant="secondary"
                  fullWidth
                />
              ) : null}
            </Section>

            <Button label="Sign out" onPress={onSignOut} variant="secondary" fullWidth />
          </>
        ) : null}
      </Screen>

      <ConfirmModal
        visible={confirmingReset}
        title="Reset demo data?"
        message="Every project, lead, task and approval on this device is replaced with the original sample data. Anything you have added is lost."
        confirmLabel="Reset"
        destructive
        loading={resetting}
        onConfirm={onResetData}
        onCancel={() => setConfirmingReset(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logo: { width: 52, height: 52, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  identityText: { flex: 1, gap: 2 },
});
