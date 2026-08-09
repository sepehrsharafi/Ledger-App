import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { PairedBars } from '@/components/charts/paired-bars';
import { ProjectHeader } from '@/components/project/project-header';
import { Button } from '@/components/ui/button';
import { DataRow } from '@/components/ui/data-row';
import { TextField } from '@/components/ui/form-field';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatStrip } from '@/components/ui/stat-strip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { AppText, Label } from '@/components/ui/text';
import { FREQUENCIES } from '@/constants/enums';
import { colors, spacing } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';
import { useProjectReport, useReportRecipients, useUpdateReportConfig } from '@/hooks/use-reports';
import { useRefresh } from '@/hooks/use-refresh';
import { formatFullDate, formatNumber } from '@/lib/format';
import type { Frequency, ReportConfig } from '@/types/models';

type Tab = 'Design' | 'Schedule' | 'Activity';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ReportsScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectReport(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const [tab, setTab] = useState<Tab>('Design');
  const recipients = useReportRecipients(projectId);

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="reports"
        title="Reports"
        subtitle="Sections, schedule and report engagement."
        actionLabel="Send now"
        onAction={() => recipients.send.mutate()}
        showBack
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading report config" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load the report config" /> : null}

        {data ? (
          <>
            <SegmentedControl options={['Design', 'Schedule', 'Activity'] as const} value={tab} onChange={setTab} />
            {tab === 'Design' ? <DesignTab config={data} projectId={projectId} /> : null}
            {tab === 'Schedule' ? <ScheduleTab config={data} projectId={projectId} /> : null}
            {tab === 'Activity' ? <ActivityTab config={data} /> : null}
          </>
        ) : null}
      </Screen>
    </View>
  );
}

function DesignTab({ config, projectId }: { config: ReportConfig; projectId: string }) {
  const updateConfig = useUpdateReportConfig(projectId);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...config.includedSections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    updateConfig.mutate({ includedSections: next });
  };

  const remove = (section: string) => {
    updateConfig.mutate({ includedSections: config.includedSections.filter((entry) => entry !== section) });
  };

  return (
    <Section title="Included sections" subtitle="Sections appear in the client report in this order.">
      {config.includedSections.length === 0 ? (
        <EmptyState title="No sections selected" message="Add sections back to build a client-ready report." />
      ) : (
        config.includedSections.map((section, index) => (
          <DataRow
            key={section}
            title={section}
            subtitle={`Position ${index + 1} of ${config.includedSections.length}`}
            trailing={
              <View style={styles.rowActions}>
                <Button label="↑" onPress={() => move(index, -1)} variant="secondary" size="sm" disabled={index === 0} />
                <Button
                  label="↓"
                  onPress={() => move(index, 1)}
                  variant="secondary"
                  size="sm"
                  disabled={index === config.includedSections.length - 1}
                />
                <Button label="Remove" onPress={() => remove(section)} variant="ghost" size="sm" />
              </View>
            }
          />
        ))
      )}
    </Section>
  );
}

function ScheduleTab({ config, projectId }: { config: ReportConfig; projectId: string }) {
  const updateConfig = useUpdateReportConfig(projectId);
  const recipients = useReportRecipients(projectId);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = touched && !EMAIL_PATTERN.test(email.trim()) ? 'Enter a valid email address' : undefined;

  const addRecipient = async () => {
    setTouched(true);
    if (!EMAIL_PATTERN.test(email.trim())) return;
    await recipients.add.mutateAsync(email.trim());
    setEmail('');
    setTouched(false);
  };

  return (
    <>
      <Section title="Frequency">
        <SegmentedControl
          options={FREQUENCIES}
          value={config.frequency}
          onChange={(frequency: Frequency) => updateConfig.mutate({ frequency })}
        />
        <DataRow
          title="Internal review first"
          subtitle="Hold each report for an internal check before it reaches the client."
          trailing={
            <Switch
              value={config.internalReviewFirst}
              onValueChange={(internalReviewFirst) => updateConfig.mutate({ internalReviewFirst })}
              trackColor={{ true: colors.accent, false: colors.surfaceSunken }}
              thumbColor={colors.surface}
            />
          }
        />
      </Section>

      <Section title="Recipients">
        {config.recipients.length === 0 ? (
          <EmptyState title="No recipients yet" message="Add the client contacts who should receive this report." />
        ) : (
          config.recipients.map((recipient) => (
            <DataRow
              key={recipient}
              title={recipient}
              trailing={
                <Button
                  label="Remove"
                  onPress={() => recipients.remove.mutate(recipient)}
                  variant="secondary"
                  size="sm"
                  disabled={recipients.remove.isPending}
                />
              }
            />
          ))
        )}

        <TextField
          label="Add recipient"
          value={email}
          onChangeText={setEmail}
          placeholder="cmo@client.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
        />
        <Button
          label="Add recipient"
          onPress={addRecipient}
          size="sm"
          disabled={email.trim().length === 0}
          loading={recipients.add.isPending}
        />
      </Section>
    </>
  );
}

function ActivityTab({ config }: { config: ReportConfig }) {
  return (
    <>
      <StatStrip
        stats={[
          { label: 'Opens', value: formatNumber(config.engagementStats.opens) },
          { label: 'Downloads', value: formatNumber(config.engagementStats.downloads) },
          {
            label: 'Last opened',
            value: config.engagementStats.lastOpenedDate ? formatFullDate(config.engagementStats.lastOpenedDate) : '—',
          },
          { label: 'Last sent', value: config.lastSentAt ? formatFullDate(config.lastSentAt) : 'Never' },
        ]}
      />

      <Section title="Opens vs downloads">
        <PairedBars
          groups={config.weeklyEngagement.map((week) => ({
            label: week.label,
            primary: week.opens,
            secondary: week.downloads,
          }))}
          primaryLabel="Opens"
          secondaryLabel="Downloads"
          height={160}
        />
        <AppText variant="small">
          Delivery is not wired to an email provider in this build — sending records the timestamp only.
        </AppText>
      </Section>

      <Section title="Schedule summary">
        <DataRow title="Frequency" value={config.frequency} />
        <DataRow title="Internal review" value={config.internalReviewFirst ? 'On' : 'Off'} />
        <DataRow title="Recipients" value={String(config.recipients.length)} />
        <Label>Sections: {config.includedSections.join(' · ')}</Label>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
