import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { AreaTrend } from '@/components/charts/area-trend';
import { MultiLine } from '@/components/charts/multi-line';
import { ProjectHeader } from '@/components/project/project-header';
import { Avatar } from '@/components/ui/avatar';
import { DataRow } from '@/components/ui/data-row';
import { Meter } from '@/components/ui/meter';
import { MetricCard } from '@/components/ui/metric-card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusPill } from '@/components/ui/status-pill';
import { AppText, Label } from '@/components/ui/text';
import { channelColors, colors, spacing } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';
import { useProjectOverview } from '@/hooks/use-projects';
import { useRefresh } from '@/hooks/use-refresh';
import { isTaskOverdue, toCsv } from '@/lib/derive';
import { formatCompactCurrency, formatCurrency, formatDayMonth, formatNumber, formatPercent, formatRelative } from '@/lib/format';
import { projectRoute } from '@/lib/routes';
import type { ProjectOverview } from '@/types/models';

type TrendMode = 'Separate' | 'Indexed';

export default function OverviewScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useProjectOverview(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const [trendMode, setTrendMode] = useState<TrendMode>('Separate');

  /**
   * Export builds the CSV in memory and hands it to the OS share sheet — no filesystem
   * permissions or native export module required.
   */
  const onExport = async () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['Metric', 'Current', 'Previous'],
      ...data.kpis.map((kpi) => [kpi.metric, kpi.current, kpi.previous]),
      [],
      ['Pipeline stage', 'Leads', 'Share of total'],
      ...data.funnel.map((stage) => [stage.stage, stage.count, formatPercent(stage.shareOfTotal)]),
      [],
      ['Campaign', 'Channel', 'Spent', 'Budget', 'Conversions'],
      ...data.topCampaigns.map((campaign) => [
        campaign.name,
        campaign.channel,
        campaign.spent,
        campaign.budget,
        campaign.conversions,
      ]),
    ];

    try {
      await Share.share({
        title: `${data.project.name} — overview export`,
        message: `${data.project.name} overview (${data.reportingPeriod.label})\n\n${toCsv(rows)}`,
      });
    } catch {
      Alert.alert('Export failed', 'The report could not be shared from this device.');
    }
  };

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="overview"
        title={data?.project.name ?? 'Overview'}
        subtitle={data ? `${data.project.type} · ${data.project.clientName}` : undefined}
        actionLabel="Export"
        onAction={onExport}
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading overview" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load this project" /> : null}
        {data ? <OverviewBody data={data} trendMode={trendMode} onTrendModeChange={setTrendMode} /> : null}
      </Screen>
    </View>
  );
}

interface OverviewBodyProps {
  data: ProjectOverview;
  trendMode: TrendMode;
  onTrendModeChange: (mode: TrendMode) => void;
}

function OverviewBody({ data, trendMode, onTrendModeChange }: OverviewBodyProps) {
  const labels = data.timeSeries.map((point) => point.label);
  const totalChannelLeads = data.channels.reduce((total, channel) => total + channel.conversions, 0);

  return (
    <>
      <View style={styles.periodBlock}>
        <Label>Reporting period</Label>
        <AppText variant="heading">{data.reportingPeriod.label}</AppText>
        <Label>{data.reportingPeriod.comparisonLabel}</Label>
      </View>

      <View style={styles.kpiGrid}>
        {data.kpis.map((kpi) => (
          <MetricCard key={kpi.metric} kpi={kpi} />
        ))}
      </View>

      <Section title="Performance · 12 months" subtitle={`${formatNumber(data.totals.leadCount)} total leads in the pipeline.`}>
        <SegmentedControl
          options={['Separate', 'Indexed'] as const}
          value={trendMode}
          onChange={onTrendModeChange}
        />
        {trendMode === 'Separate' ? (
          <View style={styles.trendStack}>
            <AreaTrend
              title="Leads this month"
              valueLabel={formatNumber(data.timeSeries.at(-1)?.leads ?? 0)}
              rangeLabel={`12-month range ${Math.min(...data.timeSeries.map((p) => p.leads))}–${Math.max(...data.timeSeries.map((p) => p.leads))}`}
              values={data.timeSeries.map((point) => point.leads)}
              labels={[]}
            />
            <AreaTrend
              title="Conversions"
              valueLabel={formatNumber(data.timeSeries.at(-1)?.conversions ?? 0)}
              values={data.timeSeries.map((point) => point.conversions)}
              labels={[]}
              color={colors.chartInk}
              fill="rgba(17, 17, 16, 0.08)"
            />
            <AreaTrend
              title="Spend"
              valueLabel={formatCompactCurrency(data.timeSeries.at(-1)?.spend ?? 0)}
              values={data.timeSeries.map((point) => point.spend)}
              labels={labels}
              color={colors.chartSoft}
              fill="rgba(156, 182, 234, 0.20)"
            />
          </View>
        ) : (
          <MultiLine
            labels={labels}
            caption={`Indexed to ${labels[0] ?? 'the first month'} = 100, so all three metrics share one scale.`}
            series={[
              { key: 'leads', label: 'Leads', values: data.timeSeries.map((p) => p.leads), color: colors.chartAccent },
              {
                key: 'conversions',
                label: 'Conversions',
                values: data.timeSeries.map((p) => p.conversions),
                color: colors.chartInk,
              },
              { key: 'spend', label: 'Spend', values: data.timeSeries.map((p) => p.spend), color: colors.chartSoft },
            ]}
          />
        )}
      </Section>

      <Section title="Leads by channel" subtitle={`${totalChannelLeads} attributed conversions across ${data.channels.length} channels.`}>
        {data.channels.map((channel) => (
          <View key={channel.id} style={styles.channelRow}>
            <View style={styles.channelHeader}>
              <View style={styles.channelLabel}>
                <View style={[styles.swatch, { backgroundColor: channelColors[channel.channel] }]} />
                <AppText variant="body">{channel.channel}</AppText>
              </View>
              <View style={styles.channelValues}>
                <AppText variant="body">
                  {totalChannelLeads > 0 ? formatPercent(channel.conversions / totalChannelLeads, 0) : '0%'}
                </AppText>
                <Label>{channel.conversions}</Label>
              </View>
            </View>
            <Meter
              progress={totalChannelLeads > 0 ? channel.conversions / totalChannelLeads : 0}
              color={channelColors[channel.channel]}
            />
          </View>
        ))}
      </Section>

      <Section title="Pipeline" subtitle={`Conversion rate ${formatPercent(data.conversionRate)} of ${data.totals.leadCount} leads.`}>
        {data.funnel.map((stage) => (
          <View key={stage.stage} style={styles.funnelRow}>
            <View style={styles.funnelHeader}>
              <AppText variant="heading">{stage.stage}</AppText>
              <View style={styles.funnelValues}>
                <AppText variant="heading">{stage.count}</AppText>
                <Label>{formatPercent(stage.shareOfTotal, 1)}</Label>
              </View>
            </View>
            <Meter progress={stage.shareOfTotal} />
            <Label>
              {stage.stage === 'New'
                ? `${stage.count} of ${data.totals.leadCount} leads entered this stage`
                : `${formatPercent(stage.shareOfPrevious, 0)} of the previous stage`}
            </Label>
          </View>
        ))}
      </Section>

      <Section
        title="Top campaigns"
        actionLabel="All"
        onAction={() => router.push(projectRoute(data.project.id, 'campaigns'))}
      >
        {data.topCampaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" message="Add a campaign to start attributing spend and conversions." />
        ) : (
          data.topCampaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignRow}>
              <DataRow
                title={campaign.name}
                subtitle={`${campaign.channel} · ${campaign.conversions} conv · ${
                  campaign.conversions > 0 ? formatCurrency(campaign.spent / campaign.conversions) : '—'
                } CPA`}
                value={formatCurrency(campaign.spent)}
                valueCaption={`of ${formatCurrency(campaign.budget)}`}
                footer={
                  <View style={styles.campaignMeter}>
                    <Meter progress={campaign.budget > 0 ? campaign.spent / campaign.budget : 0} />
                  </View>
                }
              />
            </View>
          ))
        )}
      </Section>

      <Section
        title="Due next"
        actionLabel="Board"
        onAction={() => router.push(projectRoute(data.project.id, 'tasks'))}
        subtitle={data.overdueTaskCount > 0 ? `${data.overdueTaskCount} task(s) overdue.` : undefined}
      >
        {data.upcomingTasks.length === 0 ? (
          <EmptyState title="Nothing outstanding" message="Every task on this project is done." />
        ) : (
          data.upcomingTasks.map((task) => (
            <DataRow
              key={task.id}
              title={task.title}
              subtitle={task.assignee}
              value={formatDayMonth(task.dueDate)}
              valueCaption={isTaskOverdue(task) ? 'Overdue' : task.column}
              trailing={<StatusPill label={task.priority} />}
            />
          ))
        )}
      </Section>

      <Section title="Recent activity">
        {data.recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" message="Lead updates and notes will show up here." />
        ) : (
          data.recentActivity.map((entry) => (
            <DataRow
              key={entry.id}
              title={entry.content}
              subtitle={`${entry.activityType} · ${entry.author}`}
              value={formatRelative(entry.createdAt)}
            />
          ))
        )}
      </Section>

      <Section
        title="Project team"
        actionLabel="Manage"
        onAction={() => router.push(projectRoute(data.project.id, 'team'))}
      >
        {data.team.map((member) => (
          <DataRow
            key={member.id}
            title={member.name}
            subtitle={member.email}
            leading={<Avatar name={member.name} color={member.avatarColor} />}
            trailing={<StatusPill label={member.role} />}
          />
        ))}
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  periodBlock: { gap: 2 },
  kpiGrid: { gap: spacing.md },
  trendStack: { gap: spacing.xl },
  channelRow: { gap: spacing.sm, paddingBottom: spacing.md },
  channelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  channelLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  channelValues: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  swatch: { width: 8, height: 8 },
  funnelRow: { gap: spacing.sm, paddingBottom: spacing.md },
  funnelHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  funnelValues: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  campaignRow: { gap: spacing.sm },
  campaignMeter: { paddingTop: spacing.sm },
});
