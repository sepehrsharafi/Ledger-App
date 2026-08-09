import { StyleSheet, View } from 'react-native';

import { AreaTrend } from '@/components/charts/area-trend';
import { ProjectHeader } from '@/components/project/project-header';
import { Card } from '@/components/ui/card';
import { Meter } from '@/components/ui/meter';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { StatStrip } from '@/components/ui/stat-strip';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { AppText, Label } from '@/components/ui/text';
import { colors, spacing } from '@/constants/theme';
import { useProjectId } from '@/hooks/use-project-context';
import { useClientView } from '@/hooks/use-projects';
import { useRefresh } from '@/hooks/use-refresh';
import { goalProgress } from '@/lib/derive';
import { formatCompactCurrency, formatCurrency, formatGoalValue, formatMultiple, formatNumber, formatPercent } from '@/lib/format';

/** Read-only rollup that is safe to show a client. Nothing on this screen mutates data. */
export default function ClientViewScreen() {
  const projectId = useProjectId();
  const { data, isPending, isError, error, refetch } = useClientView(projectId);
  const { refreshing, onRefresh } = useRefresh(refetch);

  return (
    <View style={styles.root}>
      <ProjectHeader
        projectId={projectId}
        segment="client-view"
        title="Client view"
        subtitle="Read-only summary — safe to share in a client meeting."
        showBack
      />

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {isPending ? <LoadingState label="Loading client view" /> : null}
        {isError ? <ErrorState error={error} onRetry={refetch} title="Could not load the client view" /> : null}

        {data ? (
          <>
            <Card accentColor={data.project.brandAccent}>
              <Label>{data.project.clientName}</Label>
              <AppText variant="title">{data.project.name}</AppText>
              <AppText variant="small">{data.project.type}</AppText>
              <View style={styles.readOnlyNote}>
                <Label color={colors.accent}>Read-only view · nothing here can be edited</Label>
              </View>
            </Card>

            <StatStrip
              stats={[
                { label: 'Traffic', value: formatNumber(data.traffic), caption: 'last 12 months' },
                { label: 'Conversions', value: formatNumber(data.conversions), caption: 'attributed' },
                { label: 'Cost per lead', value: formatCurrency(Math.round(data.costPerLead)) },
                { label: 'Return on spend', value: formatMultiple(data.returnOnSpend) },
              ]}
            />

            <Section title="Traffic · 12 months">
              <AreaTrend
                values={data.timeSeries.map((point) => point.traffic)}
                labels={data.timeSeries.map((point) => point.label)}
                height={120}
                showAxis
                valueLabel={formatNumber(data.timeSeries.at(-1)?.traffic ?? 0)}
                title="Monthly visits"
              />
            </Section>

            <Section title="Goals">
              {data.goals.map((goal) => {
                const progress = goalProgress(goal.currentValue, goal.targetValue);
                return (
                  <View key={goal.id} style={styles.goal}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitle}>
                        <AppText variant="body">{goal.label}</AppText>
                        <Label>{goal.period}</Label>
                      </View>
                      <View style={styles.goalValues}>
                        <AppText variant="body">{formatGoalValue(goal.currentValue, goal.unit)}</AppText>
                        <Label>of {formatGoalValue(goal.targetValue, goal.unit)}</Label>
                      </View>
                    </View>
                    <Meter progress={progress} height={6} />
                    <Label>{formatPercent(progress, 0)} of target</Label>
                  </View>
                );
              })}
            </Section>

            <Section title="Investment">
              <AppText variant="bodyMuted">
                {formatCompactCurrency(data.timeSeries.reduce((total, point) => total + point.spend, 0))} invested across
                the last twelve months, returning {formatMultiple(data.returnOnSpend)} on spend.
              </AppText>
            </Section>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  readOnlyNote: { marginTop: spacing.md },
  goal: { gap: spacing.xs, paddingBottom: spacing.md },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  goalTitle: { flex: 1, gap: 1 },
  goalValues: { alignItems: 'flex-end', gap: 1 },
});
